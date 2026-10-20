import { requirePage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { NAV_ITEMS } from "@/lib/nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DemoBanner } from "@/components/shared/demo-banner";
import { TooltipProvider } from "@/components/ui/popover";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  const nav = NAV_ITEMS.filter((i) => user.permissions.includes(i.permission));
  const [branches, notifications] = await Promise.all([
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.notification.findMany({
      where: { OR: [{ userId: user.id }, { userId: null, branchId: { in: user.branchIds } }] },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <TooltipProvider delayDuration={200}>
      <DemoBanner />
      <div className="flex min-h-dvh">
        <Sidebar items={nav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            user={{ name: user.name, email: user.email, roleName: user.roleName }}
            branches={branches}
            activeBranchId={user.activeBranchId}
            allowAll={user.allBranches}
            nav={nav}
            notifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              level: n.level,
              link: n.link,
              createdAt: n.createdAt.toISOString(),
              read: !!n.readAt,
            }))}
          />
          <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px] animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
