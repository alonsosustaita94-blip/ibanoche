import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

/** Descarga de un PDF de resultados para el personal (sesión del CRM). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!user.permissions.includes("patients.view")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  const { id } = await params;
  const result = await db.studyResult.findFirst({ where: { id, patient: { branchId: { in: user.branchIds } } } });
  if (!result) return NextResponse.json({ error: "No existe." }, { status: 404 });
  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.fileName.replace(/[^A-Za-z0-9_.-]+/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
