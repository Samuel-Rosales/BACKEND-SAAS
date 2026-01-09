import winston from 'winston';

// Definimos la configuración de Winston
const logger = winston.createLogger({
  transports: [
    // 1. Mostrar logs por consola con colores
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // 2. Guardar logs en un archivo (se creará la carpeta /logs automáticamente)
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Creamos el stream para Morgan
export const stream = {
  write: (message: string) => logger.info(message.trim()),
};

export default logger;