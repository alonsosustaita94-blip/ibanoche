-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Study" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- Relleno inicial: minúsculas sin acentos (equivalente a normalizeText en src/lib/utils.ts).
CREATE EXTENSION IF NOT EXISTS unaccent;
UPDATE "Study" SET "searchText" = lower(unaccent("code" || ' ' || "name" || ' ' || array_to_string("synonyms", ' ')));
UPDATE "Patient" SET "searchText" = lower(unaccent(concat_ws(' ', "firstName", "lastName", "secondLastName", "folio", "phoneNormalized", "emailNormalized")));
CREATE INDEX "Study_searchText_idx" ON "Study" USING btree ("searchText");
