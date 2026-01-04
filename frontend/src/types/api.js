/**
 * API Types - TypeScript interfaces matching backend schemas
 */
// Role hierarchy for permission checking
export const ROLE_HIERARCHY = {
    viewer: 1,
    seller: 2,
    admin: 3,
    owner: 4,
};
// Permission check helpers
export const canManageUsers = (role) => role === 'owner';
export const canAccessAccounting = (role) => role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin : false;
export const canModifyInventory = (role) => role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin : false;
export const canCreateSales = (role) => role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.seller : false;
export const canDeleteRecords = (role) => role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin : false;
// Payment method display labels
export const PAYMENT_METHOD_LABELS = {
    cash: 'Efectivo',
    nequi: 'Nequi',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    credit: 'Crédito',
};
// Payment method to account mapping (for UI display)
export const PAYMENT_METHOD_ACCOUNTS = {
    cash: 'Caja Menor',
    nequi: 'Nequi',
    transfer: 'Banco',
    card: 'Banco',
    credit: 'Cuenta por Cobrar',
};
