import { folioBookingParamSchema } from "../../src/validators/billing.js";
import { BillingController } from "../../src/controllers/billing.controller.js";
import { billingService } from "../../src/services/billing.service.js";

const BOOKING_ID = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";

describe("folioBookingParamSchema", () => {
  it("should accept a valid booking UUID", () => {
    expect(
      folioBookingParamSchema.safeParse({ bookingId: BOOKING_ID }).success
    ).toBe(true);
  });

  it("should reject a non-UUID booking id", () => {
    expect(
      folioBookingParamSchema.safeParse({ bookingId: "not-a-uuid" }).success
    ).toBe(false);
  });
});

describe("BillingController.getFolioByBooking", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return the folio with charges and invoice", async () => {
    const folio = { folio_id: "f1", booking_id: BOOKING_ID, invoice: null };
    const spy = jest
      .spyOn(billingService, "getFolioByBooking")
      .mockResolvedValue(folio as never);
    const json = jest.fn();
    const next = jest.fn();
    const controller = new BillingController();

    await controller.getFolioByBooking(
      { params: { bookingId: BOOKING_ID } } as never,
      { json } as never,
      next as never
    );

    expect(spy).toHaveBeenCalledWith(BOOKING_ID);
    expect(json).toHaveBeenCalledWith(folio);
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward service errors to next", async () => {
    const err = new Error("Folio for booking x not found yet");
    jest.spyOn(billingService, "getFolioByBooking").mockRejectedValue(err);
    const json = jest.fn();
    const next = jest.fn();
    const controller = new BillingController();

    await controller.getFolioByBooking(
      { params: { bookingId: BOOKING_ID } } as never,
      { json } as never,
      next as never
    );

    expect(json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});
