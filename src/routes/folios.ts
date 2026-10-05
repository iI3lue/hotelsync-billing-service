import { Router } from "express";
import { billingController } from "../controllers/billing.controller.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { validate } from "../middleware/validate.js";
import {
  closeFolioSchema,
  folioBookingParamSchema,
  folioIdParamSchema,
  guestIdParamSchema,
  listFoliosQuerySchema,
} from "../validators/billing.js";

const router = Router();

const requireStaff = requireRole("RECEPTIONIST", "MANAGER", "SUPER_ADMIN");

router.get(
  "/",
  requireAuth,
  requireStaff,
  validate(listFoliosQuerySchema, "query"),
  billingController.listFolios.bind(billingController)
);
router.get(
  "/guest/:id",
  requireAuth,
  requireStaff,
  validate(guestIdParamSchema, "params"),
  billingController.listFoliosByGuest.bind(billingController)
);
router.get(
  "/by-booking/:bookingId",
  requireAuth,
  requireStaff,
  validate(folioBookingParamSchema, "params"),
  billingController.getFolioByBooking.bind(billingController)
);
router.get(
  "/:id",
  requireAuth,
  requireStaff,
  validate(folioIdParamSchema, "params"),
  billingController.getFolio.bind(billingController)
);
router.post(
  "/:id/close",
  requireAuth,
  requireStaff,
  validate(folioIdParamSchema, "params"),
  validate(closeFolioSchema),
  billingController.closeFolio.bind(billingController)
);

export default router;
