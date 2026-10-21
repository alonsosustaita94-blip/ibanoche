"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { submitPublicRequestAction } from "@/server/actions/public-requests";
import { REQUEST_TYPES, type RequestType } from "@/lib/validation/public-request";
import { buttonStyles } from "./ui";

const field =
  "w-full rounded-2xl border border-brand-gray bg-white px-4 py-3 text-base text-brand-blue shadow-sm transition placeholder:text-brand-text/60 focus:border-brand-turquoise focus:outline-none focus:ring-4 focus:ring-brand-turquoise/20 aria-[invalid=true]:border-brand-coral";

function Field({ id, label, error, children, className = "" }: { id: string; label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="font-display text-sm font-semibold text-brand-blue">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm font-medium text-brand-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Formulario público: la solicitud llega al CRM como oportunidad. */
export function RequestForm({ branches, defaultType = "informacion" }: { branches: { id: string; name: string }[]; defaultType?: RequestType }) {
  const [renderedAt] = useState(() => Date.now());
  const [type, setType] = useState<RequestType>(defaultType);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-4xl bg-brand-mint px-6 py-12 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-brand-turquoise" aria-hidden />
        <p className="mt-4 font-display text-xl font-bold text-brand-blue">Recibimos tu solicitud</p>
        <p className="mt-2 max-w-md">Nuestro equipo te contactará al teléfono que nos compartiste. Folio de referencia: {done}.</p>
        <button type="button" className={`${buttonStyles.outline} mt-6`} onClick={() => setDone(null)}>
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  const needsOrg = type === "empresa" || type === "profesional";
  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await submitPublicRequestAction(fd);
          if (r.ok) {
            setDone(r.reference);
            setErrors({});
            setError(null);
          } else {
            setErrors(r.fieldErrors ?? {});
            setError(r.error);
          }
        });
      }}
    >
      <input type="hidden" name="renderedAt" value={renderedAt} />
      <div className="hidden" aria-hidden>
        <label htmlFor="website">No llenes este campo</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Field id="req-type" label="¿Qué necesitas?">
        <select id="req-type" name="type" className={`${field} select-chevron`} value={type} onChange={(e) => setType(e.target.value as RequestType)}>
          {Object.entries(REQUEST_TYPES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="req-name" label="Nombre completo" error={errors.name}>
          <input id="req-name" name="name" className={field} autoComplete="name" aria-invalid={!!errors.name} />
        </Field>
        <Field id="req-phone" label="Teléfono (WhatsApp)" error={errors.phone}>
          <input id="req-phone" name="phone" type="tel" inputMode="tel" className={field} autoComplete="tel" aria-invalid={!!errors.phone} />
        </Field>
        <Field id="req-email" label="Correo (opcional)" error={errors.email}>
          <input id="req-email" name="email" type="email" className={field} autoComplete="email" aria-invalid={!!errors.email} />
        </Field>
        {needsOrg ? (
          <Field id="req-org" label={type === "empresa" ? "Empresa o institución" : "Consultorio o especialidad"} error={errors.organization}>
            <input id="req-org" name="organization" className={field} autoComplete="organization" />
          </Field>
        ) : (
          <Field id="req-branch" label="Sucursal de preferencia" error={errors.branchId}>
            <select id="req-branch" name="branchId" className={`${field} select-chevron`} defaultValue="">
              <option value="">Cualquiera</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {type === "cita" || type === "consultorio" ? (
          <Field id="req-date" label="Fecha preferida" error={errors.preferredDate}>
            <input id="req-date" name="preferredDate" type="date" className={field} min={new Date().toISOString().slice(0, 10)} />
          </Field>
        ) : null}
      </div>
      <Field id="req-message" label="Mensaje (opcional)" error={errors.message}>
        <textarea id="req-message" name="message" rows={3} maxLength={600} className={field} placeholder="Cuéntanos qué estudio o servicio te interesa. No incluyas datos de salud." />
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="privacy" className="mt-1 h-4 w-4 accent-[#12549A]" aria-invalid={!!errors.privacy} />
        <span>
          Acepto que IBANOCHE use mis datos de contacto para atender esta solicitud, conforme a su{" "}
          <a href="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-blue underline underline-offset-2">
            aviso de privacidad
          </a>
          .
          {errors.privacy ? <span className="block font-medium text-brand-coral">{errors.privacy}</span> : null}
        </span>
      </label>
      {error && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-brand-blush px-4 py-3 text-sm text-brand-coral">
          {error}
        </p>
      ) : null}
      <button type="submit" className={`${buttonStyles.primary} w-full sm:w-auto sm:justify-self-start`} disabled={pending} aria-busy={pending}>
        <Send className="h-5 w-5" aria-hidden />
        {pending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
