/**
 * Normalizes payment method values from frontend format to database enum format.
 * Frontend sends "Bank Transfer" (with space) but Prisma expects "BankTransfer" (no space).
 */
export function normalizePaymentMethod(method: string | undefined): string {
  if (!method) return 'Cash';
  if (method === 'Bank Transfer') return 'BankTransfer';
  return method;
}