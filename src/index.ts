import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import foliosRouter from "./routes/folios.js";
import chargesRouter from "./routes/charges.js";
import invoicesRouter from "./routes/invoices.js";
import { startConsumer } from "./lib/consumer.js";
import { startOutboxDispatcher } from "./lib/outbox.js";
import prisma from "./lib/prisma.js";
import { broker } from "./lib/broker.js";

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

// Health check con dependencias (documento de arquitectura §11.3)
app.get("/health", async (_req, res) => {
  const checks: Record<string, string> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "up";
  } catch {
    checks.database = "down";
  }
  if (process.env.RABBITMQ_URL) {
    try {
      await broker.connect();
      checks.broker = "up";
    } catch {
      checks.broker = "down";
    }
  } else {
    checks.broker = "not_configured";
  }
  const degraded = Object.values(checks).includes("down");
  res.status(degraded ? 503 : 200).json({
    status: degraded ? "degraded" : "ok",
    timestamp: new Date().toISOString(),
    service: "billing-service",
    checks,
  });
});

// API routes
app.use("/v1/folios", foliosRouter);
app.use("/v1/charges", chargesRouter);
app.use("/v1/invoices", invoicesRouter);

// Error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Billing Service running on port ${PORT}`);
  });

  // Consumer del folio + dispatcher de folio.closed
  // (solo con broker configurado; sin RABBITMQ_URL el servicio opera igual).
  if (process.env.RABBITMQ_URL) {
    startConsumer().catch((err) =>
      console.error("[consumer] no se pudo iniciar", err)
    );
    startOutboxDispatcher();
    console.log("RabbitMQ consumer + outbox dispatcher started");
  }
}

export default app;
