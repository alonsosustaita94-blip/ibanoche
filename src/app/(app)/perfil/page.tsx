import type { Metadata } from "next";
import { Building2, Mail, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/dates";
import { bpsToPercent } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requirePage();
  const [record, branches, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { lastLoginAt: true, createdAt: true } }),
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" }, select: { name: true } }),
    db.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
  ]);
  const perms = user.permissions.filter((p) => p !== "branches.all");

  return (
    <div className="grid gap-6">
      <PageHeader title="Mi perfil" description="Tus datos de acceso y permisos en el CRM." />
      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} className="h-14 w-14 text-base" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold text-brand-ink">{user.name}</p>
                <Badge tone="solid">{user.roleName}</Badge>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-brand-turquoise" />
                <dd className="break-all">{user.email}</dd>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-turquoise" />
                <dd>{user.allBranches ? "Todas las sucursales" : branches.map((b) => b.name).join(", ") || "Sin sucursales asignadas"}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Último acceso</dt>
                  <dd className="font-semibold text-brand-ink">{formatDateTime(record.lastLoginAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sesiones activas</dt>
                  <dd className="font-semibold text-brand-ink tabular">{sessions}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Descuento máximo</dt>
                  <dd className="font-semibold text-brand-ink">{bpsToPercent(user.maxDiscountBps)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cuenta creada</dt>
                  <dd className="font-semibold text-brand-ink">{formatDateTime(record.createdAt)}</dd>
                </div>
              </div>
            </dl>
          </Card>
          <ChangePasswordForm />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Mis permisos</CardTitle>
            <CardDescription>Definidos por tu rol. Si necesitas otro acceso, pídelo a un administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {perms.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-brand-ink">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-green" /> {PERMISSIONS[p]}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
