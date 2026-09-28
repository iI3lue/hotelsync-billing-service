-- CreateTable
CREATE TABLE "folios" (
    "folio_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'COP',
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "folios_pkey" PRIMARY KEY ("folio_id")
);

-- CreateTable
CREATE TABLE "charges" (
    "charge_id" UUID NOT NULL,
    "folio_id" UUID NOT NULL,
    "concept" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" VARCHAR(20) NOT NULL DEFAULT 'other',
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("charge_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" UUID NOT NULL,
    "folio_id" UUID NOT NULL,
    "invoice_number" VARCHAR(40) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "country" VARCHAR(10) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "event_outbox" (
    "event_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSON NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "folios_booking_id_key" ON "folios"("booking_id");

-- CreateIndex
CREATE INDEX "folios_hotel_id_status_idx" ON "folios"("hotel_id", "status");

-- CreateIndex
CREATE INDEX "folios_booking_id_idx" ON "folios"("booking_id");

-- CreateIndex
CREATE INDEX "charges_folio_id_idx" ON "charges"("folio_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_folio_id_key" ON "invoices"("folio_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_folio_id_idx" ON "invoices"("folio_id");

-- CreateIndex
CREATE INDEX "event_outbox_status_created_at_idx" ON "event_outbox"("status", "created_at");

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("folio_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("folio_id") ON DELETE CASCADE ON UPDATE CASCADE;
