import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { stream, connectDB } from '../configs';

import { UserRoute } from '../modules/auth/user';

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
            users: `${this.prefix}/user`,
            products: `${this.prefix}/product`,
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