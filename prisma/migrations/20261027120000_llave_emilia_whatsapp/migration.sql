-- Llave de API para Emilia por WhatsApp (plataforma de agentes / YCloud).
-- Solo se guarda el hash SHA-256; la llave se entregó al responsable por un canal privado.
-- Permisos: buscar estudios, consultar precios, consultar disponibilidad, registrar pacientes,
-- solicitar citas y registrar prospectos. Sin cotizaciones ni transferencia a personal.
-- Limitada a la sucursal Torres Médicas 4. Se puede revocar en Configuración → Integraciones.
INSERT INTO "ApiClient" ("id", "name", "keyPrefix", "keyHash", "scopes", "branchId", "active", "createdAt")
SELECT 'api_emilia_whatsapp', 'Emilia WhatsApp (YCloud)', 'ibn_live_ea4', '0e213a53226a2f7af2f273d371a3b59cf861d31897ba3e6f4be5142c50c46dd6',
       ARRAY['studies.read', 'prices.read', 'availability.read', 'patients.write', 'appointments.create', 'leads.create'],
       b."id", true, now()
FROM "Branch" b
WHERE b."code" = 'TM4'
ON CONFLICT ("keyHash") DO NOTHING;
