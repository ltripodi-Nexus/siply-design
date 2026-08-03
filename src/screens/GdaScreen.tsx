import { useState } from 'react'
import { C, alpha } from '../colors'
import { cassaTotale, gdaBottiglie, gdaTotale, type Gda } from '../App'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'
import { STATUS } from '../status'
import * as Icon from '../components/Icons'

interface Props {
  gdaList: Gda[]
  onNuovoGda: () => void
  onDetail?: (gda: Gda) => void
  onChat?: (gda: Gda) => void
  /** disponibile solo sui GDA ancora in attesa di approvazione */
  onAggiungiCassa?: (gda: Gda) => void
}

type Filter = 'all' | 'bozza' | 'pending_approval' | 'approved' | 'refused'

const sCfg = {
  bozza: {
    label: 'Bozza', Icona: Icon.Matita, ...STATUS.bozza,
    desc: 'Creazione mai finalizzata. Riprendila per aggiungere casse e inviarla a Siply.',
  },
  pending_approval: {
    label: 'In attesa', Icona: Icon.Attesa, ...STATUS.pending_approval,
    desc: "Il tuo GDA è sotto esame. Il team Siply ti farà sapere presto!",
  },
  approved: {
    label: 'Approvato', Icona: Icon.Check, ...STATUS.approved,
    desc: 'Ottimo lavoro! Il tuo GDA è pubblicato sul catalogo Siply.',
  },
  refused: {
    label: 'Rifiutato', Icona: Icon.Croce, ...STATUS.refused,
    desc: 'Questo GDA non è stato approvato. Leggi le note per capire come migliorarlo.',
  },
}

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tutti' },
  { id: 'bozza', label: 'Bozze' },
  { id: 'approved', label: 'Approvati' },
  { id: 'pending_approval', label: 'In attesa' },
  { id: 'refused', label: 'Rifiutati' },
]

export default function GdaScreen({ gdaList, onNuovoGda, onDetail, onChat, onAggiungiCassa }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === 'all' ? gdaList : gdaList.filter(g => g.status === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ backgroundColor: C.dark, padding: '56px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h2 style={{ color: C.bg, fontSize: '26px', fontWeight: 800 }}>I miei GDA</h2>
          <M.Button
            onClick={onNuovoGda}
            style={{
              backgroundColor: C.magenta, color: C.bg, fontSize: '12px', fontWeight: 600,
              padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            + Nuovo
          </M.Button>
        </div>
        <p style={{ color: alpha(C.silver, 0.5), fontSize: '13px', marginBottom: '16px' }}>
          <M.Ticker value={gdaList.length} /> GDA {gdaList.length === 1 ? 'creato' : 'creati'}
        </p>

        {/* Filter chips — stessa pillola condivisa della nav e dei tab di login */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {filters.map(f => (
            <M.Chip
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                position: 'relative', flexShrink: 0, padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                backgroundColor: filter === f.id ? 'transparent' : alpha(C.white, 0.1),
                color: filter === f.id ? C.dark : alpha(C.silver, 0.55),
                transition: 'color 0.18s',
              }}
            >
              {filter === f.id && (
                <motion.div
                  layoutId="gda-filter"
                  transition={M.T.press}
                  style={{ position: 'absolute', inset: 0, backgroundColor: C.bg, borderRadius: '20px', zIndex: 0 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
            </M.Chip>
          ))}
        </div>
      </div>

      {/* List — al cambio filtro le card che restano scivolano al loro posto
          (`layout`), quelle che escono sfumano: si vede che è un filtro, non
          una pagina diversa. */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <M.Item
              key="vuoto"
              variants={M.listItem} initial="initial" animate="animate" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: '12px' }}
            >
              <Icon.Carrello size={56} />
              <p style={{ color: C.dark, fontWeight: 600, fontSize: '16px' }}>Nessun GDA qui</p>
              <M.Button
                onClick={onNuovoGda}
                style={{ backgroundColor: C.magenta, color: C.bg, padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', marginTop: '8px' }}
              >
                Crea il primo GDA
              </M.Button>
            </M.Item>
          ) : (
            filtered.map((g, i) => (
              <GdaCard
                key={g.id}
                index={i}
                gda={g}
                isExpanded={expanded === g.id}
                onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
                onDetail={() => onDetail?.(g)}
                onChat={() => onChat?.(g)}
                onAggiungiCassa={() => onAggiungiCassa?.(g)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function GdaCard({ gda, index, isExpanded, onToggle, onDetail, onChat, onAggiungiCassa }: { gda: Gda; index: number; isExpanded: boolean; onToggle: () => void; onDetail: () => void; onChat: () => void; onAggiungiCassa: () => void }) {
  const cfg = sCfg[gda.status]
  const nCasse = gda.casse.length
  // un GDA già approvato o rifiutato è chiuso: non si tocca più
  const modificabile = gda.status === 'pending_approval'
  const isBozza = gda.status === 'bozza'

  return (
    <M.Item
      layout custom={index}
      variants={M.listItem} initial="initial" animate="animate" exit="exit"
      style={{
        backgroundColor: C.white, borderRadius: '18px', overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        border: isBozza ? `1.5px dashed ${alpha(C.dark, 0.2)}` : 'none',
        // barretta di stato: fa leggere l'elenco senza fermarsi sui badge
        borderLeft: `6px solid ${cfg.solid}`,
      }}
    >
      <M.RowButton
        style={{ width: '100%', textAlign: 'left', padding: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
        // una bozza non si espande: cliccarla riporta dritti dov'era rimasta
        onClick={isBozza ? onAggiungiCassa : onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <cfg.Icona size={18} blob={cfg.solid} />
              <p style={{ color: C.dark, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gda.nome}
              </p>
            </div>
            <p style={{ color: C.gray, fontSize: '12px' }}>
              {nCasse} {nCasse === 1 ? 'cassa' : 'casse'} · {gdaBottiglie(gda)} bottiglie
            </p>
            <p style={{ color: C.gray, fontSize: '12px', marginTop: '2px' }}>
              {new Date(gda.dataCreazione).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {/* Badge pieno: la tinta al 15% non si distingueva da due metri */}
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '5px 11px', borderRadius: '20px', flexShrink: 0,
            letterSpacing: '0.02em',
            backgroundColor: cfg.solid, color: C.white,
          }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
          <span style={{ color: C.dark, fontWeight: 800, fontSize: '18px' }}>
            €{gdaTotale(gda)}
            <span style={{ color: C.gray, fontWeight: 400, fontSize: '12px', marginLeft: '4px' }}>/ GDA</span>
          </span>
          {isBozza ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.magenta, fontSize: '13px', fontWeight: 700 }}>
              Riprendi
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.magenta} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          ) : (
            <M.Chevron open={isExpanded} color={C.gray} />
          )}
        </div>
      </M.RowButton>

      <M.Collapse open={isExpanded && !isBozza}>
        <div style={{ backgroundColor: cfg.soft, borderTop: `1px solid ${alpha(C.dark, 0.06)}`, padding: '16px' }}>
          <p style={{ color: alpha(C.dark, 0.5), fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Stato
          </p>
          <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.55 }}>{cfg.desc}</p>
          {gda.note && (
            <div style={{ marginTop: '12px', backgroundColor: alpha(C.white, 0.65), borderRadius: '12px', padding: '12px' }}>
              <p style={{ color: alpha(C.dark, 0.5), fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Note Siply</p>
              <p style={{ color: C.dark, fontSize: '13px' }}>{gda.note}</p>
            </div>
          )}

          {/* Casse contenute nel GDA */}
          <p style={{ color: alpha(C.dark, 0.5), fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '14px 0 8px' }}>
            Casse nel GDA
          </p>
          <M.List style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {gda.casse.map(c => (
              <M.Item key={c.id} style={{ backgroundColor: alpha(C.white, 0.65), borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, color: C.dark, fontSize: '12px', fontWeight: 700 }}>
                    <Icon.Cassa size={15} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                  </span>
                  <span style={{ color: C.gray, fontSize: '12px', flexShrink: 0 }}>{c.quantita} bt · €{cassaTotale(c)}</span>
                </div>
                <p style={{ color: C.gray, fontSize: '11px', marginTop: '3px' }}>
                  {c.bottiglie ? c.bottiglie.map(b => b.bottiglia.nome).join(', ') : `${c.bottiglia.nome} · ${c.bottiglia.annata}`}
                </p>
              </M.Item>
            ))}
          </M.List>

          {/* Aggiungi una cassa — solo sui GDA ancora in attesa */}
          {modificabile && (
            <M.Button
              onClick={onAggiungiCassa}
              style={{
                width: '100%', marginTop: '12px', padding: '13px',
                backgroundColor: 'transparent', color: C.magenta,
                border: `2px dashed ${alpha(C.magenta, 0.4)}`, borderRadius: '12px',
                cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              }}
            >
              <span style={{ fontSize: '15px', lineHeight: 1 }}>＋</span>
              Aggiungi una cassa
            </M.Button>
          )}

          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <M.Button
              onClick={onChat}
              style={{
                flex: 1, padding: '12px',
                backgroundColor: gda.status === 'pending_approval' ? C.magenta : alpha(C.dark, 0.1),
                color: gda.status === 'pending_approval' ? C.bg : C.gray,
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Chat
            </M.Button>
            <M.Button
              onClick={onDetail}
              style={{
                flex: 1, padding: '12px',
                backgroundColor: C.dark, color: C.bg,
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              Dettaglio
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </M.Button>
          </div>
        </div>
      </M.Collapse>
    </M.Item>
  )
}
