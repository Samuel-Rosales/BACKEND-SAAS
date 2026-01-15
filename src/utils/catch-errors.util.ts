// utils/custom-errors.ts o al inicio de tu sale.service.ts

export class BusinessError extends Error {
    public status: number;

    constructor(message: string, status: number = 400) {
        super(message);
        this.status = status;
        this.name = 'BusinessError';
        
        // Esto es necesario en TypeScript para que instanceof funcione bien
        Object.setPrototypeOf(this, BusinessError.prototype);
    }
}