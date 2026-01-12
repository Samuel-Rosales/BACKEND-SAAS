import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { stream, connectDB } from '../configs';

import { UserRoute, RoleRoute, AuthRoute, BusinessMemberRoute, ContactRoute } from '../modules/aim';
import { BusinessCategoryRoute, SubscriptionRoute, BusinessRoute } from '../modules/platform';
import { CategoryRoute, DepotRoute, ProductRoute, StockLotRoute, StockMovementRoute } from '../modules/inventory';
import { ExchangeRateRoute, PaymentMethodRoute, CashRegisterRoute, CashCountRoute } from '../modules/finance';
import { SupplierRoute } from '@/modules/procurement';

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
            stockLot: `${this.prefix}/inventory/stock-lot`,
            stockMovement: `${this.prefix}/inventory/stock-movement`,
            exchangeRates: `${this.prefix}/finance/exchange-rate`,
            paymentMethods: `${this.prefix}/finance/payment-method`,
            cashRegisters: `${this.prefix}/finance/cash-register`,
            cashCounts: `${this.prefix}/finance/cash-count`,
            suppliers: `${this.prefix}/procurement/supplier`,
        };

        this.dbConnection();
        this.middlewares();
        this.routes();
    }

    private middlewares() {
        this.app.use(cors({
            origin: "*",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        }));
        this.app.use(express.json());
        this.app.use(express.static("src/public"));
        this.app.use(morgan('dev', { stream }));
    }

    private routes() {
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
        this.app.use(this.paths.stockLot, StockLotRoute);
        this.app.use(this.paths.stockMovement, StockMovementRoute);
        this.app.use(this.paths.exchangeRates, ExchangeRateRoute);
        this.app.use(this.paths.paymentMethods, PaymentMethodRoute);
        this.app.use(this.paths.cashRegisters, CashRegisterRoute);
        this.app.use(this.paths.cashCounts, CashCountRoute);
        this.app.use(this.paths.suppliers, SupplierRoute);
    }

    async dbConnection() {
        await connectDB();
    }
    
    async listen() {
        this.app.listen(this.apiPort, () => {
        console.log(`🚀 Server running at ${this.apiUrl}`);
        // Log opcional para ver las rutas activas al iniciar
        console.log(`Endpoints disponibles en ${this.prefix}/...`);
        })
    }
}