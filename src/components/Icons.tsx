import type { CSSProperties, ReactNode } from 'react'
import { C } from '../colors'

/* ──────────────────────────────────────────────────────────────────────────
   Icone Siply.

   Stile del brand: contorno spesso e arrotondato color `dark`, con un blob
   pieno sfalsato in basso a destra disegnato DIETRO il tratto. Palette del
   blob: magenta (vino), ocra (documenti, contenitori), verde (logistica,
   persone, azioni).

   Ogni icona accetta `size`, `color` (il tratto) e `blob` (null lo toglie,
   utile quando l'icona sta dentro un elemento già colorato).
   ────────────────────────────────────────────────────────────────────────── */

export interface IconProps {
  size?: number
  color?: string
  blob?: string | null
  style?: CSSProperties
}

/* ── Logo e mascotte ──────────────────────────────────────────────────────────
   I file stanno in public/logos. `variant='w'` è la versione bianca, va su
   fondo scuro; `variant='b'` è quella scura, va su fondo chiaro.
   Gli spazi nei nomi file vanno codificati nell'URL.

   Il percorso parte da BASE_URL e non da "/": pubblicato su GitHub Pages il
   sito non sta alla radice del dominio ma in una sottocartella, e un percorso
   assoluto cercherebbe i loghi nel posto sbagliato. In sviluppo BASE_URL vale
   "/", quindi non cambia niente.
   ────────────────────────────────────────────────────────────────────────── */

const BASE = import.meta.env.BASE_URL
const LOGO_SRC = { w: `${BASE}logos/logo%20w.png`, b: `${BASE}logos/Logo%20B.png` }
const MASCOTTE_SRC = { w: `${BASE}logos/mascotte%20W.png`, b: `${BASE}logos/Mascotte%20B.png` }

interface BrandProps {
  height?: number
  variant?: 'w' | 'b'
  style?: CSSProperties
}

/** Logo completo: lettering + mascotte. */
export function Logo({ height = 28, variant = 'w', style }: BrandProps = {}) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt="Siply"
      style={{ height, width: 'auto', display: 'block', flexShrink: 0, ...style }}
    />
  )
}

/** Solo la mascotte, per gli spazi stretti (avatar, badge). */
export function Mascotte({ height = 24, variant = 'w', style }: BrandProps = {}) {
  return (
    <img
      src={MASCOTTE_SRC[variant]}
      alt="Siply"
      style={{ height, width: 'auto', display: 'block', flexShrink: 0, ...style }}
    />
  )
}

function Svg({ size = 20, color = C.dark, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" fill="none"
      stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block', overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Il blob va sempre per primo: gli sta dietro. */
function Blob({ c, x, y, r }: { c?: string | null; x: number; y: number; r: number }) {
  if (!c) return null
  return <circle cx={x} cy={y} r={r} fill={c} stroke="none" />
}

/* ── Vino ─────────────────────────────────────────────────────────────────── */

export function Bottiglia({ blob = C.magenta, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={21} y={22} r={5} />
      <path d="M13 3h6v5.5c0 1.8 3.2 3.2 3.2 6.3V27a2 2 0 0 1-2 2h-8.4a2 2 0 0 1-2-2V14.8c0-3.1 3.2-4.5 3.2-6.3V3z" />
      <path d="M11.2 17.5h9.6" />
    </Svg>
  )
}

export function Calice({ blob = C.magenta, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={21} y={11} r={4.5} />
      <path d="M9 4h14c0 7.2-2.9 10.8-7 10.8S9 11.2 9 4z" />
      <path d="M16 15v9.5" />
      <path d="M10.5 28c1.6-2.2 9.4-2.2 11 0" />
    </Svg>
  )
}

export function Uva({ blob = C.magenta, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={21} y={22} r={4.5} />
      <path d="M16 8.5V4c2.6 0 4.4-.9 5.5-2" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="20" cy="12" r="3.4" />
      <circle cx="16" cy="18" r="3.4" />
      <circle cx="9.5" cy="19.5" r="3.4" />
      <circle cx="22.5" cy="19.5" r="3.4" />
      <circle cx="16" cy="25.5" r="3.4" />
    </Svg>
  )
}

export function Foglia({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={21} y={20} r={4.5} />
      <path d="M5 28C4 15 11 4 28 4c1 13-6 24-23 24z" />
      <path d="M6.5 26.5 20 13" />
    </Svg>
  )
}

export function Piatto({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={4.5} />
      <circle cx="14" cy="16" r="10.5" />
      <circle cx="14" cy="16" r="5" />
      <path d="M28 4v24" />
    </Svg>
  )
}

/* ── Contenitori e logistica ──────────────────────────────────────────────── */

export function Cassa({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={5} />
      <path d="M10 3v6M16 3v6M22 3v6" />
      <rect x="4" y="10" width="24" height="18" rx="2.5" />
      <path d="M4.5 20c5-3 8 2 13-1 3-1.8 6.5-.6 10 .8" />
    </Svg>
  )
}

export function Carrello({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={16} r={4.5} />
      <path d="M3 5h4l3.6 13.4h13.1L28 8.6H9" />
      <circle cx="12.5" cy="25.5" r="2.4" />
      <circle cx="22.5" cy="25.5" r="2.4" />
    </Svg>
  )
}

export function Documento({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={22} r={4.5} />
      <path d="M7 4.5a2 2 0 0 1 2-2h9l7 7v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
      <path d="M18 2.5v7h7" />
      <path d="M11.5 18h9M11.5 23h6" />
    </Svg>
  )
}

export function Graffetta({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={22} r={4.5} />
      <path d="M27 14.5 14.5 27a7 7 0 0 1-10-10L17 4.5a4.7 4.7 0 0 1 6.7 6.7L11.3 23.7a2.4 2.4 0 0 1-3.4-3.4l11.3-11.3" />
    </Svg>
  )
}

export function Appunti({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={22} r={4.5} />
      <path d="M11 5H8a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
      <rect x="11" y="2.5" width="10" height="5.5" rx="1.8" />
      <path d="M11.5 16h9M11.5 21.5h6" />
    </Svg>
  )
}

export function Tag({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={21} y={21} r={4.5} />
      <path d="M3.5 15.4 15.4 3.5a2 2 0 0 1 1.4-.6h9.7a2 2 0 0 1 2 2v9.7a2 2 0 0 1-.6 1.4L16 28a2 2 0 0 1-2.8 0L3.5 18.2a2 2 0 0 1 0-2.8z" />
      <circle cx="21.5" cy="10.5" r="2.2" />
    </Svg>
  )
}

/* ── Stato e azioni ───────────────────────────────────────────────────────── */

export function Check({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={5} />
      <circle cx="15" cy="15" r="11.5" />
      <path d="M9.5 15.5 13.5 20l9-9" />
    </Svg>
  )
}

export function Croce({ blob = C.magenta, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={5} />
      <circle cx="15" cy="15" r="11.5" />
      <path d="M11 11l8 8M19 11l-8 8" />
    </Svg>
  )
}

export function Attesa({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={5} />
      <circle cx="15" cy="15" r="11.5" />
      <path d="M15 8.5V15l4.5 3" />
    </Svg>
  )
}

export function Matita({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={22} r={4.5} />
      <path d="M4 28l1.6-6.4L21.4 5.8a3.7 3.7 0 0 1 5.2 5.2L10.8 26.8z" />
      <path d="M19.5 7.8l4.7 4.7" />
    </Svg>
  )
}

export function Stella({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={4.5} />
      <path d="M15 2.5l3.9 7.9 8.7 1.3-6.3 6.1 1.5 8.7-7.8-4.1-7.8 4.1 1.5-8.7L2.4 11.7l8.7-1.3z" />
    </Svg>
  )
}

export function Bersaglio({ blob = C.magenta, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={4.5} />
      <circle cx="15" cy="15" r="11.5" />
      <circle cx="15" cy="15" r="6.5" />
      <circle cx="15" cy="15" r="1.6" fill={C.dark} stroke="none" />
    </Svg>
  )
}

export function Cerca({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={20} r={4} />
      <circle cx="14" cy="14" r="9.5" />
      <path d="M21 21l7 7" />
    </Svg>
  )
}

export function Reset({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={4.5} />
      <path d="M27 16a11.5 11.5 0 1 1-3.6-8.4" />
      <path d="M27 3.5V11h-7.5" />
    </Svg>
  )
}

export function OcchioBarrato({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={23} y={21} r={4} />
      <path d="M11.5 7.4A12.6 12.6 0 0 1 16 6.5c7.5 0 13 9.5 13 9.5a24 24 0 0 1-4 5.2M20.3 20.2A6 6 0 0 1 11.8 11.7" />
      <path d="M8.2 9.3C4.9 11.4 3 16 3 16s5.5 9.5 13 9.5c2 0 3.8-.5 5.4-1.3" />
      <path d="M3.5 3.5l25 25" />
    </Svg>
  )
}

/* ── Comunicazione ────────────────────────────────────────────────────────── */

export function Chat({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={23} y={9} r={4.5} />
      <path d="M28 19.5a3 3 0 0 1-3 3H11l-7 5.5V7a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3z" />
      <path d="M10.5 11h11M10.5 16h7" />
    </Svg>
  )
}

export function Campana({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={23} y={21} r={4.5} />
      <path d="M24 12a9 9 0 1 0-18 0c0 8-3 10-3 10h24s-3-2-3-10z" />
      <path d="M12.5 27a3.7 3.7 0 0 0 6 0" />
    </Svg>
  )
}

export function Lucchetto({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={23} y={22} r={4} />
      <rect x="5" y="13.5" width="20" height="15" rx="3" />
      <path d="M9.5 13.5V9.5a5.5 5.5 0 0 1 11 0v4" />
      <path d="M15 19.5v3.5" />
    </Svg>
  )
}

/* ── Dati ─────────────────────────────────────────────────────────────────── */

export function Trend({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={9} y={22} r={4.5} />
      <path d="M3 24l8-8.5 5.5 5L28 8" />
      <path d="M20.5 8H28v7.5" />
    </Svg>
  )
}

export function Grafico({ blob = C.ocra, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={23} y={12} r={4.5} />
      <path d="M4 3v25h25" />
      <path d="M10 22v-6M17 22V9M24 22v-9" />
    </Svg>
  )
}

/* ── Persona ──────────────────────────────────────────────────────────────── */

export function Persona({ blob = C.green, ...p }: IconProps = {}) {
  return (
    <Svg {...p}>
      <Blob c={blob} x={22} y={21} r={4.5} />
      <circle cx="15" cy="9.5" r="6" />
      <path d="M4 28c0-6.1 4.9-9.5 11-9.5S26 21.9 26 28" />
    </Svg>
  )
}
