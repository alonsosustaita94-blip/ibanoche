/**
 * Carga los datos de demostración solo si la base está vacía (primer
 * despliegue). Nunca borra datos existentes. Se omite si SEED_DEMO=false.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  if (process.env.SEED_DEMO === "false") return console.log("SEED_DEMO=false: no se cargan datos de demostración.");
  const db = new PrismaClient();
  const users = await db.user.count();
  await db.$disconnect();
  if (users > 0) return console.log(`La base ya tiene ${users} usuarios: no se cargan datos de demostración.`);
  console.log("Base vacía: cargando datos de demostración…");
  execSync("tsx prisma/seed.ts", { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
