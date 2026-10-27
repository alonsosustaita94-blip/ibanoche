import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Descarga de un PDF de resultados con el enlace temporal que genera Emilia
 * (acción findResults). WhatsApp descarga el archivo desde aquí para entregarlo
 * al paciente; el enlace caduca a los 30 minutos.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params;
  const result = await db.studyResult.findUnique({ where: { id } });
  if (!result || !result.downloadToken || result.downloadToken !== token || !result.tokenExpiresAt || result.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Enlace no válido o vencido." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.fileName.replace(/[^A-Za-z0-9_.-]+/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
