import { Router } from "express";
import { billingController } from "../controllers/billing.controller.js";
import { validate } from "../middleware/validate.js";
import {
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
} from "../validators/billing.js";

const router = Router();

router.get(
  "/",
  validate(listInvoicesQuerySchema, "query"),
  billingController.listInvoices.bind(billingController)
);
router.get(
  "/:id",
  validate(invoiceIdParamSchema, "params"),
  billingController.getInvoice.bind(billingController)
);

export default router;
