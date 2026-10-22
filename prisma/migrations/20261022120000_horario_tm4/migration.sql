-- Horario de citas de Torres Médicas 4 (indicado por el laboratorio):
-- lunes a domingo de 07:00 a 17:00, un paciente cada 15 minutos.
-- Los días existentes conservan su servicio a domicilio; el domingo se crea sin domicilio.
INSERT INTO "BranchSchedule" ("id", "branchId", "weekday", "opensAt", "closesAt", "slotMinutes", "capacity", "homeService", "active")
SELECT 'sch_tm4_' || b."id" || '_' || d.wd, b."id", d.wd, '07:00', '17:00', 15, 1, false, true
FROM "Branch" b
CROSS JOIN generate_series(0, 6) AS d(wd)
WHERE b."code" = 'TM4'
ON CONFLICT ("branchId", "weekday") DO UPDATE
SET "opensAt" = '07:00', "closesAt" = '17:00', "slotMinutes" = 15, "capacity" = 1, "active" = true;
