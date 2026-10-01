import { QuotationStatus } from '@prisma/client';

export interface CreateQuotationItemDto {
    productId: number;
    productPresentationId?: number;
    quantity: number;
    price?: number;
}

export interface CreateQuotationDto {
    clientId: number;
    items: CreateQuotationItemDto[];
    notes?: string;
    validUntil?: string | Date;
    discount?: number;
    exchangeRateId?: number;
}

export interface UpdateQuotationStatusDto {
    status: QuotationStatus;
    notes?: string;
}

export interface FindQuotationsQuery {
    page?: number;
    limit?: number;
    status?: QuotationStatus | string;
    clientId?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
}
