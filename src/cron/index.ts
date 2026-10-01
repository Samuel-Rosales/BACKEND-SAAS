import cron from 'node-cron';
import { updateRateDaily } from './exchange-rate.cron'; 
import { purgeExpiredAndConvertedBudgets } from './budget.cron';

export const initCronJobs = () => {
    
    // Configuración general de zona horaria
    const timeZone = "America/Caracas";

    // Tarea 1: Tasa de Cambio (8:00 AM)
    cron.schedule('0 8 * * *', () => {
        //console.log('💵 Ejecutando actualización de tasa...');
        updateRateDaily();
    }, { timezone: timeZone });

    // Tarea 2: Purga de Presupuestos Obsoletos (3:00 AM diario)
    cron.schedule('0 3 * * *', () => {
        purgeExpiredAndConvertedBudgets();
    }, { timezone: timeZone });

    //console.log('✅ Cron Jobs Inicializados correctamente');
};