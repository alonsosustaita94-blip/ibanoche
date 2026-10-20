"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Ban,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  PlayCircle,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  availabilityAction,
  branchStaffAction,
  createAppointmentAction,
  rescheduleAppointmentAction,
  setAppointmentStatusAction,
  updateAppointmentAction,
} from "@/server/actions/appointments";
import type { PatientOption, StudyOption } from "@/server/actions/lookup";
import type { Slot } from "@/server/services/appointments";
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE, CONTACT_SOURCE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { PatientPicker, StudySearch } from "@/components/shared/pickers";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ApptView } from "./types";

type Branch = { id: string; name: string };
type StudyChip = { id: string; code: string; name: string };

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["PENDING", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

/** Horarios disponibles reales de la sucursal (cupo y anticipación mínima). */
function SlotPicker({
  branchId,
  date,
  type,
  value,
  onChange,
  error,
}: {
  branchId: string;
  date: string;
  type: "BRANCH" | "HOME";
  value: string | null;
  onChange: (iso: string | null) => void;
  error?: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || !date) return;
    let alive = true;
    setLoading(true);
    setMessage(null);
    onChange(null);
    availabilityAction({ branchId, date, type }).then((r) => {
      if (!alive) return;
      setLoading(false);
      if (!r.ok) {
        setSlots([]);
        setMessage(r.error);
        return;
      }
      setOpen(r.data.open);
      setSlots(r.data.slots);
    });
    return () => {
      alive = false;
    };
    // onChange es estable para este uso; solo recargamos al cambiar filtros.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, date, type]);

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold text-brand-ink">
        Horario <span className="text-destructive">*</span>
      </span>
      {loading ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando disponibilidad…
        </p>
      ) : message ? (
        <p className="rounded-lg bg-brand-blush p-3 text-sm text-[#c23444]">{message}</p>
      ) : !open ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {type === "HOME" ? "No hay servicio a domicilio ese día." : "La sucursal no atiende ese día."}
        </p>
      ) : slots && slots.length ? (
        <div role="radiogroup" aria-label="Horarios disponibles" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {slots.map((s) => {
            const selected = value === s.startsAt;
            const left = s.capacity - s.booked;
            return (
              <button
                key={s.startsAt}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!s.available}
                title={s.reason ?? `${left} ${left === 1 ? "lugar disponible" : "lugares disponibles"}`}
                onClick={() => onChange(s.startsAt)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-brand-blue bg-brand-blue text-white"
                    : s.available
                      ? "border-input bg-card hover:border-brand-turquoise hover:bg-brand-mint"
                      : "cursor-not-allowed border-transparent bg-muted text-muted-foreground/60 line-through",
                )}
              >
                <span className="block font-display text-sm font-bold tabular">{s.time}</span>
                <span className={cn("block text-[0.62rem]", selected ? "text-white/80" : "text-muted-foreground")}>
                  {s.available ? `${left} libre${left === 1 ? "" : "s"}` : s.reason === "Sin cupo" ? "Lleno" : "No disponible"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Sin horarios configurados.</p>
      )}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StudyChips({ value, onChange }: { value: StudyChip[]; onChange: (v: StudyChip[]) => void }) {
  return (
    <div className="grid gap-2">
      <StudySearch
        selectedIds={value.map((s) => s.id)}
        placeholder="Agregar estudio a la cita"
        onSelect={(s: StudyOption) => {
          if (!value.some((v) => v.id === s.id)) onChange([...value, { id: s.id, code: s.code, name: s.name }]);
        }}
      />
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1 rounded-full bg-brand-mint py-1 pl-2.5 pr-1 text-xs font-semibold text-[#1a7a7f]">
              {s.name}
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== s.id))} className="rounded-full p-0.5 hover:bg-white/70" aria-label={`Quitar ${s.name}`}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Opcional. Ayuda a preparar la atención.</p>
      )}
    </div>
  );
}

function useStaff(branchId: string) {
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!branchId) return;
    let alive = true;
    branchStaffAction(branchId).then((r) => alive && r.ok && setStaff(r.data));
    return () => {
      alive = false;
    };
  }, [branchId]);
  return staff;
}

export function CreateAppointmentDialog({
  branches,
  defaultBranchId,
  defaultDate,
  initialPatient,
  autoOpen,
}: {
  branches: Branch[];
  defaultBranchId?: string;
  defaultDate: string;
  initialPatient: PatientOption | null;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [patient, setPatient] = useState<PatientOption | null>(initialPatient);
  const [branchId, setBranchId] = useState(initialPatient && branches.some((b) => b.id === initialPatient.branchId) ? initialPatient.branchId : (defaultBranchId ?? branches[0]?.id ?? ""));
  const [date, setDate] = useState(defaultDate);
  const [type, setType] = useState<"BRANCH" | "HOME">("BRANCH");
  const [slot, setSlot] = useState<string | null>(null);
  const [studies, setStudies] = useState<StudyChip[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const staff = useStaff(branchId);

  const reset = () => {
    setPatient(null);
    setStudies([]);
    setSlot(null);
    setErrors({});
    setType("BRANCH");
  };

  const clearDeepLink = () => {
    if (autoOpen) router.replace("/agenda", { scroll: false });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          clearDeepLink();
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <CalendarPlus /> Nueva cita
      </Button>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>Elige un horario con cupo disponible. Las citas nuevas quedan pendientes de confirmar salvo que lo indiques.</DialogDescription>
        </DialogHeader>
        <form
          id="appointment-form"
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (!slot) {
              setErrors({ startsAt: "Elige un horario disponible." });
              return;
            }
            fd.set("startsAt", slot);
            fd.set("studyIds", studies.map((s) => s.id).join(","));
            start(async () => {
              const r = await createAppointmentAction(fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              toast.success(`Cita ${r.data.folio} agendada`);
              setOpen(false);
              reset();
              router.replace(`/agenda?view=day&date=${date}&cita=${r.data.id}`, { scroll: false });
              router.refresh();
            });
          }}
        >
          <FormField id="patientId" label="Paciente" required error={errors.patientId}>
            <PatientPicker
              value={patient}
              onChange={(p) => {
                setPatient(p);
                if (p && branches.some((b) => b.id === p.branchId)) setBranchId(p.branchId);
              }}
              invalid={!!errors.patientId}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="branchId" label="Sucursal" required error={errors.branchId}>
              <NativeSelect id="branchId" name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="date" label="Fecha" required>
              <Input id="date" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField id="type" label="Tipo de atención" required>
              <NativeSelect id="type" name="type" value={type} onChange={(e) => setType(e.target.value as "BRANCH" | "HOME")}>
                {Object.entries(APPOINTMENT_TYPE).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          {type === "HOME" ? (
            <FormField id="homeAddress" label="Domicilio para la toma de muestra" required error={errors.homeAddress}>
              <Input id="homeAddress" name="homeAddress" aria-invalid={!!errors.homeAddress} placeholder="Calle, número, colonia y referencias" />
            </FormField>
          ) : null}
          <SlotPicker branchId={branchId} date={date} type={type} value={slot} onChange={setSlot} error={errors.startsAt} />
          <div className="grid gap-1.5">
            <span className="text-xs font-semibold text-brand-ink">Estudios</span>
            <StudyChips value={studies} onChange={setStudies} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="responsibleId" label="Responsable" error={errors.responsibleId}>
              <NativeSelect id="responsibleId" name="responsibleId" defaultValue="">
                <option value="">Sin asignar</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <label className="flex items-center gap-2.5 self-end rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
              <Checkbox name="status" value="CONFIRMED" />
              Ya está confirmada con el paciente
            </label>
          </div>
          <FormField id="notes" label="Notas administrativas" hint="Sin datos clínicos ni resultados." error={errors.notes}>
            <Textarea id="notes" name="notes" rows={2} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="appointment-form" loading={pending}>
            Agendar cita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACTION_META: Record<string, { label: string; icon: typeof CheckCircle2; variant: "default" | "secondary" | "outline" | "soft" }> = {
  CONFIRMED: { label: "Confirmar", icon: CheckCircle2, variant: "default" },
  IN_PROGRESS: { label: "Registrar asistencia", icon: PlayCircle, variant: "secondary" },
  COMPLETED: { label: "Completar", icon: CheckCircle2, variant: "default" },
  PENDING: { label: "Marcar pendiente", icon: Clock, variant: "outline" },
};

export function AppointmentDetailDialog({
  appt,
  onClose,
  canManage,
  branches,
}: {
  appt: ApptView | null;
  onClose: () => void;
  canManage: boolean;
  branches: Branch[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"view" | "reschedule" | "edit">("view");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    setMode("view");
    setCancelReason("");
  }, [appt?.id]);

  if (!appt) return null;
  const allowed = TRANSITIONS[appt.status] ?? [];
  const closed = ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appt.status);

  const changeStatus = (status: string, reason?: string) =>
    new Promise<boolean>((resolve) =>
      start(async () => {
        const r = await setAppointmentStatusAction({ id: appt.id, status, reason });
        if (r.ok) {
          toast.success(r.message ?? "Cita actualizada");
          router.refresh();
        } else toast.error(r.error);
        resolve(r.ok);
      }),
    );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{mode === "reschedule" ? "Reagendar cita" : mode === "edit" ? "Editar cita" : `Cita ${appt.folio}`}</DialogTitle>
            <StatusBadge value={appt.status} map={APPOINTMENT_STATUS} />
          </div>
          <DialogDescription>
            {appt.dateKey} · {appt.time}–{appt.endTime} · {appt.branchName}
          </DialogDescription>
        </DialogHeader>

        {mode === "reschedule" ? (
          <RescheduleForm appt={appt} branches={branches} onDone={() => setMode("view")} />
        ) : mode === "edit" ? (
          <EditForm appt={appt} onDone={() => setMode("view")} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Paciente</p>
                <Link href={`/pacientes/${appt.patientId}`} className="mt-0.5 flex items-center gap-2 font-semibold text-brand-blue hover:underline">
                  <UserRound className="h-4 w-4" /> {appt.patientName}
                </Link>
                {appt.patientPhone ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-brand-ink">
                    <Phone className="h-4 w-4 text-brand-turquoise" /> {appt.patientPhone}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Tipo de atención</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-brand-ink">
                  {appt.type === "HOME" ? <Home className="h-4 w-4 text-brand-coral" /> : <MapPin className="h-4 w-4 text-brand-turquoise" />}
                  {APPOINTMENT_TYPE[appt.type]}
                </p>
                {appt.homeAddress ? <p className="mt-1 text-sm text-brand-text">{appt.homeAddress}</p> : null}
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Responsable</dt>
                <dd className="font-semibold text-brand-ink">{appt.responsibleName ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Origen</dt>
                <dd className="font-semibold text-brand-ink">{CONTACT_SOURCE[appt.source] ?? appt.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Folio</dt>
                <dd className="font-mono text-xs font-semibold text-brand-ink">{appt.folio}</dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted-foreground">Estudios</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {appt.studies.length ? (
                    appt.studies.map((s) => (
                      <span key={s.id} className="rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold text-[#1a7a7f]">
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Sin estudios registrados</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted-foreground">Notas administrativas</dt>
                <dd className="whitespace-pre-line text-brand-ink">{appt.notes || "—"}</dd>
              </div>
              {appt.cancelReason ? (
                <div className="sm:col-span-3">
                  <dt className="text-xs text-muted-foreground">Motivo de cancelación</dt>
                  <dd className="text-brand-ink">{appt.cancelReason}</dd>
                </div>
              ) : null}
            </dl>

            {canManage && !closed ? (
              <div className="grid gap-3 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  {allowed
                    .filter((s) => ACTION_META[s])
                    .map((s) => {
                      const m = ACTION_META[s];
                      const Icon = m.icon;
                      return (
                        <Button key={s} variant={m.variant} size="sm" disabled={pending} onClick={() => changeStatus(s)}>
                          <Icon /> {m.label}
                        </Button>
                      );
                    })}
                  {appt.status === "PENDING" || appt.status === "CONFIRMED" ? (
                    <Button variant="soft" size="sm" onClick={() => setMode("reschedule")}>
                      <CalendarClock /> Reagendar
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
                    <Pencil /> Editar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allowed.includes("NO_SHOW") ? (
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" size="sm" disabled={pending}>
                          <UserX /> Marcar ausencia
                        </Button>
                      }
                      title="¿Registrar que el paciente no asistió?"
                      description="La cita se cerrará como ausencia y liberará el horario."
                      confirmLabel="Registrar ausencia"
                      onConfirm={() => changeStatus("NO_SHOW")}
                    />
                  ) : null}
                  {allowed.includes("CANCELLED") ? (
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={pending}>
                          <Ban /> Cancelar cita
                        </Button>
                      }
                      title="¿Cancelar esta cita?"
                      description="El horario quedará libre. Esta acción no se puede deshacer."
                      confirmLabel="Cancelar cita"
                      variant="destructive"
                      onConfirm={async () => {
                        if (cancelReason.trim().length < 3) {
                          toast.error("Indica el motivo de la cancelación.");
                          return false;
                        }
                        return changeStatus("CANCELLED", cancelReason.trim());
                      }}
                    >
                      <FormField id="cancelReason" label="Motivo" required>
                        <Input id="cancelReason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ej. el paciente reprogramará" maxLength={300} />
                      </FormField>
                    </ConfirmDialog>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleForm({ appt, branches, onDone }: { appt: ApptView; branches: Branch[]; onDone: () => void }) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(appt.branchId);
  const [date, setDate] = useState(appt.dateKey < todayKey() ? todayKey() : appt.dateKey);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="rs-branch" label="Sucursal">
          <NativeSelect id="rs-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="rs-date" label="Nueva fecha">
          <Input id="rs-date" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
      </div>
      <SlotPicker branchId={branchId} date={date} type={appt.type} value={slot} onChange={setSlot} error={error} />
      <p className="text-xs text-muted-foreground">Al reagendar, la cita vuelve a quedar pendiente de confirmación.</p>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Volver
        </Button>
        <Button
          loading={pending}
          onClick={() => {
            if (!slot) {
              setError("Elige un horario disponible.");
              return;
            }
            start(async () => {
              const r = await rescheduleAppointmentAction({ id: appt.id, startsAt: slot, branchId: branchId !== appt.branchId ? branchId : undefined });
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              toast.success(r.message ?? "Cita reagendada");
              onDone();
              router.replace(`/agenda?view=day&date=${date}&cita=${appt.id}`, { scroll: false });
              router.refresh();
            });
          }}
        >
          Reagendar
        </Button>
      </DialogFooter>
    </div>
  );
}

function EditForm({ appt, onDone }: { appt: ApptView; onDone: () => void }) {
  const router = useRouter();
  const [studies, setStudies] = useState<StudyChip[]>(appt.studies);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const staff = useStaff(appt.branchId);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("id", appt.id);
        fd.set("studyIds", studies.map((s) => s.id).join(","));
        start(async () => {
          const r = await updateAppointmentAction(fd);
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.error);
            return;
          }
          toast.success(r.message ?? "Cita actualizada");
          onDone();
          router.refresh();
        });
      }}
    >
      <div className="grid gap-1.5">
        <span className="text-xs font-semibold text-brand-ink">Estudios</span>
        <StudyChips value={studies} onChange={setStudies} />
      </div>
      <FormField id="ed-responsible" label="Responsable" error={errors.responsibleId}>
        <NativeSelect id="ed-responsible" name="responsibleId" defaultValue={appt.responsibleId ?? ""} key={staff.length}>
          <option value="">Sin asignar</option>
          {staff.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="ed-notes" label="Notas administrativas" hint="Sin datos clínicos ni resultados." error={errors.notes}>
        <Textarea id="ed-notes" name="notes" rows={3} defaultValue={appt.notes ?? ""} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Volver
        </Button>
        <Button type="submit" loading={pending}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  );
}
