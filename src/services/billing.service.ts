import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/error-handler.js";
import { fetchBooking } from "../lib/booking-client.js";
import { fetchHotel } from "../lib/property-client.js";
import { enqueueOutboxEvent } from "../lib/outbox.js";
import { round2, taxRateForCountry } from "../lib/tax.js";
import {
  CloseFolioInput,
  CreateChargeInput,
  ListFoliosQuery,
  ListInvoicesQuery,
} from "../validators/billing.js";

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "COP";

type FolioWithCharges = {
  folio_id: string;
  booking_id: string;
  hotel_id: string;
  guest_id: string;
  currency: string;
  status: string;
  charges: Array<{ amount: number | string }>;
};

function folioSubtotal(folio: FolioWithCharges): number {
  return round2(
    folio.charges.reduce((sum, c) => sum + Number(c.amount), 0)
  );
}

export class BillingService {
  /** Folios por hotel y estado. */
  async listFolios(query: ListFoliosQuery) {
    return prisma.folio.findMany({
      where: {
        hotel_id: query.hotel_id,
        ...(query.status ? { status: query.status } : {}),
      },
      include: { charges: true },
      orderBy: { created_at: "desc" },
    });
  }

  /** Folio con cargos y factura (si está cerrado). */
  async getFolio(id: string) {
    const folio = await prisma.folio.findUnique({
      where: { folio_id: id },
      include: { charges: true, invoice: true },
    });

    if (!folio) {
      throw new AppError(404, `Folio with id ${id} not found`, "Not Found");
    }

    return folio;
  }

  /**
   * Acumula un cargo de servicio en el folio abierto (BL-1:
   * minibar, spa, restaurante, otros). Mantiene `folios.total`
   * sincronizado (documento de arquitectura §5.7).
   */
  async addCharge(
    folioId: string,
    data: Omit<CreateChargeInput, "folio_id">
  ) {
    const folio = await prisma.folio.findUnique({
      where: { folio_id: folioId },
    });

    if (!folio) {
      throw new AppError(
        404,
        `Folio with id ${folioId} not found`,
        "Not Found"
      );
    }
    if (folio.status !== "open") {
      throw new AppError(
        409,
        `Cannot add charges to folio with status ${folio.status}`,
        "Conflict"
      );
    }

    return prisma.$transaction(async (tx) => {
      const charge = await tx.charge.create({
        data: {
          folio_id: folioId,
          concept: data.concept,
          amount: data.amount,
          category: data.category ?? "other",
        },
      });

      await tx.folio.update({
        where: { folio_id: folioId },
        data: { total: round2(Number(folio.total) + data.amount) },
      });

      return charge;
    });
  }

  /**
   * Abre el folio de una reserva con el cargo inicial de habitación.
   * Idempotente por booking_id: el replay de `booking.created` devuelve
   * el folio existente sin duplicar el cargo.
   */
  async openFolio(bookingId: string) {
    const existing = await prisma.folio.findUnique({
      where: { booking_id: bookingId },
      include: { charges: true, invoice: true },
    });
    if (existing) return existing;

    const booking = await fetchBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found, requeue event`);
    }

    return prisma.folio.create({
      data: {
        booking_id: booking.booking_id,
        hotel_id: booking.hotel_id,
        guest_id: booking.guest_id,
        currency: DEFAULT_CURRENCY,
        total: Number(booking.total_amount),
        status: "open",
        charges: {
          create: {
            concept: `Estancia ${booking.check_in} → ${booking.check_out}`,
            amount: Number(booking.total_amount),
            category: "room",
          },
        },
      },
      include: { charges: true, invoice: true },
    });
  }

  /**
   * Cierra el folio y emite la factura final (BL-2, BL-3, BL-4).
   * Idempotente: si ya está cerrado devuelve la factura existente.
   * Cierre + factura + evento `folio.closed` en una sola
   * transacción (outbox transaccional, rollback conjunto).
   */
  async closeFolio(folioId: string, _data: CloseFolioInput = {}) {
    const folio = await prisma.folio.findUnique({
      where: { folio_id: folioId },
      include: { charges: true, invoice: true },
    });

    if (!folio) {
      throw new AppError(
        404,
        `Folio with id ${folioId} not found`,
        "Not Found"
      );
    }
    if (folio.invoice) return folio.invoice;

    const hotel = await fetchHotel(folio.hotel_id);
    const country = hotel?.country ?? "";
    const taxRate = taxRateForCountry(country);
    const subtotal = folioSubtotal(folio as unknown as FolioWithCharges);
    const taxAmount = round2(subtotal * taxRate);
    const total = round2(subtotal + taxAmount);

    const closed = await prisma.$transaction(async (tx) => {
      await tx.folio.update({
        where: { folio_id: folioId },
        data: { status: "closed" },
      });

      const invoice = await tx.invoice.create({
        data: {
          folio_id: folioId,
          invoice_number: `F-${folio.folio_id.slice(0, 8).toUpperCase()}`,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          currency: folio.currency,
          country,
        },
      });

      await enqueueOutboxEvent(tx, "folio.closed", {
        invoice_id: invoice.invoice_id,
        folio_id: folioId,
        booking_id: folio.booking_id,
        hotel_id: folio.hotel_id,
        guest_id: folio.guest_id,
        total: Number(invoice.total),
        currency: invoice.currency,
      });

      return invoice;
    });

    return closed;
  }

  /** Cierra el folio de una reserva por booking_id (usado por el consumer). */
  async closeFolioByBooking(bookingId: string) {
    const folio = await prisma.folio.findUnique({
      where: { booking_id: bookingId },
    });

    if (!folio) {
      // El created aún no llegó (reorden): abrir primero y luego cerrar.
      await this.openFolio(bookingId);
      const reopened = await prisma.folio.findUnique({
        where: { booking_id: bookingId },
      });
      if (!reopened) {
        throw new Error(`Folio for booking ${bookingId} could not be opened`);
      }
      return this.closeFolio(reopened.folio_id);
    }

    return this.closeFolio(folio.folio_id);
  }

  /** Folios de un huésped (documento de arquitectura §4.7). */
  async listFoliosByGuest(guestId: string) {
    return prisma.folio.findMany({
      where: { guest_id: guestId },
      include: { charges: true },
      orderBy: { created_at: "desc" },
    });
  }

  /** Facturas por hotel. */
  async listInvoices(query: ListInvoicesQuery) {
    const folios = await prisma.folio.findMany({
      where: { hotel_id: query.hotel_id },
      select: { folio_id: true },
    });
    return prisma.invoice.findMany({
      where: { folio_id: { in: folios.map((f) => f.folio_id) } },
      orderBy: { issued_at: "desc" },
    });
  }

  /** Factura con su folio y cargos. */
  async getInvoice(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { invoice_id: id },
      include: { folio: { include: { charges: true } } },
    });

    if (!invoice) {
      throw new AppError(
        404,
        `Invoice with id ${id} not found`,
        "Not Found"
      );
    }

    return invoice;
  }
}

export const billingService = new BillingService();
