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
    source: 'LOCAL_CACHE' | 'SENIAT' | 'ALGORITHM_MOD11';
}

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
     * Consulta integral de RIF con validación de Plan Premium, búsqueda en caché local y fallback inteligente.
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

            // 2. Parsear el documento ingresado (ej: "V14245074", "V-14245074-3", "14245074", "J000063729")
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
                // Si tiene más de 9 dígitos, tomar los últimos dígitos según convención
                docNumber = docNumber.slice(0, 8);
            }

            const calculatedCheckDigit = TaxpayerLookupService.calculateCheckDigit(docType, docNumber);
            const checkDigit = providedCheckDigit !== null ? providedCheckDigit : calculatedCheckDigit;
            const formattedRif = `${docType}-${docNumber}-${checkDigit}`;

            // 3. TIER 1: Búsqueda en caché local (Base de Datos Guardian)
            // Buscar coincidencias en la tabla Client por documento o RIF
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
                        source: 'LOCAL_CACHE'
                    }
                };
            }

            // 4. TIER 2: Intento de consulta en línea con timeout seguro (AbortController)
            try {
                const onlineResult = await this.queryOnlineTaxpayer(docType, docNumber, checkDigit);
                if (onlineResult && onlineResult.name) {
                    return {
                        status: 200,
                        message: 'Contribuyente consultado exitosamente del registro tributario.',
                        data: {
                            documentType: docType,
                            documentNumber: docNumber,
                            checkDigit,
                            rif: formattedRif,
                            name: onlineResult.name,
                            taxpayerType: onlineResult.taxpayerType || 'ORDINARIO',
                            isRetentionAgent: onlineResult.isRetentionAgent || false,
                            retentionPercentage: onlineResult.retentionPercentage || 0,
                            source: 'SENIAT'
                        }
                    };
                }
            } catch (netErr) {
                // Silenciosamente continuar al Tier 3 sin bloquear la experiencia de usuario
                console.warn('[TaxpayerLookup] Consulta en línea omitida o no disponible:', netErr);
            }

            // 5. TIER 3: Degeneración agraciada (Cálculo matemático Módulo 11)
            // Devuelve el RIF debidamente formateado y validado matemáticamente para que el usuario complete el nombre
            return {
                status: 200,
                message: 'Dígito verificador calculado exitosamente (Módulo 11). Ingrese la razón social.',
                data: {
                    documentType: docType,
                    documentNumber: docNumber,
                    checkDigit,
                    rif: formattedRif,
                    name: null,
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
     * Consulta con límite estricto de tiempo a servicios en línea
     */
    private async queryOnlineTaxpayer(docType: string, docNumber: string, checkDigit: number): Promise<{
        name: string;
        taxpayerType?: 'ORDINARIO' | 'ESPECIAL' | 'FORMAL';
        isRetentionAgent?: boolean;
        retentionPercentage?: number;
    } | null> {
        const paddedBody = docNumber.padStart(8, '0');
        const fullRif = `${docType}${paddedBody}${checkDigit}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        try {
            const url = `https://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp?p_rif=${encodeURIComponent(fullRif)}`;
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) return null;
            const html = await response.text();

            // Analizar posibles etiquetas donde el SENIAT ubica el nombre
            const nameMatch = html.match(/<br><b>([^<]+)<\/b><br><br>/i);
            if (nameMatch && nameMatch[1] && nameMatch[1].trim().length > 2) {
                const rawName = nameMatch[1].trim();
                const isSpecial = /retenci[oó]n|especial/i.test(html);
                return {
                    name: rawName,
                    taxpayerType: isSpecial ? 'ESPECIAL' : 'ORDINARIO',
                    isRetentionAgent: isSpecial,
                    retentionPercentage: isSpecial ? 75 : 0
                };
            }

            return null;
        } catch {
            clearTimeout(timeoutId);
            return null;
        }
    }
}
