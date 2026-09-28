import { z } from "zod";

export const CHARGE_CATEGORIES = [
  "room",
  "minibar",
  "spa",
  "restaurant",
  "other",
] as const;

export const listFoliosQuerySchema = z.object({
  hotel_id: z.string().uuid(),
  status: z.enum(["open", "closed"]).optional(),
});

export const folioIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const guestIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createChargeSchema = z.object({
  folio_id: z.string().uuid(),
  concept: z.string().min(1).max(200),
  amount: z.number().nonnegative(),
  category: z.enum(CHARGE_CATEGORIES).optional(),
});

export const closeFolioSchema = z.object({}).strict();

export const listInvoicesQuerySchema = z.object({
  hotel_id: z.string().uuid(),
});

export const invoiceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ListFoliosQuery = z.infer<typeof listFoliosQuerySchema>;
export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type CloseFolioInput = z.infer<typeof closeFolioSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
