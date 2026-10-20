import axios from 'axios';
import { AI_TOOL_DECLARATIONS, executeAiTool } from './ai.tools';
import { ChatHistoryMessage, AiChatResponse, AiChatAction } from './ai.interface';
import { AiUsageService, BusinessAiUsageInfo } from './ai.usage.service';

export class AiService {
    private apiKey: string;
    private primaryModel: string;
    private fallbackModels: string[];
    private usageService: AiUsageService;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        this.primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        this.fallbackModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];
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
- Unidades vendidas de un producto ("¿cuántas neveras vendí hoy?"): 'consultar_ventas_por_producto'
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
- ABONAR / PAGAR A CLIENTE POR COMANDO (ej: "abónale 20 dólares a Pedro", "Pedro pagó 50"): 'ejecutar_abonar_a_cliente'
- SUGERENCIA PREDICTIVA DE COMPRAS Y REPOSICIÓN A PROVEEDORES (ej: "sugiéreme qué comprar", "qué productos se van a agotar"): 'sugerir_reposicion_compras_proveedores'
- RESUMEN EJECUTIVO DE APERTURA MATUTINO (ej: "cómo arrancamos hoy", "resumen de apertura", "briefing del día"): 'consultar_resumen_apertura_matutino'
- CREACIÓN RÁPIDA DE PRODUCTO POR COMANDO DE VOZ (ej: "crea el producto Galletas María 100g, costo 0.60, venta 1.00, stock inicial 40"): 'ejecutar_crear_producto'
- AUDITORÍA FORENSE DE FRAUDE Y ANULACIONES DE CAJA (ej: "audita si hay ventas anuladas o sospecha de fraude en cajas"): 'auditar_fraude_y_anulaciones_caja'
- COMBOS Y PROMOCIONES INTELIGENTES CON DINERO DORMIDO (ej: "créame combos con los productos que no se venden", "combos promocionales"): 'generar_promociones_combos_estancados'
- REGISTRO Y EJECUCIÓN DE VENTA REAL EN POS POR COMANDO (ej: "vende 2 Coca Colas en efectivo", "haz una venta de 1 Harina Pan", "véndele 3 Refrescos a crédito a María López"): 'ejecutar_crear_venta'

COMANDOS POR VOZ Y ACCIONES RÁPIDAS:
1. Si el usuario te dice: "Abónale X dólares a [Cliente]" o "[Cliente] pagó X dólares", invoca 'ejecutar_abonar_a_cliente' con el nombre del cliente y el monto numérico en USD.
2. Si el usuario te dice: "Hazme un reporte de cómo me fue en ventas" o "¿Cómo me fue en ventas?", invoca 'consultar_resumen_ventas' para hoy y dale un resumen conciso, motivador y ejecutivo, y genera el PDF para que lo descargue de inmediato.
3. Si el usuario te dice: "¿Cómo arrancamos hoy?" o "Resumen de apertura", invoca 'consultar_resumen_apertura_matutino'.
4. Si el usuario te dice: "Sugiéreme qué comprar" o "Qué le compro a los proveedores", invoca 'sugerir_reposicion_compras_proveedores'.
5. Si el usuario te dice: "Crea el producto [Nombre], costo [X], venta [Y]", invoca 'ejecutar_crear_producto'.
6. Si el usuario te dice: "Vende [X]", "Véndele [X] a [Cliente]", o "Haz una venta de [X]", invoca 'ejecutar_crear_venta'. Si no especifica cliente, asume venta de contado para Consumidor Final. Si no especifica método de pago, usa Efectivo.`
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

        // Control y limitación de cuota mensual de IA por empresa
        const usage = await this.usageService.checkAndIncrementUsage(businessId, tzOffset);
        if (!usage.allowed) {
            return {
                text: `⚠️ **Límite Mensual de Consultas Alcanzado**\n\nTu empresa ha alcanzado el límite de **${usage.monthlyLimit} consultas mensuales** asignadas con Guardián AI para este período (${usage.periodMonth}).\n\nPara ampliar tu cupo de consultas mensuales o consultar los planes superiores de Guardián, por favor comunícate con el administrador del sistema.`,
                actions: [],
                usage
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

        const initialPayload = {
            system_instruction: systemInstruction,
            contents,
            tools: toolsConfig,
            generationConfig: {
                temperature: 0.1
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
                    temperature: 0.1
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

            return {
                text: finalReplyText || fallbackText || 'Operación ejecutada exitosamente.',
                actions: collectedActions,
                modelUsed: candidateModel,
                usage
            };
        }

        // Si no hubo tool call (por ejemplo, respuesta de tutorial o soporte), retornar directamente el texto generado
        const directText = modelParts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('\n')
            .trim();

        return {
            text: directText || 'Disculpa, no pude procesar la solicitud.',
            actions: collectedActions,
            modelUsed: candidateModel,
            usage
        };
    }
}
