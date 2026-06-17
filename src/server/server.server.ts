import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { stream, connectDB } from '../configs';

import { UserRoute, RoleRoute, AuthRoute, BusinessMemberRoute, ContactRoute, PermissionRoute } from '../modules/aim';

import { BusinessCategoryRoute, SubscriptionRoute, BusinessRoute, SubscriptionPaymentRoute, SubscriptionPaymentMethodRoute, SubscriptionPlanRoute } from '../modules/platform';

import { CategoryRoute, DepotRoute, ProductRoute, StockLotRoute, StockMovementRoute, MeasurementUnitRoute, ProductPresentationRoute } from '../modules/inventory';

import { ExchangeRateRoute, PaymentMethodRoute, CashRegisterRoute, CashCountRoute, TaxRoute } from '../modules/finance';

import { SupplierRoute, PurchaseRoute, PurchasePaymentRoute, PurchaseItemRoute } from '@/modules/procurement';

import { ClientRoute, SaleRoute, CreditNoteRoute } from '@/modules/sales';

import { TableRoute, OrderRoute } from '@/modules/restaurant';

import { DashboardRoute } from '@/modules/report/dashboard/dashboard.routes';
import { SalesReportRoute } from '@/modules/report/sales/sales-stats.route';
import { PurchaseReportRoute } from '@/modules/report/purchase/purchase-report.route';
import { InventoryReportRoute } from '@/modules/report/inventory//inventory-report.route';
import { ArticlesReportRoute } from '@/modules/report/articles/articles-report.route';
import { CashRegisterReportRoute } from '@/modules/report/cash-register/cash-register-report.route';
import { CollectionsReportRoute } from '@/modules/report/collections/collections-report.route';
import { FinancialReportRoute } from '@/modules/report/financial/financial-report.route';
import { DepositsReportRoute } from '@/modules/report/deposits/deposits-report.route';

import { AdminRoute } from '@/modules/admin';
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

            // MÓDULO AIM
            users: `${this.prefix}/aim/user`,
            roles: `${this.prefix}/aim/role`,
            permissions: `${this.prefix}/aim/permission`,
            auth: `${this.prefix}/aim/auth`,
            businessMembers: `${this.prefix}/aim/business-member`,
            contacts: `${this.prefix}/aim/contact`,

            // MÓDULO PLATFORM
            businessCategories: `${this.prefix}/platform/business-category`,
            subscriptions: `${this.prefix}/platform/subscription`,
            subscriptionPayments: `${this.prefix}/platform/subscription-payment`,
            subscriptionPaymentMethods: `${this.prefix}/platform/subscription-payment-method`,
            subscriptionPlans: `${this.prefix}/platform/subscription-plan`,
            businesses: `${this.prefix}/platform/business`,

            // MÓDULO INVENTORY
            categories: `${this.prefix}/inventory/category`,
            depots: `${this.prefix}/inventory/depot`,
            products: `${this.prefix}/inventory/product`,
            productPresentations: `${this.prefix}/inventory/product-presentation`,
            measurementUnits: `${this.prefix}/inventory/measurement-unit`,
            stockLot: `${this.prefix}/inventory/stock-lot`,
            stockMovement: `${this.prefix}/inventory/stock-movement`,

            // MÓDULO FINANCE
            exchangeRates: `${this.prefix}/finance/exchange-rate`,
            paymentMethods: `${this.prefix}/finance/payment-method`,
            cashRegisters: `${this.prefix}/finance/cash-register`,
            cashCounts: `${this.prefix}/finance/cash-count`,
            taxes: `${this.prefix}/finance/tax`,

            // MÓDULO PROCUREMENT
            suppliers: `${this.prefix}/procurement/supplier`,
            purchases: `${this.prefix}/procurement/purchase`,
            purchasePayments: `${this.prefix}/procurement/purchase-payment`,
            purchaseItems: `${this.prefix}/procurement/purchase-item`,

            // MÓDULO SALES
            clients: `${this.prefix}/sales/client`,
            sales: `${this.prefix}/sales/sale`,
            creditNotes: `${this.prefix}/sales/credit-note`,

            // MÓDULO RESTAURANT
            tables: `${this.prefix}/restaurant/table`,
            orders: `${this.prefix}/restaurant/order`,

            // MÓDULO REPORTS
            dashboardReports: `${this.prefix}/report/dashboard`,
            salesReports: `${this.prefix}/report/sales`,
            purchaseReports: `${this.prefix}/report/purchases`,
            inventoryReports: `${this.prefix}/report/inventory`,
            articleReports: `${this.prefix}/report/articles`,
            cashRegisterReports: `${this.prefix}/report/cash-register`,
            collectionsReports: `${this.prefix}/report/collections`,
            financialReports: `${this.prefix}/report/financial`,
            depositsReports: `${this.prefix}/report/deposits`,

            // MÓDULO ADMIN
            admin: `${this.prefix}/admin`,
            adminBusiness: `${this.prefix}/admin/business`,
            adminSubscriptionPayments: `${this.prefix}/admin/subscription-payments`,
            adminUsers: `${this.prefix}/admin/users`
        };

        this.dbConnection();
        this.middlewares();
        this.routes();
    }

    private middlewares() {
        // CORS: the frontend runs on a different origin (Astro dev server).
        // Avoid the invalid combination of `origin: "*"` with `credentials: true`.
        this.app.use(cors({
            origin: true, // reflect the request origin
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-business-id'],
            credentials: false,
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
        this.app.use(this.paths.permissions, PermissionRoute);
        this.app.use(this.paths.auth, AuthRoute);
        this.app.use(this.paths.businessMembers, BusinessMemberRoute);
        this.app.use(this.paths.contacts, ContactRoute);
        this.app.use(this.paths.businessCategories, BusinessCategoryRoute);
        this.app.use(this.paths.subscriptions, SubscriptionRoute);
        this.app.use(this.paths.subscriptionPayments, SubscriptionPaymentRoute);
        this.app.use(this.paths.subscriptionPaymentMethods, SubscriptionPaymentMethodRoute);
        this.app.use(this.paths.subscriptionPlans, SubscriptionPlanRoute);
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
        this.app.use(this.paths.tables, TableRoute);
        this.app.use(this.paths.orders, OrderRoute);
        this.app.use(this.paths.dashboardReports, DashboardRoute);
        this.app.use(this.paths.salesReports, SalesReportRoute);
        this.app.use(this.paths.purchaseReports, PurchaseReportRoute);
        this.app.use(this.paths.inventoryReports, InventoryReportRoute);
        this.app.use(this.paths.articleReports, ArticlesReportRoute);
        this.app.use(this.paths.cashRegisterReports, CashRegisterReportRoute);
        this.app.use(this.paths.collectionsReports, CollectionsReportRoute);
        this.app.use(this.paths.financialReports, FinancialReportRoute);
        this.app.use(this.paths.depositsReports, DepositsReportRoute);
        this.app.use(this.paths.admin, AdminRoute);

        this.app.use((req, res) => {
            //console.log(`[404 ERROR] Se intentó acceder a: ${req.originalUrl}`);
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