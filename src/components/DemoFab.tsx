import { useState, useRef } from 'react'
import { C, alpha } from '../colors'
import { fireDemo } from '../demo'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'
import * as Icon from './Icons'

/** FAB sticky: riempie tutti i campi della schermata corrente con dati mock,
 *  così si possono mostrare tutte le funzionalità senza compilare a mano.
 *  Si trascina dove serve, per non coprire la parte da fotografare.
 *  Solo per le demo. */
export default function DemoFab() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  /** menu sotto al bottone invece che sopra: serve quando il FAB sta in alto */
  const [menuSotto, setMenuSotto] = useState(false)

  const boundsRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  /** Punto in cui è iniziato il tocco: serve a capire se è stato un clic o un
   *  trascinamento. Confrontare le coordinate è più affidabile che affidarsi
   *  all'ordine fra `onDragEnd` e `onClick`, che non è garantito. */
  const giu = useRef({ x: 0, y: 0 })

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
        .siply-fab-wrap {
          position: absolute;
          right: 16px;
          bottom: 88px;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          cursor: grab;
          touch-action: none;
        }
        .siply-fab-wrap:active { cursor: grabbing; }
        @media (min-width: 768px) {
          .siply-fab-wrap { bottom: 24px; right: 24px; }
        }
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
          whileDrag={{ scale: 1.04 }}
          onDragEnd={aggiornaVerso}
          onPointerDown={e => { giu.current = { x: e.clientX, y: e.clientY } }}
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
            title="Trascinami dove vuoi"
            onClick={e => { if (eClic(e)) setOpen(o => !o) }}
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
      </div>
    </>
  )
}
