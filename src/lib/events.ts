/**
 * Eventos publicados por Billing (outbox transaccional + dispatcher).
 * `folio.closed` (nombre del documento de arquitectura §4.7) lo consumen
 * a futuro Loyalty/Analytics; Front Desk ya lo ignora explícitamente.
 */
export type BillingEventType = "folio.closed";

export function publishEvent(
  type: BillingEventType,
  payload: { invoice_id: string; [key: string]: unknown }
): void {
  console.log(`[events] ${type} invoice_id=${payload.invoice_id}`, payload);
}
