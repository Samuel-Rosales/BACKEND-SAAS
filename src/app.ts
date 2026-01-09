import dotenv from 'dotenv';
dotenv.config(); 

import { Server } from './server/server.server';

const server = new Server();
server.listen();