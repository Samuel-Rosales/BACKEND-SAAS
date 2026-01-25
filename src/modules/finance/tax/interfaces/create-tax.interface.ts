export interface CreateTaxInterface {
  name: string;
  rate: number;
  code?: string | null;
  isActive?: boolean;
}
