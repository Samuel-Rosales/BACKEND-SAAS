import { prisma } from '@/configs';

export interface TaxpayerLookupResult {
    documentType: string;
    documentNumber: string;
    checkDigit: number;
    rif: string;
    name: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxpayerType: 'ORDINARIO' | 'ESPECIAL' | 'FORMAL';
    isRetentionAgent: boolean;
    retentionPercentage: number;
    requiresCaptcha?: boolean;
    sessionId?: string;
    captchaImage?: string;
    source: 'LOCAL_CACHE' | 'SENIAT' | 'ALGORITHM_MOD11';
}

interface SeniatSessionRecord {
    cookies: string;
    docType: string;
    docNumber: string;
    checkDigit: number;
    createdAt: number;
}

// Caché en memoria para sesiones activas de consulta SENIAT (TTL: 5 minutos)
const seniatSessions = new Map<string, SeniatSessionRecord>();

setInterval(() => {
    const now = Date.now();
    for (const [key, session] of seniatSessions.entries()) {
        if (now - session.createdAt > 5 * 60 * 1000) {
            seniatSessions.delete(key);
        }
    }
}, 60 * 1000);

export class TaxpayerLookupService {

    /**
     * Calcula el dígito verificador del RIF venezolano según el algoritmo oficial Módulo 11.
     * Prefijos oficiales: V=1, E=2, J=3, P=4, G=5, C=6
     * Multiplicador base del prefijo = 4
     * Vector de pesos para los 8 dígitos: [3, 2, 7, 6, 5, 4, 3, 2]
     * Residuo = Suma % 11. Si residuo <= 1 => Dígito 0. Sino => 11 - residuo.
     */
    public static calculateCheckDigit(type: string, numberStr: string | number): number {
        const typeMap: Record<string, number> = {
            'V': 1,
            'E': 2,
            'J': 3,
            'P': 4,
            'G': 5,
            'C': 6
        };

        const prefix = (type || 'V').toUpperCase();
        const prefixCode = typeMap[prefix] ?? 1;

        // Limpiar dígitos y rellenar con ceros a la izquierda a 8 dígitos estándar
        const cleanNumber = String(numberStr).replace(/\D/g, '').padStart(8, '0');
        const weights = [3, 2, 7, 6, 5, 4, 3, 2];

        let sum = prefixCode * 4;
        for (let i = 0; i < 8; i++) {
            const digit = parseInt(cleanNumber[i] || '0', 10);
            sum += digit * weights[i];
        }

        const residue = sum % 11;
        return residue <= 1 ? 0 : 11 - residue;
    }

    /**
     * Da formato estándar al RIF venezolano (ej. V-14245074-3)
     */
    public static formatRif(type: string, numberStr: string | number, checkDigit?: number): string {
        const prefix = (type || 'V').toUpperCase();
        const cleanNumber = String(numberStr).replace(/\D/g, '');
        const digit = checkDigit !== undefined ? checkDigit : this.calculateCheckDigit(prefix, cleanNumber);
        return `${prefix}-${cleanNumber}-${digit}`;
    }

    /**
     * Consulta integral de RIF con validación de Plan Premium, búsqueda en caché local (TaxpayerCache + Client)
     * y sesión interactiva en SENIAT si no está registrado.
     */
    public async lookup(businessId: number, rawInput: string): Promise<{
        status: number;
        message: string;
        data: TaxpayerLookupResult | null;
    }> {
        try {
            // 1. Validar suscripción PREMIUM o ENTERPRISE de la empresa
            const subscription = await prisma.subscription.findUnique({
                where: { businessId },
                include: { plan: true }
            });

            const isPremiumOrEnterprise = subscription && (
                subscription.planType === 'PREMIUM' ||
                subscription.planType === 'ENTERPRISE' ||
                subscription.plan?.name?.toUpperCase().includes('PREMIUM') ||
                subscription.plan?.name?.toUpperCase().includes('ENTERPRISE')
            );

            if (!isPremiumOrEnterprise) {
                return {
                    status: 403,
                    message: 'La consulta automática de RIF es una función exclusiva de los Planes PREMIUM y ENTERPRISE.',
                    data: null
                };
            }

            // 2. Parsear el documento ingresado (ej: "V15848341", "V-15848341-2", "15848341", "J000063729")
            const cleaned = rawInput.trim().toUpperCase().replace(/[\s\.\-]/g, '');
            if (!cleaned || cleaned.length < 3) {
                return {
                    status: 400,
                    message: 'Debe ingresar un número de cédula o RIF válido.',
                    data: null
                };
            }

            let docType = 'V';
            let docNumber = cleaned;

            const firstChar = cleaned.charAt(0);
            if (['V', 'E', 'J', 'G', 'P', 'C'].includes(firstChar)) {
                docType = firstChar;
                docNumber = cleaned.slice(1);
            }

            // Si vino con dígito verificador al final (9 dígitos en lugar de 8 para número)
            let providedCheckDigit: number | null = null;
            if (docNumber.length === 9) {
                providedCheckDigit = parseInt(docNumber.slice(-1), 10);
                docNumber = docNumber.slice(0, 8);
            } else if (docNumber.length > 9) {
                docNumber = docNumber.slice(0, 8);
            }

            const calculatedCheckDigit = TaxpayerLookupService.calculateCheckDigit(docType, docNumber);
            const checkDigit = providedCheckDigit !== null ? providedCheckDigit : calculatedCheckDigit;
            const formattedRif = `${docType}-${docNumber}-${checkDigit}`;

            // 3. TIER 1: Búsqueda instantánea en TaxpayerCache (Base de Datos Tributaria de Guardian)
            const fullRawNumber = `${docNumber}${checkDigit}`;
            const cachedTaxpayers = await prisma.$queryRawUnsafe<any[]>(
                `SELECT * FROM "TaxpayerCache" 
                 WHERE ci = $1 OR ci = $2 OR ci = $3 OR ci = $4 OR ci = $5 OR ci = $6 
                 LIMIT 1`,
                docNumber,
                docNumber.replace(/^0+/, ''),
                docNumber.padStart(8, '0'),
                fullRawNumber,
                fullRawNumber.replace(/^0+/, ''),
                fullRawNumber.padStart(9, '0')
            ).catch((err) => {
                console.warn('[TaxpayerLookup] Error querying TaxpayerCache:', err.message);
                return [];
            });

            if (cachedTaxpayers && cachedTaxpayers.length > 0 && cachedTaxpayers[0].name) {
                const t = cachedTaxpayers[0];
                return {
                    status: 200,
                    message: 'Contribuyente encontrado exitosamente en el registro.',
                    data: {
                        documentType: docType,
                        documentNumber: docNumber,
                        checkDigit,
                        rif: formattedRif,
                        name: t.name,
                        phone: null,
                        email: null,
                        address: null,
                        taxpayerType: t.taxpayerType || 'ORDINARIO',
                        isRetentionAgent: !!t.isRetentionAgent,
                        retentionPercentage: Number(t.retentionPercentage || 0),
                        requiresCaptcha: false,
                        source: 'LOCAL_CACHE'
                    }
                };
            }

            // 4. TIER 2: Búsqueda en historial de Clientes de la plataforma
            const cachedClient = await prisma.client.findFirst({
                where: {
                    OR: [
                        { ci: { contains: docNumber } },
                        { ci: { contains: formattedRif } },
                        { ci: { equals: `${docType}${docNumber}` } }
                    ]
                },
                orderBy: { id: 'desc' }
            });

            if (cachedClient && cachedClient.name) {
                // Indexar en TaxpayerCache en segundo plano para optimizar futuras búsquedas
                prisma.$executeRawUnsafe(
                    `INSERT INTO "TaxpayerCache" (ci, name, "taxpayerType") VALUES ($1, $2, 'ORDINARIO') ON CONFLICT (ci) DO NOTHING`,
                    docNumber,
                    cachedClient.name
                ).catch(() => {});

                return {
                    status: 200,
                    message: 'Contribuyente encontrado en la base de datos local.',
                    data: {
                        documentType: docType,
                        documentNumber: docNumber,
                        checkDigit,
                        rif: formattedRif,
                        name: cachedClient.name,
                        phone: cachedClient.phone,
                        email: cachedClient.email,
                        address: cachedClient.address,
                        taxpayerType: 'ORDINARIO',
                        isRetentionAgent: false,
                        retentionPercentage: 0,
                        requiresCaptcha: false,
                        source: 'LOCAL_CACHE'
                    }
                };
            }

            // 5. TIER 3: Si no está en caché, iniciar sesión SENIAT con Captcha
            try {
                const sessionData = await this.startSeniatSession(docType, docNumber, checkDigit);
                if (sessionData) {
                    return {
                        status: 200,
                        message: 'Validación de seguridad SENIAT requerida para consultar este contribuyente por primera vez.',
                        data: {
                            documentType: docType,
                            documentNumber: docNumber,
                            checkDigit,
                            rif: formattedRif,
                            name: null,
                            requiresCaptcha: true,
                            sessionId: sessionData.sessionId,
                            captchaImage: sessionData.captchaImage,
                            taxpayerType: 'ORDINARIO',
                            isRetentionAgent: false,
                            retentionPercentage: 0,
                            source: 'SENIAT'
                        }
                    };
                }
            } catch (seniatErr) {
                console.warn('[TaxpayerLookup] Fallback to Modulo 11 due to SENIAT timeout/error:', seniatErr);
            }

            // 6. TIER 4: Degeneración agraciada (Cálculo matemático Módulo 11)
            return {
                status: 200,
                message: 'Dígito verificador calculado exitosamente (Módulo 11). Ingrese la razón social.',
                data: {
                    documentType: docType,
                    documentNumber: docNumber,
                    checkDigit,
                    rif: formattedRif,
                    name: null,
                    requiresCaptcha: false,
                    taxpayerType: 'ORDINARIO',
                    isRetentionAgent: false,
                    retentionPercentage: 0,
                    source: 'ALGORITHM_MOD11'
                }
            };

        } catch (error: any) {
            console.error('Error en TaxpayerLookupService.lookup:', error);
            return {
                status: 500,
                message: error?.message || 'Error interno al consultar el RIF',
                data: null
            };
        }
    }

    /**
     * Inicia una sesión con el portal SENIAT y obtiene la imagen del captcha en Base64
     */
    private async startSeniatSession(docType: string, docNumber: string, checkDigit: number): Promise<{ sessionId: string, captchaImage: string } | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        try {
            const initRes = await fetch('https://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp', {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const setCookies = (initRes.headers as any).getSetCookie 
                ? (initRes.headers as any).getSetCookie() 
                : [initRes.headers.get('set-cookie') || ''];
            
            const cookieHeader = setCookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');

            const captchaRes = await fetch('https://contribuyente.seniat.gob.ve/BuscaRif/Captcha.jpg', {
                signal: controller.signal,
                headers: {
                    'Cookie': cookieHeader,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp'
                }
            });

            clearTimeout(timeout);

            if (!captchaRes.ok) return null;

            const arrayBuf = await captchaRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuf).toString('base64');
            const captchaImage = `data:image/jpeg;base64,${base64}`;

            const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            seniatSessions.set(sessionId, {
                cookies: cookieHeader,
                docType,
                docNumber,
                checkDigit,
                createdAt: Date.now()
            });

            return { sessionId, captchaImage };
        } catch {
            clearTimeout(timeout);
            return null;
        }
    }

    /**
     * Valida el código Captcha ante el SENIAT, extrae la razón social y la indexa permanentemente
     */
    public async verifyCaptcha(businessId: number, payload: {
        sessionId: string;
        captchaCode: string;
        docType?: string;
        docNumber?: string;
        checkDigit?: number;
    }): Promise<{
        status: number;
        message: string;
        data: TaxpayerLookupResult | null;
    }> {
        // 1. Validar suscripción
        const subscription = await prisma.subscription.findUnique({
            where: { businessId },
            include: { plan: true }
        });
        const isPremiumOrEnterprise = subscription && (
            subscription.planType === 'PREMIUM' ||
            subscription.planType === 'ENTERPRISE' ||
            subscription.plan?.name?.toUpperCase().includes('PREMIUM') ||
            subscription.plan?.name?.toUpperCase().includes('ENTERPRISE')
        );
        if (!isPremiumOrEnterprise) {
            return {
                status: 403,
                message: 'La consulta automática de RIF es una función exclusiva de los Planes PREMIUM y ENTERPRISE.',
                data: null
            };
        }

        const { sessionId, captchaCode } = payload;
        const session = seniatSessions.get(sessionId);

        const docType = (session?.docType || payload.docType || 'V').toUpperCase();
        const docNumber = session?.docNumber || payload.docNumber || '';
        const checkDigit = session?.checkDigit !== undefined ? session.checkDigit : TaxpayerLookupService.calculateCheckDigit(docType, docNumber);
        const formattedRif = `${docType}-${docNumber}-${checkDigit}`;

        if (!session) {
            return {
                status: 400,
                message: 'La sesión de consulta SENIAT ha expirado. Por favor presione Consultar RIF nuevamente.',
                data: null
            };
        }

        seniatSessions.delete(sessionId); // Un solo uso

        const paddedNumber = docNumber.padStart(8, '0');
        const fullRif = `${docType}${paddedNumber}${checkDigit}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        try {
            const postRes = await fetch('https://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Cookie': session.cookies,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp'
                },
                body: `p_rif=${encodeURIComponent(fullRif)}&codigo=${encodeURIComponent(captchaCode.trim().toLowerCase())}`
            });

            clearTimeout(timeout);

            if (!postRes.ok) {
                return {
                    status: 502,
                    message: 'El portal del SENIAT no respondió adecuadamente. Intente más tarde.',
                    data: null
                };
            }

            const html = await postRes.text();

            if (html.includes('código de seguridad no coincide') || html.includes('Captcha.jpg')) {
                return {
                    status: 400,
                    message: 'El código de seguridad ingresado es incorrecto o ha caducado. Intente nuevamente.',
                    data: null
                };
            }

            const cleanName = this.extractNameFromSeniatHtml(html);
            if (!cleanName) {
                return {
                    status: 404,
                    message: 'No se pudo obtener el nombre del contribuyente desde el SENIAT.',
                    data: null
                };
            }

            const isSpecial = /retenci[oó]n|especial/i.test(html);
            const retentionPct = isSpecial ? 75 : 0;

            // Guardar permanentemente en TaxpayerCache
            await prisma.$executeRawUnsafe(
                `INSERT INTO "TaxpayerCache" (ci, name, "taxpayerType", "isRetentionAgent", "retentionPercentage")
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (ci) DO UPDATE SET 
                   name = EXCLUDED.name, 
                   "taxpayerType" = EXCLUDED."taxpayerType",
                   "isRetentionAgent" = EXCLUDED."isRetentionAgent",
                   "retentionPercentage" = EXCLUDED."retentionPercentage"`,
                docNumber,
                cleanName,
                isSpecial ? 'ESPECIAL' : 'ORDINARIO',
                isSpecial,
                retentionPct
            ).catch((err) => {
                console.warn('[TaxpayerLookup] Error caching verified taxpayer:', err.message);
            });

            return {
                status: 200,
                message: 'Contribuyente verificado exitosamente desde el SENIAT.',
                data: {
                    documentType: docType,
                    documentNumber: docNumber,
                    checkDigit,
                    rif: formattedRif,
                    name: cleanName,
                    phone: null,
                    email: null,
                    address: null,
                    taxpayerType: isSpecial ? 'ESPECIAL' : 'ORDINARIO',
                    isRetentionAgent: isSpecial,
                    retentionPercentage: retentionPct,
                    requiresCaptcha: false,
                    source: 'SENIAT'
                }
            };

        } catch (err: any) {
            clearTimeout(timeout);
            return {
                status: 500,
                message: err?.message || 'Error de conexión con el SENIAT al verificar el código.',
                data: null
            };
        }
    }

    /**
     * Parsea el nombre legal/razón social devuelto por el SENIAT
     */
    private extractNameFromSeniatHtml(html: string): string | null {
        const regex1 = /<b>\s*<font[^>]*>([A-Z0-9]+)(?:&nbsp;|\s+)([^<]+)<\/b>\s*<\/font>/i;
        const match1 = html.match(regex1);
        if (match1 && match1[2] && match1[2].trim().length > 2) {
            return match1[2].replace(/&nbsp;/g, ' ').trim();
        }

        const regex2 = /<font[^>]*face=["']?Verdana["']?[^>]*>([A-Z0-9]+)(?:&nbsp;|\s+)([^<]+)<\/b>/i;
        const match2 = html.match(regex2);
        if (match2 && match2[2] && match2[2].trim().length > 2) {
            return match2[2].replace(/&nbsp;/g, ' ').trim();
        }

        const regex3 = />([VEJPGvejpg]\d{8,9})(?:&nbsp;|\s+)([A-ZÁÉÍÓÚÑ0-9\s\.\,\-]+)<\/b>/i;
        const match3 = html.match(regex3);
        if (match3 && match3[2] && match3[2].trim().length > 2) {
            return match3[2].replace(/&nbsp;/g, ' ').trim();
        }

        const regex4 = /<br><b>([^<]+)<\/b><br><br>/i;
        const match4 = html.match(regex4);
        if (match4 && match4[1] && match4[1].trim().length > 2) {
            return match4[1].replace(/&nbsp;/g, ' ').trim();
        }

        return null;
    }
}
