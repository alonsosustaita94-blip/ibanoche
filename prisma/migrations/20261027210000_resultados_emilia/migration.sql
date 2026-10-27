-- Resultados en PDF para entregarlos por WhatsApp (Emilia) y ajustes pedidos por el laboratorio.

-- CreateTable
CREATE TABLE "StudyResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "note" TEXT,
    "uploadedById" TEXT,
    "downloadToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyResult_downloadToken_key" ON "StudyResult"("downloadToken");

-- CreateIndex
CREATE INDEX "StudyResult_patientId_createdAt_idx" ON "StudyResult"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudyResult" ADD CONSTRAINT "StudyResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyResult" ADD CONSTRAINT "StudyResult_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Datos de Torres Médicas 4 (lista de precios 2026 del laboratorio).
UPDATE "Branch" SET "address" = 'Calle Tecamachalco 83, Torres Médicas 4, Col. La Paz, Puebla, Pue.', "updatedAt" = now()
WHERE "code" = 'TM4' AND "address" IS NULL;

-- Las citas se agendan con al menos 2 horas de anticipación (cuestionario del laboratorio).
UPDATE "SystemSetting" SET "value" = jsonb_set("value"::jsonb, '{minAdvanceMinutes}', '120'), "updatedAt" = now()
WHERE "key" = 'appointments';

-- Llave de Emilia en Zaiko (agenda, recordatorios y entrega de resultados). Solo se guarda el hash;
-- la llave completa quedó cifrada en la plataforma de agentes. Se puede revocar en Configuración → Integraciones.
INSERT INTO "ApiClient" ("id", "name", "keyPrefix", "keyHash", "scopes", "branchId", "active", "createdAt")
SELECT 'api_emilia_zaiko', 'Emilia WhatsApp (Zaiko)', 'ibn_live_Sp2', 'dfcaae08fca28f729a466a27eb9d5c157b38587dede06e5da4bf8cbd1fad8b98',
       ARRAY['studies.read', 'prices.read', 'availability.read', 'patients.write', 'appointments.create', 'appointments.read', 'results.read', 'leads.create'],
       b."id", true, now()
FROM "Branch" b
WHERE b."code" = 'TM4'
ON CONFLICT ("keyHash") DO NOTHING;
