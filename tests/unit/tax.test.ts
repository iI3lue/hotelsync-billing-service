import { taxRateForCountry, round2 } from "../../src/lib/tax.js";

describe("tax", () => {
  it("should return the configured rate per country", () => {
    expect(taxRateForCountry("CO")).toBe(0.19);
    expect(taxRateForCountry("co")).toBe(0.19);
    expect(taxRateForCountry("AR")).toBe(0.21);
  });

  it("should accept country names as stored by Property", () => {
    expect(taxRateForCountry("Argentina")).toBe(0.21);
    expect(taxRateForCountry("Colombia")).toBe(0.19);
    expect(taxRateForCountry("México")).toBe(0.16);
  });

  it("should return 0 for unknown or missing country", () => {
    expect(taxRateForCountry("XX")).toBe(0);
    expect(taxRateForCountry(undefined)).toBe(0);
  });

  it("should round to 2 decimals", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(25500)).toBe(25500);
  });
});
