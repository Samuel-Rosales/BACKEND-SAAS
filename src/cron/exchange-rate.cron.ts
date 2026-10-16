import { ExchangeRateService } from '@/modules/finance/exchange-rate';

const exchangeService = new ExchangeRateService();

export const updateRateDaily = async () => {
    try {
        const rate = await exchangeService.syncBCVRate(); 
        const dateStr = rate.createdAt ? new Date(rate.createdAt).toISOString().split('T')[0] : 'N/A';
        console.log(`[CRON BCV] Sincronización exitosa. Tasa activa: ${rate.rate} Bs. (Fecha valor: ${dateStr})`);
    } catch (error: any) {
        console.error('[CRON BCV] Fallo al sincronizar tasa:', error?.message || error);
    }
};