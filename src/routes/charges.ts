import { Router } from "express";
import { billingController } from "../controllers/billing.controller.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { validate } from "../middleware/validate.js";
import { createChargeSchema } from "../validators/billing.js";

const router = Router();

const requireStaff = requireRole("RECEPTIONIST", "MANAGER", "SUPER_ADMIN");

router.post(
  "/",
  requireAuth,
  requireStaff,
  validate(createChargeSchema),
  billingController.addCharge.bind(billingController)
);

export default router;
