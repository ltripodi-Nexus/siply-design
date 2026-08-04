import { createContext, forwardRef, useContext, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion, type Transition, type Variants } from 'motion/react'

/**
 * Sistema di animazione di Siply.
 *
 * Regola d'oro: nessuna schermata inventa animazioni proprie. Si prende il
 * primitivo che corrisponde al *ruolo* dell'elemento (bottone, card, lista,
 * modale...) e l'animazione arriva già uniforme. Se domani serve un bottone
 * nuovo, usa `M.Button` e si anima esattamente come tutti gli altri.
 *
 * I criteri sono quelli standard di material/HIG:
 *  - l'entrata decelera (ease-out), l'uscita accelera (ease-in) ed è più rapida
 *  - le micro-interazioni stanno sotto i 200ms, così non si "sentono"
 *  - le superfici grandi si muovono più lentamente di quelle piccole
 *  - il movimento segue la direzione del gesto (avanti = da destra)
 */

/* ── Curve e durate ──────────────────────────────────────────────────────── */

const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]   // decelera
const IN: [number, number, number, number] = [0.55, 0, 1, 0.45]    // accelera
const INOUT: [number, number, number, number] = [0.65, 0, 0.35, 1] // spostamenti

export const T = {
  /** micro-interazione: press, hover, rotazione di una freccia */
  micro: { duration: 0.16, ease: OUT } as Transition,
  /** molla per press e indicatori che scivolano: reattiva, senza rimbalzo */
  press: { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 } as Transition,
  /** comparsa di un elemento nel flusso (card, riga, campo) */
  enter: { duration: 0.26, ease: OUT } as Transition,
  /** uscita: sempre più corta dell'entrata, l'utente ha già deciso */
  exit: { duration: 0.15, ease: IN } as Transition,
  /** superfici grandi: pannelli, sheet, cambio schermata */
  surface: { duration: 0.34, ease: OUT } as Transition,
  /** apertura/chiusura di un'area espandibile */
  collapse: { duration: 0.28, ease: INOUT } as Transition,
  /** molla morbida per modali e sheet: un filo di elasticità, niente molleggio */
  pop: { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 } as Transition,
} as const

/** Ritardo fra un elemento e il successivo in una lista. 45ms è il punto in cui
 *  la sequenza si legge senza far aspettare l'ultimo elemento. */
const STAGGER = 0.045

/* ── Varianti condivise ──────────────────────────────────────────────────── */

export const V = {
  /** Schermata intera: sale di poco e sfuma. Niente slide, cambierebbe contesto. */
  page: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { ...T.surface, staggerChildren: STAGGER, delayChildren: 0.04 } },
    exit: { opacity: 0, y: -6, transition: T.exit },
  } satisfies Variants,

  /** Contenitore di lista: non si anima, orchestra i figli. */
  list: {
    initial: {},
    animate: { transition: { staggerChildren: STAGGER } },
    exit: {},
  } satisfies Variants,

  /** Riga o card dentro una lista/sezione. */
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: T.enter },
    exit: { opacity: 0, scale: 0.97, transition: T.exit },
  } satisfies Variants,

  /** Elemento piccolo che compare/scompare: chip, badge, tag allegato. */
  pop: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1, transition: T.pop },
    exit: { opacity: 0, scale: 0.8, transition: T.exit },
  } satisfies Variants,

  /** Solo opacità: per scambi al volo dove il movimento distrarrebbe. */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: T.enter },
    exit: { opacity: 0, transition: T.exit },
  } satisfies Variants,

  /** Messaggio di chat: entra dal basso con un accenno di scala. */
  bubble: {
    initial: { opacity: 0, y: 10, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1, transition: T.pop },
    exit: { opacity: 0, transition: T.exit },
  } satisfies Variants,

  /** Velo scuro dietro modali e sheet. */
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.22, ease: OUT } },
    exit: { opacity: 0, transition: T.exit },
  } satisfies Variants,

  /** Modale centrata: cresce dal centro, non scivola. */
  modal: {
    initial: { opacity: 0, scale: 0.94, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0, transition: T.pop },
    exit: { opacity: 0, scale: 0.96, y: 8, transition: T.exit },
  } satisfies Variants,

  /** Bottom sheet: sale dal bordo da cui è stata chiamata. */
  sheet: {
    initial: { y: '100%' },
    animate: { y: 0, transition: T.surface },
    exit: { y: '100%', transition: { duration: 0.22, ease: IN } },
  } satisfies Variants,
} as const

/**
 * Variante per gli item di una lista che deve animare **anche l'uscita**
 * (filtri, rimozioni). Lì `List`+`Item` non basta: dichiarare `exit` rende
 * l'item "controllante" e gli fa perdere lo stagger ereditato dal contenitore,
 * quindi il ritardo se lo porta dentro tramite `custom={indice}`.
 * Uso: `<M.Item custom={i} variants={M.listItem} initial="initial" animate="animate" exit="exit">`
 */
export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { ...T.enter, delay: i * STAGGER },
  }),
  exit: { opacity: 0, scale: 0.97, transition: T.exit },
}

/** Step di un wizard: si muove nel verso della navigazione.
 *  `dir` = 1 avanti, -1 indietro. */
export function stepVariants(dir: number): Variants {
  return {
    initial: { opacity: 0, x: dir * 28 },
    animate: { opacity: 1, x: 0, transition: { ...T.surface, staggerChildren: STAGGER, delayChildren: 0.05 } },
    exit: { opacity: 0, x: dir * -28, transition: T.exit },
  }
}

/** Tooltip/popover agganciato a un elemento: nasce dal lato da cui esce, così
 *  si capisce a colpo d'occhio a quale voce si riferisce.
 *  `sotto` = compare sotto all'ancora invece che sopra. */
export function tipVariants(sotto: boolean): Variants {
  return {
    initial: { opacity: 0, scale: 0.96, y: sotto ? -6 : 6 },
    animate: { opacity: 1, scale: 1, y: 0, transition: T.pop },
    exit: { opacity: 0, scale: 0.97, y: sotto ? -4 : 4, transition: T.exit },
  }
}

/* ── Gesti riutilizzabili ────────────────────────────────────────────────── */

/** Da spreddare su qualunque `motion.*` cliccabile che non usi i primitivi qui
 *  sotto (es. un `motion.a`). Tiene il feedback tattile identico ovunque. */
export const press = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.975 },
  transition: T.press,
} as const

const pressCard = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.985 },
  transition: T.press,
} as const

/** Testata di accordion o riga larga: solo una compressione appena percettibile.
 *  Niente sollevamento, si muoverebbe dentro la card che la contiene. */
const pressRow = {
  whileTap: { scale: 0.99 },
  transition: T.press,
} as const

const pressIcon = {
  whileHover: { scale: 1.12 },
  whileTap: { scale: 0.88 },
  transition: T.press,
} as const

const pressChip = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.94 },
  transition: T.press,
} as const

/* ── Primitivi ───────────────────────────────────────────────────────────── */

type BtnProps = ComponentProps<typeof motion.button>

/** CTA e bottoni testuali. Il press è l'unico feedback: affidabile anche su touch. */
export const Button = forwardRef<HTMLButtonElement, BtnProps>((p, ref) => (
  <motion.button ref={ref} {...press} {...p} />
))
Button.displayName = 'M.Button'

/** Card o riga cliccabile: si solleva all'hover invece di ingrandirsi, così i
 *  bordi restano allineati alle card vicine. */
export const CardButton = forwardRef<HTMLButtonElement, BtnProps>((p, ref) => (
  <motion.button ref={ref} {...pressCard} {...p} />
))
CardButton.displayName = 'M.CardButton'

/** Riga cliccabile larga quanto la card che la contiene (testata di accordion). */
export const RowButton = forwardRef<HTMLButtonElement, BtnProps>((p, ref) => (
  <motion.button ref={ref} {...pressRow} {...p} />
))
RowButton.displayName = 'M.RowButton'

/** Bottoncino con sola icona (chiudi, +/−, allega): press più marcato perché
 *  l'area è piccola e serve conferma visiva. */
export const IconButton = forwardRef<HTMLButtonElement, BtnProps>((p, ref) => (
  <motion.button ref={ref} {...pressIcon} {...p} />
))
IconButton.displayName = 'M.IconButton'

/** Chip di filtro / tab. */
export const Chip = forwardRef<HTMLButtonElement, BtnProps>((p, ref) => (
  <motion.button ref={ref} {...pressChip} {...p} />
))
Chip.displayName = 'M.Chip'

/**
 * Radice di una schermata. Va dentro un `<AnimatePresence mode="wait">`.
 * La classe `siply-page` (in index.css) la fa allungare fino in fondo al
 * contenitore e allunga a sua volta la schermata che contiene.
 */
export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <motion.div
      className="siply-page"
      variants={V.page} initial="initial" animate="animate" exit="exit"
      style={style}
    >
      {children}
    </motion.div>
  )
}

/** Contenitore che fa entrare i figli in sequenza. I figli devono essere `Item`. */
export function List({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <motion.div variants={V.list} initial="initial" animate="animate" className={className} style={style}>
      {children}
    </motion.div>
  )
}

/** Un elemento di lista/sezione. Eredita il ritmo dal `List` che lo contiene. */
export const Item = forwardRef<HTMLDivElement, ComponentProps<typeof motion.div>>((p, ref) => (
  <motion.div ref={ref} variants={V.item} {...p} />
))
Item.displayName = 'M.Item'

/** Area che si apre e chiude in altezza (accordion, campi condizionali). */
export function Collapse({ open, children, style }: { open: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1, transition: T.collapse }}
          exit={{ height: 0, opacity: 0, transition: { ...T.collapse, duration: 0.22 } }}
          style={{ overflow: 'hidden', ...style }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * A che altezza si sta lavorando: 0 è la pagina, un numero è lo `z` del
 * pannello che ci sta intorno.
 *
 * Serve a chi deve disegnarsi *sopra* a quello che spiega o commenta. Uno
 * z-index scritto a mano nel componente vale finché quel componente sta nella
 * pagina: aperto dentro un foglio finisce sotto al velo, ed è sparito. Così
 * invece ogni pannello dichiara la propria altezza e chi sta dentro la legge.
 */
const Livello = createContext(0)

/** Lo `z` del pannello in cui ci si trova, 0 se si è nella pagina. */
export const useLivello = () => useContext(Livello)

/**
 * Velo + pannello per modali e bottom sheet.
 * Il chiamante lo avvolge in `<AnimatePresence>` per avere anche l'uscita:
 *   <AnimatePresence>{aperto && <M.Overlay .../>}</AnimatePresence>
 */
export function Overlay({ onClose, kind = 'sheet', z = 300, panelStyle, veil = 0.55, children }: {
  onClose: () => void
  kind?: 'sheet' | 'modal'
  z?: number
  panelStyle?: CSSProperties
  /** opacità del velo scuro */
  veil?: number
  children: ReactNode
}) {
  const sheet = kind === 'sheet'
  return (
    <Livello.Provider value={z}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: z,
        ...(sheet ? {} : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }),
      }}>
        <motion.div
          variants={V.backdrop} initial="initial" animate="animate" exit="exit"
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${veil})` }}
        />
        <motion.div
          variants={sheet ? V.sheet : V.modal} initial="initial" animate="animate" exit="exit"
          style={sheet
            ? { position: 'absolute', bottom: 0, left: 0, right: 0, margin: '0 auto', ...panelStyle }
            : { position: 'relative', ...panelStyle }}
        >
          {children}
        </motion.div>
      </div>
    </Livello.Provider>
  )
}

/** Freccia/chevron che ruota. Un solo posto per la durata della rotazione. */
export function Chevron({ open, size = 16, color, style }: { open: boolean; size?: number; color: string; style?: CSSProperties }) {
  return (
    <motion.svg
      animate={{ rotate: open ? 180 : 0 }} transition={T.micro}
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} style={style}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  )
}

/** Valore numerico che cambia: sostituzione con un breve fade verticale, così
 *  si nota che si è aggiornato senza far saltare la riga. */
export function Ticker({ value, style }: { value: string | number; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-block', position: 'relative', ...style }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: T.enter }}
          exit={{ opacity: 0, y: -8, transition: T.exit }}
          style={{ display: 'inline-block' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export { motion, AnimatePresence, useReducedMotion }
