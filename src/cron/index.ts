import cron from 'node-cron';
import { updateRateDaily } from './exchange-rate.cron'; 
import { checkSubscriptionsDaily } from './subscription.cron';

export const initCronJobs = () => {
    
    // Configuración general de zona horaria
    const timeZone = "America/Caracas";

    // Tarea 1: Tasa de Cambio (8:00 AM)
    cron.schedule('0 8 * * *', () => {
        //console.log('💵 Ejecutando actualización de tasa...');
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