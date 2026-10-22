/**
 * Pruebas de integración de los flujos críticos contra PostgreSQL.
 * Usan TEST_DATABASE_URL (por omisión ibanoche_crm_test) y limpian sus datos.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addDays, localDateKey, zonedDateTime } from "@/lib/dates";
import { createAppointment, getAvailability } from "@/server/services/appointments";
import { cashSessionSummary, closeCashSession, openCashSession, registerPayment, voidPayment } from "@/server/services/payments";
import { setPrice } from "@/server/services/pricing";
import { convertQuoteToOrder, createQuote } from "@/server/services/quotes";
import { changeOrderStatus } from "@/server/services/orders";
import { findOrCreatePatientForEmilia } from "@/server/services/patients";

let branchId = "";
let userId = "";
let patientIds: string[] = [];
let studyA = "";
let studyB = "";

async function wipe() {
  await db.$executeRawUnsafe(`TRUNCATE "Message","Conversation","InvoiceRequest","Payment","CashRegisterSession","OrderEvent","OrderItem","Opportunity","Order","QuoteItem","Quote","AppointmentStudy","Appointment","PatientInteraction","Patient","Agreement","Partner","StudyPrice","Study","StudyCategory","Promotion","Notification","AuditLog","Session","UserBranch","User","Role","BranchSchedule","Branch","ApiClient","IdempotencyRecord","SystemSetting","Counter" CASCADE`);
}

/** Próximo día hábil (lunes a viernes) al menos 2 días adelante, en hora local. */
function nextWeekday() {
  let d = addDays(localDateKey(new Date()), 2);
  while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())) d = addDays(d, 1);
  return d;
}

beforeAll(async () => {
  await wipe();
  const role = await db.role.create({ data: { key: "ADMIN", name: "Admin", permissions: [], maxDiscountBps: 1000 } });
  const branch = await db.branch.create({ data: { code: "T1", name: "Sucursal prueba" } });
  branchId = branch.id;
  for (let wd = 1; wd <= 5; wd++) await db.branchSchedule.create({ data: { branchId, weekday: wd, opensAt: "08:00", closesAt: "10:00", slotMinutes: 30, capacity: 2 } });
  userId = (await db.user.create({ data: { email: "t@example.com", name: "Tester", passwordHash: "x", roleId: role.id } })).id;
  const cat = await db.studyCategory.create({ data: { key: "c", name: "Cat" } });
  studyA = (await db.study.create({ data: { code: "TA", name: "Estudio A", categoryId: cat.id } })).id;
  studyB = (await db.study.create({ data: { code: "TB", name: "Estudio B", categoryId: cat.id } })).id;
  await setPrice(studyA, "PUBLIC", 18000, userId);
  await setPrice(studyB, "PUBLIC", 29000, userId);
  patientIds = [];
  for (let i = 0; i < 4; i++) {
    const p = await db.patient.create({ data: { folio: `PAC-T${i}`, firstName: `P${i}`, lastName: "Prueba", branchId, phone: `22200000${i}0` } });
    patientIds.push(p.id);
  }
});

afterAll(async () => {
  await wipe();
  await db.$disconnect();
});

describe("agenda", () => {
  it("no permite sobrecupo aunque las reservas lleguen al mismo tiempo", async () => {
    const day = nextWeekday();
    const startsAt = zonedDateTime(day, "08:30");
    const results = await Promise.allSettled(
      patientIds.map((patientId) => createAppointment({ patientId, branchId, startsAt, type: "BRANCH", studyIds: [studyA] }, userId)),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(2); // capacidad configurada = 2
    expect(await db.appointment.count({ where: { branchId, startsAt } })).toBe(2);
    const availability = await getAvailability(branchId, day);
    const slot = availability.slots.find((s) => s.time === "08:30")!;
    expect(slot.available).toBe(false);
  });

  it("rechaza doble reserva del mismo paciente y horarios fuera del horario", async () => {
    const day = nextWeekday();
    const startsAt = zonedDateTime(day, "09:00");
    await createAppointment({ patientId: patientIds[0], branchId, startsAt, type: "BRANCH", studyIds: [] }, userId);
    await expect(createAppointment({ patientId: patientIds[0], branchId, startsAt, type: "BRANCH", studyIds: [] }, userId)).rejects.toThrow(/ya tiene una cita/);
    await expect(createAppointment({ patientId: patientIds[1], branchId, startsAt: zonedDateTime(day, "11:00"), type: "BRANCH", studyIds: [] }, userId)).rejects.toThrow(/horario/);
    await expect(createAppointment({ patientId: patientIds[1], branchId, startsAt: zonedDateTime(day, "08:15"), type: "BRANCH", studyIds: [] }, userId)).rejects.toThrow(/horario/);
  });
});

describe("cotizaciones y órdenes", () => {
  it("conserva los precios de la cotización aunque cambie la tarifa", async () => {
    const quote = await createQuote({ patientId: patientIds[0], branchId, items: [{ studyId: studyA, quantity: 1 }, { studyId: studyB, quantity: 2 }], discountBps: 1000 }, { userId, roleMaxBps: 1000 });
    expect(quote.subtotalCents).toBe(18000 + 2 * 29000);
    expect(quote.totalCents).toBe(Math.round((18000 + 58000) * 0.9));
    await setPrice(studyA, "PUBLIC", 25000, userId, "Aumento");
    const { order } = await convertQuoteToOrder(quote.id, userId);
    const items = await db.orderItem.findMany({ where: { orderId: order.id } });
    expect(items.find((i) => i.studyId === studyA)!.unitPriceCents).toBe(18000);
    expect(order.totalCents).toBe(quote.totalCents);
    // Idempotente: convertir de nuevo devuelve la misma orden.
    const again = await convertQuoteToOrder(quote.id, userId);
    expect(again.created).toBe(false);
    expect(again.order.id).toBe(order.id);
  });

  it("rechaza descuentos mayores al autorizado", async () => {
    await expect(
      createQuote({ patientId: patientIds[1], branchId, items: [{ studyId: studyA, quantity: 1 }], discountBps: 1500 }, { userId, roleMaxBps: 1000 }),
    ).rejects.toThrow(/máximo autorizado/);
  });

  it("solo hay una tarifa vigente por estudio", async () => {
    expect(await db.studyPrice.count({ where: { studyId: studyA, kind: "PUBLIC", validTo: null } })).toBe(1);
    expect(await db.studyPrice.count({ where: { studyId: studyA, kind: "PUBLIC" } })).toBe(2);
  });
});

describe("caja", () => {
  it("cobra sin duplicar, evita sobrepagos y cuadra el corte", async () => {
    const quote = await createQuote({ patientId: patientIds[2], branchId, items: [{ studyId: studyB, quantity: 1 }], discountBps: 0 }, { userId, roleMaxBps: 0 });
    const { order } = await convertQuoteToOrder(quote.id, userId);

    await expect(registerPayment({ orderId: order.id, parts: [{ method: "CASH", amountCents: 1000 }], idempotencyKey: "nocaja00001", userId, allowedBranchIds: [branchId] })).rejects.toThrow(/Abre la caja/);
    const session = await openCashSession(branchId, 50000, userId);
    await expect(openCashSession(branchId, 0, userId)).rejects.toThrow(/Ya hay una caja abierta/);

    // Doble envío simultáneo con la misma llave: un solo cobro.
    const key = "idem-test-0001";
    const parts = [
      { method: "CASH" as const, amountCents: 10000 },
      { method: "CARD" as const, amountCents: 5000 },
    ];
    const [r1, r2] = await Promise.all([
      registerPayment({ orderId: order.id, parts, idempotencyKey: key, userId, allowedBranchIds: [branchId] }),
      registerPayment({ orderId: order.id, parts, idempotencyKey: key, userId, allowedBranchIds: [branchId] }),
    ]);
    expect(r1.groupId).toBe(r2.groupId);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(2);
    let o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.paidCents).toBe(15000);
    expect(o.paymentStatus).toBe("PARTIAL");

    await expect(registerPayment({ orderId: order.id, parts: [{ method: "CASH", amountCents: 20000 }], idempotencyKey: "over-0000001", userId, allowedBranchIds: [branchId] })).rejects.toThrow(/supera el saldo/);
    await expect(registerPayment({ orderId: order.id, parts: [{ method: "CASH", amountCents: 1000 }], idempotencyKey: "branch-000001", userId, allowedBranchIds: [] })).rejects.toThrow(/sucursal/);

    await registerPayment({ orderId: order.id, parts: [{ method: "TRANSFER", amountCents: 14000 }], idempotencyKey: "rest-0000001", userId, allowedBranchIds: [branchId] });
    o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.paymentStatus).toBe("PAID");
    expect(o.status).toBe("PAID");

    await expect(changeOrderStatus(order.id, "CANCELLED", userId, "x")).rejects.toThrow(/no está permitido/);

    // Anular un cobro regresa la orden a confirmada con saldo.
    const transfer = await db.payment.findFirstOrThrow({ where: { orderId: order.id, method: "TRANSFER" } });
    await voidPayment(transfer.id, userId, "Prueba");
    o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.paidCents).toBe(15000);
    expect(o.status).toBe("CONFIRMED");

    const summary = await cashSessionSummary(session.id);
    expect(summary.byMethod).toEqual({ CASH: 10000, CARD: 5000, TRANSFER: 0 });
    expect(summary.expectedCashCents).toBe(60000);
    const { closed } = await closeCashSession(session.id, 59500, userId);
    expect(closed.differenceCents).toBe(-500);
    await expect(closeCashSession(session.id, 0, userId)).rejects.toThrow(/ya está cerrada/);
  });
});

describe("pacientes de Emilia", () => {
  it("reutiliza la ficha con el mismo teléfono y nombre, y separa a otra persona con el mismo teléfono", async () => {
    const base = { firstName: "Lucía", lastName: "Hernández", phone: "+52 1 222 555 0101", branchId };
    const a = await findOrCreatePatientForEmilia(base);
    expect(a.created).toBe(true);
    expect(a.patient.source).toBe("EMILIA");
    expect(a.patient.phoneNormalized).toBe("2225550101");
    expect(a.patient.contactConsent).toBe(false);

    const again = await findOrCreatePatientForEmilia({ ...base, firstName: "lucía", phone: "2225550101" });
    expect(again.created).toBe(false);
    expect(again.patient.id).toBe(a.patient.id);

    const child = await findOrCreatePatientForEmilia({ ...base, firstName: "Mateo" });
    expect(child.created).toBe(true);
    expect(child.patient.id).not.toBe(a.patient.id);
  });
});
