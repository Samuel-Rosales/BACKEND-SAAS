import https from 'https';
import { URLSearchParams } from 'url';

export interface TesoroValidationResult {
  success: boolean;
  approved: boolean;
  message: string;
}

export interface TesoroValidateParams {
  amountBs: number;
  originBank?: string | null;
  originPhone?: string | null;
  reference: string;
}

export class TesoroPagosService {
  private static instance: TesoroPagosService;

  private readonly baseUrl = 'tesoropagos.bt.com.ve';
  private readonly defaultSucursal = '01597001';
  private readonly defaultCaja = '04';
  private readonly defaultPassword = '654321';

  private cookieJar: string[] = [];
  private isAuthenticated = false;
  private lastSessionTime = 0;
  private isAuthenticating = false;

  public static getInstance(): TesoroPagosService {
    if (!TesoroPagosService.instance) {
      TesoroPagosService.instance = new TesoroPagosService();
    }
    return TesoroPagosService.instance;
  }

  private cleanBankCode(bank?: string | null): string {
    if (!bank) return '0102'; // Default Venezuela
    const match = String(bank).match(/\b(\d{4})\b/);
    if (match) return match[1];
    return '0102';
  }

  private cleanPhone(phone?: string | null): string {
    if (!phone) return '04120000000';
    let clean = String(phone).replace(/[^\d]/g, '');
    if (clean.length === 10 && clean.startsWith('4')) clean = '0' + clean;
    if (clean.length > 11) clean = clean.slice(-11);
    if (clean.length < 11) clean = clean.padStart(11, '0');
    return clean;
  }

  private cleanReference(reference: string): string {
    const digits = String(reference).replace(/[^\d]/g, '');
    if (digits.length >= 6) return digits.slice(-6);
    return digits.padStart(6, '0');
  }

  private formatAmount(amount: number): string {
    // Formato requerido por Tesoro Pagos: "800,00" o "1.500,00"
    const fixed = Number(amount).toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},${decPart}`;
  }

  private updateCookies(newCookies?: string[]) {
    if (!newCookies || newCookies.length === 0) return;
    const cookieMap = new Map<string, string>();

    // Cargar existentes
    for (const c of this.cookieJar) {
      const [nameVal] = c.split(';');
      const [k, v] = nameVal.split('=');
      if (k && v !== undefined) cookieMap.set(k.trim(), v.trim());
    }

    // Agregar o sobreescribir nuevas
    for (const c of newCookies) {
      const [nameVal] = c.split(';');
      const [k, v] = nameVal.split('=');
      if (k && v !== undefined) cookieMap.set(k.trim(), v.trim());
    }

    this.cookieJar = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
  }

  private getCookieHeader(): string {
    return this.cookieJar.join('; ');
  }

  private async request(options: {
    path: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ statusCode: number; headers: Record<string, any>; body: string }> {
    return new Promise((resolve, reject) => {
      const reqHeaders = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        Cookie: this.getCookieHeader(),
        ...(options.headers || {}),
      };

      const req = https.request(
        {
          hostname: this.baseUrl,
          path: options.path,
          method: options.method,
          headers: reqHeaders,
          timeout: 25000,
        },
        (res) => {
          let data = '';
          this.updateCookies(res.headers['set-cookie']);
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () =>
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body: data,
            })
          );
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de conexión con Banco del Tesoro'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  private async ensureAuthenticated(): Promise<boolean> {
    const now = Date.now();
    // Reutilizar sesión si tiene menos de 2.5 minutos
    if (this.isAuthenticated && now - this.lastSessionTime < 150000) {
      return true;
    }

    if (this.isAuthenticating) {
      // Esperar si ya hay una autenticación en curso
      await new Promise((r) => setTimeout(r, 1200));
      return this.isAuthenticated;
    }

    this.isAuthenticating = true;
    try {
      console.log('[TesoroPagos] Iniciando sesión para Sucursal', this.defaultSucursal, 'Caja', this.defaultCaja);

      // 1. Obtener CSRF token fresco desde /login
      const getRes = await this.request({ path: '/login', method: 'GET' });
      const tokenMatch = getRes.body.match(/name="_token"\s+value="([^"]+)"/);
      if (!tokenMatch) {
        console.error('[TesoroPagos] No se encontró CSRF token en /login');
        return false;
      }
      const csrfToken = tokenMatch[1];

      // 2. Enviar POST login
      const postBody = new URLSearchParams({
        _token: csrfToken,
        security_code: process.env.TESORO_SUCURSAL || this.defaultSucursal,
        box_number: process.env.TESORO_CAJA || this.defaultCaja,
        password: process.env.TESORO_PASSWORD || this.defaultPassword,
      }).toString();

      const postRes = await this.request({
        path: '/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': String(Buffer.byteLength(postBody)),
          Referer: `https://${this.baseUrl}/login`,
          Origin: `https://${this.baseUrl}`,
        },
        body: postBody,
      });

      if (
        postRes.statusCode === 302 ||
        postRes.body.includes('form-confirmacion-pago') ||
        postRes.body.includes('dashboard') ||
        postRes.body.includes('pago-movil')
      ) {
        console.log('[TesoroPagos] Sesión iniciada con éxito en Banco del Tesoro');
        this.isAuthenticated = true;
        this.lastSessionTime = Date.now();
        return true;
      }

      if (postRes.body.includes('La caja ya tiene una sesión activa')) {
        console.log('[TesoroPagos] La caja ya tiene sesión activa. Verificando acceso directo...');
        const checkPm = await this.request({ path: '/pago-movil', method: 'GET' });
        if (checkPm.body.includes('form-confirmacion-pago') || checkPm.body.includes('btn-validar-pago')) {
          this.isAuthenticated = true;
          this.lastSessionTime = Date.now();
          return true;
        }
      }

      console.warn('[TesoroPagos] Respuesta inesperada tras login:', postRes.statusCode);
      return false;
    } catch (error) {
      console.error('[TesoroPagos] Error en ensureAuthenticated:', error);
      return false;
    } finally {
      this.isAuthenticating = false;
    }
  }

  public async validatePayment(params: TesoroValidateParams): Promise<TesoroValidationResult> {
    try {
      let authOk = await this.ensureAuthenticated();
      if (!authOk) {
        this.cookieJar = [];
        this.isAuthenticated = false;
        authOk = await this.ensureAuthenticated();
        if (!authOk) {
          return {
            success: false,
            approved: false,
            message: 'No se pudo establecer conexión segura con el Banco del Tesoro.',
          };
        }
      }

      const cleanBank = this.cleanBankCode(params.originBank);
      const cleanPhone = this.cleanPhone(params.originPhone);
      const cleanRef = this.cleanReference(params.reference);
      const cleanAmount = this.formatAmount(params.amountBs);

      console.log(
        `[TesoroPagos] Validando pago: Monto=${cleanAmount} Bs, Banco=${cleanBank}, Teléfono=${cleanPhone}, Ref=${cleanRef}`
      );

      // 1. Obtener CSRF token de la página /pago-movil
      const pmPage = await this.request({ path: '/pago-movil', method: 'GET' });
      let formTokenMatch = pmPage.body.match(/id="form-confirmacion-pago"[^>]*>.*?name="_token"\s+value="([^"]+)"/s);
      let formToken = formTokenMatch ? formTokenMatch[1] : '';

      if (!formToken) {
        const metaMatch = pmPage.body.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
        if (metaMatch) formToken = metaMatch[1];
      }

      if (!formToken) {
        console.warn('[TesoroPagos] No se pudo obtener token de formulario en /pago-movil');
        return {
          success: false,
          approved: false,
          message: 'Error obteniendo el token de seguridad del banco.',
        };
      }

      // 2. Enviar validación a /pago-movil
      const postData = new URLSearchParams({
        _token: formToken,
        monto: cleanAmount,
        banco: cleanBank,
        telefono: cleanPhone,
        referencia: cleanRef,
      }).toString();

      const valRes = await this.request({
        path: '/pago-movil',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': String(Buffer.byteLength(postData)),
          Referer: `https://${this.baseUrl}/pago-movil`,
          Origin: `https://${this.baseUrl}`,
        },
        body: postData,
      });

      const body = valRes.body;
      console.log(`[TesoroPagos] Respuesta HTTP: ${valRes.statusCode}, longitud ${body.length}`);

      // 3. Analizar respuesta bancaria
      if (
        body.toLowerCase().includes('pago movil no encontrado') ||
        body.toLowerCase().includes('no encontrado') ||
        body.toLowerCase().includes('pago no encontrado')
      ) {
        console.log('[TesoroPagos] Resultado: Pago NO encontrado en el banco');
        return {
          success: true,
          approved: false,
          message:
            'Pago no encontrado en Banco del Tesoro. Verifica el monto exacto en Bs, el banco emisor y la referencia.',
        };
      }

      if (
        body.toLowerCase().includes('confirmado') ||
        body.toLowerCase().includes('aprobado') ||
        body.toLowerCase().includes('exitoso') ||
        body.toLowerCase().includes('pago movil confirmado') ||
        (body.includes('border-green') && !body.includes('border-red'))
      ) {
        console.log('[TesoroPagos] ¡PAGO CONFIRMADO EXITOSAMENTE!');
        return {
          success: true,
          approved: true,
          message: '¡Pago móvil confirmado y verificado con éxito en Banco del Tesoro!',
        };
      }

      if (body.toLowerCase().includes('sesión expirada') || valRes.headers.location?.includes('login')) {
        console.warn('[TesoroPagos] Sesión expiró durante la consulta');
        this.isAuthenticated = false;
        return {
          success: false,
          approved: false,
          message: 'La sesión bancaria se está renovando. Por favor intenta de nuevo en unos segundos.',
        };
      }

      return {
        success: false,
        approved: false,
        message: 'El banco no devolvió un estado concluyente inmediato. Tu pago quedó registrado para revisión.',
      };
    } catch (error: any) {
      console.error('[TesoroPagos] Excepción en validatePayment:', error);
      return {
        success: false,
        approved: false,
        message: `Error de conexión con el banco: ${error?.message || error}`,
      };
    }
  }
}

export const tesoroPagosService = TesoroPagosService.getInstance();
