import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The waiting page's three drawings (owner, 2026-10-09: "each screen will have different
 * animation"), one for each part that can be away: Paperbase's server thinking while its gears
 * turn, the ID card scanned again and again while sign-in is away, the router searching for a
 * Wi-Fi signal while the device itself is offline. Coloured by `.pb-art` (globals.css), light and
 * dark; the page wears `.pb-motion`, so nothing moves for someone whose device asks for less.
 *
 * Drawn on a 320 x 240 grid. A turning part names its centre on that grid, or (inside the card,
 * which floats) carries a circle the size of its turn so that its own box is centred on it.
 */

const C = {
  ink: "var(--art-ink)",
  surface: "var(--art-surface)",
  t1: "var(--art-t1)",
  t2: "var(--art-t2)",
  t3: "var(--art-t3)",
  t4: "var(--art-t4)",
  blob: "var(--art-blob)",
  ground: "var(--art-ground)",
  amber: "var(--art-amber)",
  amberSoft: "var(--art-amber-soft)",
  blue: "var(--art-blue)",
  blueSoft: "var(--art-blue-soft)",
  red: "var(--art-red)",
  green: "var(--art-green)",
  mark: "var(--art-mark)",
} as const;

const LINE = { stroke: C.ink, strokeWidth: 2 } as const;
const ROUND = { strokeLinecap: "round", strokeLinejoin: "round" } as const;
const OWN_CENTRE: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

function Frame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" aria-hidden className={cn("pb-art aspect-[4/3]", className)}>
      {children}
    </svg>
  );
}

/** The four-pointed spark and the dot that twinkle around every drawing. */
function Sparkle({ x, y, size, seconds, delay }: { x: number; y: number; size: number; seconds: number; delay: number }) {
  const s = size;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M0 ${-s}Q0 0 ${s} 0Q0 0 0 ${s}Q0 0 ${-s} 0Q0 0 0 ${-s}Z`}
        fill={C.t3}
        style={{ ...OWN_CENTRE, animation: `pb-twinkle ${seconds}s ease-in-out ${delay}s infinite` }}
      />
    </g>
  );
}

function Glint({ x, y, r, seconds, delay }: { x: number; y: number; r: number; seconds: number; delay: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={C.t3}
      opacity={0.35}
      style={{ animation: `pb-glint ${seconds}s ease-in-out ${delay}s infinite` }}
    />
  );
}

/** A light that blinks, with its glow. */
function Led({ x, y, colour, seconds, delay = 0 }: { x: number; y: number; colour: string; seconds: number; delay?: number }) {
  const timing = `${seconds}s ease-in-out ${delay}s infinite`;
  return (
    <>
      <circle cx={x} cy={y} r={6.5} fill={colour} opacity={0.3} style={{ animation: `pb-fade ${timing}` }} />
      <circle cx={x} cy={y} r={3.2} fill={colour} style={{ animation: `pb-dim ${timing}` }} />
    </>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A gear's outline: `teeth` teeth between the root and tip circles, the first centred on `phase` degrees. */
function gearPath(cx: number, cy: number, teeth: number, rootR: number, tipR: number, phase: number): string {
  const step = 360 / teeth;
  const at = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${round2(cx + r * Math.cos(rad))} ${round2(cy + r * Math.sin(rad))}`;
  };
  let d = "";
  for (let k = 0; k < teeth; k++) {
    const a = phase + k * step;
    d += `${k === 0 ? "M" : "L"}${at(rootR, a - step * 0.27)}`;
    d += `L${at(tipR, a - step * 0.15)}A${tipR} ${tipR} 0 0 1 ${at(tipR, a + step * 0.15)}L${at(rootR, a + step * 0.27)}`;
    d += `A${rootR} ${rootR} 0 0 1 ${at(rootR, a + step - step * 0.27)}`;
  }
  return `${d}Z`;
}

// The two gears meet on the line between their centres: the big one's tooth faces a gap of the small one's.
const BIG = { x: 214, y: 92 };
const SMALL = { x: 241, y: 61 };
const MESH = (Math.atan2(SMALL.y - BIG.y, SMALL.x - BIG.x) * 180) / Math.PI;
const BIG_GEAR = gearPath(BIG.x, BIG.y, 10, 24, 31, MESH);
const SMALL_GEAR = gearPath(SMALL.x, SMALL.y, 6, 12, 17.5, MESH + 180 + 30);

/** Paperbase's API is away: the server is thinking ("...") and its gears turn -- we are on it. */
export function ServerDown({ className }: { className?: string }) {
  const units = [
    { y: 98, lights: ["amber", "off"] },
    { y: 134, lights: ["off", "amber"] },
    { y: 170, lights: ["off", "off"] },
  ];
  return (
    <Frame className={className}>
      <path d="M66 128C62 80 104 46 160 44C218 42 262 74 262 124C262 172 224 204 162 204C104 204 70 176 66 128Z" fill={C.blob} />
      <Sparkle x={50} y={132} size={6} seconds={3.2} delay={0} />
      <Glint x={286} y={132} r={2.5} seconds={2.6} delay={-1} />
      <Sparkle x={274} y={184} size={4.5} seconds={2.8} delay={-1.4} />
      <Glint x={74} y={182} r={2} seconds={3} delay={-0.6} />
      <ellipse cx={160} cy={206} rx={66} ry={5} fill={C.ground} />

      {/* 10 and 6 teeth: the small gear turns 10/6 as fast, the other way. */}
      <g style={{ transformOrigin: `${SMALL.x}px ${SMALL.y}px`, animation: "pb-turn 7.2s linear infinite reverse" }}>
        <path d={SMALL_GEAR} fill={C.t2} {...LINE} {...ROUND} />
        <circle cx={SMALL.x} cy={SMALL.y} r={5} fill={C.surface} {...LINE} />
      </g>
      <g style={{ transformOrigin: `${BIG.x}px ${BIG.y}px`, animation: "pb-turn 12s linear infinite" }}>
        <path d={BIG_GEAR} fill={C.amberSoft} {...LINE} {...ROUND} />
        <circle cx={BIG.x} cy={BIG.y} r={10} fill={C.surface} {...LINE} />
        <circle cx={BIG.x} cy={BIG.y} r={3.5} fill={C.ink} />
      </g>

      {[124, 184].map((x) => (
        <rect key={x} x={x} y={198} width={14} height={8} rx={2.5} fill={C.t3} {...LINE} />
      ))}
      {units.map(({ y, lights }, i) => (
        <g key={y}>
          <rect x={110} y={y} width={100} height={32} rx={7} fill={C.surface} />
          <path d={`M110 ${y + 23}H210V${y + 25}A7 7 0 0 1 203 ${y + 32}H117A7 7 0 0 1 110 ${y + 25}Z`} fill={C.t1} />
          {[122, 128, 134].map((x) => (
            <path key={x} d={`M${x} ${y + 8}V${y + 17}`} stroke={C.t3} strokeWidth={2.5} strokeLinecap="round" />
          ))}
          <rect x={146} y={y + 10} width={30} height={5} rx={2.5} fill={C.t2} />
          {lights.map((light, j) =>
            light === "amber" ? (
              <Led key={j} x={188 + j * 10} y={y + 12.5} colour={C.amber} seconds={1.4} delay={-0.7 * i} />
            ) : (
              <circle key={j} cx={188 + j * 10} cy={y + 12.5} r={3.2} fill={C.t3} />
            )
          )}
          <rect x={110} y={y} width={100} height={32} rx={7} {...LINE} />
        </g>
      ))}

      {/* The answer that has not come yet. */}
      <path
        d="M71 64H91A15 15 0 0 1 106 79A15 15 0 0 1 98.5 92L108 103L88 94H71A15 15 0 0 1 56 79A15 15 0 0 1 71 64Z"
        fill={C.surface}
        {...LINE}
        {...ROUND}
      />
      {[71, 81, 91].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={79}
          r={3}
          fill={C.t4}
          opacity={0.5}
          style={{ animation: `pb-typing 1.4s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
    </Frame>
  );
}

/** Accounts is away: the ID card is scanned again and again, and the clock ticks on. */
export function SignInDown({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M60 122C60 76 102 46 156 46C214 46 262 78 262 128C262 176 220 204 160 204C102 204 60 170 60 122Z" fill={C.blob} />
      <Sparkle x={62} y={70} size={6} seconds={3.2} delay={0} />
      <Glint x={50} y={148} r={2.5} seconds={2.6} delay={-1} />
      <Sparkle x={276} y={176} size={4.5} seconds={2.8} delay={-1.4} />
      <Glint x={72} y={188} r={2} seconds={3} delay={-0.6} />
      {/* The shadow narrows as the card rises. */}
      <ellipse
        cx={160}
        cy={206}
        rx={58}
        ry={5}
        fill={C.ground}
        style={{ ...OWN_CENTRE, animation: "pb-squash 4s ease-in-out infinite" }}
      />

      <g style={{ animation: "pb-bob 4s ease-in-out infinite" }}>
        <rect x={96} y={82} width={128} height={92} rx={12} fill={C.surface} />
        <path d="M96 104V94A12 12 0 0 1 108 82H212A12 12 0 0 1 224 94V104Z" fill={C.blueSoft} />
        <rect x={148} y={89} width={24} height={6} rx={3} fill={C.surface} stroke={C.ink} strokeWidth={1.5} />
        <circle cx={128} cy={136} r={19} fill={C.t1} />
        <circle cx={128} cy={130} r={7} fill={C.t3} />
        <path d="M116.2 151C117 143.5 122 140 128 140C134 140 139 143.5 139.8 151A19 19 0 0 1 116.2 151Z" fill={C.t3} />
        <rect x={156} y={124} width={52} height={7} rx={3.5} fill={C.t2} />
        <rect x={156} y={138} width={38} height={6} rx={3} fill={C.t1} />
        <rect x={156} y={150} width={46} height={6} rx={3} fill={C.t1} />
        <rect x={96} y={82} width={128} height={92} rx={12} {...LINE} />

        {["M84 88V78A8 8 0 0 1 92 70H102", "M218 70H228A8 8 0 0 1 236 78V88", "M84 168V178A8 8 0 0 0 92 186H102", "M218 186H228A8 8 0 0 0 236 178V168"].map(
          (d) => (
            <path key={d} d={d} stroke={C.blue} strokeWidth={3} {...ROUND} />
          )
        )}
        {/* The scan, sweeping down and up across the card; still, it rests across the middle. */}
        <g style={{ animation: "pb-scan 3.2s ease-in-out infinite" }}>
          <rect x={92} y={119} width={136} height={18} rx={9} fill={C.blue} opacity={0.1} />
          <rect x={92} y={124} width={136} height={8} rx={4} fill={C.blue} opacity={0.16} />
          <path d="M90 128H230" stroke={C.blue} strokeWidth={2.5} strokeLinecap="round" />
        </g>

        <circle cx={256} cy={96} r={15} fill={C.amberSoft} {...LINE} />
        <g style={{ ...OWN_CENTRE, animation: "pb-turn 3s linear infinite" }}>
          <circle cx={256} cy={96} r={9} />
          <path d="M256 96V88" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
        </g>
        <g style={{ ...OWN_CENTRE, animation: "pb-turn 36s linear infinite" }}>
          <circle cx={256} cy={96} r={9} />
          <path d="M256 96H261" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
        </g>
        <circle cx={256} cy={96} r={2} fill={C.ink} />
      </g>
    </Frame>
  );
}

/** The Wi-Fi sign's arc of radius `r` over (160, 140), a quarter turn wide. */
function wifiArc(r: number): string {
  const k = round2(r * Math.SQRT1_2);
  return `M${round2(160 - k)} ${round2(140 - k)}A${r} ${r} 0 0 1 ${round2(160 + k)} ${round2(140 - k)}`;
}

/** The device is offline: the router keeps searching, its signal runs out and reaches nothing. */
export function NoInternet({ className }: { className?: string }) {
  const antennas = [
    { x: 116, lean: -10, delay: 0 },
    { x: 204, lean: 10, delay: -1.5 },
  ];
  return (
    <Frame className={className}>
      <path d="M64 130C58 82 100 48 158 46C218 44 262 80 260 130C258 178 220 204 160 204C102 204 70 178 64 130Z" fill={C.blob} />
      <Sparkle x={66} y={86} size={6} seconds={3.2} delay={0} />
      <Glint x={266} y={62} r={2.5} seconds={2.6} delay={-1} />
      <Sparkle x={276} y={166} size={4.5} seconds={2.8} delay={-1.4} />
      <Glint x={54} y={158} r={2} seconds={3} delay={-0.6} />
      <ellipse cx={160} cy={206} rx={72} ry={5} fill={C.ground} />

      {antennas.map(({ x, lean, delay }) => (
        <g
          key={x}
          style={
            {
              transform: `rotate(${lean}deg)`,
              transformOrigin: `${x}px 160px`,
              "--half": `${lean / 2}deg`,
              animation: `pb-sway 3s ease-in-out ${delay}s infinite`,
            } as CSSProperties
          }
        >
          <rect x={x - 4} y={102} width={8} height={60} rx={4} fill={C.t2} {...LINE} />
          <circle cx={x} cy={102} r={5} fill={C.t3} {...LINE} />
        </g>
      ))}
      {[114, 192].map((x) => (
        <rect key={x} x={x} y={193} width={14} height={9} rx={2.5} fill={C.t3} {...LINE} />
      ))}
      <rect x={100} y={158} width={120} height={38} rx={10} fill={C.surface} />
      <path d="M100 186H220A10 10 0 0 1 210 196H110A10 10 0 0 1 100 186Z" fill={C.t1} />
      <circle cx={118} cy={173} r={3.2} fill={C.green} />
      <circle cx={130} cy={173} r={3.2} fill={C.t3} />
      <circle cx={142} cy={173} r={3.2} fill={C.t3} />
      <Led x={154} y={173} colour={C.red} seconds={1.2} />
      {[182, 188, 194, 200].map((x) => (
        <path key={x} d={`M${x} 168V178`} stroke={C.t3} strokeWidth={2.5} strokeLinecap="round" />
      ))}
      <rect x={100} y={158} width={120} height={38} rx={10} {...LINE} />
      {[108, 196].map((x) => (
        <rect key={x} x={x} y={152} width={16} height={9} rx={3} fill={C.t2} {...LINE} />
      ))}

      {/* Grey bars, and a blue wave running outward over them, again and again. */}
      <circle cx={160} cy={140} r={5} fill={C.t3} />
      {[16, 30, 44].map((r) => (
        <path key={r} d={wifiArc(r)} stroke={C.t3} strokeWidth={6} strokeLinecap="round" />
      ))}
      <circle cx={160} cy={140} r={5} fill={C.blue} opacity={0} style={{ animation: "pb-wave 2.4s linear infinite" }} />
      {[16, 30, 44].map((r, i) => (
        <path
          key={r}
          d={wifiArc(r)}
          stroke={C.blue}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0}
          style={{ animation: `pb-wave 2.4s linear ${(i + 1) * 0.22}s infinite` }}
        />
      ))}

      <circle
        cx={190}
        cy={134}
        r={11}
        stroke={C.red}
        strokeWidth={2}
        opacity={0}
        style={{ ...OWN_CENTRE, animation: "pb-ring 1.8s ease-out infinite" }}
      />
      <circle cx={190} cy={134} r={11} fill={C.red} stroke={C.blob} strokeWidth={3} />
      <path d="M186 130L194 138M194 130L186 138" stroke={C.mark} strokeWidth={2.4} strokeLinecap="round" />
    </Frame>
  );
}
