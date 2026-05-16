// import { SalesStatsService } ... etc
import { InventoryStatsService } from '../inventory/inventory-stats.service';
import { SalesStatsService } from '../sales/sales-stats.service';
import { ClientStatsService } from '../client/client-stats.service';
import { CreditStatsService } from '../sales/credit-stats.service';
import { Request, Response } from 'express';


const inventoryStats = new InventoryStatsService();
const salesStats = new SalesStatsService();
const clientStats = new ClientStatsService();
const creditStats = new CreditStatsService();

export class DashboardController {

    getDashboardOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }
        //console.log('Business ID recibido en el controlador:', businessId);
        try {

            const [inventory, sales, clients, credit] = await Promise.all([
                inventoryStats.getDashboardKPIs(businessId),
                salesStats.getSalesDashboardMetrics(businessId, tzOffset),
                clientStats.getClientDashboardMetrics(businessId),
                creditStats.getCreditDashboardMetrics(businessId)
            ]);
            // Aquí ocurre la orquestación
            
            if (inventory.status !== 200) {
                return res.status(inventory.status).json({ error: inventory.message });
            }

            if (sales.status !== 200) {
                return res.status(sales.status).json({ error: sales.message });
            }

            if (clients.status !== 200) {
                return res.status(clients.status).json({ error: clients.message });
            }

            if (credit.status !== 200) {
                return res.status(credit.status).json({ error: credit.message });
            }

            // ... aquí llamarías también a ventas, finanzas, etc.

            res.status(200).json({
                message: 'KPIs de inventario calculados exitosamente',
                data: {
                    inventory: inventory.data,
                    sales: sales.data,
                    clients: clients.data,
                    credit: credit.data
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error interno' });
        }
    }
}