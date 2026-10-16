import cron from 'node-cron';
import { updateRateDaily } from './exchange-rate.cron'; 
import { checkSubscriptionsDaily } from './subscription.cron';

export const initCronJobs = () => {
    
    // Configuración general de zona horaria
    const timeZone = "America/Caracas";

    // Tarea 1A: Tasa de Cambio Vespertina (6:00 PM y 7:00 PM - Lunes a Viernes)
    // El BCV suele publicar entre 4:30 PM y 6:00 PM. Se consulta a las 18:00 y se reintenta a las 19:00.
    cron.schedule('0 18,19 * * 1-5', () => {
        updateRateDaily();
    }, { timezone: timeZone });

    // Tarea 1B: Tasa de Cambio Matutina de Respaldo (8:00 AM - Diario)
    cron.schedule('0 8 * * *', () => {
        updateRateDaily();
    }, { timezone: timeZone });

    // Tarea 2: Desactivación Automática de Suscripciones Vencidas (00:05 AM)
    cron.schedule('5 0 * * *', () => {
        checkSubscriptionsDaily();
    }, { timezone: timeZone });

    // Verificación inicial inmediata al arrancar el servidor
    checkSubscriptionsDaily();

    //console.log('✅ Cron Jobs Inicializados correctamente');
};