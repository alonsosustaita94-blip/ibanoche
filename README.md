# IBANOCHE — Sitio web

Sitio web (solo frontend) de **IBANOCHE — Laboratorio de Análisis Clínicos**, construido con Next.js, React, TypeScript, Tailwind CSS y Lucide React.

## Ejecutar en local

Requisitos: Node.js 18.18 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
```

Versión de producción:

```bash
npm run build
npm start
```

Versión estática (archivos HTML en `out/`, para cualquier hosting de archivos):

```bash
STATIC_EXPORT=1 npm run build
```

## Publicación en GitHub Pages

El flujo `.github/workflows/deploy-pages.yml` exporta y publica el sitio en cada push a la rama principal.
Activación (una sola vez): en GitHub, **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Dirección: `https://alonsosustaita94-blip.github.io/ibanoche/`.

## Páginas

| Ruta | Contenido |
| --- | --- |
| `/` | Inicio: portada, beneficios, sucursales, ¿Por qué elegir IBANOCHE?, servicios |
| `/estudios` | Estudios clínicos: buscador, categorías y resultados |
| `/servicios` | Resumen de servicios |
| `/servicios/renta-de-consultorio` | Renta de consultorio por hora |
| `/profesionales` | Página para médicos y profesionales de la salud |
| `/nosotros` | Nosotros y ¿Por qué elegir IBANOCHE? |
| `/sucursales` | Torres Médicas 4 y Centro Médico de Diagnóstico |
| `/contacto` | Contacto y opciones de atención |

## Estructura

```
src/
  app/                 Páginas (App Router)
  components/
    ui.tsx             Logotipo, títulos, botones, iconos y espacios fotográficos
    actions.tsx        Botones de WhatsApp, llamada y mapa, y aviso de demostración
    header.tsx         Barra superior, navegación fija y menú móvil
    footer.tsx         Pie de página
    sections.tsx       Secciones reutilizables (beneficios, ¿Por qué elegirnos?, sucursales, CTA)
    page-hero.tsx      Portada estándar de las páginas internas
    study-explorer.tsx Buscador y categorías de estudios
    illustrations.tsx  Ilustraciones científicas provisionales
    reveal.tsx         Animación de aparición al desplazarse
  config/site.ts       Datos de contacto, redes, sucursales y fotografías
  data/studies.ts      Catálogo de ejemplo (solo nombres)
tailwind.config.ts     Colores y tipografías del manual de marca
```

## Sistema de diseño

Basado en el Manual de Marca v1.0:

- Azul corporativo `#12549A`, turquesa `#32B8BE`, coral `#E74758`, blanco, gris claro `#F4F7FA` y gris texto `#596A82`.
- Montserrat para títulos y elementos destacados. Open Sans para párrafos y textos secundarios.
- Títulos en dos tonos (azul y turquesa), tarjetas redondeadas con sombras suaves, formas orgánicas en las esquinas y cruz de salud translúcida.

## Cómo completar el sitio

Todo se edita en `src/config/site.ts`. Los botones que dependen de datos aún vacíos muestran un aviso de demostración. Al completar el dato, el botón realiza la acción real.

- **WhatsApp:** `contact.whatsapp`, solo dígitos con lada de país (ej. `522221234567`). Cada botón abre WhatsApp con un mensaje según el servicio.
- **Teléfono y correo:** `contact.phone` (ej. `+522221234567`) y `contact.email`.
- **Redes sociales:** `social.facebook`, `social.instagram`.
- **Sucursales:** `address`, `schedule`, `phone`, `whatsapp`, `mapsUrl` e `image` de cada sucursal.
- **Fotografías:** coloca los archivos en `public/images/` y escribe la ruta en `photos` (ej. `hero: "/images/hero.jpg"`). Mientras sea `null` se muestra una ilustración.
- **Logotipo oficial:** el logotipo actual es tipográfico y temporal. Reemplaza el contenido del componente `Logo` en `src/components/ui.tsx` por el archivo oficial (SVG recomendado en `public/`).
- **Catálogo:** `src/data/studies.ts` contiene solo nombres de ejemplo, sin precios, tiempos ni indicaciones.

## Pendientes antes de publicar

- [ ] Logotipo oficial en SVG o PNG con fondo transparente.
- [ ] Número de WhatsApp, teléfono y correo oficiales.
- [ ] Direcciones, horarios, teléfonos y enlaces de Google Maps de cada sucursal.
- [ ] Fotografías reales: portada, laboratorio, atención al paciente, profesionales, consultorio, fachadas y contacto.
- [ ] Catálogo de estudios validado (precios públicos, tiempos de entrega e indicaciones de preparación aprobadas).
- [ ] Enlaces de redes sociales.
- [ ] Aviso de privacidad (texto legal).
- [ ] Dominio y alojamiento (el sitio es compatible con Vercel u otro hosting de Next.js).
