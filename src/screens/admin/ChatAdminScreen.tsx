import { useEffect, useMemo, useRef, useState } from 'react'
import { C, alpha } from '../../colors'
import { eur } from '../../economia'
import * as M from '../../motion'
import { motion, AnimatePresence } from '../../motion'
import { STATUS } from '../../status'
import * as Icon from '../../components/Icons'
import { allegabili, DettaglioModale, type Allegato } from '../ChatScreen'
import { produttore, type Richiesta, type StatoRichiesta } from '../../admin/dati'
import { vociCassa } from '../../admin/statistiche'
import Riepilogo from '../../admin/Riepilogo'
import DocumentoModale from '../../admin/Documento'
import { NOME_CAMPO, type CampoPrezzo, type Documento, type Messaggio, type Proposta } from '../../admin/stato'

/* La conversazione lato Siply: la stessa chat del produttore, più gli
   strumenti per lavorarci sopra — il riepilogo della richiesta sempre a
   portata, la trattativa sul prezzo e l'esito con il documento. */

const ETICHETTA: Record<StatoRichiesta, string> = {
  pending_approval: 'Da valutare',
  approved: 'Approvata',
  refused: 'Rifiutata',
}

const COLORE: Record<StatoRichiesta, string> = {
  pending_approval: STATUS.pending_approval.light,
  approved: STATUS.approved.light,
  refused: STATUS.refused.light,
}

interface Props {
  richieste: Richiesta[]
  messaggi: Record<string, Messaggio[]>
  proposte: Proposta[]
  documenti: Record<string, Documento>
  apertaId: string | null
  onApri: (id: string | null) => void
  onInvia: (richiestaId: string, testo: string, allegati?: Allegato[]) => void
  onProponi: (p: Omit<Proposta, 'id' | 'stato'>) => void
  onDecidiProposta: (p: Proposta, accetta: boolean) => void
  onDecidi: (richiestaId: string, stato: StatoRichiesta, motivo?: string) => void
}

export default function ChatAdminScreen(p: Props) {
  const aperta = p.richieste.find(r => r.id === p.apertaId) ?? null

  return (
    <AnimatePresence mode="wait" initial={false}>
      {aperta ? (
        <motion.div
          key="thread"
          className="siply-page siply-chat"
          variants={M.stepVariants(1)} initial="initial" animate="animate" exit="exit"
        >
          <Thread
            richiesta={aperta}
            messaggi={p.messaggi[aperta.id] ?? []}
            proposte={p.proposte.filter(x => x.richiestaId === aperta.id)}
            documento={p.documenti[aperta.id]}
            onIndietro={() => p.onApri(null)}
            onInvia={(t, a) => p.onInvia(aperta.id, t, a)}
            onProponi={p.onProponi}
            onDecidiProposta={p.onDecidiProposta}
            onDecidi={(s, m) => p.onDecidi(aperta.id, s, m)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="lista"
          variants={M.stepVariants(-1)} initial="initial" animate="animate" exit="exit"
          style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
        >
          <Lista richieste={p.richieste} messaggi={p.messaggi} onApri={p.onApri} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Elenco delle conversazioni ──────────────────────────────────────────── */

const ORDINE: StatoRichiesta[] = ['pending_approval', 'approved', 'refused']

/** Le intestazioni contano più conversazioni: al plurale. */
const SEZIONE: Record<StatoRichiesta, string> = {
  pending_approval: 'Da valutare',
  approved: 'Approvate',
  refused: 'Rifiutate',
}

function Lista({ richieste, messaggi, onApri }: { richieste: Richiesta[]; messaggi: Record<string, Messaggio[]>; onApri: (id: string) => void }) {
  /* Ordine: prima chi aspetta una risposta, poi la richiesta più recente.
     È l'ordine in cui si lavora, quindi è quello in cui si legge. */
  const ordinate = useMemo(
    () => [...richieste].sort((a, b) =>
      ORDINE.indexOf(a.stato) - ORDINE.indexOf(b.stato) || b.dataInvio.localeCompare(a.dataInvio)),
    [richieste],
  )
  const daValutare = ordinate.filter(r => r.stato === 'pending_approval').length

  return (
    <>
      <div style={{ backgroundColor: C.dark, padding: '56px 24px 24px' }}>
        <h2 style={{ color: C.bg, fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Conversazioni</h2>
        <p style={{ color: alpha(C.silver, 0.5), fontSize: '14px' }}>
          Una per richiesta · {daValutare} in attesa di risposta
        </p>
      </div>

      <M.List style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ordinate.map((r, i) => {
          const pr = produttore(r.produttoreId)
          const msgs = messaggi[r.id] ?? []
          const ultimo = msgs[msgs.length - 1]
          const primo = i === 0 || ordinate[i - 1].stato !== r.stato
          return (
            <div key={r.id}>
              {primo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: i === 0 ? '0 0 10px' : '16px 0 10px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: STATUS[r.stato].solid }} />
                  <p style={{ color: alpha(C.dark, 0.4), fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {SEZIONE[r.stato]}
                  </p>
                </div>
              )}
              <M.Item>
                <M.CardButton
                  onClick={() => onApri(r.id)}
                  style={{
                    width: '100%', textAlign: 'left', backgroundColor: C.white,
                    borderRadius: '16px', padding: '14px 16px', border: 'none', cursor: 'pointer',
                    borderLeft: `6px solid ${STATUS[r.stato].solid}`,
                    display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
                    opacity: r.stato === 'pending_approval' ? 1 : 0.78,
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon.Persona size={20} color={C.bg} blob={null} />
                    </div>
                    <div style={{ position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: STATUS[r.stato].solid, border: `2px solid ${C.white}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{ color: C.dark, fontWeight: 700, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {pr.cantina}
                      </p>
                      {ultimo && <span style={{ color: C.gray, fontSize: '11px', flexShrink: 0 }}>{ultimo.ora}</span>}
                    </div>
                    <p style={{ color: alpha(C.dark, 0.55), fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.nome}
                    </p>
                    <p style={{ color: C.gray, fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ultimo ? anteprima(ultimo) : 'Nessun messaggio'}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.25)} strokeWidth={2} style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </M.CardButton>
              </M.Item>
            </div>
          )
        })}
      </M.List>
    </>
  )
}

function anteprima(m: Messaggio) {
  const chi = m.da === 'siply' ? 'Tu: ' : ''
  if (m.documento) return `${chi}📄 Documento emesso`
  if (m.propostaId) return `${chi}Proposta di modifica prezzo`
  return chi + (m.testo ?? '')
}

/* ── La conversazione ────────────────────────────────────────────────────── */

interface ThreadProps {
  richiesta: Richiesta
  messaggi: Messaggio[]
  proposte: Proposta[]
  documento?: Documento
  onIndietro: () => void
  onInvia: (testo: string, allegati?: Allegato[]) => void
  onProponi: (p: Omit<Proposta, 'id' | 'stato'>) => void
  onDecidiProposta: (p: Proposta, accetta: boolean) => void
  onDecidi: (stato: StatoRichiesta, motivo?: string) => void
}

function Thread({ richiesta: r, messaggi, proposte, documento, onIndietro, onInvia, onProponi, onDecidiProposta, onDecidi }: ThreadProps) {
  const [testo, setTesto] = useState('')
  const [allegati, setAllegati] = useState<Allegato[]>([])
  const [pickerAperto, setPickerAperto] = useState(false)
  const [dettaglio, setDettaglio] = useState<Allegato | null>(null)
  const [propostaAperta, setPropostaAperta] = useState(false)
  const [rifiutoAperto, setRifiutoAperto] = useState(false)
  const [docAperto, setDocAperto] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pr = produttore(r.produttoreId)
  const daValutare = r.stato === 'pending_approval'

  useEffect(() => {
    const box = scrollRef.current
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
  }, [messaggi.length])

  const invia = () => {
    const t = testo.trim()
    if (!t && allegati.length === 0) return
    onInvia(t || (allegati.length === 1 ? 'Ti giro questo:' : 'Ti giro questi:'), allegati)
    setTesto('')
    setAllegati([])
  }

  const toggleAllegato = (a: Allegato) =>
    setAllegati(prev => prev.some(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Intestazione */}
      <div style={{ backgroundColor: C.dark, padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <M.IconButton
            onClick={onIndietro}
            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: alpha(C.white, 0.1), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.2}>
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </M.IconButton>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: alpha(C.white, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon.Persona size={20} color={C.bg} blob={null} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: C.bg, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pr.cantina}
            </p>
            <p style={{ fontSize: '11px', fontWeight: 600, color: COLORE[r.stato], marginTop: '1px' }}>
              ● {ETICHETTA[r.stato]} · {r.nome}
            </p>
          </div>
        </div>
      </div>

      {/* Corpo: riepilogo e messaggi scorrono insieme */}
      <div ref={scrollRef} className="siply-chat-messaggi" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Riepilogo richiesta={r} />

        {documento && (
          <M.Button
            onClick={() => setDocAperto(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', backgroundColor: alpha(C.green, 0.14), border: `1.5px solid ${alpha(C.green, 0.4)}`, borderRadius: '14px', padding: '12px 14px', cursor: 'pointer' }}
          >
            <Icon.Documento size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: C.forest, fontSize: '13px', fontWeight: 700 }}>Documento emesso</p>
              <p style={{ color: C.gray, fontSize: '11.5px' }}>Protocollo {documento.protocollo}</p>
            </div>
            <span style={{ color: C.forest, fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>Apri</span>
          </M.Button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: alpha(C.dark, 0.08) }} />
          <span style={{ color: C.gray, fontSize: '11px' }}>
            {new Date(r.dataInvio).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: alpha(C.dark, 0.08) }} />
        </div>

        <AnimatePresence initial={false}>
          {messaggi.map(m => (
            <Bolla
              key={m.id}
              m={m}
              proposta={m.propostaId ? proposte.find(p => p.id === m.propostaId) : undefined}
              documento={m.documento ? documento : undefined}
              onDecidi={onDecidiProposta}
              onApriDocumento={() => setDocAperto(true)}
              onApriAllegato={setDettaglio}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Esito della richiesta */}
      {daValutare && (
        <div style={{ flexShrink: 0, padding: '12px 16px', backgroundColor: alpha(C.dark, 0.05), borderTop: `1px solid ${alpha(C.dark, 0.08)}`, display: 'flex', gap: '10px' }}>
          <M.Button
            onClick={() => setRifiutoAperto(true)}
            style={{ flex: 1, backgroundColor: 'transparent', color: STATUS.refused.solid, border: `1.5px solid ${alpha(STATUS.refused.solid, 0.4)}`, borderRadius: '13px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            Rifiuta
          </M.Button>
          <M.Button
            onClick={() => onDecidi('approved')}
            style={{ flex: 2, backgroundColor: STATUS.approved.solid, color: C.white, border: 'none', borderRadius: '13px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Icon.Check size={17} color={C.white} blob={null} />
            Approva ed emetti il documento
          </M.Button>
        </div>
      )}

      {/* Allegati in attesa */}
      <div style={{ flexShrink: 0, backgroundColor: C.bg, borderTop: `1px solid ${alpha(C.dark, 0.08)}` }}>
        <M.Collapse open={allegati.length > 0}>
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <AnimatePresence initial={false}>
              {allegati.map(a => (
                <motion.div
                  key={a.id} layout
                  variants={M.V.pop} initial="initial" animate="animate" exit="exit"
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', backgroundColor: C.white, border: `1.5px solid ${alpha(C.magenta, 0.3)}`, borderRadius: '10px', padding: '6px 8px 6px 10px' }}
                >
                  {a.tipo === 'cassa' ? <Icon.Cassa size={15} /> : <Icon.Bottiglia size={15} />}
                  <span style={{ color: C.dark, fontSize: '12px', fontWeight: 600, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.tipo === 'cassa' ? a.cassa.nome : a.bottiglia.nome}
                  </span>
                  <M.IconButton
                    onClick={() => toggleAllegato(a)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: alpha(C.dark, 0.35), fontSize: '15px', lineHeight: 1, padding: '0 2px' }}
                  >×</M.IconButton>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </M.Collapse>

        <div style={{ padding: '10px 16px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <M.IconButton
            onClick={() => setPickerAperto(true)}
            title="Allega una cassa o una bottiglia della richiesta"
            style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: C.white, border: `1.5px solid ${allegati.length ? C.magenta : alpha(C.dark, 0.1)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={allegati.length ? C.magenta : C.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </M.IconButton>
          {/* Lo strumento in più rispetto alla chat del produttore */}
          <M.IconButton
            onClick={() => setPropostaAperta(true)}
            title="Proponi un prezzo diverso"
            style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: alpha(C.ocra, 0.2), border: `1.5px solid ${alpha(C.ocra, 0.55)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Icon.Trend size={19} />
          </M.IconButton>
          <input
            type="text"
            placeholder="Scrivi al produttore..."
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && invia()}
            style={{ flex: 1, minWidth: 0, backgroundColor: C.white, border: `1.5px solid ${alpha(C.dark, 0.1)}`, borderRadius: '14px', padding: '12px 16px', color: C.dark, fontSize: '14px', outline: 'none' }}
          />
          <M.IconButton
            onClick={invia}
            disabled={!testo.trim() && allegati.length === 0}
            style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: testo.trim() || allegati.length ? C.magenta : alpha(C.dark, 0.1), border: 'none', cursor: testo.trim() || allegati.length ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={testo.trim() || allegati.length ? C.bg : C.gray} strokeWidth={2}>
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </M.IconButton>
        </div>
      </div>

      <AnimatePresence>
        {pickerAperto && (
          <PickerAllegati
            richiesta={r}
            selezionati={allegati}
            onToggle={toggleAllegato}
            onClose={() => setPickerAperto(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {dettaglio && <DettaglioModale allegato={dettaglio} onClose={() => setDettaglio(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {propostaAperta && (
          <SheetProposta
            richiesta={r}
            onClose={() => setPropostaAperta(false)}
            onInvia={p => { onProponi(p); setPropostaAperta(false) }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rifiutoAperto && (
          <SheetRifiuto
            onClose={() => setRifiutoAperto(false)}
            onConferma={motivo => { onDecidi('refused', motivo); setRifiutoAperto(false) }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {docAperto && documento && (
          <DocumentoModale richiesta={r} documento={documento} onClose={() => setDocAperto(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Bolle ───────────────────────────────────────────────────────────────── */

function Bolla({ m, proposta, documento, onDecidi, onApriDocumento, onApriAllegato }: {
  m: Messaggio
  proposta?: Proposta
  documento?: Documento
  onDecidi: (p: Proposta, accetta: boolean) => void
  onApriDocumento: () => void
  onApriAllegato: (a: Allegato) => void
}) {
  const mio = m.da === 'siply'
  return (
    <motion.div
      variants={M.V.bubble} initial="initial" animate="animate" exit="exit"
      style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: mio ? 'row-reverse' : 'row' }}
    >
      {!mio && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon.Persona size={14} color={C.bg} blob={null} />
        </div>
      )}
      <div style={{ maxWidth: proposta || documento ? '88%' : '78%', display: 'flex', flexDirection: 'column', alignItems: mio ? 'flex-end' : 'flex-start', gap: '4px' }}>
        {proposta && <CardProposta p={proposta} onDecidi={onDecidi} />}
        {documento && (
          <M.CardButton
            onClick={onApriDocumento}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', backgroundColor: C.white, border: `1.5px solid ${alpha(C.green, 0.4)}`, borderLeft: `4px solid ${C.green}`, borderRadius: '12px', padding: '11px 13px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <Icon.Documento size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: alpha(C.dark, 0.4), fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Documento</p>
              <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700 }}>Atto di attivazione GDA</p>
              <p style={{ color: C.gray, fontSize: '11px' }}>Protocollo {documento.protocollo}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.3)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </M.CardButton>
        )}
        {m.allegati?.map(a => (
          <M.CardButton
            key={a.id}
            onClick={() => onApriAllegato(a)}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', backgroundColor: C.white, border: `1.5px solid ${alpha(C.magenta, 0.3)}`, borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {a.tipo === 'cassa' ? <Icon.Cassa size={20} /> : <Icon.Bottiglia size={20} />}
            <span style={{ flex: 1, minWidth: 0, color: C.dark, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.tipo === 'cassa' ? a.cassa.nome : a.bottiglia.nome}
            </span>
          </M.CardButton>
        ))}
        {m.testo && (
          <div style={{ padding: '11px 15px', borderRadius: mio ? '18px 18px 4px 18px' : '18px 18px 18px 4px', backgroundColor: mio ? C.magenta : C.white, color: mio ? C.bg : C.dark, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{m.testo}</p>
          </div>
        )}
        <p style={{ color: C.gray, fontSize: '11px', padding: '0 4px' }}>{m.ora}</p>
      </div>
    </motion.div>
  )
}

/** La proposta di prezzo: da quanto a quanto, e di quanto cambia.
 *  A decidere siamo noi: confermandola il prezzo cambia nel GDA del produttore,
 *  che se lo trova aggiornato e riceve la comunicazione in chat. */
function CardProposta({ p, onDecidi }: { p: Proposta; onDecidi: (p: Proposta, accetta: boolean) => void }) {
  const delta = p.da > 0 ? ((p.a - p.da) / p.da) * 100 : 0
  const giu = p.a < p.da
  const colore = giu ? C.magenta : C.forest
  const decisa = p.stato !== 'attesa'

  return (
    <div style={{ width: '100%', backgroundColor: C.white, border: `1.5px solid ${alpha(colore, 0.35)}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.08)' }}>
      <div style={{ padding: '11px 14px 12px' }}>
        <p style={{ color: alpha(C.dark, 0.4), fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Proposta di modifica prezzo
        </p>
        <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{p.vinoNome}</p>
        <p style={{ color: C.gray, fontSize: '11.5px', marginBottom: '9px' }}>{NOME_CAMPO[p.campo]}</p>

        {/* Il confronto: prezzo di adesso, freccia, prezzo proposto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ color: alpha(C.dark, 0.4), fontSize: '15px', fontWeight: 700, textDecoration: 'line-through' }}>
            €{eur(p.da)}
          </span>
          <Freccia giu={giu} colore={colore} />
          <span style={{ color: colore, fontSize: '20px', fontWeight: 800 }}>€{eur(p.a)}</span>
          <span style={{ color: colore, fontSize: '12px', fontWeight: 800, backgroundColor: alpha(colore, 0.13), padding: '3px 9px', borderRadius: '20px' }}>
            {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(1).replace('.', ',')}%
          </span>
        </div>

        {p.nota && (
          <p style={{ color: C.gray, fontSize: '12.5px', lineHeight: 1.5, marginTop: '9px', paddingTop: '9px', borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
            {p.nota}
          </p>
        )}
      </div>

      {decisa ? (
        <div style={{
          padding: '9px 14px',
          backgroundColor: p.stato === 'accettata' ? alpha(C.green, 0.16) : alpha(C.dark, 0.05),
          borderTop: `1px solid ${alpha(C.dark, 0.06)}`,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {p.stato === 'accettata'
            ? <Icon.Check size={16} blob={null} color={C.forest} />
            : <Icon.Croce size={16} blob={null} color={C.gray} />}
          <p style={{ color: p.stato === 'accettata' ? C.forest : C.gray, fontSize: '12px', fontWeight: 700 }}>
            {p.stato === 'accettata' ? 'Applicata — il produttore ha il prezzo nuovo' : 'Lasciata cadere — resta il prezzo di prima'}
          </p>
        </div>
      ) : (
        <div style={{ padding: '9px 12px', backgroundColor: alpha(C.dark, 0.04), borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
          <p style={{ color: alpha(C.dark, 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' }}>
            Decidi tu — la modifica si applica al produttore
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <M.Button
              onClick={() => onDecidi(p, true)}
              style={{ flex: 1, backgroundColor: STATUS.approved.solid, color: C.white, border: 'none', borderRadius: '10px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Accetta e applica
            </M.Button>
            <M.Button
              onClick={() => onDecidi(p, false)}
              style={{ flex: 1, backgroundColor: 'transparent', color: C.gray, border: `1.5px solid ${alpha(C.dark, 0.15)}`, borderRadius: '10px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Lascia perdere
            </M.Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Freccia({ giu, colore }: { giu: boolean; colore: string }) {
  return (
    <motion.svg
      initial={{ y: giu ? -4 : 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={M.T.press}
      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d={giu ? 'M12 5v14M5 12l7 7 7-7' : 'M12 19V5M5 12l7-7 7 7'} />
    </motion.svg>
  )
}

/* ── Comporre una proposta ───────────────────────────────────────────────── */

function SheetProposta({ richiesta: r, onClose, onInvia }: {
  richiesta: Richiesta
  onClose: () => void
  onInvia: (p: Omit<Proposta, 'id' | 'stato'>) => void
}) {
  /** Tutte le bottiglie della richiesta, con la cassa da cui vengono. */
  const righe = useMemo(
    () => r.casse.flatMap(c => vociCassa(c).map(v => ({ cassa: c, bottiglia: v.bottiglia }))),
    [r],
  )
  const [scelta, setScelta] = useState(0)
  const [campo, setCampo] = useState<CampoPrezzo>('gda')
  const [valore, setValore] = useState('')
  const [nota, setNota] = useState('')

  const riga = righe[scelta]
  const chiave = campo === 'gda' ? 'prezziScontati' : 'costiScontati'
  const attuale = parseFloat(riga.cassa[chiave]?.[riga.bottiglia.id] ?? '') || riga.bottiglia.prezzo
  const nuovo = parseFloat(valore)
  const valido = !isNaN(nuovo) && nuovo > 0 && Math.abs(nuovo - attuale) > 0.004
  const delta = valido ? ((nuovo - attuale) / attuale) * 100 : 0

  return (
    <M.Overlay onClose={onClose} kind="sheet" z={420} veil={0.6} panelStyle={{
      maxWidth: '640px', backgroundColor: C.bg, borderRadius: '24px 24px 0 0',
      maxHeight: '88vh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flexShrink: 0, padding: '12px 20px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15) }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: C.dark, fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>Proponi un prezzo</h3>
            <p style={{ color: C.gray, fontSize: '12px', marginTop: '3px' }}>Finisce in chat come proposta. La confermi tu da lì: il prezzo cambia nel GDA del produttore.</p>
          </div>
          <M.IconButton onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</M.IconButton>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {/* Su quale bottiglia */}
        <p style={labelSheet}>Su quale bottiglia</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {righe.map((x, i) => (
            <M.RowButton
              key={`${x.cassa.id}-${x.bottiglia.id}`}
              onClick={() => setScelta(i)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                backgroundColor: i === scelta ? alpha(C.magenta, 0.07) : C.white,
                border: `1.5px solid ${i === scelta ? C.magenta : alpha(C.dark, 0.08)}`,
                borderRadius: '12px', padding: '10px 13px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}
            >
              <Icon.Bottiglia size={17} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: C.dark, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.bottiglia.nome}</p>
                <p style={{ color: C.gray, fontSize: '11px' }}>in {x.cassa.nome}</p>
              </div>
            </M.RowButton>
          ))}
        </div>

        {/* Quale prezzo */}
        <p style={labelSheet}>Quale prezzo</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['gda', 'siply'] as CampoPrezzo[]).map(c => (
            <M.Chip
              key={c}
              onClick={() => setCampo(c)}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer',
                fontSize: '12.5px', fontWeight: 700,
                backgroundColor: campo === c ? C.dark : C.white,
                color: campo === c ? C.bg : C.gray,
                border: `1.5px solid ${campo === c ? C.dark : alpha(C.dark, 0.1)}`,
              }}
            >
              {NOME_CAMPO[c]}
            </M.Chip>
          ))}
        </div>

        {/* Da quanto a quanto */}
        <p style={labelSheet}>Nuovo prezzo</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: C.white, border: `1.5px solid ${valido ? C.magenta : alpha(C.dark, 0.1)}`, borderRadius: '14px', padding: '12px 16px', marginBottom: '10px' }}>
          <div>
            <p style={{ color: alpha(C.dark, 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Adesso</p>
            <p style={{ color: C.gray, fontSize: '18px', fontWeight: 700 }}>€{eur(attuale)}</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.25)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: alpha(C.dark, 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Proposta</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
              <span style={{ color: C.dark, fontSize: '18px', fontWeight: 800 }}>€</span>
              <input
                className="num-clean"
                type="number" step="0.5" min="0"
                placeholder={attuale.toFixed(2)}
                value={valore}
                onChange={e => setValore(e.target.value)}
                style={{ width: '100%', minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.dark, fontSize: '22px', fontWeight: 800 }}
              />
            </div>
          </div>
        </div>

        {valido && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
            <Freccia giu={nuovo < attuale} colore={nuovo < attuale ? C.magenta : C.forest} />
            <span style={{ color: nuovo < attuale ? C.magenta : C.forest, fontSize: '15px', fontWeight: 800 }}>
              {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(1).replace('.', ',')}%
            </span>
            <span style={{ color: C.gray, fontSize: '13px' }}>
              {nuovo < attuale ? 'in meno rispetto a ora' : 'in più rispetto a ora'}
            </span>
          </div>
        )}

        <p style={labelSheet}>Perché (opzionale)</p>
        <textarea
          rows={2}
          placeholder="es. Con questo prezzo il GDA rientra nella fascia della selezione attiva."
          value={nota}
          onChange={e => setNota(e.target.value)}
          style={{ width: '100%', backgroundColor: C.white, border: `1.5px solid ${alpha(C.dark, 0.1)}`, borderRadius: '12px', padding: '12px 14px', color: C.dark, fontSize: '13.5px', outline: 'none', resize: 'none', lineHeight: 1.5, marginBottom: '8px' }}
        />
      </div>

      <div style={{ flexShrink: 0, padding: '12px 20px 32px', borderTop: `1px solid ${alpha(C.dark, 0.07)}` }}>
        <M.Button
          onClick={() => valido && onInvia({
            richiestaId: r.id,
            cassaId: riga.cassa.id,
            vinoId: riga.bottiglia.id,
            vinoNome: riga.bottiglia.nome,
            campo,
            da: attuale,
            a: nuovo,
            nota: nota.trim() || undefined,
          })}
          disabled={!valido}
          style={{
            width: '100%', backgroundColor: valido ? C.magenta : alpha(C.dark, 0.12),
            color: valido ? C.bg : alpha(C.dark, 0.35),
            fontWeight: 700, padding: '15px', borderRadius: '14px', fontSize: '15px',
            border: 'none', cursor: valido ? 'pointer' : 'default', transition: 'background-color 0.2s',
          }}
        >
          Invia la proposta
        </M.Button>
      </div>
    </M.Overlay>
  )
}

/* ── Rifiutare, dicendo perché ───────────────────────────────────────────── */

const MOTIVI = [
  'Fascia di prezzo fuori dalla selezione attiva.',
  'Sconto troppo alto: il margine del produttore va sotto il costo.',
  'Documentazione del listino mancante o incompleta.',
  'Quantità non sufficienti a coprire il primo obiettivo.',
]

function SheetRifiuto({ onClose, onConferma }: { onClose: () => void; onConferma: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('')

  return (
    <M.Overlay onClose={onClose} kind="sheet" z={420} veil={0.6} panelStyle={{
      maxWidth: '560px', backgroundColor: C.bg, borderRadius: '24px 24px 0 0',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '12px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15) }} />
        </div>
        <h3 style={{ color: C.dark, fontSize: '18px', fontWeight: 800 }}>Perché non va bene?</h3>
        <p style={{ color: C.gray, fontSize: '12.5px', marginTop: '3px', marginBottom: '14px' }}>
          Il motivo finisce in chat: è quello su cui il produttore lavorerà per riprovare.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {MOTIVI.map(m => (
            <M.RowButton
              key={m}
              onClick={() => setMotivo(m)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                backgroundColor: motivo === m ? alpha(C.magenta, 0.07) : C.white,
                border: `1.5px solid ${motivo === m ? C.magenta : alpha(C.dark, 0.08)}`,
                borderRadius: '12px', padding: '11px 13px',
                color: C.dark, fontSize: '13px', lineHeight: 1.45,
              }}
            >
              {m}
            </M.RowButton>
          ))}
        </div>

        <textarea
          rows={2}
          placeholder="…oppure scrivi il motivo"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          style={{ width: '100%', backgroundColor: C.white, border: `1.5px solid ${alpha(C.dark, 0.1)}`, borderRadius: '12px', padding: '12px 14px', color: C.dark, fontSize: '13.5px', outline: 'none', resize: 'none', lineHeight: 1.5, marginBottom: '14px' }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <M.Button
            onClick={onClose}
            style={{ flex: 1, backgroundColor: alpha(C.dark, 0.08), color: C.dark, fontWeight: 700, padding: '14px', borderRadius: '14px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
          >
            Annulla
          </M.Button>
          <M.Button
            onClick={() => motivo.trim() && onConferma(motivo.trim())}
            disabled={!motivo.trim()}
            style={{
              flex: 1, backgroundColor: motivo.trim() ? STATUS.refused.solid : alpha(C.dark, 0.12),
              color: motivo.trim() ? C.white : alpha(C.dark, 0.35),
              fontWeight: 700, padding: '14px', borderRadius: '14px', fontSize: '14px', border: 'none',
              cursor: motivo.trim() ? 'pointer' : 'default', transition: 'background-color 0.2s',
            }}
          >
            Rifiuta la richiesta
          </M.Button>
        </div>
      </div>
    </M.Overlay>
  )
}

/* ── Scegliere cosa allegare ─────────────────────────────────────────────── */

function PickerAllegati({ richiesta, selezionati, onToggle, onClose }: {
  richiesta: Richiesta
  selezionati: Allegato[]
  onToggle: (a: Allegato) => void
  onClose: () => void
}) {
  const voci = allegabili(richiesta)
  const sel = (a: Allegato) => selezionati.some(x => x.id === a.id)

  return (
    <M.Overlay onClose={onClose} kind="sheet" z={400} veil={0.6} panelStyle={{
      maxWidth: '640px', backgroundColor: C.bg, borderRadius: '24px 24px 0 0',
      maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flexShrink: 0, padding: '12px 20px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15) }} />
        </div>
        <h3 style={{ color: C.dark, fontSize: '18px', fontWeight: 800 }}>Allega al messaggio</h3>
        <p style={{ color: C.gray, fontSize: '12px', marginTop: '3px' }}>Casse e bottiglie di {richiesta.nome}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: C.white }}>
        {voci.map(a => (
          <M.RowButton
            key={a.id}
            onClick={() => onToggle(a)}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', padding: '12px 20px',
              background: sel(a) ? alpha(C.magenta, 0.05) : 'none', border: 'none',
              borderBottom: `1px solid ${alpha(C.dark, 0.05)}`,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <motion.div
              animate={{ borderColor: sel(a) ? C.magenta : alpha(C.dark, 0.2), backgroundColor: sel(a) ? C.magenta : 'rgba(0,0,0,0)' }}
              transition={M.T.micro}
              style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, borderWidth: '2px', borderStyle: 'solid', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <AnimatePresence>
                {sel(a) && (
                  <motion.svg key="v" variants={M.V.pop} initial="initial" animate="animate" exit="exit" width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.div>
            {a.tipo === 'cassa' ? <Icon.Cassa size={18} /> : <Icon.Bottiglia size={18} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: C.dark, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.tipo === 'cassa' ? a.cassa.nome : a.bottiglia.nome}
              </p>
              <p style={{ color: C.gray, fontSize: '11px', marginTop: '2px' }}>
                {a.tipo === 'cassa' ? `${a.cassa.quantita} bt` : `${a.quantita} bt · in ${a.cassaNome}`}
              </p>
            </div>
          </M.RowButton>
        ))}
      </div>
      <div style={{ flexShrink: 0, padding: '12px 20px 32px', borderTop: `1px solid ${alpha(C.dark, 0.07)}` }}>
        <M.Button
          onClick={onClose}
          style={{ width: '100%', backgroundColor: C.magenta, color: C.bg, fontWeight: 700, padding: '15px', borderRadius: '14px', fontSize: '15px', border: 'none', cursor: 'pointer' }}
        >
          {selezionati.length > 0 ? `Allega ${selezionati.length} element${selezionati.length === 1 ? 'o' : 'i'}` : 'Chiudi'}
        </M.Button>
      </div>
    </M.Overlay>
  )
}

const labelSheet: React.CSSProperties = {
  color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '7px',
}
