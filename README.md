# IBANOCHE — Sitio web y CRM

Una sola aplicación para IBANOCHE — Laboratorio de Análisis Clínicos:

- **`/`** — Sitio web público (inicio, estudios clínicos, servicios, renta de consultorio, profesionales, nosotros, sucursales, contacto, aviso de privacidad).
- **`/crm`** — **IBANOCHE CRM**, *administración y gestión comercial inteligente*: pacientes, agenda, catálogo, cotizaciones, órdenes, caja, Emilia IA, oportunidades, convenios, reportes y configuración. Requiere inicio de sesión del personal (`/crm/login`).

**Integración sitio → CRM:** el formulario de solicitud del sitio (`/contacto#solicitud`, con `?tipo=informacion|cita|profesional|empresa|consultorio`) registra cada solicitud en el CRM como oportunidad (etapa *Prospecto*, origen *Sitio web*) y notifica a la sucursal. Incluye aceptación del aviso de privacidad, campo trampa anti-spam, tiempo mínimo de llenado y límite de envíos por IP. El pie del sitio tiene el enlace **Acceso personal** al CRM.

> **Alcance:** este CRM **no es un sistema clínico ni un LIMS**. No almacena resultados de laboratorio, valores analíticos, diagnósticos, tratamientos ni interpretaciones médicas. El procesamiento de muestras y la emisión de resultados viven en un sistema clínico independiente.

> **Estado:** entorno de **demostración**. Todos los pacientes, precios y movimientos incluidos son ficticios. Ningún módulo está listo para producción hasta completar la lista de [pendientes](#pendientes-antes-de-producción).

---

## Tecnología

| Capa | Herramienta |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Interfaz | Tailwind CSS, componentes estilo shadcn/ui sobre Radix UI, Lucide React, Recharts, dnd-kit |
| Datos | PostgreSQL 16, Prisma ORM 6 |
| Validación | Zod (servidor y formularios) |
| Autenticación | Sesiones propias en base de datos (cookie httpOnly) + bcrypt |
| Pruebas | Vitest (unitarias e integración contra PostgreSQL) |

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior con la extensión `unaccent` disponible (incluida en las distribuciones estándar y en servicios administrados como Neon, Supabase o RDS)

## Demo en línea con GitHub Codespaces

El repositorio incluye la configuración `.devcontainer/`: Codespaces levanta la app y su PostgreSQL, carga los datos de demostración y arranca el CRM en el puerto 3000.

1. En GitHub, abre el repositorio en la rama del CRM → botón **Code** → pestaña **Codespaces** → **Create codespace**.
2. Espera a que termine la preparación (instala, migra, carga la demo y compila; tarda unos minutos la primera vez).
3. Se abre la pestaña **Puertos** con “IBANOCHE” (3000). La dirección abre el sitio web; el CRM está en `/crm`.
4. Para compartirla: clic derecho en el puerto → **Port visibility → Public** y comparte la dirección `https://…app.github.dev`.

El Codespace se suspende tras un periodo sin uso y consume horas de tu cuota de GitHub. Es una demo, no un despliegue de producción.

## Instalación local

```bash
npm install
cp .env.example .env            # y edita los valores
npx prisma migrate deploy       # crea las tablas
npm run db:seed                 # carga los datos de demostración
npm run dev                     # sitio: http://localhost:3000 · CRM: http://localhost:3000/crm
```

Para crear la base de datos local (ejemplo):

```bash
createuser -P ibanoche          # contraseña: la de DATABASE_URL
createdb -O ibanoche ibanoche_crm
```

### Cuentas de demostración

Contraseña para todas: `Demo2026!`

| Correo | Rol | Sucursales |
| --- | --- | --- |
| admin@demo.ibanoche.mx | Administrador | Todas |
| supervisor@demo.ibanoche.mx | Supervisor | Todas |
| recepcion@demo.ibanoche.mx | Recepción | Torres Médicas 4 |
| caja@demo.ibanoche.mx | Caja | Torres Médicas 4 |
| comercial@demo.ibanoche.mx | Comercial | Todas |
| lectura@demo.ibanoche.mx | Solo lectura | Todas |

`npm run db:reset` borra todo y vuelve a cargar la demo.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `SESSION_TTL_HOURS` | Duración de la sesión (por omisión 8) |
| `APP_TIMEZONE` | Zona horaria de operación (`America/Mexico_City`) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` muestra el aviso de demostración y las cuentas demo en el inicio de sesión. **Debe ser `false` en producción.** |
| `EMILIA_DEMO_API_KEY` | Llave fija para la API de Emilia al cargar la demo (opcional) |
| `EMILIA_AGENT_URL` | URL del agente de Emilia cuando exista. Mientras falte, la interfaz indica que Emilia no está conectada |
| `TEST_DATABASE_URL` | Base de datos para pruebas de integración (por omisión `ibanoche_crm_test`) |

Nunca subas `.env` al repositorio.

## Módulos

| Módulo | Ruta | Permiso |
| --- | --- | --- |
| Dashboard | `/crm/dashboard` | `dashboard.view` |
| Pacientes | `/crm/pacientes` | `patients.view` / `patients.manage` |
| Agenda y citas | `/crm/agenda` | `appointments.view` / `appointments.manage` |
| Catálogo de estudios | `/crm/catalogo` | `catalog.view` / `catalog.manage` / `catalog.viewCost` / `prices.manage` |
| Cotizaciones | `/crm/cotizaciones` | `quotes.view` / `quotes.manage` |
| Órdenes | `/crm/ordenes` | `orders.view` / `orders.manage` |
| Caja / POS | `/crm/caja` | `pos.charge` / `pos.cashSession` / `pos.void` |
| Emilia IA | `/crm/emilia` | `emilia.view` / `emilia.reply` |
| Oportunidades | `/crm/oportunidades` | `opportunities.view` / `opportunities.manage` |
| Convenios | `/crm/convenios` | `partners.view` / `partners.manage` |
| Reportes | `/crm/reportes` | `reports.view` / `reports.export` |
| Configuración | `/crm/configuracion` | `settings.*`, `users.manage`, `audit.view` |

Los permisos por rol iniciales están en `src/lib/auth/permissions.ts` y se guardan en la tabla `Role`; el administrador puede ajustarlos en Configuración → Usuarios y roles.

## Arquitectura

```
prisma/
  schema.prisma            Modelo relacional (importes en centavos, porcentajes en puntos base)
  migrations/              Migraciones SQL (incluye índices parciales y restricciones CHECK)
  seed.ts                  Datos de demostración
src/
  app/(site)/              Sitio web público
  app/crm/(auth)/login     Inicio de sesión del CRM
  app/crm/(app)/<módulo>   Páginas de cada módulo del CRM (componentes de servidor)
  app/api/emilia/[action]  API para Emilia IA (llave + alcances)
  app/api/...              Exportaciones (CSV) y PDF de cotizaciones
  components/site          Componentes del sitio web
  components/ui            Componentes base del CRM (estilo shadcn/ui)
  components/shared        Componentes compartidos (tablas, filtros, selectores, estados)
  components/charts        Gráficas (Recharts)
  lib/auth                 Sesiones, permisos y guardas
  lib/validation           Esquemas Zod
  server/services          Reglas de negocio (precios, cotizaciones, órdenes, cobros, agenda, métricas)
  server/actions           Acciones de servidor: validan → autorizan → ejecutan → auditan
tests/                     Pruebas unitarias e integración
```

Flujo de una acción: el formulario llama a una **acción de servidor** → `requireUser(permiso)` → validación Zod → verificación de sucursal → **servicio** de negocio (transacción) → `audit()` → `revalidatePath`. Los errores se devuelven como mensajes comprensibles; nunca se muestra una confirmación si no se guardó.

## Reglas de negocio y seguridad implementadas

- **Autenticación:** contraseñas con bcrypt (12 rondas), sesión aleatoria de 256 bits guardada como hash SHA-256, cookie `httpOnly` + `SameSite=Lax` + `Secure` en producción, bloqueo temporal tras 5 intentos fallidos, mensajes de error que no revelan si el correo existe.
- **Autorización:** permisos verificados en el servidor en cada página, acción y ruta de API (ocultar botones es solo cortesía).
- **Separación por sucursal:** todas las consultas se limitan a las sucursales asignadas al usuario.
- **Auditoría:** cambios administrativos relevantes en `AuditLog` con antes/después, usuario e IP.
- **Precios:** tarifas versionadas (una sola vigente por estudio garantizada por índice parcial); el costo interno solo se consulta con `catalog.viewCost`.
- **Cotizaciones:** guardan una copia del precio aplicado (snapshot); convertirlas en orden copia esos precios, no los vigentes. Conversión idempotente.
- **Descuentos:** máximo por rol, promoción vigente o convenio activo; se valida en el servidor.
- **Agenda:** horarios, intervalos, capacidad y anticipación mínima configurables; candado por sucursal y horario (`pg_advisory_xact_lock`) contra sobrecupos y reservas duplicadas.
- **Caja:** cobros idempotentes (`Idempotency-Key` por intento), bloqueo de la orden (`FOR UPDATE`) contra sobrepagos, una sola caja abierta por sucursal (índice parcial), anulaciones sin borrar registros, corte de caja con diferencia.
- **Sin pasarela de pago:** se registran cobros hechos en efectivo, terminal o transferencia. No se conecta ninguna pasarela hasta configurar credenciales.
- **Emilia:** API con llave (solo se guarda su hash), alcances mínimos, límite de solicitudes, idempotencia en acciones que crean registros y auditoría de cada acción. Sin acciones para diagnosticar, interpretar resultados, aplicar descuentos, modificar precios ni autorizar reembolsos. Ver `docs/emilia-api.md`.
- **Encabezados de seguridad:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

## Pruebas

```bash
npm run typecheck
npm run lint
npm test          # unitarias + integración (requiere la base de pruebas)
```

Las pruebas de integración usan `TEST_DATABASE_URL` y **vacían esa base** antes y después. Prepárala una vez:

```bash
createdb -O ibanoche ibanoche_crm_test
DATABASE_URL="postgresql://ibanoche:...@localhost:5432/ibanoche_crm_test" npx prisma migrate deploy
```

Cubren: sobrecupo con reservas simultáneas, doble reserva del mismo paciente, horarios fuera de rango, snapshot de precios, conversión idempotente, límite de descuento, tarifa única vigente, cobros duplicados simultáneos, sobrepago, caja cerrada, anulación y corte de caja.

## Despliegue

1. Base de datos PostgreSQL administrada con respaldos automáticos y recuperación a un punto en el tiempo (PITR).
2. Variables de entorno en el proveedor (Vercel, Railway, Render, servidor propio). `NEXT_PUBLIC_DEMO_MODE=false`.
3. En cada versión: `npm ci && npx prisma migrate deploy && npm run build && npm start`.
4. **No ejecutes `npm run db:seed` en producción**: borra todos los datos.
5. Crea el primer administrador real con un script de alta (pendiente) o desde la demo y luego elimina las cuentas `@demo.ibanoche.mx`.
6. HTTPS obligatorio. Si hay varias instancias, el límite de solicitudes de la API de Emilia debe moverse a un almacén compartido (p. ej. Redis).

## Respaldos

```bash
DATABASE_URL=... ./scripts/backup.sh ./backups      # pg_dump en formato custom
DATABASE_URL=... ./scripts/restore.sh archivo.dump  # pide confirmación antes de reemplazar
```

Programa `backup.sh` a diario, guarda las copias fuera del servidor y prueba la restauración periódicamente. En servicios administrados, activa además los respaldos automáticos con recuperación a un punto en el tiempo.

## Pendientes antes de producción

**Información del laboratorio**
- [ ] Catálogo real de estudios, **precios públicos aprobados** y costos internos (los actuales son ficticios con código `DEMO-`).
- [ ] Tipos de muestra, indicaciones de preparación y tiempos de entrega **validados por el laboratorio** (hoy están como pendientes; el sistema no los inventa).
- [ ] Direcciones, teléfonos, horarios, capacidad por intervalo y servicio a domicilio reales de Torres Médicas 4 y Centro Médico de Diagnóstico.
- [ ] Texto legal del aviso de privacidad (`/aviso-de-privacidad` está reservado y marcado como en preparación).
- [ ] Datos de contacto, fotografías y logotipo del sitio web (ver `src/config/site.ts`).
- [ ] Usuarios reales, roles y descuentos máximos autorizados por rol; promociones vigentes.
- [ ] Logotipo oficial (hoy se usa una marca tipográfica provisional en `src/components/layout/brand.tsx`).

**Integraciones**
- [ ] Agente de Emilia: conectar con la API documentada en `docs/emilia-api.md` y configurar `EMILIA_AGENT_URL`.
- [ ] Canal de WhatsApp (WhatsApp Business API) para enviar y recibir mensajes; hoy las respuestas del personal se registran en el CRM pero no se envían.
- [ ] Pasarela o terminal de pago, si se requiere conciliación automática.
- [ ] Facturación electrónica (PAC/CFDI): hoy solo se registra la solicitud de factura.
- [ ] Vínculo con el sistema clínico/LIMS (solo identificadores de orden, nunca resultados).
- [ ] Envío de notificaciones (correo/WhatsApp) para recordatorios autorizados.

**Seguridad y cumplimiento**
- [ ] Revisión de obligaciones de la **LFPDPPP** (Ley Federal de Protección de Datos Personales en Posesión de los Particulares): aviso de privacidad, consentimiento, derechos ARCO, transferencias y encargados.
- [ ] Política de retención y eliminación de datos personales.
- [ ] Respaldos probados y plan de recuperación.
- [ ] Autenticación de dos factores para administradores.
- [ ] Pruebas de penetración y revisión de dependencias.
- [ ] Límite de solicitudes compartido entre instancias.

**Validación funcional**
- [ ] Pruebas con usuarios reales de recepción, caja y área comercial.
- [ ] Pruebas de carga con volumen real de pacientes y órdenes.
