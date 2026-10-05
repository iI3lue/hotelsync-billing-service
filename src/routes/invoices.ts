import { Router } from "express";
import { billingController } from "../controllers/billing.controller.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { validate } from "../middleware/validate.js";
import {
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
} from "../validators/billing.js";

const router = Router();

const requireStaff = requireRole("RECEPTIONIST", "MANAGER", "SUPER_ADMIN");

router.get(
  "/",
  requireAuth,
  requireStaff,
  validate(listInvoicesQuerySchema, "query"),
  billingController.listInvoices.bind(billingController)
);
router.get(
  "/:id",
  requireAuth,
  requireStaff,
  validate(invoiceIdParamSchema, "params"),
  billingController.getInvoice.bind(billingController)
);

export default router;
