/**
 * Ilustraciones científicas en colores de marca.
 * Se usan como sustituto visual mientras no existan fotografías reales
 * (ver `site.photos` en src/config/site.ts).
 */

const C = {
  blue: "#12549A",
  turquoise: "#32B8BE",
  coral: "#E74758",
  ice: "#EAF2FA",
  mint: "#E7F7F8",
};

type SceneProps = { className?: string };

function Bokeh({ seed = 1 }: { seed?: number }) {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const r = ((i * 37 + seed * 11) % 23) + 6;
    const x = (i * 97 + seed * 53) % 600;
    const y = (i * 61 + seed * 29) % 500;
    return <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.35 + ((i % 3) * 0.12)} />;
  });
  return <g>{dots}</g>;
}

function Dna({ x, y, height, amp = 34, opacity = 0.5 }: { x: number; y: number; height: number; amp?: number; opacity?: number }) {
  const steps = Math.floor(height / 16);
  const items = [];
  for (let i = 0; i <= steps; i++) {
    const t = i * 0.42;
    const yy = y + i * 16;
    const a = x + Math.sin(t) * amp;
    const b = x - Math.sin(t) * amp;
    const front = Math.cos(t) > 0;
    items.push(
      <g key={i}>
        <line x1={a} y1={yy} x2={b} y2={yy} stroke="#fff" strokeWidth={2} opacity={0.7} />
        <circle cx={a} cy={yy} r={front ? 5.5 : 3.5} fill={front ? C.turquoise : "#8FD3E8"} />
        <circle cx={b} cy={yy} r={front ? 3.5 : 5.5} fill={front ? "#9DBEE2" : C.blue} />
      </g>,
    );
  }
  return <g opacity={opacity}>{items}</g>;
}

function Cross({ x, y, s, opacity = 0.55 }: { x: number; y: number; s: number; opacity?: number }) {
  const w = s / 3;
  return (
    <g opacity={opacity}>
      <rect x={x - w / 2} y={y - s / 2} width={w} height={s} rx={w / 4} fill="#fff" />
      <rect x={x - s / 2} y={y - w / 2} width={s} height={w} rx={w / 4} fill="#fff" />
    </g>
  );
}

function Tube({ x, y, h, liquid, cap, level = 0.55 }: { x: number; y: number; h: number; liquid: string; cap: string; level?: number }) {
  const w = 30;
  const lh = h * level;
  return (
    <g>
      <rect x={x} y={y - 16} width={w} height={20} rx={5} fill={cap} />
      <rect x={x + 2} y={y} width={w - 4} height={h} rx={(w - 4) / 2} fill="url(#glass)" stroke="#CFE3F3" strokeWidth={1.5} />
      <rect x={x + 4} y={y + h - lh} width={w - 8} height={lh - 2} rx={(w - 8) / 2} fill={liquid} opacity={0.85} />
      <rect x={x + 8} y={y + 8} width={4} height={h - 24} rx={2} fill="#fff" opacity={0.7} />
    </g>
  );
}

function SharedDefs() {
  return (
    <defs>
      <linearGradient id="bg-lab" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F7FBFE" />
        <stop offset="0.55" stopColor="#DCEBF7" />
        <stop offset="1" stopColor="#BFDBEE" />
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="0.5" stopColor="#E8F3FB" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id="liquid-blue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6CC9EA" />
        <stop offset="1" stopColor={C.blue} />
      </linearGradient>
      <linearGradient id="liquid-turq" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8BE0E3" />
        <stop offset="1" stopColor={C.turquoise} />
      </linearGradient>
      <linearGradient id="liquid-coral" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F48A96" />
        <stop offset="1" stopColor={C.coral} />
      </linearGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#E9EEF4" />
        <stop offset="0.5" stopColor="#ffffff" />
        <stop offset="1" stopColor="#C9D4E0" />
      </linearGradient>
      <linearGradient id="deep" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2A6FB5" />
        <stop offset="1" stopColor="#0C3B70" />
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Frame({ children, className, label }: SceneProps & { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={label}>
      <SharedDefs />
      <rect width="600" height="500" fill="url(#bg-lab)" />
      {children}
    </svg>
  );
}

/** Portada: rack de tubos, pipeta con gota y hélice de ADN. */
export function LabScene({ className }: SceneProps) {
  return (
    <Frame className={className} label="Ilustración de laboratorio clínico con pipeta, tubos de ensayo y ADN">
      <Bokeh seed={2} />
      <Dna x={150} y={20} height={470} amp={42} opacity={0.55} />
      <Cross x={300} y={150} s={120} opacity={0.5} />
      <circle cx={430} cy={250} r={190} fill="url(#glow)" />
      {/* Pipeta */}
      <g transform="translate(-10 30) rotate(32 470 120)">
        <rect x={455} y={-120} width={30} height={70} rx={12} fill={C.blue} />
        <rect x={462} y={-56} width={16} height={230} rx={8} fill="url(#glass)" stroke="#BFD9EE" strokeWidth={2} />
        <rect x={465} y={60} width={10} height={108} rx={5} fill="url(#liquid-blue)" opacity={0.9} />
        <path d="M462 172 L478 172 L472 214 L468 214 Z" fill="url(#glass)" stroke="#BFD9EE" strokeWidth={2} />
      </g>
      <g className="motion-safe:animate-float">
        <path d="M410 240 C 410 240 399 254 399 262 a 11 11 0 0 0 22 0 C 421 254 410 240 410 240 Z" fill="url(#liquid-blue)" />
        <circle cx={405} cy={262} r={2.5} fill="#fff" opacity={0.8} />
      </g>
      {/* Rack de tubos */}
      <g transform="translate(0 -70)">
        <Tube x={300} y={372} h={110} liquid="url(#liquid-blue)" cap={C.blue} level={0.5} />
        <Tube x={345} y={362} h={120} liquid="url(#liquid-turq)" cap={C.turquoise} level={0.6} />
        <Tube x={390} y={372} h={110} liquid="url(#liquid-coral)" cap={C.coral} level={0.45} />
        <Tube x={435} y={362} h={120} liquid="url(#liquid-blue)" cap={C.blue} level={0.62} />
        <Tube x={480} y={372} h={110} liquid="url(#liquid-turq)" cap={C.turquoise} level={0.5} />
        <rect x={282} y={420} width={250} height={22} rx={8} fill="#fff" opacity={0.92} />
        <rect x={282} y={470} width={250} height={30} rx={8} fill="#fff" opacity={0.95} />
      </g>
    </Frame>
  );
}

/** Estudios: gradilla con muchos tubos de muestra. */
export function TubesScene({ className }: SceneProps) {
  const colors = [C.blue, C.turquoise, C.coral, "#6A3FA0", C.blue, C.turquoise, C.blue, C.coral];
  const liquids = ["url(#liquid-blue)", "url(#liquid-turq)", "url(#liquid-coral)"];
  return (
    <Frame className={className} label="Ilustración de tubos de muestra en una gradilla de laboratorio">
      <Bokeh seed={5} />
      <Dna x={520} y={10} height={300} amp={30} opacity={0.4} />
      <Cross x={110} y={110} s={90} opacity={0.45} />
      <g>
        {colors.map((cap, i) => (
          <Tube key={i} x={60 + i * 62} y={210 + (i % 2) * 14} h={150} liquid={liquids[i % 3]} cap={cap} level={0.4 + (i % 3) * 0.12} />
        ))}
        <rect x={40} y={300} width={530} height={26} rx={10} fill="#fff" opacity={0.9} />
      </g>
      {/* Mano enguantada estilizada sosteniendo un tubo */}
      <g transform="translate(430 60) rotate(18)">
        <Tube x={0} y={20} h={120} liquid="url(#liquid-coral)" cap={C.blue} level={0.6} />
      </g>
    </Frame>
  );
}

/** Por qué elegirnos: microscopio. */
export function MicroscopeScene({ className }: SceneProps) {
  return (
    <Frame className={className} label="Ilustración de microscopio de laboratorio">
      <Bokeh seed={7} />
      <Dna x={90} y={40} height={430} amp={36} opacity={0.4} />
      <Cross x={470} y={110} s={100} opacity={0.5} />
      <g transform="translate(200 70)">
        <rect x={20} y={330} width={220} height={36} rx={14} fill="url(#deep)" />
        <path d="M150 330 C 150 250 200 200 200 140 L 170 120 C 160 190 110 230 110 330 Z" fill="url(#metal)" stroke="#C7D3E0" />
        <rect x={50} y={250} width={150} height={16} rx={6} fill="url(#deep)" />
        <circle cx={185} cy={210} r={20} fill="url(#metal)" stroke="#C7D3E0" />
        <g transform="rotate(-28 110 90)">
          <rect x={90} y={0} width={44} height={150} rx={14} fill="#fff" stroke="#C7D3E0" strokeWidth={2} />
          <rect x={98} y={-28} width={28} height={36} rx={8} fill={C.blue} />
          <rect x={102} y={150} width={20} height={40} rx={6} fill="url(#metal)" stroke="#C7D3E0" />
        </g>
        <ellipse cx={120} cy={246} rx={34} ry={7} fill={C.turquoise} opacity={0.7} />
      </g>
      <g opacity={0.9}>
        <circle cx={470} cy={360} r={46} fill="#fff" />
        <circle cx={455} cy={350} r={9} fill={C.coral} opacity={0.75} />
        <circle cx={485} cy={372} r={7} fill={C.turquoise} />
        <circle cx={478} cy={340} r={5} fill={C.blue} opacity={0.7} />
        <circle cx={460} cy={380} r={5} fill={C.turquoise} opacity={0.7} />
      </g>
    </Frame>
  );
}

/** Profesionales: reporte de resultados y estetoscopio. */
export function ProfessionalsScene({ className }: SceneProps) {
  return (
    <Frame className={className} label="Ilustración de reporte clínico y estetoscopio">
      <Bokeh seed={3} />
      <Dna x={520} y={20} height={460} amp={34} opacity={0.4} />
      <g transform="rotate(-6 260 260)">
        <rect x={120} y={70} width={280} height={360} rx={22} fill="#fff" stroke="#D6E4F1" strokeWidth={2} />
        <rect x={150} y={100} width={120} height={14} rx={7} fill={C.blue} />
        <rect x={150} y={124} width={80} height={8} rx={4} fill={C.turquoise} />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect x={150} y={160 + i * 32} width={130} height={9} rx={4.5} fill="#D9E5F1" />
            <rect x={300} y={160 + i * 32} width={70} height={9} rx={4.5} fill={i === 2 ? C.coral : "#B9D3EA"} opacity={i === 2 ? 0.7 : 1} />
          </g>
        ))}
      </g>
      <path
        d="M380 120 C 470 120 480 220 430 270 C 390 310 410 380 470 390"
        fill="none"
        stroke={C.blue}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <circle cx={478} cy={392} r={26} fill="url(#metal)" stroke="#AFC1D4" strokeWidth={3} />
      <circle cx={478} cy={392} r={14} fill={C.turquoise} opacity={0.7} />
      <circle cx={380} cy={120} r={9} fill={C.coral} />
    </Frame>
  );
}

/** Renta de consultorio: consultorio moderno y luminoso. */
export function ConsultorioScene({ className }: SceneProps) {
  return (
    <Frame className={className} label="Ilustración de consultorio médico moderno y luminoso">
      <rect x={60} y={40} width={300} height={250} rx={14} fill="#fff" opacity={0.85} />
      <rect x={76} y={56} width={268} height={218} rx={8} fill="#CFE6F6" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={96 + i * 62} y={150 - (i % 2) * 40} width={42} height={124 + (i % 2) * 40} fill="#A9CBE6" opacity={0.8} />
      ))}
      <line x1={210} y1={56} x2={210} y2={274} stroke="#fff" strokeWidth={6} />
      <Bokeh seed={9} />
      {/* Piso */}
      <rect x={0} y={390} width={600} height={110} fill="#F4F7FA" />
      {/* Escritorio */}
      <rect x={250} y={300} width={260} height={18} rx={6} fill="#fff" stroke="#D4E1EE" />
      <rect x={270} y={318} width={12} height={80} fill="#C8D6E5" />
      <rect x={478} y={318} width={12} height={80} fill="#C8D6E5" />
      <rect x={400} y={248} width={78} height={52} rx={6} fill="url(#deep)" />
      <rect x={430} y={300} width={18} height={4} fill="#9FB3C8" />
      {/* Silla */}
      <rect x={190} y={300} width={60} height={70} rx={18} fill={C.blue} />
      <rect x={198} y={360} width={50} height={14} rx={7} fill="#0C3B70" />
      <rect x={220} y={374} width={6} height={30} fill="#9FB3C8" />
      {/* Camilla */}
      <rect x={60} y={330} width={120} height={22} rx={10} fill={C.turquoise} />
      <rect x={70} y={352} width={8} height={46} fill="#C8D6E5" />
      <rect x={162} y={352} width={8} height={46} fill="#C8D6E5" />
      {/* Planta */}
      <rect x={530} y={340} width={36} height={56} rx={8} fill="#fff" stroke="#D4E1EE" />
      <ellipse cx={548} cy={320} rx={22} ry={34} fill="#5DBB9C" />
      <ellipse cx={532} cy={330} rx={12} ry={24} fill="#3FA184" />
      {/* Lámpara */}
      <line x1={420} y1={0} x2={420} y2={90} stroke="#C8D6E5" strokeWidth={3} />
      <path d="M396 90 h48 l-10 24 h-28 Z" fill="#fff" stroke="#D4E1EE" />
      <Cross x={520} y={110} s={70} opacity={0.6} />
    </Frame>
  );
}

/** Sucursales: fachada de edificio médico. */
export function BuildingScene({ className, variant = 0 }: SceneProps & { variant?: number }) {
  const cols = variant ? 5 : 6;
  return (
    <Frame className={className} label="Ilustración de fachada de edificio médico">
      <Bokeh seed={variant + 11} />
      <rect x={110} y={variant ? 90 : 50} width={380} height={420} rx={10} fill="#fff" />
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={130 + c * (340 / cols)}
            y={(variant ? 110 : 70) + r * 52}
            width={340 / cols - 12}
            height={38}
            rx={4}
            fill={(r + c) % 4 === 0 ? "#A9CBE6" : "#CFE6F6"}
          />
        )),
      )}
      <rect x={110} y={420} width={380} height={90} fill={variant ? C.turquoise : C.blue} opacity={0.12} />
      <rect x={250} y={430} width={100} height={70} rx={6} fill="#CFE6F6" stroke="#fff" strokeWidth={4} />
      <rect x={200} y={385} width={200} height={34} rx={8} fill={variant ? C.turquoise : C.blue} />
      <g transform="translate(300 402)">
        <rect x={-4} y={-12} width={8} height={24} rx={2} fill="#fff" />
        <rect x={-12} y={-4} width={24} height={8} rx={2} fill="#fff" />
      </g>
      <ellipse cx={80} cy={470} rx={40} ry={60} fill="#5DBB9C" opacity={0.8} />
      <ellipse cx={530} cy={470} rx={40} ry={60} fill="#5DBB9C" opacity={0.8} />
    </Frame>
  );
}

/** Contacto: diadema de atención y mensajes. */
export function SupportScene({ className }: SceneProps) {
  return (
    <Frame className={className} label="Ilustración de atención al paciente con diadema y mensajes">
      <Bokeh seed={4} />
      <Dna x={90} y={30} height={440} amp={30} opacity={0.35} />
      <Cross x={500} y={90} s={90} opacity={0.55} />
      <g transform="translate(300 250)">
        <circle r={150} fill="#fff" opacity={0.7} />
        <path d="M-95 20 A 95 95 0 0 1 95 20" fill="none" stroke={C.blue} strokeWidth={18} strokeLinecap="round" />
        <rect x={-120} y={0} width={46} height={86} rx={20} fill={C.blue} />
        <rect x={74} y={0} width={46} height={86} rx={20} fill={C.blue} />
        <path d="M-97 86 C -90 130 -40 140 0 136" fill="none" stroke={C.blue} strokeWidth={8} strokeLinecap="round" />
        <rect x={-6} y={126} width={30} height={20} rx={10} fill={C.turquoise} />
        <path d="M-12 -40 C -40 -70 -80 -30 -12 10 C 56 -30 16 -70 -12 -40 Z" fill={C.coral} transform="translate(12 0)" />
      </g>
      <g>
        <rect x={380} y={300} width={170} height={60} rx={22} fill="#fff" />
        <rect x={400} y={318} width={110} height={9} rx={4.5} fill="#B9D3EA" />
        <rect x={400} y={334} width={70} height={9} rx={4.5} fill={C.turquoise} />
        <rect x={60} y={150} width={150} height={56} rx={22} fill={C.turquoise} />
        <rect x={80} y={170} width={100} height={8} rx={4} fill="#fff" />
        <rect x={80} y={184} width={60} height={8} rx={4} fill="#fff" opacity={0.7} />
      </g>
    </Frame>
  );
}

export const scenes = {
  lab: LabScene,
  tubes: TubesScene,
  microscope: MicroscopeScene,
  professionals: ProfessionalsScene,
  consultorio: ConsultorioScene,
  building: BuildingScene,
  support: SupportScene,
};

export type SceneName = keyof typeof scenes;
