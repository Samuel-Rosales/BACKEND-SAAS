// Agregador de semillas por módulos para testing del frontend
// Puedes importar por módulo o entidades individuales

// AIM (autenticación y miembros)
import { users } from "./aim/user.data";
import { roles } from "./aim/role.data";
import { userContacts } from "./aim/contact.data";
import { businessMembers } from "./aim/business-member.data";

// Platform (negocio/tenant)
import { businessCategories } from "./platform/business-category.data";
import { businesses } from "./platform/business.data";
import { subscriptions } from "./platform/subscription.data";

// Finance (caja y tasas)
import { exchangeRates } from "./finance/exchange-rate.data";
import { paymentMethods } from "./finance/payment-method.data";
import { cashRegisters } from "./finance/cash-register.data";
import { cashCounts } from "./finance/cash-count.data";

// Inventory
import { measurementUnits } from "./inventory/measurement-unit.data";
import { categories } from "./inventory/category.data";
import { products } from "./inventory/product.data";
import { productPresentations } from "./inventory/product-presentation.data";
import { depots } from "./inventory/depot.data";
import { stockLots } from "./inventory/stock-lot.data";
import { stockMovements } from "./inventory/stock-movement.data";

// Sales
import { clients } from "./sales/client.data";
import { sales } from "./sales/sale.data";
import { saleItems } from "./sales/sale-item.data";
import { saleItemLots } from "./sales/sale-item-lot.data";
import { salePayments } from "./sales/sale-payment.data";
import { creditNotes } from "./sales/credit-note.data";
import { creditNoteItems } from "./sales/credit-note-item.data";

// Procurement
import { suppliers } from "./procurement/supplier.data";
import { purchases } from "./procurement/purchase.data";
import { purchaseItems } from "./procurement/purchase-item.data";
import { purchasePayments } from "./procurement/purchase-payment.data";

// Export agrupado por módulos (opcional)
export const seedData = {
	aim: { users, roles, userContacts, businessMembers },
	platform: { businessCategories, businesses, subscriptions },
	finance: { exchangeRates, paymentMethods, cashRegisters, cashCounts },
	inventory: {
		measurementUnits,
		categories,
		products,
		productPresentations,
		depots,
		stockLots,
		stockMovements,
	},
	sales: {
		clients,
		sales,
		saleItems,
		saleItemLots,
		salePayments,
		creditNotes,
		creditNoteItems,
	},
	procurement: {
		suppliers,
		purchases,
		purchaseItems,
		purchasePayments,
	},
};

// Named exports para importación directa por entidad
export {
	users,
	roles,
	userContacts,
	businessMembers,
	businessCategories,
	businesses,
	subscriptions,
	exchangeRates,
	paymentMethods,
	cashRegisters,
	cashCounts,
	measurementUnits,
	categories,
	products,
	productPresentations,
	depots,
	stockLots,
	stockMovements,
	clients,
	sales,
	saleItems,
	saleItemLots,
	salePayments,
	creditNotes,
	creditNoteItems,
	suppliers,
	purchases,
	purchaseItems,
	purchasePayments,
};
