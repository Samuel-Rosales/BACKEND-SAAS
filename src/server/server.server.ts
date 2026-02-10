import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { stream, connectDB } from '../configs';

import { UserRoute, RoleRoute, AuthRoute, BusinessMemberRoute, ContactRoute } from '../modules/aim';
import { BusinessCategoryRoute, SubscriptionRoute, BusinessRoute, AdminRoute } from '../modules/platform';
import { CategoryRoute, DepotRoute, ProductRoute, StockLotRoute, StockMovementRoute, MeasurementUnitRoute, ProductPresentationRoute } from '../modules/inventory';
import { ExchangeRateRoute, PaymentMethodRoute, CashRegisterRoute, CashCountRoute, TaxRoute } from '../modules/finance';
import { SupplierRoute, PurchaseRoute, PurchasePaymentRoute, PurchaseItemRoute } from '@/modules/procurement';
import { ClientRoute, SaleRoute, CreditNoteRoute } from '@/modules/sales';
import { DashboardRoute } from '@/modules/report/analytics/routes/dashboard.routes';
import { initCronJobs } from '@/cron';
export class Server {

    public app: express.Application;
    private apiPort: string;
    private apiUrl: string;
    private prefix: string;
    private paths: any;

    constructor() {
        this.app = express();
        this.apiPort = process.env.API_PORT || "3000";
        this.apiUrl = process.env.API_URL || `http://localhost:${this.apiPort}`;
        this.prefix = '/api/v1';
        this.paths = {
            users: `${this.prefix}/aim/user`,
            roles: `${this.prefix}/aim/role`,
            auth: `${this.prefix}/aim/auth`,
            businessMembers: `${this.prefix}/aim/business-member`,
            contacts: `${this.prefix}/aim/contact`,
            businessCategories: `${this.prefix}/platform/business-category`,
            subscriptions: `${this.prefix}/platform/subscription`,
            businesses: `${this.prefix}/platform/business`,
            categories: `${this.prefix}/inventory/category`,
            depots: `${this.prefix}/inventory/depot`,
            products: `${this.prefix}/inventory/product`,
            productPresentations: `${this.prefix}/inventory/product-presentation`,
            measurementUnits: `${this.prefix}/inventory/measurement-unit`,
            stockLot: `${this.prefix}/inventory/stock-lot`,
            stockMovement: `${this.prefix}/inventory/stock-movement`,
            exchangeRates: `${this.prefix}/finance/exchange-rate`,
            paymentMethods: `${this.prefix}/finance/payment-method`,
            cashRegisters: `${this.prefix}/finance/cash-register`,
            cashCounts: `${this.prefix}/finance/cash-count`,
            taxes: `${this.prefix}/finance/tax`,
            suppliers: `${this.prefix}/procurement/supplier`,
            purchases: `${this.prefix}/procurement/purchase`,
            purchasePayments: `${this.prefix}/procurement/purchase-payment`,
            purchaseItems: `${this.prefix}/procurement/purchase-item`,
            clients: `${this.prefix}/sales/client`,
            sales: `${this.prefix}/sales/sale`,
            creditNotes: `${this.prefix}/sales/credit-note`,
            reports: `${this.prefix}/report/dashboard`,
            admin: `${this.prefix}/admin`
        };

        this.dbConnection();
        this.middlewares();
        this.routes();
    }

    private middlewares() {
        this.app.use(cors({
            origin: "*",
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            credentials: true
        }));
        this.app.use(express.json());
        this.app.use(express.static("src/public"));
        this.app.use(morgan('dev', { stream }));
    }

    private routes() {
        this.app.get('/', (req, res) => {
            res.status(200).json({
                status: 'online',
                message: 'Backend SaaS is running correctly'
            });
        });

        this.app.get('/health', (req, res) => {
            res.status(200).send('OK');
        });

        this.app.use(this.paths.users, UserRoute);
        this.app.use(this.paths.roles, RoleRoute);
        this.app.use(this.paths.auth, AuthRoute);
        this.app.use(this.paths.businessMembers, BusinessMemberRoute);
        this.app.use(this.paths.contacts, ContactRoute);
        this.app.use(this.paths.businessCategories, BusinessCategoryRoute);
        this.app.use(this.paths.subscriptions, SubscriptionRoute);
        this.app.use(this.paths.businesses, BusinessRoute);
        this.app.use(this.paths.categories, CategoryRoute);
        this.app.use(this.paths.depots, DepotRoute);
        this.app.use(this.paths.products, ProductRoute);
        this.app.use(this.paths.productPresentations, ProductPresentationRoute);
        this.app.use(this.paths.measurementUnits, MeasurementUnitRoute);
        this.app.use(this.paths.stockLot, StockLotRoute);
        this.app.use(this.paths.stockMovement, StockMovementRoute);
        this.app.use(this.paths.exchangeRates, ExchangeRateRoute);
        this.app.use(this.paths.paymentMethods, PaymentMethodRoute);
        this.app.use(this.paths.cashRegisters, CashRegisterRoute);
        this.app.use(this.paths.cashCounts, CashCountRoute);
        this.app.use(this.paths.taxes, TaxRoute);
        this.app.use(this.paths.suppliers, SupplierRoute);
        this.app.use(this.paths.purchases, PurchaseRoute);
        this.app.use(this.paths.purchasePayments, PurchasePaymentRoute);
        this.app.use(this.paths.purchaseItems, PurchaseItemRoute);
        this.app.use(this.paths.clients, ClientRoute);
        this.app.use(this.paths.sales, SaleRoute);
        this.app.use(this.paths.creditNotes, CreditNoteRoute);
        this.app.use(this.paths.reports, DashboardRoute);
        this.app.use(this.paths.admin, AdminRoute);

        this.app.use((req, res) => {
            console.log(`[404 ERROR] Se intentó acceder a: ${req.originalUrl}`);
            res.status(404).json({
                error: 'Not Found',
                requestedPath: req.originalUrl,
                validPrefix: this.prefix
            });
        });
    }

    async dbConnection() {
        await connectDB();
    }

    async listen() {

        initCronJobs();

        this.app.listen(this.apiPort, () => {

            console.log(`🚀 Server running at ${this.apiUrl}`);

            // Log opcional para ver las rutas activas al iniciar

            console.log(`Endpoints disponibles en ${this.prefix}/...`);

        })
    }
}