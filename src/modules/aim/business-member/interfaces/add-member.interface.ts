export interface AddMemberInterface {
    email?: string;
    name: string;   // Nuevo: Necesario por si hay que crearlo
    ci: string;     // Nuevo: Necesario por si hay que crearlo y será su password
    roleId: number;
    phone?: string; // Opcional
}