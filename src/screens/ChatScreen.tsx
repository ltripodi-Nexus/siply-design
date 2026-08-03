import { useState, useRef, useEffect, useMemo } from 'react'
import { C, alpha } from '../colors'
import { cassaTotale, gdaBottiglie, type User, type Gda, type Cassa, type Bottiglia } from '../App'
import { useDemo, DEMO_CHAT } from '../demo'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'
import { STATUS } from '../status'
import * as Icon from '../components/Icons'

interface Props {
  user: User
  gdaList: Gda[]
  openGdaId?: string | null
  onOpenHandled?: () => void
}

/** Riferimento a una cassa o a una bottiglia del GDA di cui si sta parlando.
 *  Porta con sé i dati che servono a mostrarlo, così il messaggio resta leggibile
 *  anche se il GDA cambia dopo l'invio. */
type Allegato =
  | { tipo: 'cassa'; id: string; cassa: Cassa }
  | { tipo: 'bottiglia'; id: string; bottiglia: Bottiglia; quantita: number; cassaNome: string }

interface Message {
  id: string
  sender: 'produttore' | 'siply'
  text: string
  time: string
  allegati?: Allegato[]
}

/** Tutto quello che si può allegare partendo da un GDA. */
function allegabili(gda: Gda): Allegato[] {
  const casse: Allegato[] = gda.casse.map(c => ({ tipo: 'cassa', id: `c:${c.id}`, cassa: c }))
  const bottiglie: Allegato[] = gda.casse.flatMap(c =>
    (c.bottiglie ?? [{ bottiglia: c.bottiglia, quantita: c.quantita }]).map(b => ({
      tipo: 'bottiglia' as const,
      id: `b:${c.id}:${b.bottiglia.id}`,
      bottiglia: b.bottiglia,
      quantita: b.quantita,
      cassaNome: c.nome,
    })),
  )
  return [...casse, ...bottiglie]
}

type ChatMap = Record<string, Message[]>

const STATUS_LABEL: Record<Gda['status'], string> = {
  bozza: 'Bozza',
  pending_approval: 'In attesa',
  approved: 'Approvato',
  refused: 'Rifiutato',
}

/** Su card bianche si usa `solid`, sull'header scuro `light`: vedi src/status.ts */
const STATUS_COLOR: Record<Gda['status'], string> = {
  bozza: STATUS.bozza.solid,
  pending_approval: STATUS.pending_approval.solid,
  approved: STATUS.approved.solid,
  refused: STATUS.refused.solid,
}

const INITIAL_MSGS: Record<string, Message[]> = {
  g1: [
    { id: '1', sender: 'siply', text: "Ciao! Il GDA 'Nordeuropa 2025' è stato approvato e pubblicato sul catalogo Siply. Complimenti per la selezione!", time: '10:30' },
    { id: '2', sender: 'produttore', text: "Grazie mille! Posso sapere quando sarà visibile agli acquirenti?", time: '10:45' },
    { id: '3', sender: 'siply', text: "Già da oggi pomeriggio sarà live, con entrambe le casse. Buone vendite!", time: '10:47' },
  ],
  g2: [
    { id: '1', sender: 'siply', text: "Ciao! Il GDA 'Ristorazione Milano' è in fase di revisione. Ti faremo sapere entro 48 ore. Nel frattempo puoi ancora aggiungere casse al gruppo.", time: '09:15' },
  ],
  g3: [
    { id: '1', sender: 'siply', text: "Ciao! Riguardo al GDA 'Enoteche Veneto': purtroppo non rientra nella fascia di prezzo della selezione attiva. Puoi proporre vini tra €15 e €35 a bottiglia.", time: '14:00' },
    { id: '2', sender: 'produttore', text: "Capito, posso proporre il Chianti Classico 2021 a €22?", time: '14:12' },
    { id: '3', sender: 'siply', text: "Perfetto! Apri un nuovo GDA con quel vino e lo valuteremo volentieri.", time: '14:15' },
  ],
}

/** Allegato d'esempio agganciato al primo messaggio dei thread mock. */
const ESEMPI_ALLEGATO: Record<string, Allegato['tipo']> = { g2: 'cassa', g3: 'bottiglia' }

const AUTO_REPLIES = [
  "Grazie per il messaggio! Il nostro team ti risponderà a breve.",
  "Ho preso nota. Ti aggiorniamo entro 24 ore lavorative.",
  "Ottima domanda! Lasciami verificare e ti rispondo subito.",
  "Capito! Siamo qui per supportarti in ogni fase. Hai altre domande?",
]

function ts() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

export default function ChatScreen({ user: _user, gdaList: tutti, openGdaId, onOpenHandled }: Props) {
  // le bozze non sono ancora arrivate a Siply: nessuna conversazione da aprire.
  // Memoizzato perché finisce nelle dipendenze dell'effect di sync qui sotto.
  const gdaList = useMemo(() => tutti.filter(g => g.status !== 'bozza'), [tutti])

  const [chatMap, setChatMap] = useState<ChatMap>(() => {
    const map: ChatMap = {}
    gdaList.forEach(g => {
      const msgs = [...(INITIAL_MSGS[g.id] ?? [])]
      const tipo = ESEMPI_ALLEGATO[g.id]
      if (tipo && msgs[0]) {
        const scelto = allegabili(g).find(v => v.tipo === tipo)
        if (scelto) msgs[0] = { ...msgs[0], allegati: [scelto] }
      }
      map[g.id] = msgs
    })
    return map
  })
  const [openId, setOpenId] = useState<string | null>(openGdaId ?? null)

  useEffect(() => {
    if (openGdaId) {
      setOpenId(openGdaId)
      onOpenHandled?.()
    }
  }, [openGdaId])

  const openGda = gdaList.find(g => g.id === openId)
  const isOpen = openGda?.status === 'pending_approval'

  // Apre una conversazione vuota per ogni GDA nuovo.
  // Se non manca niente si restituisce `prev` così com'è: senza questo controllo
  // l'oggetto nuovo a ogni giro faceva ri-renderizzare all'infinito.
  useEffect(() => {
    setChatMap(prev => {
      const mancanti = gdaList.filter(g => !prev[g.id])
      if (mancanti.length === 0) return prev
      const next = { ...prev }
      mancanti.forEach(g => { next[g.id] = [] })
      return next
    })
  }, [gdaList])

  const sendMessage = (gdaId: string, text: string, allegati: Allegato[]) => {
    const msg: Message = { id: String(Date.now()), sender: 'produttore', text, time: ts(), allegati: allegati.length ? allegati : undefined }
    setChatMap(prev => ({ ...prev, [gdaId]: [...(prev[gdaId] ?? []), msg] }))
    setTimeout(() => {
      const reply: Message = { id: String(Date.now() + 1), sender: 'siply', text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)], time: ts() }
      setChatMap(prev => ({ ...prev, [gdaId]: [...(prev[gdaId] ?? []), reply] }))
    }, 1400)
  }

  const pending = gdaList.filter(g => g.status === 'pending_approval')
  const closed = gdaList.filter(g => g.status !== 'pending_approval')

  /* Entrare in una conversazione è un livello più in profondità: il thread
     arriva da destra, tornare indietro lo rimanda da dove è venuto. */
  return (
    <AnimatePresence mode="wait" initial={false}>
      {openId && openGda ? (
        <motion.div
          key="thread"
          className="siply-page siply-chat"
          variants={M.stepVariants(1)} initial="initial" animate="animate" exit="exit"
        >
          <ChatThread
            gda={openGda}
            messages={chatMap[openId] ?? []}
            canSend={isOpen}
            onSend={(text, allegati) => sendMessage(openId, text, allegati)}
            onBack={() => setOpenId(null)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="lista"
          variants={M.stepVariants(-1)} initial="initial" animate="animate" exit="exit"
          style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
        >
      {/* Header */}
      <div style={{ backgroundColor: C.dark, padding: '56px 24px 24px' }}>
        <h2 style={{ color: C.bg, fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Chat con Siply</h2>
        <p style={{ color: alpha(C.silver, 0.5), fontSize: '14px' }}>
          Ogni GDA ha la sua conversazione dedicata
        </p>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Active chats */}
        {pending.length > 0 && (
          <section>
            <SectionLabel label="Conversazioni attive" dot={C.green} />
            <M.List style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pending.map(g => (
                <ChatRow
                  key={g.id}
                  gda={g}
                  messages={chatMap[g.id] ?? []}
                  active
                  onClick={() => setOpenId(g.id)}
                />
              ))}
            </M.List>
          </section>
        )}

        {/* Closed chats */}
        {closed.length > 0 && (
          <section>
            <SectionLabel label="Conversazioni chiuse" dot={C.gray} />
            <M.List style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {closed.map(g => (
                <ChatRow
                  key={g.id}
                  gda={g}
                  messages={chatMap[g.id] ?? []}
                  active={false}
                  onClick={() => setOpenId(g.id)}
                />
              ))}
            </M.List>
          </section>
        )}

        {gdaList.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: '12px' }}>
            <Icon.Chat size={52} />
            <p style={{ color: C.dark, fontWeight: 600, fontSize: '16px' }}>Nessuna chat ancora</p>
            <p style={{ color: C.gray, fontSize: '14px', textAlign: 'center', maxWidth: '240px' }}>
              Le chat si aprono automaticamente quando crei un nuovo GDA.
            </p>
          </div>
        )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Chat row in list ───────────────────────────────────────────────────────── */
function ChatRow({ gda, messages, active, onClick }: {
  gda: Gda
  messages: Message[]
  active: boolean
  onClick: () => void
}) {
  const last = messages[messages.length - 1]
  const statusColor = STATUS_COLOR[gda.status]

  return (
    <M.Item>
      <M.CardButton
        onClick={onClick}
        style={{
          width: '100%', textAlign: 'left', backgroundColor: C.white,
          borderRadius: '16px', padding: '14px 16px', border: 'none', cursor: 'pointer',
          borderLeft: `6px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
          opacity: active ? 1 : 0.72,
        }}
      >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.55 }}>
          <Icon.Mascotte height={24} />
        </div>
        {/* Status dot */}
        <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '11px', height: '11px', borderRadius: '50%', backgroundColor: statusColor, border: `2px solid ${C.white}` }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
          <p style={{ color: C.dark, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {gda.nome}
          </p>
          {last && <span style={{ color: C.gray, fontSize: '11px', flexShrink: 0 }}>{last.time}</span>}
        </div>
        <p style={{ color: C.gray, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {last ? (last.sender === 'siply' ? 'Siply: ' : 'Tu: ') + last.text : 'Nessun messaggio ancora'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: C.white, backgroundColor: statusColor, padding: '3px 8px', borderRadius: '20px' }}>
            {STATUS_LABEL[gda.status]}
          </span>
          <span style={{ fontSize: '10px', color: C.gray, backgroundColor: alpha(C.dark, 0.06), padding: '2px 7px', borderRadius: '20px', fontWeight: 500 }}>
            {gda.casse.length} cass{gda.casse.length === 1 ? 'a' : 'e'}
          </span>
          {!active && (
            <span style={{ fontSize: '10px', color: C.gray, backgroundColor: alpha(C.dark, 0.06), padding: '2px 7px', borderRadius: '20px', fontWeight: 500 }}>
              <Icon.Lucchetto size={11} color={C.gray} blob={null} /> Chiusa
            </span>
          )}
        </div>
      </div>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.25)} strokeWidth={2}>
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </M.CardButton>
    </M.Item>
  )
}

/* ── Thread view ─────────────────────────────────────────────────────────────── */
function ChatThread({ gda, messages, canSend, onSend, onBack }: {
  gda: Gda
  messages: Message[]
  canSend: boolean
  onSend: (text: string, allegati: Allegato[]) => void
  onBack: () => void
}) {
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [allegati, setAllegati] = useState<Allegato[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dettaglio, setDettaglio] = useState<Allegato | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useDemo(m => {
    if (m === 'clear') { setInput(''); setAllegati([]); return }
    setInput(DEMO_CHAT)
    // allega la prima cassa del GDA, così si vede subito com'è fatto un allegato
    setAllegati(allegabili(gda).slice(0, 1))
  })

  // l'intestazione del thread sta sul fondo scuro: qui serve la variante chiara
  const statusColor = STATUS[gda.status].light
  const puoInviare = canSend && (input.trim().length > 0 || allegati.length > 0)

  /* Scorre la lista dei messaggi, non la pagina: `scrollIntoView` muoveva ogni
     antenato scrollabile, finestra compresa, e la barra di scrittura si
     staccava dal fondo dello schermo. */
  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const send = () => {
    if (!puoInviare) return
    onSend(input.trim(), allegati)
    setInput('')
    setAllegati([])
    setTyping(true)
    setTimeout(() => setTyping(false), 1500)
  }

  const toggleAllegato = (a: Allegato) =>
    setAllegati(prev => prev.some(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div style={{ backgroundColor: C.dark, padding: '52px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <M.IconButton
            onClick={onBack}
            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: alpha(C.white, 0.1), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.2}>
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </M.IconButton>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: alpha(C.white, canSend ? 0.14 : 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Mascotte height={23} />
            </div>
            <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: statusColor, border: `2px solid ${C.dark}` }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: C.bg, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {gda.nome}
            </p>
            <p style={{ fontSize: '11px', fontWeight: 600, color: statusColor, marginTop: '1px' }}>
              {canSend ? '● Chat attiva' : `Chat chiusa · ${STATUS_LABEL[gda.status]}`}
            </p>
          </div>
        </div>

        {/* Riepilogo GDA */}
        <div style={{ marginTop: '14px', backgroundColor: alpha(C.white, 0.07), borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Icon.Carrello size={17} color={alpha(C.silver, 0.75)} blob={null} />
          <p style={{ color: alpha(C.silver, 0.6), fontSize: '12px' }}>
            {gda.casse.length} cass{gda.casse.length === 1 ? 'a' : 'e'} · {gdaBottiglie(gda)} bottiglie
          </p>
        </div>
      </div>

      {/* Closed banner */}
      {!canSend && (
        <div style={{ backgroundColor: alpha(C.dark, 0.06), borderBottom: `1px solid ${alpha(C.dark, 0.08)}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <Icon.Lucchetto size={18} />
          <p style={{ color: C.gray, fontSize: '13px', lineHeight: 1.45 }}>
            Questo GDA è <strong style={{ color: C.dark }}>{STATUS_LABEL[gda.status].toLowerCase()}</strong> — la conversazione è in sola lettura.
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="siply-chat-messaggi" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: '8px' }}>
            <Icon.Chat size={40} />
            <p style={{ color: C.gray, fontSize: '14px', textAlign: 'center' }}>Nessun messaggio ancora.<br />Scrivi al team Siply qui sotto.</p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: alpha(C.dark, 0.08) }} />
          <span style={{ color: C.gray, fontSize: '11px' }}>
            {new Date(gda.dataCreazione).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: alpha(C.dark, 0.08) }} />
        </div>

        {/* I messaggi già presenti compaiono subito (initial={false}): solo quelli
            nuovi entrano dal basso, come in una chat vera. */}
        <AnimatePresence initial={false}>
          {messages.map(m => <Bubble key={m.id} m={m} onApriAllegato={setDettaglio} />)}
        </AnimatePresence>

        <AnimatePresence>
          {typing && (
          <motion.div
            key="typing"
            variants={M.V.bubble} initial="initial" animate="animate" exit="exit"
            style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.Mascotte height={16} /></div>
            <div style={{ backgroundColor: C.white, borderRadius: '16px 16px 16px 4px', padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px' }}>
                {[0, 150, 300].map(d => (
                  <span key={d} style={{ width: '6px', height: '6px', backgroundColor: C.gray, borderRadius: '50%', display: 'inline-block', animation: `bounce 1.2s ${d}ms infinite` }} />
                ))}
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      {canSend ? (
        <div style={{ backgroundColor: C.bg, borderTop: `1px solid ${alpha(C.dark, 0.08)}`, flexShrink: 0 }}>
          {/* Allegati in attesa di invio — ogni chip fa "pop" quando entra ed esce */}
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

          <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <M.IconButton
              onClick={() => setPickerOpen(true)}
              title="Allega una cassa o una bottiglia del GDA"
              style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: C.white, border: `1.5px solid ${allegati.length ? C.magenta : alpha(C.dark, 0.1)}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', transition: 'border-color 0.2s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={allegati.length ? C.magenta : C.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
              <AnimatePresence>
                {allegati.length > 0 && (
                  <motion.span
                    key="badge"
                    variants={M.V.pop} initial="initial" animate="animate" exit="exit"
                    style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '17px', height: '17px', borderRadius: '9px', backgroundColor: C.magenta, color: C.bg, fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}
                  >
                    {allegati.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </M.IconButton>
            <input
              type="text"
              placeholder="Scrivi un messaggio..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              style={{ flex: 1, backgroundColor: C.white, border: `1.5px solid ${alpha(C.dark, 0.1)}`, borderRadius: '14px', padding: '12px 16px', color: C.dark, fontSize: '14px', outline: 'none' }}
            />
            {/* L'aereo di carta si inclina appena quando il messaggio è pronto:
                segnala che il tasto è diventato attivo. */}
            <M.IconButton
              onClick={send}
              disabled={!puoInviare}
              style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: puoInviare ? C.magenta : alpha(C.dark, 0.1), border: 'none', cursor: puoInviare ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background-color 0.2s' }}
            >
              <motion.svg
                animate={{ rotate: puoInviare ? 0 : -12, scale: puoInviare ? 1 : 0.9 }}
                transition={M.T.press}
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={puoInviare ? C.bg : C.gray} strokeWidth={2}
              >
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinejoin="round" strokeLinecap="round" />
              </motion.svg>
            </M.IconButton>
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 20px', backgroundColor: alpha(C.dark, 0.04), borderTop: `1px solid ${alpha(C.dark, 0.08)}`, textAlign: 'center', flexShrink: 0 }}>
          <p style={{ color: alpha(C.dark, 0.35), fontSize: '13px' }}>
            Chat non disponibile per GDA {STATUS_LABEL[gda.status].toLowerCase()}
          </p>
        </div>
      )}

      {/* Selettore allegati */}
      <AnimatePresence>
        {pickerOpen && (
          <AllegatiPicker
            gda={gda}
            selezionati={allegati}
            onToggle={toggleAllegato}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Dettaglio di un allegato */}
      <AnimatePresence>
        {dettaglio && <DettaglioModale allegato={dettaglio} onClose={() => setDettaglio(null)} />}
      </AnimatePresence>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}

function Bubble({ m, onApriAllegato }: { m: Message; onApriAllegato: (a: Allegato) => void }) {
  const isMe = m.sender === 'produttore'
  return (
    <motion.div
      variants={M.V.bubble} initial="initial" animate="animate" exit="exit"
      style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}
    >
      {!isMe && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.Mascotte height={16} /></div>
      )}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: '4px' }}>
        {/* Allegati: sopra al testo, come nelle app di messaggistica */}
        {m.allegati && m.allegati.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginBottom: '2px' }}>
            {m.allegati.map(a => (
              <AllegatoCard key={a.id} allegato={a} isMe={isMe} onClick={() => onApriAllegato(a)} />
            ))}
          </div>
        )}
        {m.text && (
          <div style={{ padding: '11px 15px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', backgroundColor: isMe ? C.magenta : C.white, color: isMe ? C.bg : C.dark, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{m.text}</p>
          </div>
        )}
        <p style={{ color: C.gray, fontSize: '11px', paddingLeft: '4px', paddingRight: '4px' }}>{m.time}</p>
      </div>
    </motion.div>
  )
}

/* ── Allegato dentro una bolla ───────────────────────────────────────────── */
function AllegatoCard({ allegato: a, isMe, onClick }: { allegato: Allegato; isMe: boolean; onClick: () => void }) {
  const accent = isMe ? C.magenta : C.forest
  return (
    <M.CardButton
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        backgroundColor: C.white,
        border: `1.5px solid ${alpha(accent, 0.3)}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: '12px', padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      }}
    >
      {a.tipo === 'bottiglia' && a.bottiglia.immagine ? (
        <div style={{ width: '26px', height: '34px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={a.bottiglia.immagine} alt={a.bottiglia.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      ) : a.tipo === 'cassa' ? (
        <Icon.Cassa size={20} />
      ) : (
        <Icon.Bottiglia size={20} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: alpha(C.dark, 0.4), fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {a.tipo === 'cassa' ? 'Cassa' : 'Bottiglia'}
        </p>
        <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.tipo === 'cassa' ? a.cassa.nome : a.bottiglia.nome}
        </p>
        <p style={{ color: C.gray, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.tipo === 'cassa'
            ? `${a.cassa.quantita} bt · €${cassaTotale(a.cassa)}`
            : `${a.quantita} bt · €${a.bottiglia.prezzo}/bt · in ${a.cassaNome}`}
        </p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.3)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6" />
      </svg>
    </M.CardButton>
  )
}

/* ── Selettore: cosa allegare ────────────────────────────────────────────── */
function AllegatiPicker({ gda, selezionati, onToggle, onClose }: {
  gda: Gda
  selezionati: Allegato[]
  onToggle: (a: Allegato) => void
  onClose: () => void
}) {
  const voci = allegabili(gda)
  const casse = voci.filter(v => v.tipo === 'cassa')
  const bottiglie = voci.filter(v => v.tipo === 'bottiglia')
  const isSel = (a: Allegato) => selezionati.some(x => x.id === a.id)

  const riga = (a: Allegato) => {
    const sel = isSel(a)
    return (
      <M.RowButton
        key={a.id}
        onClick={() => onToggle(a)}
        style={{
          width: '100%', textAlign: 'left', background: sel ? alpha(C.magenta, 0.05) : 'none',
          border: 'none', cursor: 'pointer', padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          borderBottom: `1px solid ${alpha(C.dark, 0.05)}`,
          transition: 'background-color 0.15s',
        }}
      >
        {/* La spunta si disegna al momento della selezione, non compare secca */}
        <motion.div
          animate={{
            borderColor: sel ? C.magenta : alpha(C.dark, 0.2),
            backgroundColor: sel ? C.magenta : 'rgba(0,0,0,0)',
          }}
          transition={M.T.micro}
          style={{
            width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
            borderWidth: '2px', borderStyle: 'solid',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <AnimatePresence>
            {sel && (
              <motion.svg
                key="check"
                variants={M.V.pop} initial="initial" animate="animate" exit="exit"
                width="11" height="11" viewBox="0 0 12 12" fill="none"
              >
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
          <p style={{ color: C.gray, fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.tipo === 'cassa'
              ? `${a.cassa.quantita} bt · €${cassaTotale(a.cassa)}`
              : `${a.bottiglia.annata} · ${a.quantita} bt · in ${a.cassaNome}`}
          </p>
        </div>
      </M.RowButton>
    )
  }

  return (
    <M.Overlay onClose={onClose} kind="sheet" z={400} veil={0.6} panelStyle={{
      maxWidth: '640px',
      backgroundColor: C.bg, borderRadius: '24px 24px 0 0',
      maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    }}>
        <div style={{ flexShrink: 0, padding: '12px 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15) }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: C.dark, fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>Allega al messaggio</h3>
              <p style={{ color: C.gray, fontSize: '12px', marginTop: '3px' }}>Casse e bottiglie di {gda.nome}</p>
            </div>
            <M.IconButton onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</M.IconButton>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: C.white }}>
          <p style={{ padding: '12px 20px 8px', color: alpha(C.dark, 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Casse</p>
          {casse.map(riga)}
          <p style={{ padding: '14px 20px 8px', color: alpha(C.dark, 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bottiglie</p>
          {bottiglie.map(riga)}
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

/* ── Modale di dettaglio di un allegato ──────────────────────────────────── */
function DettaglioModale({ allegato: a, onClose }: { allegato: Allegato; onClose: () => void }) {
  const voci = a.tipo === 'cassa'
    ? (a.cassa.bottiglie ?? [{ bottiglia: a.cassa.bottiglia, quantita: a.cassa.quantita }])
    : []

  return (
    <M.Overlay onClose={onClose} kind="modal" z={500} veil={0.65} panelStyle={{
      width: '100%', maxWidth: '420px', maxHeight: '85vh',
      backgroundColor: C.bg, borderRadius: '22px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
    }}>
        {/* Header */}
        <div style={{ backgroundColor: C.dark, padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px', flexShrink: 0 }}>
          {a.tipo === 'bottiglia' && a.bottiglia.immagine ? (
            <div style={{ width: '40px', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={a.bottiglia.immagine} alt={a.bottiglia.nome} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} />
            </div>
          ) : (
            <Icon.Cassa size={34} color={C.bg} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: alpha(C.silver, 0.5), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
              {a.tipo === 'cassa' ? 'Cassa del GDA' : 'Bottiglia'}
            </p>
            <h3 style={{ color: C.bg, fontSize: '18px', fontWeight: 800, lineHeight: 1.25 }}>
              {a.tipo === 'cassa' ? a.cassa.nome : a.bottiglia.nome}
            </h3>
            {a.tipo === 'bottiglia' && (
              <p style={{ color: C.ocra, fontSize: '12px', marginTop: '3px' }}>{a.bottiglia.produttore} · {a.bottiglia.annata}</p>
            )}
          </div>
          <M.IconButton onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: alpha(C.silver, 0.6), fontSize: '20px', lineHeight: 1, padding: '2px', flexShrink: 0 }}>✕</M.IconButton>
        </div>

        {/* Corpo */}
        <M.List style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
          {a.tipo === 'cassa' ? (
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <Stat label="Bottiglie" value={String(a.cassa.quantita)} />
                <Stat label="Vini" value={String(voci.length)} />
                <Stat label="Totale" value={`€${cassaTotale(a.cassa)}`} accent />
              </div>
              <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '4px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {voci.map((v, i) => (
                  <div key={v.bottiglia.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: i < voci.length - 1 ? `1px solid ${alpha(C.dark, 0.06)}` : 'none' }}>
                    <div style={{ width: '24px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {v.bottiglia.immagine
                        ? <img src={v.bottiglia.immagine} alt={v.bottiglia.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <Icon.Bottiglia size={17} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.bottiglia.nome}</p>
                      <p style={{ color: C.gray, fontSize: '11px' }}>{v.bottiglia.annata} · {v.quantita} bt × €{v.bottiglia.prezzo}</p>
                    </div>
                    <p style={{ color: C.dark, fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>€{v.bottiglia.prezzo * v.quantita}</p>
                  </div>
                ))}
              </div>
              {a.cassa.note && (
                <div style={{ marginTop: '12px', padding: '12px 14px', backgroundColor: alpha(C.ocra, 0.12), borderRadius: '12px', borderLeft: `3px solid ${C.ocra}` }}>
                  <p style={{ color: C.olive, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Note</p>
                  <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.5 }}>{a.cassa.note}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <Stat label="In cassa" value={`${a.quantita} bt`} />
                <Stat label="Listino" value={`€${a.bottiglia.prezzo}`} />
                <Stat label="Totale" value={`€${a.bottiglia.prezzo * a.quantita}`} accent />
              </div>
              <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '4px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <Riga label="Produttore" value={a.bottiglia.produttore} />
                <Riga label="Annata" value={String(a.bottiglia.annata)} />
                <Riga label="Denominazione" value={a.bottiglia.denominazione} />
                <Riga label="Prezzo a listino" value={`€${a.bottiglia.prezzo} / bottiglia`} />
                <Riga label="Cassa di appartenenza" value={a.cassaNome} last />
              </div>
            </>
          )}
        </M.List>
    </M.Overlay>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <M.Item style={{ flex: 1, backgroundColor: accent ? C.dark : C.white, borderRadius: '12px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p style={{ color: accent ? alpha(C.silver, 0.5) : alpha(C.dark, 0.4), fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{label}</p>
      <p style={{ color: accent ? C.bg : C.dark, fontSize: '16px', fontWeight: 800, lineHeight: 1 }}>{value}</p>
    </M.Item>
  )
}

function Riga({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${alpha(C.dark, 0.06)}` }}>
      <span style={{ color: C.gray, fontSize: '12px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.dark, fontSize: '13px', fontWeight: 600, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  )
}

function SectionLabel({ label, dot }: { label: string; dot: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dot, flexShrink: 0 }} />
      <p style={{ color: alpha(C.dark, 0.4), fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  )
}
