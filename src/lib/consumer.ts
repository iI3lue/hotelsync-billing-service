import prisma from "./prisma.js";
import { consume, FOLIO_QUEUE } from "./broker.js";
import { billingService } from "../services/billing.service.js";

export interface BookingCreatedPayload {
  booking_id: string;
  guest_id: string;
  hotel_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  channel?: string;
}

export interface CheckoutCompletedPayload {
  booking_id: string;
  physical_room_number: string;
}

type PrismaLike = typeof prisma;

/**
 * Aplica los eventos del ciclo de estancia al folio (BL-1, BL-2):
 * - `booking.confirmed` abre el folio con el cargo de habitación.
 * - `checkout.completed` cierra el folio y emite la factura.
 * Idempotente: folio único por booking_id y cierre con retorno temprano
 * si la factura ya existe (replays del broker no duplican).
 */
export async function handleBillingEvent(
  _db: PrismaLike,
  routingKey: string,
  payload: BookingCreatedPayload & CheckoutCompletedPayload
): Promise<void> {
  // booking.created representa pending y no compromete inventario.
  if (routingKey === "booking.confirmed") {
    await billingService.openFolio(payload.booking_id);
    return;
  }

  if (routingKey === "checkout.completed") {
    await billingService.closeFolioByBooking(payload.booking_id);
    return;
  }

  console.warn(`[consumer] routing key ignorada: ${routingKey}`);
}

/**
 * Arranca el consumidor del folio: cola durable `billing.folio`
 * bindeada a `booking.confirmed` y `checkout.completed`.
 */
export async function startConsumer(): Promise<void> {
  await consume(
    FOLIO_QUEUE,
    ["booking.confirmed", "checkout.completed"],
    (routingKey, payload) => handleBillingEvent(prisma, routingKey, payload)
  );
}
