import { NextResponse, type NextRequest } from "next/server";

/**
 * El sitio público (/) no requiere sesión. En el CRM (/crm), sin cookie de
 * sesión se redirige al inicio de sesión. La validación real de la sesión y
 * los permisos ocurre en el servidor (layout, acciones y rutas de API).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/crm/login")) return NextResponse.next();
  if (!req.cookies.has("ibn_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/crm/login";
    url.search = pathname === "/crm" || pathname === "/crm/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/crm", "/crm/:path*"] };
