/**
 * Datos de DEMOSTRACIÓN. Todo es ficticio: personas, teléfonos (lada 222 000),
 * correos (@example.com), precios y movimientos. No representan tarifas ni
 * operación real de IBANOCHE.
 *
 * Uso: npm run db:seed   (o npm run db:reset para recrear todo)
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_DEFINITIONS } from "../src/lib/auth/permissions";
import { patientSearchText, studySearchText } from "../src/lib/utils";

const db = new PrismaClient();
const DEMO_PASSWORD = "Demo2026!";

// PRNG determinista para que la demo sea reproducible.
let seed = 20261020;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;

const DAY = 86400000;
const now = new Date();

/** Fecha local de México (UTC-6) a una hora dada, `daysFromToday` días desde hoy. */
function mxDate(daysFromToday: number, hour: number, minute = 0) {
  const base = new Date(now.getTime() - 6 * 3600000); // reloj local
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate() + daysFromToday;
  return new Date(Date.UTC(y, m, d, hour + 6, minute));
}

const FIRST = ["Ana", "Luis", "Sofía", "Carlos", "María", "Jorge", "Valeria", "Miguel", "Fernanda", "Diego", "Daniela", "Ricardo", "Paola", "Andrés", "Lucía", "Emilio", "Regina", "Héctor", "Camila", "Javier", "Ximena", "Raúl", "Natalia", "Óscar", "Mariana", "Gerardo", "Renata", "Iván", "Andrea", "Alejandro"];
const LAST = ["Torres", "Mendoza", "Ramírez", "Hernández", "López", "García", "Martínez", "Flores", "Cruz", "Morales", "Reyes", "Jiménez", "Ruiz", "Vargas", "Castillo", "Ortiz", "Romero", "Navarro", "Salazar", "Aguilar", "Domínguez", "Herrera", "Medina", "Rojas"];

const CATEGORIES = [
  ["hematologia", "Hematología"],
  ["quimica", "Química clínica"],
  ["inmunologia", "Inmunología"],
  ["microbiologia", "Microbiología"],
  ["uroanalisis", "Uroanálisis"],
  ["genetica", "Genética"],
  ["especializados", "Estudios especializados"],
  ["perfiles", "Perfiles y paquetes"],
  ["otros", "Otros"],
] as const;

// [código, nombre, categoría, sinónimos, precio demo MXN, costo demo MXN]
const STUDIES: [string, string, string, string[], number, number][] = [
  ["DEMO-BH01", "Biometría hemática", "hematologia", ["bh", "hemograma", "citometria"], 180, 62],
  ["DEMO-HE02", "Velocidad de sedimentación globular", "hematologia", ["vsg"], 120, 35],
  ["DEMO-HE03", "Tiempos de coagulación (TP y TTP)", "hematologia", ["tp", "ttp", "coagulacion"], 290, 110],
  ["DEMO-HE04", "Grupo sanguíneo y factor Rh", "hematologia", ["tipo de sangre", "rh"], 150, 40],
  ["DEMO-HE05", "Reticulocitos", "hematologia", ["reticulocitos"], 160, 55],
  ["DEMO-QS01", "Glucosa", "quimica", ["glucemia", "azucar"], 90, 22],
  ["DEMO-QS02", "Química sanguínea de 6 elementos", "quimica", ["qs6", "quimica"], 290, 95],
  ["DEMO-QS03", "Química sanguínea de 12 elementos", "quimica", ["qs12"], 450, 160],
  ["DEMO-QS04", "Colesterol total", "quimica", ["colesterol"], 110, 30],
  ["DEMO-QS05", "Triglicéridos", "quimica", ["trigliceridos"], 110, 30],
  ["DEMO-QS06", "Ácido úrico", "quimica", ["urico"], 100, 28],
  ["DEMO-QS07", "Creatinina", "quimica", ["creatinina"], 100, 28],
  ["DEMO-QS08", "Hemoglobina glucosilada (HbA1c)", "quimica", ["hba1c", "a1c"], 350, 140],
  ["DEMO-QS09", "Electrolitos séricos", "quimica", ["electrolitos", "sodio", "potasio"], 320, 120],
  ["DEMO-IN01", "Proteína C reactiva", "inmunologia", ["pcr"], 220, 80],
  ["DEMO-IN02", "Factor reumatoide", "inmunologia", ["fr"], 230, 85],
  ["DEMO-IN03", "Antiestreptolisinas O", "inmunologia", ["aslo"], 230, 85],
  ["DEMO-IN04", "Prueba inmunológica de embarazo en sangre", "inmunologia", ["embarazo", "hcg"], 260, 90],
  ["DEMO-IN05", "Panel de anticuerpos IgG/IgM", "inmunologia", ["anticuerpos"], 520, 210],
  ["DEMO-MI01", "Urocultivo", "microbiologia", ["cultivo de orina"], 380, 140],
  ["DEMO-MI02", "Exudado faríngeo", "microbiologia", ["faringeo"], 360, 130],
  ["DEMO-MI03", "Coprocultivo", "microbiologia", ["cultivo de heces"], 390, 145],
  ["DEMO-MI04", "Coproparasitoscópico seriado", "microbiologia", ["cps", "parasitos"], 260, 80],
  ["DEMO-UR01", "Examen general de orina", "uroanalisis", ["ego", "orina"], 120, 35],
  ["DEMO-UR02", "Depuración de creatinina en orina de 24 h", "uroanalisis", ["depuracion"], 340, 120],
  ["DEMO-GE01", "Panel genético de ejemplo A", "genetica", ["genetica", "adn"], 4800, 2900],
  ["DEMO-GE02", "Cariotipo", "genetica", ["cromosomas"], 3200, 1900],
  ["DEMO-GE03", "Prueba de parentesco (ejemplo)", "genetica", ["paternidad"], 5600, 3100],
  ["DEMO-ES01", "Hormona estimulante de tiroides (TSH)", "especializados", ["tsh", "tiroides"], 320, 120],
  ["DEMO-ES02", "Vitamina D (25-OH)", "especializados", ["vitamina d"], 790, 330],
  ["DEMO-ES03", "Antígeno prostático específico", "especializados", ["ape", "psa"], 420, 160],
  ["DEMO-ES04", "Ferritina", "especializados", ["ferritina"], 380, 140],
  ["DEMO-ES05", "Insulina basal", "especializados", ["insulina"], 420, 160],
  ["DEMO-PE01", "Perfil lipídico", "perfiles", ["lipidos", "colesterol"], 320, 110],
  ["DEMO-PE02", "Perfil tiroideo", "perfiles", ["t3", "t4", "tiroides"], 450, 170],
  ["DEMO-PE03", "Perfil hepático", "perfiles", ["higado", "pfh"], 420, 150],
  ["DEMO-PE04", "Perfil renal", "perfiles", ["riñon", "renal"], 390, 140],
  ["DEMO-PE05", "Paquete chequeo general", "perfiles", ["check up", "chequeo"], 890, 340],
  ["DEMO-PE06", "Perfil prenatal", "perfiles", ["embarazo", "prenatal"], 1250, 520],
  ["DEMO-PE07", "Paquete empresarial básico", "perfiles", ["empresa", "ingreso"], 650, 250],
  ["DEMO-OT01", "Toma de muestra a domicilio", "otros", ["domicilio"], 250, 90],
  ["DEMO-OT02", "Constancia administrativa de estudios", "otros", ["constancia"], 80, 10],
];

async function main() {
  console.log("→ Limpiando datos anteriores…");
  // Orden inverso de dependencias.
  await db.$transaction([
    db.message.deleteMany(),
    db.conversation.deleteMany(),
    db.invoiceRequest.deleteMany(),
    db.payment.deleteMany(),
    db.cashRegisterSession.deleteMany(),
    db.orderEvent.deleteMany(),
    db.orderItem.deleteMany(),
    db.opportunity.deleteMany(),
    db.order.deleteMany(),
    db.quoteItem.deleteMany(),
    db.quote.deleteMany(),
    db.appointmentStudy.deleteMany(),
    db.appointment.deleteMany(),
    db.patientInteraction.deleteMany(),
    db.patient.deleteMany(),
    db.agreement.deleteMany(),
    db.partner.deleteMany(),
    db.studyPrice.deleteMany(),
    db.study.deleteMany(),
    db.studyCategory.deleteMany(),
    db.promotion.deleteMany(),
    db.notification.deleteMany(),
    db.auditLog.deleteMany(),
    db.session.deleteMany(),
    db.userBranch.deleteMany(),
    db.user.deleteMany(),
    db.role.deleteMany(),
    db.branchSchedule.deleteMany(),
    db.branch.deleteMany(),
    db.apiClient.deleteMany(),
    db.idempotencyRecord.deleteMany(),
    db.systemSetting.deleteMany(),
    db.counter.deleteMany(),
  ]);

  console.log("→ Roles y sucursales…");
  const roles: Record<string, string> = {};
  for (const [key, def] of Object.entries(ROLE_DEFINITIONS)) {
    const r = await db.role.create({
      data: { key: key as keyof typeof ROLE_DEFINITIONS, name: def.name, description: def.description, permissions: def.permissions, maxDiscountBps: def.maxDiscountBps },
    });
    roles[key] = r.id;
  }

  const branchData = [
    { code: "DEMO-SUC1", name: "Sucursal Demo Centro", address: "Dirección de demostración 100, Puebla", phone: "222 000 0100" },
    { code: "DEMO-SUC2", name: "Sucursal Demo Norte", address: "Dirección de demostración 200, Puebla", phone: "222 000 0200" },
    { code: "DEMO-SUC3", name: "Sucursal Demo Sur", address: "Dirección de demostración 300, Puebla", phone: "222 000 0300" },
  ];
  const branches = [];
  for (const b of branchData) {
    const branch = await db.branch.create({ data: { ...b, isDemo: true } });
    branches.push(branch);
    for (let wd = 0; wd <= 6; wd++) {
      if (wd === 0) continue; // domingo cerrado
      await db.branchSchedule.create({
        data: {
          branchId: branch.id,
          weekday: wd,
          opensAt: "07:00",
          closesAt: wd === 6 ? "13:00" : "15:00",
          slotMinutes: 30,
          capacity: b.code === "DEMO-SUC1" ? 3 : 2,
          homeService: wd !== 6,
        },
      });
    }
  }
  const branchIds = branches.map((b) => b.id);

  console.log("→ Usuarios demo…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const userDefs = [
    { email: "admin@demo.ibanoche.mx", name: "Laura Méndez (demo)", role: "ADMIN", branches: branchIds },
    { email: "supervisor@demo.ibanoche.mx", name: "Miguel Torres (demo)", role: "SUPERVISOR", branches: branchIds },
    { email: "recepcion@demo.ibanoche.mx", name: "Ana García (demo)", role: "RECEPTION", branches: [branchIds[0]] },
    { email: "caja@demo.ibanoche.mx", name: "Luis Ramírez (demo)", role: "CASHIER", branches: [branchIds[0]] },
    { email: "comercial@demo.ibanoche.mx", name: "Sofía López (demo)", role: "SALES", branches: branchIds },
    { email: "lectura@demo.ibanoche.mx", name: "Consulta General (demo)", role: "READ_ONLY", branches: branchIds },
    { email: "recepcion.norte@demo.ibanoche.mx", name: "Paola Cruz (demo)", role: "RECEPTION", branches: [branchIds[1]] },
    { email: "recepcion.sur@demo.ibanoche.mx", name: "Diego Ortiz (demo)", role: "RECEPTION", branches: [branchIds[2]] },
  ];
  const users: Record<string, { id: string; branches: string[] }> = {};
  for (const u of userDefs) {
    const user = await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash,
        roleId: roles[u.role],
        isDemo: true,
        defaultBranchId: u.branches.length === 1 ? u.branches[0] : null,
        branches: { create: u.branches.map((branchId) => ({ branchId })) },
      },
    });
    users[u.email] = { id: user.id, branches: u.branches };
  }
  const staff = Object.values(users).map((u) => u.id);
  const salesUser = users["comercial@demo.ibanoche.mx"].id;
  const adminUser = users["admin@demo.ibanoche.mx"].id;
  const cashierUser = users["caja@demo.ibanoche.mx"].id;

  console.log("→ Catálogo demo…");
  const catIds: Record<string, string> = {};
  for (const [i, [key, name]] of CATEGORIES.entries()) {
    catIds[key] = (await db.studyCategory.create({ data: { key, name, sortOrder: i } })).id;
  }
  const studies: { id: string; code: string; name: string; price: number }[] = [];
  const priceStart = new Date(now.getTime() - 220 * DAY);
  for (const [code, name, cat, synonyms, price, cost] of STUDIES) {
    const validated = chance(0.6);
    const s = await db.study.create({
      data: {
        code,
        name,
        synonyms,
        searchText: studySearchText({ code, name, synonyms }),
        categoryId: catIds[cat],
        isDemo: true,
        active: code !== "DEMO-HE05",
        sampleType: validated ? (cat === "uroanalisis" ? "Orina" : cat === "microbiologia" ? "Según el estudio" : "Sangre") : null,
        sampleTypeValidated: validated,
        // Indicaciones y tiempos quedan pendientes de validación: no se inventan.
        instructions: null,
        instructionsApproved: false,
        turnaround: null,
        turnaroundConfirmed: false,
        prices: {
          create: [
            // Historial: tarifa anterior para mostrar el versionamiento.
            { kind: "PUBLIC", amountCents: Math.round(price * 0.92) * 100, validFrom: priceStart, validTo: new Date(now.getTime() - 60 * DAY), reason: "Tarifa demo inicial", createdById: adminUser },
            { kind: "PUBLIC", amountCents: price * 100, validFrom: new Date(now.getTime() - 60 * DAY), reason: "Actualización demo", createdById: adminUser },
            { kind: "INTERNAL_COST", amountCents: cost * 100, validFrom: priceStart, createdById: adminUser },
          ],
        },
      },
    });
    studies.push({ id: s.id, code, name, price: price * 100 });
  }
  const activeStudies = studies.filter((s) => s.code !== "DEMO-HE05");
  // Los estudios más comunes se eligen con mayor probabilidad.
  const popular = activeStudies.filter((s) => ["DEMO-BH01", "DEMO-QS02", "DEMO-UR01", "DEMO-QS01", "DEMO-PE01", "DEMO-QS08", "DEMO-PE05", "DEMO-ES01"].includes(s.code));
  const pickStudy = () => (chance(0.65) ? pick(popular) : pick(activeStudies));

  await db.promotion.createMany({
    data: [
      { name: "Promoción demo: chequeo de temporada", discountBps: 1500, active: true, validFrom: new Date(now.getTime() - 15 * DAY), validTo: new Date(now.getTime() + 30 * DAY) },
      { name: "Promoción demo: adulto mayor", discountBps: 1000, active: true },
    ],
  });

  console.log("→ Convenios demo…");
  const partnerDefs: [string, string, Prisma.PartnerCreateInput["type"], Prisma.PartnerCreateInput["status"]][] = [
    ["Clínica Demo San Ángel", "Dr. Pérez (demo)", "CLINIC", "ACTIVE"],
    ["Hospital Demo del Valle", "Lic. Martínez (demo)", "HOSPITAL", "ACTIVE"],
    ["Empresa Demo Logística", "Carlos Ruiz (demo)", "COMPANY", "NEGOTIATION"],
    ["Colegio Demo Nacional", "Mtra. Gómez (demo)", "SCHOOL", "ACTIVE"],
    ["Consultorio Demo Vida", "Dra. Salas (demo)", "DOCTOR", "ACTIVE"],
    ["Grupo Empresarial Demo", "Ing. Rojas (demo)", "COMPANY", "PROSPECT"],
    ["Instituto Demo de Salud", "Lic. Herrera (demo)", "INSTITUTION", "NEGOTIATION"],
    ["Dr. Medina — Medicina interna (demo)", "Dr. Medina (demo)", "DOCTOR", "ACTIVE"],
    ["Escuela Demo Primaria Norte", "Prof. Aguilar (demo)", "SCHOOL", "INACTIVE"],
    ["Farmacias Demo Salud", "Laura Gómez (demo)", "COMPANY", "ACTIVE"],
  ];
  const partners = [];
  for (const [i, [organization, contactName, type, status]] of partnerDefs.entries()) {
    partners.push(
      await db.partner.create({
        data: {
          organization,
          contactName,
          type,
          status,
          phone: `222 000 ${String(5100 + i).padStart(4, "0")}`,
          email: `convenio${i + 1}@example.com`,
          owner: { connect: { id: salesUser } },
          branch: { connect: { id: branchIds[i % 3] } },
          startDate: status === "ACTIVE" ? new Date(now.getTime() - int(30, 300) * DAY) : null,
          notes: "Registro ficticio de demostración.",
          isDemo: true,
          agreements:
            status === "ACTIVE"
              ? { create: { name: `Convenio demo ${i + 1}`, discountBps: pick([500, 1000, 1500]), validFrom: new Date(now.getTime() - 90 * DAY), validTo: new Date(now.getTime() + 275 * DAY), status: "ACTIVE", terms: "Condiciones ficticias de demostración." } }
              : undefined,
        },
      }),
    );
  }

  console.log("→ Pacientes demo…");
  const patients: { id: string; branchId: string; name: string; phone: string }[] = [];
  const types = ["PARTICULAR", "PARTICULAR", "PARTICULAR", "PARTICULAR", "CONVENIO", "CONVENIO", "EMPRESA", "OTRO"] as const;
  const sources = ["WALK_IN", "PHONE", "WHATSAPP", "WHATSAPP", "WEBSITE", "EMILIA", "REFERRAL"] as const;
  for (let i = 1; i <= 220; i++) {
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const secondLastName = pick(LAST);
    const branchId = i % 5 === 0 ? branchIds[2] : i % 3 === 0 ? branchIds[1] : branchIds[0];
    const type = pick(types);
    const phone = `222 000 ${String(1000 + i).padStart(4, "0")}`;
    const createdAt = new Date(now.getTime() - int(0, 200) * DAY - int(0, 600) * 60000);
    const consent = chance(0.8);
    const p = await db.patient.create({
      data: {
        folio: `PAC-${String(i).padStart(6, "0")}`,
        firstName,
        lastName,
        secondLastName,
        birthDate: new Date(Date.UTC(int(1950, 2018), int(0, 11), int(1, 28))),
        phone,
        phoneNormalized: phone.replace(/\D/g, ""),
        email: chance(0.7) ? `paciente${i}@example.com` : null,
        emailNormalized: null,
        type,
        status: chance(0.94) ? "ACTIVE" : "INACTIVE",
        source: pick(sources),
        branchId,
        partnerId: type === "CONVENIO" || type === "EMPRESA" ? pick(partners.filter((x) => x.status === "ACTIVE")).id : null,
        contactConsent: consent,
        consentAt: consent ? createdAt : null,
        prefersWhatsApp: true,
        prefersEmail: chance(0.3),
        prefersPhone: chance(0.2),
        isDemo: true,
        createdAt,
      },
    });
    await db.patient.update({
      where: { id: p.id },
      data: { emailNormalized: p.email?.toLowerCase() ?? null, searchText: patientSearchText({ ...p, emailNormalized: p.email?.toLowerCase() ?? null }) },
    });
    patients.push({ id: p.id, branchId, name: `${firstName} ${lastName}`, phone });
    if (chance(0.5)) {
      await db.patientInteraction.create({
        data: { patientId: p.id, type: pick(["CALL", "WHATSAPP", "VISIT", "NOTE"] as const), summary: pick(["Solicitó información de precios.", "Confirmó asistencia a su cita.", "Pidió la ubicación de la sucursal.", "Consultó horarios de atención.", "Solicitó factura."]), userId: pick(staff), createdAt: new Date(createdAt.getTime() + DAY) },
      });
    }
  }

  console.log("→ Cotizaciones, órdenes y pagos demo…");
  let quoteN = 0;
  let orderN = 0;
  let payN = 0;
  let apptN = 0;

  const itemsFor = () => {
    const n = int(1, 4);
    const chosen = new Map<string, (typeof studies)[number]>();
    while (chosen.size < n) {
      const s = pickStudy();
      chosen.set(s.id, s);
    }
    return [...chosen.values()].map((s) => ({ studyId: s.id, studyCode: s.code, studyName: s.name, unitPriceCents: s.price, quantity: 1, lineTotalCents: s.price }));
  };

  // Cajas cerradas: una por sucursal por día de los últimos 180 días se resumen en sesiones semanales.
  const cashSessions: Record<string, string> = {};
  for (const b of branches) {
    const s = await db.cashRegisterSession.create({
      data: { branchId: b.id, status: "OPEN", openedById: cashierUser, openedAt: mxDate(0, 7), openingCents: 150000, notes: "Caja demo del día" },
    });
    cashSessions[b.id] = s.id;
  }

  for (let day = -180; day <= 0; day++) {
    const weekday = new Date(mxDate(day, 12)).getUTCDay();
    if (weekday === 0) continue;
    // Crecimiento gradual a lo largo de los meses.
    const ordersToday = int(2, 5) + Math.floor((180 + day) / 45);
    for (let k = 0; k < ordersToday; k++) {
      const patient = pick(patients);
      const items = itemsFor();
      const subtotal = items.reduce((a, b) => a + b.lineTotalCents, 0);
      const discountBps = chance(0.2) ? pick([500, 1000, 1500]) : 0;
      const discountCents = Math.round((subtotal * discountBps) / 10000);
      const total = subtotal - discountCents;
      const createdAt = mxDate(day, int(7, 14), pick([0, 15, 30, 45]));
      const responsibleId = pick(staff);

      // ~40 % de las órdenes provienen de una cotización.
      let quoteId: string | undefined;
      if (chance(0.4)) {
        quoteN++;
        const q = await db.quote.create({
          data: {
            folio: `COT-${createdAt.getUTCFullYear()}-${String(quoteN).padStart(6, "0")}`,
            patientId: patient.id,
            branchId: patient.branchId,
            responsibleId,
            status: "ACCEPTED",
            issuedAt: new Date(createdAt.getTime() - int(1, 5) * DAY),
            validUntil: new Date(createdAt.getTime() + 10 * DAY),
            subtotalCents: subtotal,
            discountBps,
            discountCents,
            totalCents: total,
            source: pick(sources),
            isDemo: true,
            items: { create: items },
          },
        });
        quoteId = q.id;
      }

      const isToday = day === 0;
      const recent = day > -3;
      const status = isToday
        ? pick(["CONFIRMED", "PAID", "IN_PROGRESS", "DRAFT"] as const)
        : recent
          ? pick(["PAID", "IN_PROGRESS", "COMPLETED", "COMPLETED"] as const)
          : chance(0.06)
            ? "CANCELLED"
            : "COMPLETED";
      const paid = status === "CANCELLED" || status === "DRAFT" ? 0 : status === "CONFIRMED" ? (chance(0.5) ? Math.round(total * 0.5) : 0) : total;
      orderN++;
      const order = await db.order.create({
        data: {
          folio: `ORD-${createdAt.getUTCFullYear()}-${String(orderN).padStart(6, "0")}`,
          patientId: patient.id,
          branchId: patient.branchId,
          quoteId,
          status,
          paymentStatus: paid === 0 ? "UNPAID" : paid < total ? "PARTIAL" : "PAID",
          subtotalCents: subtotal,
          discountBps,
          discountCents,
          totalCents: total,
          paidCents: paid,
          responsibleId,
          isDemo: true,
          createdAt,
          items: { create: items },
          events: { create: [{ type: "created", toStatus: status, note: "Orden demo", userId: responsibleId, createdAt }] },
        },
      });
      if (paid > 0) {
        const groupId = `grp_${randomBytes(6).toString("hex")}`;
        const mixed = chance(0.12);
        const parts: { method: "CASH" | "CARD" | "TRANSFER"; amount: number }[] = mixed
          ? [
              { method: "CASH", amount: Math.round(paid / 2) },
              { method: "CARD", amount: paid - Math.round(paid / 2) },
            ]
          : [{ method: pick(["CASH", "CASH", "CARD", "CARD", "TRANSFER"] as const), amount: paid }];
        for (const part of parts) {
          payN++;
          await db.payment.create({
            data: {
              folio: `REC-${createdAt.getUTCFullYear()}-${String(payN).padStart(6, "0")}`,
              groupId,
              orderId: order.id,
              branchId: patient.branchId,
              cashSessionId: isToday ? cashSessions[patient.branchId] : null,
              method: part.method,
              kind: paid < total ? "ADVANCE" : "PAYMENT",
              amountCents: part.amount,
              idempotencyKey: `seed-${payN}`,
              receivedById: cashierUser,
              isDemo: true,
              createdAt: new Date(createdAt.getTime() + 10 * 60000),
            },
          });
        }
      }
      if (status === "COMPLETED") {
        await db.patient.update({ where: { id: patient.id }, data: { lastVisitAt: createdAt } });
      }
    }
  }

  // Cotizaciones abiertas (pendientes de respuesta).
  const openStatuses = ["DRAFT", "SENT", "SENT", "FOLLOW_UP", "FOLLOW_UP", "REJECTED", "EXPIRED"] as const;
  for (let i = 0; i < 40; i++) {
    const patient = chance(0.8) ? pick(patients) : null;
    const items = itemsFor();
    const subtotal = items.reduce((a, b) => a + b.lineTotalCents, 0);
    const issuedAt = mxDate(-int(0, 25), int(8, 17));
    const status = pick(openStatuses);
    quoteN++;
    await db.quote.create({
      data: {
        folio: `COT-${issuedAt.getUTCFullYear()}-${String(quoteN).padStart(6, "0")}`,
        patientId: patient?.id,
        prospectName: patient ? null : `${pick(FIRST)} ${pick(LAST)} (prospecto demo)`,
        prospectPhone: patient ? null : `222 000 ${int(6000, 6999)}`,
        branchId: patient?.branchId ?? pick(branchIds),
        responsibleId: pick(staff),
        status: status === "EXPIRED" ? "EXPIRED" : status,
        issuedAt,
        validUntil: status === "EXPIRED" ? new Date(issuedAt.getTime() + 7 * DAY) : new Date(now.getTime() + int(3, 15) * DAY),
        subtotalCents: subtotal,
        totalCents: subtotal,
        source: pick(sources),
        isDemo: true,
        items: { create: items },
      },
    });
  }

  console.log("→ Citas demo…");
  for (let day = -45; day <= 14; day++) {
    const base = new Date(mxDate(day, 12));
    if (base.getUTCDay() === 0) continue;
    const count = day === 0 ? 14 : int(3, 8);
    for (let k = 0; k < count; k++) {
      const patient = pick(patients);
      const hour = int(7, 13);
      const minute = pick([0, 30]);
      const startsAt = mxDate(day, hour, minute);
      const status =
        day < 0
          ? pick(["COMPLETED", "COMPLETED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const)
          : day === 0
            ? hour < 10
              ? pick(["COMPLETED", "IN_PROGRESS"] as const)
              : pick(["CONFIRMED", "CONFIRMED", "PENDING"] as const)
            : pick(["PENDING", "CONFIRMED"] as const);
      const home = chance(0.12);
      apptN++;
      // Evita duplicar paciente-horario.
      const exists = await db.appointment.findFirst({ where: { patientId: patient.id, startsAt } });
      if (exists) continue;
      const count2 = await db.appointment.count({ where: { branchId: patient.branchId, startsAt, status: { notIn: ["CANCELLED", "NO_SHOW"] } } });
      if (count2 >= 2) continue;
      await db.appointment.create({
        data: {
          folio: `CIT-${startsAt.getUTCFullYear()}-${String(apptN).padStart(6, "0")}`,
          patientId: patient.id,
          branchId: patient.branchId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 30 * 60000),
          type: home ? "HOME" : "BRANCH",
          homeAddress: home ? "Domicilio de demostración" : null,
          status,
          cancelReason: status === "CANCELLED" ? "El paciente reprogramará (demo)." : null,
          responsibleId: pick(staff),
          createdById: pick(staff),
          source: pick(sources),
          isDemo: true,
          studies: { create: [{ studyId: pickStudy().id }] },
        },
      });
    }
  }

  console.log("→ Oportunidades demo…");
  const oppDefs: [string, string, Prisma.OpportunityCreateInput["clientType"], Prisma.OpportunityCreateInput["stage"], number][] = [
    ["Chequeo anual de personal", "Empresa Demo Logística", "COMPANY", "QUOTED", 80000],
    ["Convenio de referencia", "Hospital Demo del Valle", "HOSPITAL", "FOLLOW_UP", 150000],
    ["Exámenes de ingreso escolar", "Colegio Demo Nacional", "SCHOOL", "PROSPECT", 60000],
    ["Paquete de laboratorio corporativo", "Grupo Empresarial Demo", "COMPANY", "CONTACTED", 200000],
    ["Estudios preventivos", "Instituto Demo de Salud", "INSTITUTION", "FOLLOW_UP", 120000],
    ["Referencias de pacientes", "Dr. Medina (demo)", "DOCTOR", "WON", 45000],
    ["Campaña de salud", "Farmacias Demo Salud", "COMPANY", "WON", 130000],
    ["Perfil prenatal familiar", "Valeria Hernández (demo)", "PATIENT", "QUOTED", 3750],
    ["Chequeo general", "Jorge Flores (demo)", "PATIENT", "CONTACTED", 1780],
    ["Pruebas para torneo deportivo", "Escuela Demo Primaria Norte", "SCHOOL", "LOST", 40000],
    ["Programa de bienestar", "Consultorio Demo Vida", "DOCTOR", "PROSPECT", 35000],
    ["Estudios de seguimiento", "Clínica Demo San Ángel", "CLINIC", "QUOTED", 90000],
    ["Paquete ejecutivo", "Empresa Demo Logística", "COMPANY", "PROSPECT", 70000],
    ["Perfil tiroideo trimestral", "Mariana Reyes (demo)", "PATIENT", "FOLLOW_UP", 1350],
  ];
  for (const [i, [title, prospectName, clientType, stage, pesos]] of oppDefs.entries()) {
    await db.opportunity.create({
      data: {
        title,
        prospectName,
        prospectPhone: `222 000 ${7000 + i}`,
        clientType,
        stage,
        position: i,
        estimatedCents: pesos * 100,
        owner: { connect: { id: salesUser } },
        branch: { connect: { id: branchIds[i % 3] } },
        partner: partners.find((p) => p.organization === prospectName) ? { connect: { id: partners.find((p) => p.organization === prospectName)!.id } } : undefined,
        nextFollowUpAt: stage === "WON" || stage === "LOST" ? null : mxDate(int(-2, 10), 10),
        notes: "Oportunidad ficticia de demostración.",
        lostReason: stage === "LOST" ? "Eligió otro proveedor (demo)." : null,
        closedAt: stage === "WON" || stage === "LOST" ? mxDate(-int(5, 40), 12) : null,
        stageChangedAt: mxDate(-int(0, 20), 12),
        source: pick(sources),
        isDemo: true,
      },
    });
  }

  console.log("→ Conversaciones simuladas de Emilia…");
  const convs: { name: string; status: "OPEN" | "PENDING" | "TRANSFERRED" | "CLOSED"; intent: string; msgs: [("CONTACT" | "EMILIA" | "AGENT" | "SYSTEM"), string][] }[] = [
    { name: "Ana Torres (demo)", status: "OPEN", intent: "Precio de estudios", msgs: [["CONTACT", "Hola, ¿cuánto cuesta la biometría hemática?"], ["EMILIA", "¡Hola! Soy Emilia, tu asistente virtual de IBANOCHE. En este entorno de demostración, la Biometría hemática tiene un precio público de $180.00. ¿Quieres que te prepare una cotización?"], ["CONTACT", "Sí, por favor, también glucosa."]] },
    { name: "Luis Mendoza (demo)", status: "PENDING", intent: "Agendar cita", msgs: [["CONTACT", "Quiero agendar para mañana temprano"], ["EMILIA", "Con gusto. ¿En qué sucursal te gustaría atenderte?"], ["CONTACT", "En la del centro"]] },
    { name: "Sofía Ramírez (demo)", status: "TRANSFERRED", intent: "Interpretación de resultados", msgs: [["CONTACT", "¿Me puedes decir si mis resultados salieron bien?"], ["EMILIA", "No puedo interpretar resultados clínicos. Te comunico con una persona de nuestro equipo para orientarte."], ["SYSTEM", "Conversación transferida a personal humano: solicitud de interpretación clínica."]] },
    { name: "Carlos Hernández (demo)", status: "CLOSED", intent: "Horarios", msgs: [["CONTACT", "¿A qué hora abren el sábado?"], ["EMILIA", "Los horarios mostrados son de demostración: sábados de 7:00 a 13:00."], ["CONTACT", "Gracias"]] },
    { name: "María López (demo)", status: "OPEN", intent: "Cotización para empresa", msgs: [["CONTACT", "Necesito cotizar estudios para 20 empleados"], ["EMILIA", "Puedo registrar tu solicitud para que el área comercial te contacte. ¿Me compartes el nombre de la empresa?"]] },
    { name: "Prospecto 222 000 6123 (demo)", status: "PENDING", intent: "Queja", msgs: [["CONTACT", "Tuve un problema con mi cobro"], ["EMILIA", "Lamento lo ocurrido. Este tema lo atiende nuestro personal; te transfiero en un momento."]] },
    { name: "Jorge Flores (demo)", status: "OPEN", intent: "Preparación", msgs: [["CONTACT", "¿Tengo que ir en ayunas para el perfil lipídico?"], ["EMILIA", "Las indicaciones de este estudio aún no están aprobadas en el catálogo de demostración. Te comunico con recepción para confirmarlo."]] },
    { name: "Renata Vargas (demo)", status: "CLOSED", intent: "Ubicación", msgs: [["CONTACT", "¿Dónde están?"], ["EMILIA", "Tenemos tres sucursales de demostración. ¿Cuál te queda más cerca?"]] },
  ];
  for (const [i, c] of convs.entries()) {
    const start = new Date(now.getTime() - (i * 3 + 1) * 3600000);
    const patient = patients[i * 7];
    await db.conversation.create({
      data: {
        channel: i % 3 === 0 ? "WEBSITE" : "WHATSAPP",
        contactName: c.name,
        contactPhone: `222 000 ${6100 + i}`,
        patientId: i < 5 ? patient.id : null,
        branchId: patient.branchId,
        status: c.status,
        intent: c.intent,
        assignedToId: c.status === "TRANSFERRED" ? users["recepcion@demo.ibanoche.mx"].id : null,
        handoffReason: c.status === "TRANSFERRED" ? "Solicitud de interpretación clínica" : null,
        isSimulated: true,
        lastMessageAt: new Date(start.getTime() + c.msgs.length * 60000),
        messages: { create: c.msgs.map(([sender, body], j) => ({ sender, body, createdAt: new Date(start.getTime() + j * 60000) })) },
      },
    });
  }

  console.log("→ Configuración y notificaciones…");
  await db.systemSetting.createMany({
    data: [
      { key: "general", value: { businessName: "IBANOCHE — Laboratorio de Análisis Clínicos", timezone: "America/Mexico_City", currency: "MXN", demo: true } },
      { key: "appointments", value: { minAdvanceMinutes: 60, maxDaysAhead: 60, defaultDurationMinutes: 30 } },
      { key: "quotes", value: { validityDays: 15 } },
      { key: "payments", value: { CASH: true, CARD: true, TRANSFER: true, gatewayConfigured: false } },
      { key: "notifications", value: { appointmentReminders: false, quoteFollowUp: true, dailySummary: true } },
    ],
  });
  await db.notification.createMany({
    data: [
      { title: "Cotizaciones por vencer", body: "Hay cotizaciones demo que vencen esta semana.", level: "warning", link: "/cotizaciones?status=SENT" },
      { title: "Conversación transferida", body: "Emilia transfirió una conversación a recepción.", level: "info", link: "/emilia" },
      { title: "Caja abierta", body: "La caja de la Sucursal Demo Centro está abierta.", level: "success", link: "/caja" },
    ].map((n) => ({ ...n, userId: null, branchId: branchIds[0] })),
  });

  // Contadores alineados con los folios creados.
  await db.counter.createMany({
    data: [
      { key: "PAC", value: patients.length },
      { key: `COT-${now.getUTCFullYear()}`, value: quoteN },
      { key: `ORD-${now.getUTCFullYear()}`, value: orderN },
      { key: `REC-${now.getUTCFullYear()}`, value: payN },
      { key: `CIT-${now.getUTCFullYear()}`, value: apptN },
    ],
  });

  // Llave de API de Emilia (solo se guarda el hash).
  const apiKey = process.env.EMILIA_DEMO_API_KEY || `ibn_demo_${randomBytes(24).toString("base64url")}`;
  await db.apiClient.create({
    data: {
      name: "Emilia IA (demo)",
      keyPrefix: apiKey.slice(0, 12),
      keyHash: createHash("sha256").update(apiKey).digest("hex"),
      scopes: ["studies.read", "prices.read", "quotes.create", "availability.read", "appointments.create", "leads.create", "handoff.create"],
    },
  });

  await db.auditLog.create({ data: { actorType: "SYSTEM", action: "seed.demo", entity: "System", summary: "Datos de demostración cargados" } });

  console.log("\n✓ Datos de demostración listos.");
  console.log(`  Usuarios demo: admin@demo.ibanoche.mx (y otros) · contraseña: ${DEMO_PASSWORD}`);
  console.log(`  Llave de API de Emilia (demo): ${apiKey}`);
  console.log(`  Pacientes: ${patients.length} · Órdenes: ${orderN} · Cotizaciones: ${quoteN} · Pagos: ${payN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
