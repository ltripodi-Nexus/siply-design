import { useMemo, useState } from 'react'
import { C, alpha } from '../../colors'
import { eur } from '../../economia'
import * as M from '../../motion'
import { motion, AnimatePresence } from '../../motion'
import { STATUS } from '../../status'
import * as Icon from '../../components/Icons'
import { produttore, type Richiesta, type StatoRichiesta } from '../../admin/dati'
import { cassaScontata } from '../../admin/statistiche'

/* L'elenco delle richieste arrivate. Le pending stanno in cima e restano in
   cima: sono le uniche su cui c'è da fare qualcosa, il resto è archivio. */

const CFG: Record<StatoRichiesta, { label: string; Icona: typeof Icon.Attesa; solid: string; soft: string }> = {
  pending_approval: { label: 'Da valutare', Icona: Icon.Attesa, solid: STATUS.pending_approval.solid, soft: STATUS.pending_approval.soft },
  approved: { label: 'Approvata', Icona: Icon.Check, solid: STATUS.approved.solid, soft: STATUS.approved.soft },
  refused: { label: 'Rifiutata', Icona: Icon.Croce, solid: STATUS.refused.solid, soft: STATUS.refused.soft },
}

const ORDINE: StatoRichiesta[] = ['pending_approval', 'approved', 'refused']
const TITOLO: Record<StatoRichiesta, string> = {
  pending_approval: 'Da valutare',
  approved: 'Approvate',
  refused: 'Rifiutate',
}

type Filtro = 'tutte' | StatoRichiesta

const FILTRI: { id: Filtro; label: string }[] = [
  { id: 'pending_approval', label: 'Da valutare' },
  { id: 'tutte', label: 'Tutte' },
  { id: 'approved', label: 'Approvate' },
  { id: 'refused', label: 'Rifiutate' },
]

interface Props {
  richieste: Richiesta[]
  onApri: (r: Richiesta) => void
}

export default function RichiesteScreen({ richieste, onApri }: Props) {
  // si parte da quelle da valutare: è il lavoro del giorno
  const [filtro, setFiltro] = useState<Filtro>('pending_approval')

  const conteggi = useMemo(() => {
    const c: Record<StatoRichiesta, number> = { pending_approval: 0, approved: 0, refused: 0 }
    richieste.forEach(r => c[r.stato]++)
    return c
  }, [richieste])

  /** Sempre: prima le pending, poi la più recente. Anche dentro un filtro solo,
   *  così l'ordine non cambia significato passando da una scheda all'altra. */
  const ordinate = useMemo(() => {
    const sel = filtro === 'tutte' ? richieste : richieste.filter(r => r.stato === filtro)
    return [...sel].sort((a, b) =>
      ORDINE.indexOf(a.stato) - ORDINE.indexOf(b.stato) || b.dataInvio.localeCompare(a.dataInvio))
  }, [richieste, filtro])

  /** Nel misto le sezioni sono etichettate: senza, l'ordine sembra casuale. */
  const conIntestazioni = filtro === 'tutte'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ backgroundColor: C.dark, padding: '56px 24px 20px' }}>
        <h2 style={{ color: C.bg, fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Richieste GDA</h2>
        <p style={{ color: alpha(C.silver, 0.5), fontSize: '13px', marginBottom: '16px' }}>
          <M.Ticker value={conteggi.pending_approval} /> in attesa di una risposta
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {ORDINE.map(s => (
            <M.CardButton
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                flex: 1, textAlign: 'left', cursor: 'pointer',
                backgroundColor: alpha(C.white, filtro === s ? 0.14 : 0.06),
                border: `1px solid ${filtro === s ? alpha(C.white, 0.2) : 'transparent'}`,
                borderRadius: '14px', padding: '10px 12px',
                transition: 'background-color 0.2s',
              }}
            >
              <p style={{ color: CFG[s].solid === STATUS.pending_approval.solid ? STATUS.pending_approval.light : s === 'approved' ? STATUS.approved.light : STATUS.refused.light, fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>
                <M.Ticker value={conteggi[s]} />
              </p>
              <p style={{ color: alpha(C.silver, 0.55), fontSize: '11px', fontWeight: 600 }}>{TITOLO[s]}</p>
            </M.CardButton>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {FILTRI.map(f => (
            <M.Chip
              key={f.id}
              onClick={() => setFiltro(f.id)}
              style={{
                position: 'relative', flexShrink: 0, padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                backgroundColor: filtro === f.id ? 'transparent' : alpha(C.white, 0.1),
                color: filtro === f.id ? C.dark : alpha(C.silver, 0.55),
                transition: 'color 0.18s',
              }}
            >
              {filtro === f.id && (
                <motion.div
                  layoutId="filtro-richieste"
                  transition={M.T.press}
                  style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, borderRadius: '20px', zIndex: 0 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
            </M.Chip>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <AnimatePresence initial={false}>
          {ordinate.length === 0 ? (
            <M.Item key="vuoto" variants={M.listItem} initial="initial" animate="animate" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: '10px' }}>
              <Icon.Check size={52} />
              <p style={{ color: C.dark, fontWeight: 700, fontSize: '16px' }}>Niente da vedere qui</p>
              <p style={{ color: C.gray, fontSize: '13px', textAlign: 'center', maxWidth: '260px' }}>
                Non c'è nessuna richiesta in questo stato.
              </p>
            </M.Item>
          ) : (
            ordinate.map((r, i) => {
              const primo = conIntestazioni && (i === 0 || ordinate[i - 1].stato !== r.stato)
              return (
                <motion.div key={r.id} layout>
                  {primo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: i === 0 ? '0 0 10px' : '14px 0 10px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: CFG[r.stato].solid }} />
                      <p style={{ color: alpha(C.dark, 0.4), fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {TITOLO[r.stato]}
                      </p>
                    </div>
                  )}
                  <Card richiesta={r} index={i} onApri={() => onApri(r)} />
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Card({ richiesta: r, index, onApri }: { richiesta: Richiesta; index: number; onApri: () => void }) {
  const cfg = CFG[r.stato]
  const p = produttore(r.produttoreId)
  const bottiglie = r.casse.reduce((s, c) => s + c.quantita, 0)
  const valore = r.casse.reduce((s, c) => s + cassaScontata(c), 0)
  const daFare = r.stato === 'pending_approval'

  return (
    <M.Item
      layout custom={index}
      variants={M.listItem} initial="initial" animate="animate" exit="exit"
      style={{
        backgroundColor: C.white, borderRadius: '18px', overflow: 'hidden',
        boxShadow: daFare ? '0 2px 12px rgba(0,0,0,0.10)' : '0 1px 6px rgba(0,0,0,0.06)',
        borderLeft: `6px solid ${cfg.solid}`,
        opacity: daFare ? 1 : 0.82,
      }}
    >
      <M.RowButton
        onClick={onApri}
        style={{ width: '100%', textAlign: 'left', padding: '15px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
              <cfg.Icona size={17} blob={cfg.solid} />
              <p style={{ color: C.dark, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.nome}
              </p>
            </div>
            {/* La cantina prima di tutto: qui si ragiona per produttore */}
            <p style={{ color: C.dark, fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.cantina}
            </p>
            <p style={{ color: C.gray, fontSize: '12px', marginTop: '1px' }}>
              {p.regione} · {r.casse.length} cass{r.casse.length === 1 ? 'a' : 'e'} · {bottiglie} bt
            </p>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '5px 11px', borderRadius: '20px', flexShrink: 0,
            backgroundColor: cfg.solid, color: C.white,
          }}>
            {cfg.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '11px', borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
          <div>
            <span style={{ color: C.dark, fontWeight: 800, fontSize: '17px' }}>€{eur(valore)}</span>
            <span style={{ color: C.gray, fontWeight: 400, fontSize: '12px', marginLeft: '5px' }}>al GDA</span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: daFare ? C.magenta : C.gray, fontSize: '13px', fontWeight: 700 }}>
            {daFare ? 'Valuta' : 'Apri'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={daFare ? C.magenta : C.gray} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        <p style={{ color: alpha(C.dark, 0.35), fontSize: '11.5px', marginTop: '8px' }}>
          Inviata il {new Date(r.dataInvio).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </M.RowButton>
    </M.Item>
  )
}
