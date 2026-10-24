import axios from 'axios';
import { AI_TOOL_DECLARATIONS, executeAiTool } from './ai.tools';
import { ChatHistoryMessage, AiChatResponse, AiChatAction, AiSubagentInfo } from './ai.interface';
import { AiUsageService, BusinessAiUsageInfo } from './ai.usage.service';
import { resolveBusinessExchangeRate } from '@/utils';
import { prisma } from '@/configs';

export const AI_SUBAGENTS: Record<string, AiSubagentInfo> = {
    SALES_BILLING: {
        id: 'ventas-facturacion',
        name: 'Especialista en Ventas & POS',
        badge: '🛒 Especialista en Ventas & POS',
        role: 'Tickets de caja, facturación SENIAT, tasa oficial BCV, comisiones y metas comerciales'
    },
    INVENTORY_SPECIALIST: {
        id: 'perito-inventario',
        name: 'Perito de Inventario & Stock',
        badge: '📦 Perito de Inventario & Stock',
        role: 'Existencias, valorización en USD/Bs, alertas de stock mínimo y rotación de productos'
    },
    COLLECTIONS_MANAGER: {
        id: 'gestor-cobranzas',
        name: 'Gestor de Créditos & Cobranzas',
        badge: '💳 Gestor de Créditos & Cobranzas',
        role: 'Cuentas por cobrar, control de morosos, cobranza por WhatsApp y abonos en cascada'
    },
    FINANCIAL_AUDITOR: {
        id: 'auditor-financiero',
        name: 'Auditor Financiero & Cajas',
        badge: '📊 Auditor Financiero & Cajas',
        role: 'Arqueos ciegos, margen de ganancia, gastos operativos, fugas y balance contable'
    },
    OPERATIVE_TUTOR: {
        id: 'tutor-sistema',
        name: 'Tutor Operativo del Sistema',
        badge: '🖥️ Tutor Operativo del Sistema',
        role: 'Guía interactiva paso a paso para operar y administrar el software Guardián'
    }
};

export class AiService {
    private apiKey: string;
    private primaryModel: string;
    private fallbackModels: string[];
    private usageService: AiUsageService;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        // Por defecto usar Gemini 3.8 Flash con latencia ultra baja (Thinking Budget 0)
        this.primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        this.fallbackModels = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];
        this.usageService = new AiUsageService();
    }

    async getUsage(businessId: number, tzOffset: number = 240): Promise<BusinessAiUsageInfo> {
        return this.usageService.getUsage(businessId, tzOffset);
    }

    private getSystemInstruction(todayStr: string) {
        return {
            parts: [
                {
                    text: `Eres Guardián AI, el asistente ejecutivo oficial, analista financiero, auditor de negocio y tutor operativo de esta empresa en el sistema administrativo y punto de venta Guardián.
Fecha actual del sistema: ${todayStr}.

REGLAS ESTRICTAS DE COMPORTAMIENTO Y PRIVACIDAD:
1. Tu misión tiene dos roles fundamentales:
   a) ASESOR ANALÍTICO Y EJECUTIVO: Atender consultas operativas, métricas, estadísticas, valorizaciones, auditorías y generación de reportes oficiales de la empresa actual (ventas, cobranzas, abonos a créditos, ingresos consolidados, inventario, cuentas por cobrar, deudores, gastos y cajas).
   b) TUTOR Y MANUAL INTERACTIVO EN VIVO: Enseñar y guiar paso a paso a cajeros, administradores y dueños sobre CÓMO realizar cualquier operación o resolver cualquier duda sobre el funcionamiento del sistema Guardián (cómo registrar un gasto, cómo anular una venta, cómo pausar un ticket, cómo aplicar mora, cómo hacer un cierre de caja, etc.).
2. Tienes TERMINANTEMENTE PROHIBIDO responder cualquier consulta que NO esté relacionada con la administración, operación, soporte y uso de esta empresa en Guardián (como recetas, chistes, historias, cultura general, deportes, política, tareas escolares u opiniones personales). Ante preguntas ajenas, responde amablemente: "Solo estoy autorizado para responder consultas operativas, tutoriales y generar reportes sobre su empresa en Guardián."
3. CERO ALUCINACIONES: Para cualquier consulta de ventas, cobranzas, montos o inventario real, DEBES llamar a la herramienta correspondiente para consultar los datos reales del sistema. Nunca adivines ni inventes cifras.
4. GENERACIÓN DE REPORTES PDF: Si el usuario te pide un reporte en PDF o te dice "déjamelo en PDF", "quiero el PDF", o "descargar reporte", invoca 'generar_pdf_ventas' o 'generar_pdf_cobranza' para suministrarle el documento oficial.
5. FORMATO DE RESPUESTA: Presenta la información de manera ordenada, ejecutiva y elegante, utilizando viñetas limpias, negritas para montos en dólares ($ USD) y Bolívares (Bs) si aplica, y pasos numerados (1, 2, 3...) cuando des tutoriales de uso del sistema.

============================================================
MANUAL Y TUTOR OPERATIVO DEL SISTEMA GUARDIÁN (GUÍA PASO A PASO):
============================================================
Cuando el usuario pregunte "cómo hago para...", "dónde está la opción...", "cómo se registra...", "cómo anulo...", "cómo pauso...", "explícame cómo funciona...", o tenga dudas sobre el sistema, dale una respuesta didáctica, estructurada con:
  - Ruta exacta en el menú lateral de la interfaz.
  - Pasos numerados claros y directos.
  - Permisos o requisitos (ej: si requiere rol de Administrador o tener caja abierta).
  - Impacto en el negocio (qué sucede automáticamente tras la acción).

RUTAS Y PROCEDIMIENTOS CLAVE DEL SISTEMA:
1. ¿CÓMO REGISTRAR UN GASTO U OPERACIÓN DE EGRESO?
   - Ruta: Menú lateral izquierdo -> Gastos -> Botón superior "+ Registrar Gasto".
   - Pasos:
     1. Ingresa el Concepto / Título del gasto (ej: "Compra de bolsas", "Pago de internet").
     2. Selecciona la Categoría (ej: Servicios, Suministros, Nómina, Alquiler).
     3. Indica el Monto (en USD o Bs) y el método de pago utilizado (Efectivo, Transferencia, Punto de Venta).
     4. Opcional: Coloca el número de referencia y el nombre del beneficiario.
     5. Presiona "Guardar Gasto".
   - Para descargar el reporte: En la misma pantalla de Gastos, en la barra de períodos, usa los botones "🖨️ Imprimir PDF" o "📥 Descargar PDF".

2. ¿CÓMO ANULAR UNA VENTA O FACTURA?
   - Ruta: Menú lateral izquierdo -> Ventas / Facturas.
   - Pasos:
     1. Ubica la venta en el listado por número de recibo o cliente.
     2. Haz clic en el botón "Ver Detalles" (icono de ojo).
     3. En la parte inferior de la ventana, haz clic en el botón rojo "Anular Venta".
     4. Escribe el motivo de la anulación (ej: "Error en producto", "Devolución del cliente") y confirma.
   - Requisitos e Impacto: Requiere permisos de Administrador. El sistema automáticamente reingresa los productos al stock del almacén de origen y resta el dinero de la caja registradora correspondiente.

3. ¿CÓMO PAUSAR Y RETOMAR VENTAS EN EL PUNTO DE VENTA (POS)?
   - Ruta: Menú lateral -> Punto de Venta (POS).
   - Para pausar: Con artículos agregados al ticket, haz clic en el botón "[⏸️ Pausar]" situado en la barra superior del ticket. Ingresa una nota o nombre de referencia del cliente y confirma. El ticket se limpiará para que atiendas al siguiente cliente.
   - Para retomar: Haz clic en "[⏳ En Espera (X)]" en la barra superior. Verás el listado de ventas pausadas con su hora y monto. Pulsa "Retomar Venta" en la que desees y los productos se cargarán de nuevo al ticket al instante. También puedes cancelar ventas en espera desde ese panel.

4. ¿CÓMO APLICAR EL 10% DE MORA A UN CRÉDITO VENCIDO?
   - Paso 1 (Configuración): Configuración de la Empresa -> Políticas de Crédito -> Activar interruptor "Recargo por Mora en Cuotas Vencidas" (10%).
   - Paso 2 (Aplicación en cobranza): Menú Créditos -> Cobranzas (o Ventas a Crédito) -> Haz clic en "Ver Detalles" de la venta del cliente.
   - Paso 3: En la pestaña "Plan de Cuotas", ubica la cuota cuya fecha ya venció. Verás el botón rojo destacado "Aplicar Mora +10%". Al pulsar y confirmar, el sistema suma automáticamente el 10% de recargo por demora a esa cuota y a la deuda total.

5. ¿CÓMO VENDER A CRÉDITO Y RECARGO DEL 10% / 20%?
   - Si la tienda tiene activada la política de recargo por crédito en Configuración -> Políticas de Crédito, cada vez que el cajero pulse un producto en el POS se le preguntará: "¿Cómo se vende este artículo? (Contado, Crédito +10% o Crédito +20%)".
   - Al finalizar, pulsa "Cobrar", selecciona "A Crédito", asigna el cliente registrado y define el plazo de cuotas acordado.

6. ¿CÓMO REALIZAR UN CIERRE DE CAJA (CIERRE X Y CIERRE Z)?
   - Ruta: Menú lateral -> Cajas Registradoras -> Cierre de Caja.
   - Cierre X (Parcial): Es un arqueo preventivo que muestra el balance de las operaciones del turno sin bloquear la caja.
   - Cierre Z (Definitivo Diario): Cuadra el efectivo físico en gaveta contra los puntos de venta y transferencias, emite el reporte Z oficial y cierra la sesión de la caja para el día.

7. ¿CÓMO REGISTRAR O ACTUALIZAR PRODUCTOS Y PRECIOS?
   - Ruta: Menú lateral -> Inventario -> Catálogo de Productos -> "+ Nuevo Producto".
   - Permite colocar precio de costo, precio de venta en USD (calcula automáticamente en Bs según tasa oficial BCV), código de barras / SKU y asignar existencias por almacén.

8. ¿CÓMO GESTIONAR Y CONSULTAR COMISIONES POR VENTA DE VENDEDORES?
   - Configuración de Comisión del Vendedor: Menú lateral -> Usuarios / Miembros del Negocio -> Editar Empleado (icono lápiz) -> Campo "Porcentaje de Comisión (%)" (ej: 5% o 10%). Guarda los cambios.
   - Ruta del Reporte: Menú lateral -> Reportes -> Comisiones.
   - Requisito e Impacto: Exclusivo del Plan Premium. El sistema calcula en vivo el total de ventas brutas realizadas por cada vendedor, descuenta automáticamente devoluciones si hubo notas de crédito, y calcula la comisión neta ganada en USD. También soporta comisión gerencial para supervisores de tienda.

============================================================
GUÍA DE HERRAMIENTAS ANALÍTICAS Y DE EJECUCIÓN:
============================================================
- Consultas de Ventas del período / hoy: 'consultar_resumen_ventas'
- Unidades vendidas de un producto: 'consultar_ventas_por_producto'
- Inversión, valor comercial y ganancia potencial del inventario: 'consultar_valorizacion_inventario'
- Ranking de más vendidos: 'consultar_top_productos_mas_vendidos'
- Cuentas por cobrar y lista de deudores: 'consultar_cuentas_por_cobrar_y_deudores'
- Información y stock de un artículo: 'consultar_informacion_producto'
- Gastos registrados: 'consultar_gastos_operativos'
- Últimas ventas: 'consultar_ultimas_ventas'
- Cobranzas y abonos: 'consultar_resumen_cobranza'
- Ingresos consolidados (contado vs crédito): 'consultar_ingresos_consolidados'
- Stock bajo o crítico: 'consultar_productos_stock_bajo'
- Ranking de mejores clientes: 'consultar_top_clientes'
- Compras a proveedores: 'consultar_compras_proveedores'
- Estado de cajas registradoras: 'consultar_estado_cajas'
- Cotizaciones / presupuestos: 'consultar_cotizaciones_presupuestos'
- Datos de la empresa: 'consultar_datos_empresa'
- Comisiones ganadas y a pagar a vendedores: 'consultar_comisiones_vendedores'
- Estado financiero, utilidad bruta, costos (COGS) y ganancia neta real del negocio: 'consultar_reporte_financiero'
- Resumen y valorización de depósitos físicos / almacenes: 'consultar_reporte_almacenes_depositos'
- Auditoría forense de fugas y dinero dormido: 'auditar_fugas_y_dinero_dormido'
- Cobranza por WhatsApp con enlace directo: 'generar_mensaje_cobranza_whatsapp'
- Registro de gasto por comando: 'ejecutar_crear_gasto'
- Cambio de precio de producto por comando: 'ejecutar_cambiar_precio_producto'
- ABONAR / PAGAR A CLIENTE POR COMANDO: 'ejecutar_abonar_a_cliente'
- SUGERENCIA PREDICTIVA DE COMPRAS Y REPOSICIÓN A PROVEEDORES: 'sugerir_reposicion_compras_proveedores'
- RESUMEN EJECUTIVO DE APERTURA MATUTINO: 'consultar_resumen_apertura_matutino'
- CREACIÓN RÁPIDA DE PRODUCTO POR COMANDO DE VOZ: 'ejecutar_crear_producto'
- AUDITORÍA FORENSE DE FRAUDE Y ANULACIONES DE CAJA: 'auditar_fraude_y_anulaciones_caja'
- COMBOS Y PROMOCIONES INTELIGENTES CON DINERO DORMIDO: 'generar_promociones_combos_estancados'
- REGISTRO Y EJECUCIÓN DE VENTA REAL EN POS POR COMANDO: 'ejecutar_crear_venta'`
                }
            ]
        };
    }

    private async callGeminiApi(model: string, payload: any) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        return axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        });
    }

    async chat(
        businessId: number, 
        userMessage: string, 
        history: ChatHistoryMessage[] = [],
        tzOffset: number = 240,
        clientLocalDate?: string,
        userId?: number
    ): Promise<AiChatResponse> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno del servidor.');
        }

        const cleanCmd = (userMessage || '').trim().toLowerCase();

        // =========================================================================
        // MOTOR FAST-PATH FORENSE (< 5 MS) - INSPIRADO EN LA ARQUITECTURA DE ARMANDO
        // =========================================================================

        // 1. Saludos y Bienvenida Inmediata
        if (/^(hola|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] tal|qui[eé]n eres|hey guardi[aá]n|hola guardi[aá]n)$/i.test(cleanCmd)) {
            const biz = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true }
            }).catch(() => null);

            const bizName = biz?.name || 'su empresa';
            return {
                text: `¡Hola! Soy **Guardián AI**, el copiloto operativo y analista financiero oficial de **${bizName}**.\n\nTengo conexión en tiempo real con sus puntos de venta, inventarios, cajas y cuentas por cobrar. ¿Qué consulta o acción operativa desea realizar hoy?`,
                actions: [],
                subagent: AI_SUBAGENTS.OPERATIVE_TUTOR,
                suggestedOptions: [
                    '📊 ¿Cómo me fue en ventas hoy?',
                    '💳 Cuentas por cobrar y deudores',
                    '📦 Stock bajo / agotado',
                    '💵 Consultar Tasa Oficial BCV'
                ]
            };
        }

        // 2. Consulta Ultrarrápida de Tasa Oficial BCV
        if (/(?:a\s+c[uú]anto\s+est[aá]\s+el\s+d[oó]lar|tasa\s+bcv|precio\s+del\s+d[oó]lar|tasa\s+oficial|tasa\s+del\s+d[oó]lar|cu[aá]l\s+es\s+la\s+tasa)/i.test(cleanCmd) && !/(?:debo|pagu[eé]|gasto|factura|vender)/i.test(cleanCmd)) {
            let numRate = 80.00;
            try {
                const rateRecord = await resolveBusinessExchangeRate(businessId);
                if (rateRecord && rateRecord.rate) {
                    numRate = Number(rateRecord.rate);
                }
            } catch {
                numRate = 80.00;
            }
            return {
                text: `💵 **Tasa Oficial BCV Activa en el Sistema**:\n\nActualmente la tasa oficial activa del Banco Central de Venezuela es de **${numRate.toFixed(2)} Bs./$ USD**.\n\nTodos los precios de su inventario, tickets de venta en caja y conversiones se calculan en tiempo real anclados a este valor.`,
                actions: [],
                subagent: AI_SUBAGENTS.SALES_BILLING,
                suggestedOptions: [
                    '📊 Ventas de hoy en USD y Bs',
                    '🏷️ Inversión y valor de inventario',
                    '💳 Cuentas por cobrar'
                ]
            };
        }

        // Control y limitación de cuota mensual de IA por empresa
        const usage = await this.usageService.checkAndIncrementUsage(businessId, tzOffset);
        if (!usage.allowed) {
            return {
                text: `⚠️ **Límite Mensual de Consultas Alcanzado**\n\nTu empresa ha alcanzado el límite de **${usage.monthlyLimit} consultas mensuales** asignadas con Guardián AI para este período (${usage.periodMonth}).\n\nPara ampliar tu cupo de consultas mensuales o consultar los planes superiores de Guardián, por favor comunícate con el administrador del sistema.`,
                actions: [],
                subagent: AI_SUBAGENTS.OPERATIVE_TUTOR,
                usage,
                suggestedOptions: ['Ver planes de suscripción']
            };
        }

        const todayStr = clientLocalDate || (() => {
            const local = new Date(Date.now() - (tzOffset * 60_000));
            return local.toISOString().split('T')[0];
        })();
        const systemInstruction = this.getSystemInstruction(todayStr);

        // Formatear historial existente
        const contents: any[] = [];
        for (const msg of history) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        }

        // Agregar el mensaje actual del usuario
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const toolsConfig = [
            {
                function_declarations: AI_TOOL_DECLARATIONS
            }
        ];

        // Se configura thinkingBudget: 0 para máxima velocidad y ultra-baja latencia
        const initialPayload = {
            system_instruction: systemInstruction,
            contents,
            tools: toolsConfig,
            generationConfig: {
                temperature: 0.1,
                thinkingConfig: {
                    thinkingBudget: 0
                }
            }
        };

        const collectedActions: AiChatAction[] = [];
        let candidateModel = this.primaryModel;
        let response: any = null;

        // Estrategia con reintento y fallback ante spikes de demanda
        const candidateModels = [this.primaryModel, ...this.fallbackModels.filter(m => m !== this.primaryModel)];
        let lastError: any = null;

        for (const model of candidateModels) {
            try {
                candidateModel = model;
                response = await this.callGeminiApi(model, initialPayload);
                if (response && response.status === 200) {
                    break;
                }
            } catch (err: any) {
                lastError = err;
                const status = err.response ? err.response.status : null;
                console.warn(`[Guardián AI] Falló llamada con modelo ${model} (HTTP ${status}): ${err.message}. Probando fallback...`);
            }
        }

        if (!response || !response.data?.candidates?.[0]) {
            console.error('[Guardián AI] Error final tras probar fallbacks:', lastError?.response?.data || lastError?.message);
            throw new Error('El asistente inteligente no está disponible temporalmente. Intente nuevamente en unos segundos.');
        }

        let firstCandidate = response.data.candidates[0];
        let modelParts = firstCandidate.content?.parts || [];

        // Verificar si el modelo invocó herramientas (Function Calls)
        const functionCalls = modelParts.filter((p: any) => p.functionCall);

        if (functionCalls.length > 0) {
            const toolResultsParts: any[] = [];

            for (const fc of functionCalls) {
                const toolName = fc.functionCall.name;
                const toolArgs = fc.functionCall.args || {};

                try {
                    const toolResult = await executeAiTool(toolName, toolArgs, businessId, tzOffset, userId);

                    if (toolResult.action) {
                        collectedActions.push(toolResult.action);
                    }

                    toolResultsParts.push({
                        functionResponse: {
                            name: toolName,
                            response: toolResult.data
                        }
                    });
                } catch (toolErr: any) {
                    console.error(`[Guardián AI] Error ejecutando herramienta ${toolName}:`, toolErr.message);
                    toolResultsParts.push({
                        functionResponse: {
                            name: toolName,
                            response: { error: `Error al consultar datos: ${toolErr.message}` }
                        }
                    });
                }
            }

            // Segunda llamada con los resultados de las herramientas
            const followUpContents = [
                ...contents,
                {
                    role: 'model',
                    parts: modelParts
                },
                {
                    role: 'user',
                    parts: toolResultsParts
                }
            ];

            const followUpPayload = {
                system_instruction: systemInstruction,
                contents: followUpContents,
                generationConfig: {
                    temperature: 0.1,
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                }
            };

            let secondResponse: any = null;
            for (const model of candidateModels) {
                try {
                    candidateModel = model;
                    secondResponse = await this.callGeminiApi(model, followUpPayload);
                    if (secondResponse && secondResponse.status === 200) {
                        break;
                    }
                } catch (err: any) {
                    console.warn(`[Guardián AI] Falló follow-up con modelo ${model}: ${err.message}. Probando fallback...`);
                }
            }

            const secondCandidate = secondResponse?.data?.candidates?.[0];
            const secondParts = secondCandidate?.content?.parts || [];
            
            const finalReplyText = secondParts
                .filter((p: any) => p.text)
                .map((p: any) => p.text)
                .join('\n')
                .trim();

            let fallbackText = '';
            for (const p of toolResultsParts) {
                const resp = p.functionResponse?.response;
                if (resp?.mensaje) {
                    fallbackText += (fallbackText ? '\n\n' : '') + resp.mensaje;
                } else if (resp?.error) {
                    fallbackText += (fallbackText ? '\n\n' : '') + resp.error;
                }
            }

            // Asignación de subagente según herramientas ejecutadas
            const toolNames = functionCalls.map((fc: any) => fc.functionCall.name);
            let activeSubagent = AI_SUBAGENTS.FINANCIAL_AUDITOR;
            let suggestedOptions: string[] = ['📊 Ventas de hoy', '📄 PDF de ventas', '🔍 Auditar caja'];

            if (toolNames.some((t: string) => t.includes('inventario') || t.includes('stock') || t.includes('producto') || t.includes('almacen') || t.includes('compras') || t.includes('reposicion') || t.includes('precio') || t.includes('combo'))) {
                activeSubagent = AI_SUBAGENTS.INVENTORY_SPECIALIST;
                suggestedOptions = ['📦 Productos con bajo stock', '🏷️ Inversión total de inventario', '🛒 Sugerir compras a proveedor'];
            } else if (toolNames.some((t: string) => t.includes('cobranza') || t.includes('credito') || t.includes('deudor') || t.includes('abonar') || t.includes('whatsapp') || t.includes('cliente'))) {
                activeSubagent = AI_SUBAGENTS.COLLECTIONS_MANAGER;
                suggestedOptions = ['📲 Mensaje cobranza WhatsApp', '💰 Cobranza recaudada hoy', '💳 Principales deudores'];
            } else if (toolNames.some((t: string) => t.includes('caja') || t.includes('gasto') || t.includes('fuga') || t.includes('financiero') || t.includes('ingreso') || t.includes('apertura') || t.includes('fraude'))) {
                activeSubagent = AI_SUBAGENTS.FINANCIAL_AUDITOR;
                suggestedOptions = ['🔒 Estado de cajas hoy', '💸 Registrar gasto operativo', '📉 Auditar fugas y dinero dormido'];
            } else if (toolNames.some((t: string) => t.includes('venta') || t.includes('comision') || t.includes('cotizacion') || t.includes('tasa') || t.includes('empresa') || t.includes('fiscal') || t.includes('seniat'))) {
                activeSubagent = AI_SUBAGENTS.SALES_BILLING;
                suggestedOptions = ['💵 Tasa oficial BCV', '📊 Resumen de ventas hoy', '📄 PDF de ventas'];
            }

            return {
                text: finalReplyText || fallbackText || 'Operación ejecutada exitosamente.',
                actions: collectedActions,
                modelUsed: candidateModel,
                subagent: activeSubagent,
                suggestedOptions,
                usage
            };
        }

        // Si no hubo tool call (por ejemplo, respuesta de tutorial o soporte), retornar directamente el texto generado
        const directText = modelParts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('\n')
            .trim();

        // Determinar subagente para respuesta tutorial / conversacional de software administrativo
        let convSubagent = AI_SUBAGENTS.OPERATIVE_TUTOR;
        let convOptions = ['📊 ¿Cómo me fue en ventas?', '💳 Cuentas por cobrar', '📦 Stock bajo'];

        if (/(?:inventario|stock|producto|almac[eé]n|mercanc[ií]a|precio)/i.test(cleanCmd)) {
            convSubagent = AI_SUBAGENTS.INVENTORY_SPECIALIST;
            convOptions = ['📦 Ver stock crítico', '🏷️ Valorizar inventario', '➕ Crear producto por voz'];
        } else if (/(?:cr[eé]dito|cobranza|deuda|deudor|mora|cuota|abonar)/i.test(cleanCmd)) {
            convSubagent = AI_SUBAGENTS.COLLECTIONS_MANAGER;
            convOptions = ['💳 Ver lista de deudores', '📲 Cobranza WhatsApp', '💰 Cobranzas de hoy'];
        } else if (/(?:caja|anula|fraude|fuga|gasto|dinero|financier)/i.test(cleanCmd)) {
            convSubagent = AI_SUBAGENTS.FINANCIAL_AUDITOR;
            convOptions = ['🔒 Cierre de caja ciego', '🔍 Auditar anulaciones', '💸 Registrar gasto'];
        } else if (/(?:venta|factura|ticket|pos|vender|comisi[oó]n|seniat|bcv|tasa)/i.test(cleanCmd)) {
            convSubagent = AI_SUBAGENTS.SALES_BILLING;
            convOptions = ['📊 Ventas de hoy', '💵 Tasa oficial BCV', '📄 PDF de ventas'];
        }

        return {
            text: directText || 'Disculpa, no pude procesar la solicitud.',
            actions: collectedActions,
            modelUsed: candidateModel,
            subagent: convSubagent,
            suggestedOptions: convOptions,
            usage
        };
    }
}
