# API de Emilia IA

API que usa Emilia, la asistente virtual de IBANOCHE, para operar sobre el CRM. Está implementada en `src/app/api/emilia/[action]/route.ts`.

Emilia **nunca** accede directamente a la base de datos. Cada acción:

1. autentica la llave de API,
2. comprueba que la llave tenga el alcance (scope) de la acción,
3. valida los parámetros con Zod,
4. aplica las reglas de negocio del CRM (precios vigentes, cupo de agenda, etc.),
5. queda registrada en la auditoría con `actorType = EMILIA`.

## Restricciones

Emilia **no puede** diagnosticar, interpretar resultados, consultar resultados clínicos, recomendar medicamentos o tratamientos, autorizar reembolsos, modificar precios ni aplicar o inventar descuentos y promociones. Ninguna de esas operaciones existe en la API, y el CRM no almacena resultados clínicos.

Además:

- Las cotizaciones de Emilia se crean **sin descuento** y con estado `SENT`.
- Las citas que solicita Emilia quedan **pendientes** (`PENDING`) hasta que el personal las confirme.
- Solo se devuelven indicaciones de preparación, tipo de muestra y tiempos de entrega **aprobados**. Si no lo están, la respuesta trae `null` y una nota para transferir a personal.

## Conexión

```
POST https://<dominio-del-crm>/api/emilia/<acción>
Authorization: Bearer <llave>
Content-Type: application/json
Idempotency-Key: <valor único>   ← obligatorio en acciones que crean registros
```

- Solo se acepta `POST`. `GET` responde `405`.
- La llave se crea en **Configuración → Integraciones**. El CRM guarda únicamente su hash SHA-256; la llave completa se muestra una sola vez.
- Una llave puede limitarse a una sucursal (`branchId`). En ese caso, las acciones con otra sucursal responden `422` ("Sucursal no permitida").
- Límite de uso: 60 solicitudes por minuto por llave. El contador vive en memoria de cada instancia; con varias instancias hay que moverlo a un almacén compartido.
- En la demo, la llave está en `EMILIA_DEMO_API_KEY` (`.env`) y la imprime `npm run db:seed`.

### Idempotencia

Las acciones `findOrCreatePatient`, `createQuote`, `createAppointment`, `createLead` y `handoffToHuman` requieren el encabezado `Idempotency-Key`: de 8 a 100 caracteres, solo letras, números, `_` o `-`.

Si se repite la misma llave, la API devuelve la respuesta original sin crear otro registro. Usa una llave nueva por cada intención real del usuario y reutilízala solo en reintentos de red.

## Alcances (scopes)

| Acción | Scope requerido | Crea registros |
| --- | --- | --- |
| `searchStudies` | `studies.read` | No |
| `getApprovedPrice` | `prices.read` | No |
| `createQuote` | `quotes.create` | Sí |
| `listBranches` | `availability.read` | No |
| `findOrCreatePatient` | `patients.write` | Sí |
| `checkAvailability` | `availability.read` | No |
| `createAppointment` | `appointments.create` | Sí |
| `createLead` | `leads.create` | Sí |
| `handoffToHuman` | `handoff.create` | Sí |

Da a cada llave solo los alcances que necesita (principio de permisos mínimos).

## Respuestas y errores

Respuesta correcta:

```json
{ "ok": true, "data": { … } }
```

| Código | Significado |
| --- | --- |
| `200` | Correcto (también al repetir una `Idempotency-Key`). |
| `400` | El cuerpo no es JSON válido, o falta o es inválida la `Idempotency-Key`. |
| `401` | Llave ausente, inválida, inactiva o revocada. |
| `403` | La llave no tiene el scope de la acción. |
| `404` | Acción inexistente o registro no encontrado. |
| `405` | Método distinto de `POST`. |
| `422` | Parámetros inválidos (`issues` con el detalle) o regla de negocio incumplida (`error` con el mensaje). |
| `429` | Límite de solicitudes excedido. |
| `500` | Error interno (sin detalles sensibles). |

Ejemplo de `422` por parámetros:

```json
{
  "error": "Parámetros no válidos.",
  "issues": [{ "path": "studyIds", "message": "Array must contain at least 1 element(s)" }]
}
```

Ejemplo de `422` por regla de negocio:

```json
{ "error": "Ese horario ya no tiene cupo. Elige otro." }
```

Todos los importes están en **centavos de MXN** (`18000` = $180.00).

---

## Acciones

### `searchStudies`

Busca estudios activos por nombre, código o sinónimo. La búsqueda ignora acentos y mayúsculas.

```json
{ "query": "biometria", "limit": 8 }
```

- `query`: de 2 a 80 caracteres.
- `limit`: de 1 a 20 (por omisión 8).

```json
{
  "ok": true,
  "data": [
    {
      "id": "cmv…",
      "code": "DEMO-BH01",
      "name": "Biometría hemática",
      "category": "Hematología",
      "sampleType": "Sangre",
      "instructions": null,
      "turnaround": null,
      "note": "Indicaciones pendientes de aprobación: transferir a personal para confirmarlas."
    }
  ]
}
```

### `getApprovedPrice`

Devuelve el precio público vigente. Nunca expone el costo interno.

```json
{ "studyIds": ["cmv…", "cmv…"] }
```

`studyIds`: de 1 a 20 identificadores.

```json
{
  "ok": true,
  "data": [
    { "studyId": "cmv…", "code": "DEMO-BH01", "name": "Biometría hemática", "publicPriceCents": 18000, "currency": "MXN" },
    { "studyId": "cmv…", "available": false }
  ]
}
```

`available: false` indica que el estudio no existe, está inactivo o no tiene precio público vigente.

### `createQuote`

Genera una cotización con los precios vigentes. Los precios quedan fijos en la cotización aunque la tarifa cambie después. No admite descuentos.

```json
{
  "branchId": "cmv…",
  "patientId": "cmv…",
  "prospectName": "Nombre del prospecto",
  "prospectPhone": "2220001234",
  "items": [{ "studyId": "cmv…", "quantity": 1 }],
  "conversationId": "cmv…"
}
```

- Se requiere `patientId` o `prospectName`.
- `items`: de 1 a 20 partidas; `quantity` de 1 a 20.

```json
{ "ok": true, "data": { "quoteId": "cmv…", "folio": "COT-2026-000351", "totalCents": 18000, "validUntil": "2026-11-04T23:08:40.099Z" } }
```

### `listBranches`

Sucursales activas (solo la de la llave, si está limitada a una). Emilia la usa para obtener el `branchId`.

```json
{}
```

```json
{ "ok": true, "data": [{ "id": "cmv…", "code": "MAT", "name": "Matriz", "address": "…", "phone": "…" }] }
```

### `findOrCreatePatient`

Obtiene el paciente para agendar su cita. Reutiliza la ficha que tenga **el mismo teléfono y el mismo nombre y apellido paterno**; si no existe, crea una nueva con origen `EMILIA`. Un teléfono puede ser de varias personas (por ejemplo, una mamá que agenda para su hijo), por eso se compara también el nombre.

```json
{
  "branchId": "cmv…",
  "firstName": "Ana",
  "lastName": "López",
  "secondLastName": "Ruiz",
  "birthDate": "1990-05-12",
  "phone": "2221234567",
  "email": "ana@example.com"
}
```

- `secondLastName`, `birthDate` y `email` son opcionales.
- La ficha nueva queda **sin autorización de contacto** (`contactConsent = false`); el personal la registra en la visita.
- Solo devuelve el identificador y el folio: Emilia no consulta expedientes.

```json
{ "ok": true, "data": { "patientId": "cmv…", "folio": "PAC-000123", "created": true } }
```

### `checkAvailability`

Horarios con cupo para un día, según el horario configurado de la sucursal, la capacidad por intervalo y la anticipación mínima.

```json
{ "branchId": "cmv…", "date": "2026-10-22", "type": "BRANCH" }
```

`type`: `BRANCH` (en sucursal) o `HOME` (a domicilio).

```json
{
  "ok": true,
  "data": {
    "open": true,
    "slots": [{ "time": "07:00", "startsAt": "2026-10-22T13:00:00.000Z" }]
  }
}
```

`open: false` indica que la sucursal no atiende ese día, o que no ofrece servicio a domicilio.

### `createAppointment`

Solicita una cita para un paciente (usa antes `findOrCreatePatient` para obtener su `patientId`). La cita queda en estado `PENDING`.

El servidor rechaza la solicitud en estos casos:

- el horario no tiene cupo;
- está fuera del horario de la sucursal o no coincide con un intervalo;
- incumple la anticipación mínima o el máximo de días;
- el paciente ya tiene una cita en ese horario;
- es a domicilio y no incluye dirección.

```json
{
  "branchId": "cmv…",
  "patientId": "cmv…",
  "startsAt": "2026-10-22T13:00:00.000Z",
  "type": "BRANCH",
  "homeAddress": "Solo si type = HOME",
  "studyIds": ["cmv…"],
  "conversationId": "cmv…"
}
```

```json
{ "ok": true, "data": { "appointmentId": "cmv…", "folio": "CIT-2026-000123", "status": "PENDING", "startsAt": "2026-10-22T13:00:00.000Z" } }
```

### `createLead`

Registra un prospecto como oportunidad comercial en la etapa **Prospecto**, con origen `EMILIA`.

```json
{
  "name": "Empresa Ejemplo",
  "phone": "2220001234",
  "clientType": "COMPANY",
  "interest": "Estudios de ingreso para 20 empleados",
  "branchId": "cmv…",
  "estimatedCents": 0
}
```

`clientType`: `PATIENT`, `DOCTOR`, `CLINIC`, `HOSPITAL`, `COMPANY`, `SCHOOL` o `INSTITUTION`.

```json
{ "ok": true, "data": { "opportunityId": "cmv…", "stage": "PROSPECT" } }
```

### `handoffToHuman`

Transfiere la conversación a personal humano. Cambia su estado a `TRANSFERRED`, agrega un mensaje de sistema y genera una notificación para la sucursal.

Emilia debe usar esta acción ante:

- solicitudes de interpretación clínica;
- quejas;
- reembolsos;
- indicaciones no aprobadas;
- cualquier tema fuera de sus capacidades.

```json
{ "conversationId": "cmv…", "reason": "Solicitud de interpretación de resultados" }
```

```json
{ "ok": true, "data": { "conversationId": "cmv…", "status": "TRANSFERRED" } }
```

---

## Ejemplo con curl

```bash
KEY="ibn_demo_…"
URL="http://localhost:3000/api/emilia"

curl -s -X POST "$URL/searchStudies" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"query":"perfil hepatico"}'

curl -s -X POST "$URL/createQuote" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: conv123-quote-1" \
  -d '{"branchId":"<id>","prospectName":"Prospecto","items":[{"studyId":"<id>"}]}'
```

## Bandeja en el CRM

El módulo **Emilia IA** (`/emilia`) muestra las conversaciones, permite que el personal las tome, las marque como pendientes, las cierre o las reabra, y que vincule pacientes o registre oportunidades.

Mientras no se configure `EMILIA_AGENT_URL` y la integración del canal (WhatsApp o sitio web):

- la interfaz indica que la IA no está conectada;
- las conversaciones de demostración aparecen marcadas como **Simuladas**;
- las respuestas del personal se guardan en el historial, pero **no se envían** al contacto.

## Pendiente para producción

- Conectar el agente real de Emilia y el canal de WhatsApp Business o del sitio web. Es necesario un endpoint que reciba mensajes y los guarde en `Conversation` y `Message`.
- Mover el límite de solicitudes a un almacén compartido si hay varias instancias.
- Rotar llaves periódicamente y revocar las que no se usen.
- Revisar el aviso de privacidad y el consentimiento de contacto de los pacientes antes de enviar mensajes salientes.
