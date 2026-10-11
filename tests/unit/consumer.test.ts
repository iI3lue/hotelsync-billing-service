import { handleBillingEvent } from "../../src/lib/consumer.js";
import { billingService } from "../../src/services/billing.service.js";

const BOOKING_ID = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";

describe("handleBillingEvent", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should open the folio only on booking.confirmed", async () => {
    const openSpy = jest
      .spyOn(billingService, "openFolio")
      .mockResolvedValue({ folio_id: "f1" } as any);

    await handleBillingEvent({} as any, "booking.confirmed", {
      booking_id: BOOKING_ID,
    } as any);

    expect(openSpy).toHaveBeenCalledWith(BOOKING_ID);
  });

  it("should not open a folio for a pending booking.created event", async () => {
    const openSpy = jest.spyOn(billingService, "openFolio");

    await handleBillingEvent({} as any, "booking.created", {
      booking_id: BOOKING_ID,
    } as any);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it("should close the folio on checkout.completed", async () => {
    const closeSpy = jest
      .spyOn(billingService, "closeFolioByBooking")
      .mockResolvedValue({ invoice_id: "i1" } as any);

    await handleBillingEvent({} as any, "checkout.completed", {
      booking_id: BOOKING_ID,
      physical_room_number: "101",
    } as any);

    expect(closeSpy).toHaveBeenCalledWith(BOOKING_ID);
  });

  it("should ignore unknown routing keys", async () => {
    const openSpy = jest.spyOn(billingService, "openFolio");
    const closeSpy = jest.spyOn(billingService, "closeFolioByBooking");

    await handleBillingEvent({} as any, "booking.cancelled", {
      booking_id: BOOKING_ID,
    } as any);

    expect(openSpy).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
