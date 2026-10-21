"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactMoney, formatMoney } from "@/lib/money";

export const CHART_COLORS = ["#12549A", "#32B8BE", "#E74758", "#7FB3E3", "#C98A12", "#9AA8BC", "#1E9E6A"];
const AXIS = { fontSize: 11, fill: "#596A82" };
const GRID = "#E6ECF3";

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-pop">
      <p className="font-semibold capitalize text-brand-ink">{label}</p>
      <p className="tabular text-brand-blue">{formatMoney(payload[0].value)}</p>
    </div>
  );
}

/** Barras de ingresos por mes; resalta el mes más reciente. */
export function RevenueBars({ data, height = 240 }: { data: { label: string; cents: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactMoney(v)} width={64} />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "#EAF2FA" }} />
        <Bar dataKey="cents" radius={[6, 6, 0, 0]} maxBarSize={42}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 ? "#12549A" : "#9CC4EA"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Área de tendencia (ingresos u otra serie monetaria o de conteo). */
export function TrendArea({ data, money = true, height = 240 }: { data: { label: string; value: number }[]; money?: boolean; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#32B8BE" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#32B8BE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => (money ? formatCompactMoney(v) : String(v))} allowDecimals={false} />
        <Tooltip
          formatter={(v: number) => (money ? formatMoney(v) : v)}
          labelClassName="font-semibold"
          contentStyle={{ borderRadius: 10, border: "1px solid #E1E8F0", fontSize: 12 }}
        />
        <Area type="monotone" dataKey="value" stroke="#32B8BE" strokeWidth={2.5} fill="url(#trend)" dot={false} activeDot={{ r: 5, fill: "#12549A" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Dona con total al centro y leyenda con porcentajes. */
export function Donut({
  data,
  centerLabel,
  height = 200,
  money = false,
}: {
  data: { name: string; value: number }[];
  centerLabel: string;
  height?: number;
  money?: boolean;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke="none" animationDuration={500}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => (money ? formatMoney(v) : v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-xl font-bold text-brand-ink tabular">{money ? formatCompactMoney(total) : total.toLocaleString("es-MX")}</span>
          <span className="text-[0.65rem] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid w-full gap-2 text-xs">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate text-brand-ink">{d.name}</span>
            </span>
            <span className="tabular font-semibold text-brand-text">{total ? Math.round((d.value / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontales (ventas por sucursal, estudios). */
export function HorizontalBars({
  data,
  money = true,
  height,
}: {
  data: { name: string; value: number }[];
  money?: boolean;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(140, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => (money ? formatCompactMoney(v) : String(v))} />
        <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={150} />
        <Tooltip formatter={(v: number) => (money ? formatMoney(v) : v)} cursor={{ fill: "#EAF2FA" }} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#12549A" : i === 1 ? "#32B8BE" : "#9CC4EA"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
