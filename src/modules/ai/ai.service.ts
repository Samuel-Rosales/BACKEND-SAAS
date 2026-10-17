import axios from 'axios';
import { AI_TOOL_DECLARATIONS, executeAiTool } from './ai.tools';
import { ChatHistoryMessage, AiChatResponse, AiChatAction } from './ai.interface';

export class AiService {
    private apiKey: string;
    private primaryModel: string;
    private fallbackModels: string[];

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
        this.primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
        this.fallbackModels = ['gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    }

    private getSystemInstruction(todayStr: string) {
        return {
            parts: [
                {
                    text: `Eres Guardián AI, el asistente ejecutivo oficial, analista financiero y asesor operativo de esta empresa en el sistema administrativo y punto de venta Guardián.
Fecha actual del sistema: ${todayStr}.

REGLAS ESTRICTAS DE COMPORTAMIENTO Y PRIVACIDAD:
1. Tu única misión es atender consultas operativas, métricas, estadísticas, valorizaciones y generación de reportes oficiales de la empresa actual (ventas, cobranza, abonos a créditos, ingresos consolidados, productos en inventario, valorización financiera de inventario, cuentas por cobrar, deudores, gastos y datos del negocio).
2. Tienes TERMINANTEMENTE PROHIBIDO responder cualquier consulta que NO esté relacionada con la administración y operación de esta empresa (como recetas, chistes, historias, cultura general, deportes, política, tareas, programación externa u opiniones personales). Ante cualquier pregunta ajena, responde amablemente: "Solo estoy autorizado para responder consultas operativas y generar reportes sobre su empresa en Guardián."
3. CERO ALUCINACIONES: Para cualquier consulta de ventas, cobranzas, montos o inventario, DEBES llamar a la herramienta correspondiente para consultar los datos reales del sistema. Nunca adivines ni inventes cifras.
4. GENERACIÓN DE REPORTES PDF: Si el usuario te pide un reporte en PDF o te dice "déjamelo en PDF", "quiero el PDF", o "descargar reporte", invoca la herramienta 'generar_pdf_ventas' o 'generar_pdf_cobranza' según corresponda para suministrarle el documento oficial.
5. FORMATO DE RESPUESTA: Presenta la información de manera ordenada, ejecutiva y elegante, utilizando viñetas limpias y resaltando los montos en negrita en dólares ($ USD) y Bolívares (Bs) si aplica.
6. Si el usuario se refiere a "hoy", utiliza la fecha actual (${todayStr}). Si se refiere a "esta semana" o "este mes", calcula el rango correspondiente.
7. INTEGRIDAD DE DATOS (CERO INVENTOS CUANDO NO HAY MOVIMIENTO): Si una herramienta de ventas o cobranzas retorna totalSales: 0 o totalOrders: 0, debes informar con total precisión y transparencia ejecutiva: "Para el día de hoy (${todayStr}), no se registran ventas realizadas hasta el momento (Total: $0.00 USD, 0 transacciones)." NUNCA inventes ventas de fechas anteriores ni asumas montos no reportados por la herramienta.

GUÍA DE SELECCIÓN DE HERRAMIENTAS ANTE CONSULTAS OPERATIVAS Y FINANCIERAS:
- Ventas de un artículo en específico (ej: "¿cuántas neveras he vendido hoy?", "¿se vendió harina de trigo hoy?", "¿cuánto vendí de aceite este mes?"):
  -> INVOCAR: 'consultar_ventas_por_producto' con 'searchTerm' (ej: "nevera", "harina") y las fechas solicitadas.
- Inversión y valorización global del inventario (ej: "¿cuánto tengo invertido en mi negocio en precio de venta y de costo?", "¿cuál es el valor de mi inventario?", "¿cuánto capital tengo en stock?", "¿cuál es mi ganancia potencial y margen?"):
  -> INVOCAR: 'consultar_valorizacion_inventario'.
- Ranking de productos más vendidos (ej: "¿cuáles son los productos más vendidos?", "¿qué es lo que más se vende?", "top productos"):
  -> INVOCAR: 'consultar_top_productos_mas_vendidos'.
- Cuentas por cobrar y deudores (ej: "¿cuánto me deben?", "¿quiénes son los principales deudores?", "¿cuentas por cobrar?"):
  -> INVOCAR: 'consultar_cuentas_por_cobrar_y_deudores'.
- Ficha, precio o existencia de un producto específico (ej: "¿a qué precio vendo el televisor?", "¿cuánto cuesta la harina y cuánto me queda?", "¿en qué depósito está x producto?"):
  -> INVOCAR: 'consultar_informacion_producto' con 'search'.
- Gastos operativos y egresos (ej: "¿cuánto he gastado hoy?", "¿cuáles han sido los gastos de este mes?", "¿cuánto dinero salió en egresos?"):
  -> INVOCAR: 'consultar_gastos_operativos'.
- Últimas ventas realizadas (ej: "¿cuáles fueron las últimas ventas?", "¿quién compró de último?"):
  -> INVOCAR: 'consultar_ultimas_ventas'.
- Resumen global de ventas del día o período (monto total vendido, número de facturas, métodos de pago):
  -> INVOCAR: 'consultar_resumen_ventas'.
- Resumen de cobranza y abonos a créditos:
  -> INVOCAR: 'consultar_resumen_cobranza'.
- Ingresos consolidados (diferencia entre ventas de contado vs cobranzas a crédito):
  -> INVOCAR: 'consultar_ingresos_consolidados'.
- Productos con stock bajo o agotados:
  -> INVOCAR: 'consultar_productos_stock_bajo'.
- Ranking de mejores clientes (ej: "¿quién es mi cliente estrella?", "¿quién me compra más?", "top clientes"):
  -> INVOCAR: 'consultar_top_clientes'.
- Compras a proveedores y reposición (ej: "¿qué le compramos a proveedores?", "¿cuánto compramos este mes?", "¿cuánto se le debe a proveedores?"):
  -> INVOCAR: 'consultar_compras_proveedores'.
- Estado de cajas registradoras (ej: "¿están abiertas las cajas?", "¿cómo está la caja?", "¿cuánto se abrió en caja?"):
  -> INVOCAR: 'consultar_estado_cajas'.
- Presupuestos y cotizaciones (ej: "¿cuántos presupuestos tenemos activos?", "¿qué cotizaciones están pendientes?"):
  -> INVOCAR: 'consultar_cotizaciones_presupuestos'.
- Información de la empresa (RIF, nombre, teléfono, tasa BCV):
  -> INVOCAR: 'consultar_datos_empresa'.

COMPRENSIÓN TOTAL DE LENGUAJE ESPONTÁNEO Y COLOQUIAL:
El usuario puede formular sus preguntas con absoluta libertad, de manera espontánea, coloquial o ejecutiva, sin necesidad de seguir formatos predefinidos ni palabras exactas. Interpreta siempre la intención operativa/financiera de su solicitud y activa la herramienta correspondiente (o varias si la consulta abarca múltiples áreas) para responder con exactitud analítica y datos reales.`
                }
            ]
        };
    }

    private async callGeminiApi(model: string, payload: any) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        return axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 25000
        });
    }

    async chat(
        businessId: number, 
        userMessage: string, 
        history: ChatHistoryMessage[] = [],
        tzOffset: number = 240,
        clientLocalDate?: string
    ): Promise<AiChatResponse> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno del servidor.');
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
            // Guardar la respuesta del modelo con las invocaciones en la conversación
            contents.push(firstCandidate.content);

            const toolResponseParts: any[] = [];

            // Ejecutar secuencialmente cada herramienta solicitada
            for (const part of functionCalls) {
                const call = part.functionCall;
                console.log(`[Guardián AI] Ejecutando herramienta ${call.name} para negocio ${businessId} con args:`, call.args);
                
                const execResult = await executeAiTool(call.name, call.args, businessId, tzOffset);

                if (execResult.action) {
                    collectedActions.push(execResult.action);
                }

                toolResponseParts.push({
                    functionResponse: {
                        name: call.name,
                        response: {
                            output: execResult.data
                        }
                    }
                });
            }

            // Enviar los resultados de las herramientas de vuelta a Gemini para obtener la respuesta final
            contents.push({
                role: 'user',
                parts: toolResponseParts
            });

            const followUpPayload = {
                system_instruction: systemInstruction,
                contents,
                tools: toolsConfig,
                generationConfig: {
                    temperature: 0.1
                }
            };

            const secondResponse = await this.callGeminiApi(candidateModel, followUpPayload);
            const secondCandidate = secondResponse.data?.candidates?.[0];
            const secondParts = secondCandidate?.content?.parts || [];
            
            const finalReplyText = secondParts
                .filter((p: any) => p.text)
                .map((p: any) => p.text)
                .join('\n')
                .trim();

            return {
                text: finalReplyText || 'Reporte procesado exitosamente.',
                actions: collectedActions,
                modelUsed: candidateModel
            };
        }

        // Si no hubo tool call, retornar directamente el texto generado
        const directText = modelParts
            .filter((p: any) => p.text)
            .map((p: any) => p.text)
            .join('\n')
            .trim();

        return {
            text: directText || 'Disculpa, no pude procesar la solicitud.',
            actions: collectedActions,
            modelUsed: candidateModel
        };
    }
}
