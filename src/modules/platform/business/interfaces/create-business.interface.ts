export interface CreateBusinessDto {
  name: string;
  currencySymbol?: string; // Opcional, default "$"
  address: string;
  logoUrl?: string;
  // exchangeRate se inicializa en 1.0 por defecto en la BD
}