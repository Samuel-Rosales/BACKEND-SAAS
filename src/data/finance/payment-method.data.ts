export const paymentMethods = [
  { name: "Caja Efectivo Bolivares (Bs)", type: "CASH", currency: "VES", isActive: true },
  { name: "Caja Efectivo Dólares (US$)", type: "CASH", currency: "USD", isActive: true },
  { name: "Zelle Banesco (U$)", type: "ZELLE", currency: "USD", isActive: true },
  { name: "Pago Móvil (Bs)", type: "MOBILE_PAYMENT", currency: "VES", isActive: true },
  { name: "Transferencia (Bs)", type: "TRANSFER", currency: "VES", isActive: true },
  { name: "Transferencia (US$)", type: "TRANSFER", currency: "USD", isActive: true },
  { name: "Punto de Venta (Bs)", type: "DEBIT_CARD", currency: "VES", isActive: true },
  { name: "Tarjeta de Crédito (Bs)", type: "CREDIT_CARD", currency: "VES", isActive: true },
  { name: "PayPal (US$)", type: "OTHER", currency: "USD", isActive: true },
  { name: "Zelle Antiguo (U$)", type: "ZELLE", currency: "USD", isActive: false }
];
