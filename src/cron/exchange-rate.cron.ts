import { ExchangeRateService } from '@/modules/finance/exchange-rate';

const exchangeService = new ExchangeRateService();

export const updateRateDaily = async () => {
    try {

        await exchangeService.syncBCVRate(); 

    } catch (error) {

        console.error('Fallo en el Cron Job BCV');
    }
};