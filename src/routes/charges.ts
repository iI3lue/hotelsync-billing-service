import { Router } from "express";
import { billingController } from "../controllers/billing.controller.js";
import { validate } from "../middleware/validate.js";
import { createChargeSchema } from "../validators/billing.js";

const router = Router();

router.post(
  "/",
  validate(createChargeSchema),
  billingController.addCharge.bind(billingController)
);

export default router;
