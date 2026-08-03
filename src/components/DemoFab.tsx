import { useState, useRef, useEffect, useCallback } from 'react'
import { C, alpha } from '../colors'
import { fireDemo } from '../demo'
import * as M from '../motion'
import { motion, AnimatePresence, useReducedMotion } from '../motion'
import * as Icon from './Icons'

/** Attesa prima che esca, avvicinandosi col mouse. Stessa dei tooltip: chi sta
 *  solo attraversando l'angolo non se lo vede saltare addosso. */
const RITARDO = 750
/** Quanto vicino deve arrivare il puntatore al suo angolo perché esca. */
const RAGGIO = 96
/** Quanto sporge quando fa capolino. */
const SPIA = 26
/** Ogni quanto ricorda che c'è, e per quanto resta fuori. */
const OGNI = 14000
const DURATA_SPIA = 1600

/** FAB delle demo: riempie tutti i campi della schermata corrente con dati
 *  mock, così si possono mostrare le funzionalità senza compilare a mano.
 *
 *  Sta fuori dallo schermo per non entrare nelle schermate da mostrare, e
 *  rientra avvicinandoglisi col mouse. Ogni tanto fa capolino da solo,
 *  altrimenti chi non sa che c'è non lo cercherebbe mai.
 *  Si trascina dove serve. Solo per le demo. */
export default function DemoFab() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  /** menu sotto al bottone invece che sopra: serve quando il FAB sta in alto */
  const [menuSotto, setMenuSotto] = useState(false)
  /** il puntatore è arrivato abbastanza vicino da farlo uscire */
  const [vicino, setVicino] = useState(false)
  /** sta facendo capolino da solo */
  const [sbircia, setSbircia] = useState(false)
  const [trascina, setTrascina] = useState(false)
  /** quanti px deve percorrere per uscire di scena, col segno del verso */
  const [fuga, setFuga] = useState(0)

  const ridotto = useReducedMotion()
  const boundsRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const attesa = useRef<number | null>(null)
  const rientro = useRef<number | null>(null)
  /** Punto in cui è iniziato il tocco: serve a capire se è stato un clic o un
   *  trascinamento. Confrontare le coordinate è più affidabile che affidarsi
   *  all'ordine fra `onDragEnd` e `onClick`, che non è garantito. */
  const giu = useRef({ x: 0, y: 0 })

  /** Dove non c'è l'hover il puntatore non esiste: lì un bordino resta sempre
   *  fuori, altrimenti non ci sarebbe modo di richiamarlo. */
  const [touch, setTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  /**
   * Quanto deve scorrere per sparire, verso il bordo che ha più vicino.
   *
   * Il riquadro esterno si misura da solo: essendo allineato a destra, il suo
   * bordo destro coincide sempre con quello del bottone, anche col menu
   * aperto che è più largo. La traslazione che lo nasconde sta su un elemento
   * interno, quindi non falsa questa misura né litiga col trascinamento, che
   * scrive anche lui sulla stessa proprietà.
   */
  const misuraFuga = useCallback(() => {
    const r = wrapRef.current?.getBoundingClientRect()
    const larg = btnRef.current?.offsetWidth
    if (!r || !larg) return
    const centro = r.right - larg / 2
    setFuga(centro > window.innerWidth / 2
      ? window.innerWidth - r.right + larg + 6   // esce a destra
      : -(r.right + 6))                          // esce a sinistra
  }, [])

  useEffect(() => {
    misuraFuga()
    window.addEventListener('resize', misuraFuga)
    return () => window.removeEventListener('resize', misuraFuga)
  }, [misuraFuga])

  /* ── Uscita all'avvicinarsi del puntatore ─────────────────────────────── */

  const annulla = () => {
    if (attesa.current !== null) { clearTimeout(attesa.current); attesa.current = null }
  }

  useEffect(() => {
    if (touch || hidden) return
    const onMove = (e: PointerEvent) => {
      const r = wrapRef.current?.getBoundingClientRect()
      if (!r) return
      // distanza dal riquadro, non dal suo centro: conta quanto sei arrivato
      // vicino al bordo, non quanto è grande il bottone
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
      if (Math.hypot(dx, dy) < RAGGIO) {
        if (vicino || attesa.current !== null) return
        attesa.current = window.setTimeout(() => setVicino(true), RITARDO)
      } else {
        annulla()
        if (vicino) setVicino(false)
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => { window.removeEventListener('pointermove', onMove); annulla() }
  }, [touch, hidden, vicino])

  /* ── Capolino periodico ───────────────────────────────────────────────── */

  useEffect(() => {
    // Con "riduci movimento" niente promemoria che si muove da solo: al suo
    // posto resta il bordino sempre in vista, che non si anima.
    if (ridotto || hidden) return
    const t = setInterval(() => {
      setSbircia(true)
      rientro.current = window.setTimeout(() => setSbircia(false), DURATA_SPIA)
    }, OGNI)
    return () => {
      clearInterval(t)
      if (rientro.current !== null) clearTimeout(rientro.current)
    }
  }, [ridotto, hidden])

  if (hidden) return null

  const eClic = (e: { clientX: number; clientY: number }) =>
    Math.abs(e.clientX - giu.current.x) < 5 && Math.abs(e.clientY - giu.current.y) < 5

  /** Dopo lo spostamento il menu si apre dalla parte dove c'è spazio. */
  const aggiornaVerso = () => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (r) setMenuSotto(r.top < window.innerHeight * 0.4)
  }

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    if (!eClic(e)) return
    fn()
    setOpen(false)
  }

  const inScena = open || vicino || trascina
  /** A riposo: fuori del tutto, o con un bordino in vista dove serve. */
  const aRiposo = touch || ridotto ? fuga - Math.sign(fuga) * SPIA : fuga
  const scarto = inScena ? 0 : sbircia ? fuga - Math.sign(fuga) * SPIA : aRiposo

  return (
    <>
      <style>{`
        /* Riquadro invisibile a tutto schermo: fa da limite al trascinamento,
           senza rubare i clic a quello che ci sta sotto. */
        .siply-fab-bounds {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
        }
        /* Il riquadro che si trascina non intercetta niente: quando il bottone
           è fuori campo qui resta uno spazio vuoto, e catturare i clic in un
           angolo dove non si vede nulla sarebbe solo un fastidio. Sono i figli
           a riprendersi i puntatori. */
        .siply-fab-wrap {
          position: absolute;
          right: 16px;
          bottom: 88px;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        @media (min-width: 768px) {
          .siply-fab-wrap { bottom: 24px; right: 24px; }
        }
        .siply-fab-scivolo {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          pointer-events: auto;
          cursor: grab;
          touch-action: none;
        }
        .siply-fab-scivolo:active { cursor: grabbing; }
        .siply-fab-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid ${alpha(C.white, 0.1)};
          background-color: ${C.dark};
          color: ${C.bg};
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        }
        .siply-fab-action:hover { border-color: ${alpha(C.white, 0.24)}; }
      `}</style>

      <div ref={boundsRef} className="siply-fab-bounds">
        <motion.div
          ref={wrapRef}
          className="siply-fab-wrap"
          drag
          dragConstraints={boundsRef}
          dragMomentum={false}
          dragElastic={0.04}
          onDragStart={() => setTrascina(true)}
          onDragEnd={() => { setTrascina(false); aggiornaVerso(); misuraFuga() }}
          onPointerDown={e => { giu.current = { x: e.clientX, y: e.clientY } }}
        >
          {/* Il livello che entra e esce di scena. La traslazione sta qui e non
              sul riquadro esterno, che è impegnato col trascinamento. */}
          <motion.div
            className="siply-fab-scivolo"
            animate={{ x: scarto, scale: trascina ? 1.04 : 1 }}
            transition={M.T.surface}
            style={{ flexDirection: menuSotto ? 'column-reverse' : 'column' }}
          >
            {/* Le voci escono a ventaglio dal FAB: si legge che nascono dal
                bottone che le ha aperte. */}
            <AnimatePresence>
              {open && (
                <motion.div
                  key="menu"
                  initial="initial" animate="animate" exit="exit"
                  variants={{
                    animate: { transition: { staggerChildren: 0.04, staggerDirection: menuSotto ? 1 : -1 } },
                    exit: { transition: { staggerChildren: 0.03 } },
                  }}
                  // Si inverte solo il contenitore esterno, per spostare il menu
                  // sotto al bottone: le voci restano nel loro ordine di lettura.
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}
                >
                  <M.Item variants={M.V.pop}>
                    <M.Button className="siply-fab-action" onClick={act(() => fireDemo('fill'))}>
                      <Icon.Stella size={17} color={C.bg} /> Compila tutto
                    </M.Button>
                  </M.Item>
                  <M.Item variants={M.V.pop}>
                    <M.Button className="siply-fab-action" onClick={act(() => fireDemo('clear'))}>
                      <Icon.Reset size={17} color={C.bg} /> Svuota tutto
                    </M.Button>
                  </M.Item>
                  <M.Item variants={M.V.pop}>
                    <M.Button
                      className="siply-fab-action"
                      onClick={act(() => setHidden(true))}
                      style={{ color: alpha(C.silver, 0.6), fontWeight: 500 }}
                    >
                      <Icon.OcchioBarrato size={17} color={alpha(C.silver, 0.6)} blob={null} /> Nascondi (per screenshot)
                    </M.Button>
                  </M.Item>
                </motion.div>
              )}
            </AnimatePresence>

            <M.Button
              ref={btnRef}
              title="Trascinami dove vuoi"
              onClick={e => {
                if (!eClic(e)) return
                // toccandolo mentre sporge appena, il primo tocco lo chiama fuori
                if (!inScena) { setVicino(true); return }
                setOpen(o => !o)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: C.magenta, color: C.bg,
                border: 'none', borderRadius: '999px',
                padding: '12px 18px', fontSize: '13px', fontWeight: 700,
                cursor: 'inherit', boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
              }}
            >
              {/* Presa: dice che si può spostare */}
              <span style={{ display: 'grid', gridTemplateColumns: '3px 3px', gap: '3px', opacity: 0.55 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: C.bg }} />
                ))}
              </span>
              <motion.span animate={{ rotate: open ? 90 : 0 }} transition={M.T.press} style={{ display: 'flex' }}>
                {open
                  ? <span style={{ fontSize: '15px' }}>✕</span>
                  : <Icon.Stella size={17} color={C.bg} blob={null} />}
              </motion.span>
              {open ? 'Chiudi' : 'Demo'}
            </M.Button>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
