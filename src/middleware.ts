import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro rápido: sin cookie de sesión se redirige al inicio de sesión.
 * La validación real de la sesión y los permisos ocurre en el servidor
 * (layout, acciones y rutas de API) contra la base de datos.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("ibn_session");
  const { pathname } = req.nextUrl;
  if (!hasSession && !pathname.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // La API de Emilia usa su propia llave; los recursos estáticos no requieren sesión.
  matcher: ["/((?!api/emilia|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
