import request from "supertest";
import express from "express";
import chargesRouter from "../../src/routes/charges.js";
import foliosRouter from "../../src/routes/folios.js";
import { errorHandler } from "../../src/middleware/error-handler.js";

jest.mock("../../src/lib/prisma.js", () => ({
  __esModule: true,
  default: {
    folio: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    charge: { create: jest.fn() },
    invoice: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../src/lib/booking-client.js", () => ({
  __esModule: true,
  fetchBooking: jest.fn(),
}));

jest.mock("../../src/lib/property-client.js", () => ({
  __esModule: true,
  fetchHotel: jest.fn(),
}));

jest.mock("../../src/lib/outbox.js", () => ({
  __esModule: true,
  enqueueOutboxEvent: jest.fn(),
}));

import prisma from "../../src/lib/prisma.js";
import { fetchHotel } from "../../src/lib/property-client.js";
import { enqueueOutboxEvent } from "../../src/lib/outbox.js";
import { signAccessToken } from "../helpers/tokens.js";

const mockPrisma = prisma as any;
const mockFetchHotel = fetchHotel as jest.Mock;
const mockEnqueueEvent = enqueueOutboxEvent as jest.Mock;

const HOTEL_A = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
const HOTEL_B = "b1b2c3d4-e5f6-4890-abcd-ef1234567891";
const FOLIO_ID = "f1b2c3d4-e5f6-4890-abcd-ef1234567892";
const BOOKING_ID = "c1b2c3d4-e5f6-4890-abcd-ef1234567893";
const STAFF_SUB = "d1b2c3d4-e5f6-4890-abcd-ef1234567894";

const tokenFor = (role: string, hotel_id: string | null) =>
  signAccessToken({ sub: STAFF_SUB, email: "staff@hotelsync.local", role, hotel_id });

const chargeBody = {
  folio_id: FOLIO_ID,
  concept: "Minibar",
  amount: 50,
  category: "minibar",
};

const tx = {
  charge: { create: jest.fn() },
  folio: { update: jest.fn() },
  invoice: { create: jest.fn() },
};

const app = express();
app.use(express.json());
app.use("/v1/charges", chargesRouter);
app.use("/v1/folios", foliosRouter);
app.use(errorHandler);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((cb: any) => cb(tx));
});

describe("POST /v1/charges (autorización y validación)", () => {
  it("rechaza sin token (401) y no toca la base", async () => {
    const res = await request(app).post("/v1/charges").send(chargeBody);
    expect(res.status).toBe(401);
    expect(mockPrisma.folio.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza a un GUEST (403)", async () => {
    const res = await request(app)
      .post("/v1/charges")
      .set("Authorization", `Bearer ${tokenFor("GUEST", null)}`)
      .send(chargeBody);
    expect(res.status).toBe(403);
    expect(mockPrisma.folio.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza un monto negativo con el error de validación (400)", async () => {
    const res = await request(app)
      .post("/v1/charges")
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_A)}`)
      .send({ ...chargeBody, amount: -5 });
    expect(res.status).toBe(400);
    expect(mockPrisma.folio.findUnique).not.toHaveBeenCalled();
  });

  it("devuelve 404 si el folio no existe", async () => {
    mockPrisma.folio.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/v1/charges")
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_A)}`)
      .send(chargeBody);
    expect(res.status).toBe(404);
  });

  it("devuelve 409 si el folio no está abierto", async () => {
    mockPrisma.folio.findUnique.mockResolvedValue({
      folio_id: FOLIO_ID,
      hotel_id: HOTEL_A,
      status: "closed",
      total: "100.00",
    });
    const res = await request(app)
      .post("/v1/charges")
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_A)}`)
      .send(chargeBody);
    expect(res.status).toBe(409);
    expect(tx.charge.create).not.toHaveBeenCalled();
  });

  it("rechaza a staff de otro hotel (403)", async () => {
    mockPrisma.folio.findUnique.mockResolvedValue({
      folio_id: FOLIO_ID,
      hotel_id: HOTEL_A,
      status: "open",
      total: "100.00",
    });
    const res = await request(app)
      .post("/v1/charges")
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_B)}`)
      .send(chargeBody);
    expect(res.status).toBe(403);
    expect(tx.charge.create).not.toHaveBeenCalled();
  });

  it("registra el cargo y sincroniza el total del folio (201)", async () => {
    mockPrisma.folio.findUnique.mockResolvedValue({
      folio_id: FOLIO_ID,
      hotel_id: HOTEL_A,
      status: "open",
      total: "100.00",
    });
    tx.charge.create.mockResolvedValue({ charge_id: "ch-1", ...chargeBody });
    tx.folio.update.mockResolvedValue({});

    const res = await request(app)
      .post("/v1/charges")
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_A)}`)
      .send(chargeBody);

    expect(res.status).toBe(201);
    expect(res.body.charge_id).toBe("ch-1");
    expect(tx.folio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { folio_id: FOLIO_ID },
        data: { total: 150 },
      })
    );
  });
});

describe("GET /v1/folios/by-booking/:bookingId", () => {
  beforeEach(() => {
    mockPrisma.folio.findUnique.mockResolvedValue({
      folio_id: FOLIO_ID,
      booking_id: BOOKING_ID,
      hotel_id: HOTEL_A,
      charges: [],
      invoice: null,
    });
  });

  it("devuelve 404 si el folio aún no existe", async () => {
    mockPrisma.folio.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .get(`/v1/folios/by-booking/${BOOKING_ID}`)
      .set("Authorization", `Bearer ${tokenFor("MANAGER", HOTEL_A)}`);
    expect(res.status).toBe(404);
  });

  it("rechaza a un MANAGER de otro hotel (403)", async () => {
    const res = await request(app)
      .get(`/v1/folios/by-booking/${BOOKING_ID}`)
      .set("Authorization", `Bearer ${tokenFor("MANAGER", HOTEL_B)}`);
    expect(res.status).toBe(403);
  });

  it("devuelve el folio al staff del hotel (200)", async () => {
    const res = await request(app)
      .get(`/v1/folios/by-booking/${BOOKING_ID}`)
      .set("Authorization", `Bearer ${tokenFor("MANAGER", HOTEL_A)}`);
    expect(res.status).toBe(200);
    expect(res.body.folio_id).toBe(FOLIO_ID);
  });
});

describe("POST /v1/folios/:id/close", () => {
  it("es idempotente y no re-emite la factura si el folio ya cerró", async () => {
    mockPrisma.folio.findUnique
      .mockResolvedValueOnce({ hotel_id: HOTEL_A })
      .mockResolvedValueOnce({
        folio_id: FOLIO_ID,
        booking_id: BOOKING_ID,
        hotel_id: HOTEL_A,
        guest_id: STAFF_SUB,
        currency: "COP",
        status: "closed",
        charges: [],
        invoice: { invoice_id: "inv-existing" },
      });

    const res = await request(app)
      .post(`/v1/folios/${FOLIO_ID}/close`)
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_A)}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.invoice_id).toBe("inv-existing");
    expect(tx.invoice.create).not.toHaveBeenCalled();
    expect(mockFetchHotel).not.toHaveBeenCalled();
    expect(mockEnqueueEvent).not.toHaveBeenCalled();
  });

  it("cierra el folio, emite la factura y encola folio.closed en la transacción", async () => {
    mockPrisma.folio.findUnique
      .mockResolvedValueOnce({ hotel_id: HOTEL_A })
      .mockResolvedValueOnce({
        folio_id: FOLIO_ID,
        booking_id: BOOKING_ID,
        hotel_id: HOTEL_A,
        guest_id: STAFF_SUB,
        currency: "COP",
        status: "open",
        charges: [{ amount: "100.00" }],
        invoice: null,
      });
    mockFetchHotel.mockResolvedValue({ country: "CO" });
    tx.invoice.create.mockResolvedValue({
      invoice_id: "inv-new",
      total: "119.00",
      currency: "COP",
    });
    tx.folio.update.mockResolvedValue({});

    const res = await request(app)
      .post(`/v1/folios/${FOLIO_ID}/close`)
      .set("Authorization", `Bearer ${tokenFor("RECEPTIONIST", HOTEL_A)}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.invoice_id).toBe("inv-new");
    expect(tx.folio.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "closed" } })
    );
    expect(mockEnqueueEvent).toHaveBeenCalledWith(
      tx,
      "folio.closed",
      expect.objectContaining({ invoice_id: "inv-new", booking_id: BOOKING_ID })
    );
  });
});
