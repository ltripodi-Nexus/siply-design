import { useState, useMemo, useRef, useEffect } from 'react'
import { C, alpha } from '../colors'
import { cassaTotale, type Cassa, type CassaBottiglia, type Gda, type GdaPayload } from '../App'
import { COMMISSIONE_PCT, QUOTA_PCT, alProduttore, commissione, eur, num, pct } from '../economia'
import { WINES, FILTERS_INIT, applyFilters, activeFilterCount, type WineRich, type WineFilters } from '../data/wines'
import WineFilterPanel from '../components/WineFilterPanel'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'
import * as Icon from '../components/Icons'
import { scrollToFooter } from '../components/Footer'
import Spiega from '../components/Spiega'
import IndirizzoInput from '../components/IndirizzoInput'
import { EsempioScala, RigaTraguardo, StrisciaCommissione, medieCasse } from '../components/ScalaTraguardi'
import {
  MAX_BOTTIGLIE, MAX_TRAGUARDI, normalizza, traguardoIncoerente, type Traguardo,
} from '../traguardi'
import { useDemo, DEMO_CASSA, demoListino } from '../demo'

interface Props {
  /** valorizzato = si aggiungono casse a un GDA esistente, o si riprende una bozza */
  gdaTarget?: Gda | null
  onCreata: (gdaId: string | null, dati: GdaPayload) => void
  /** chiamata uscendo senza inviare: quello che c'è viene salvato come bozza */
  onBozza: (gdaId: string | null, dati: GdaPayload) => void
  onAnnulla: () => void
}

function clampTraguardo(v: string): string {
  if (v === '') return ''
  const n = parseInt(v)
  if (isNaN(n)) return ''
  return String(Math.min(Math.max(n, 0), MAX_BOTTIGLIE))
}

/** Cassa finta già presente nel GDA, usata solo dal pulsante Demo. */
function demoDraft(): Cassa {
  const voci = Object.entries(DEMO_CASSA.quantita)
    .map(([id, quantita]) => ({ bottiglia: WINES.find(w => w.id === id), quantita }))
    .filter((v): v is { bottiglia: WineRich; quantita: number } => v.bottiglia !== undefined)
  const principale = voci.reduce((a, b) => a.quantita >= b.quantita ? a : b)
  return {
    id: 'demo-cassa-1',
    nome: DEMO_CASSA.nome,
    bottiglia: principale.bottiglia,
    quantita: voci.reduce((s, v) => s + v.quantita, 0),
    bottiglie: voci.length > 1 ? voci : undefined,
    note: DEMO_CASSA.note,
    prezziScontati: DEMO_CASSA.prezziScontati,
    costiUnitari: DEMO_CASSA.costiUnitari,
    costiScontati: DEMO_CASSA.costiScontati,
  }
}

type Step = 'gda' | 'vino' | 'dettagli' | 'riepilogo'
const STEP_LABEL: Record<Step, string> = { gda: 'GDA', vino: 'Vino', dettagli: 'Dettagli', riepilogo: 'Riepilogo' }

export default function NuovoGdaScreen({ gdaTarget = null, onCreata, onBozza, onAnnulla }: Props) {
  // una bozza ripresa è ancora tutta modificabile; un GDA già inviato no
  const bozza = gdaTarget?.status === 'bozza'
  // col GDA già aperto lo step 1 sparisce: il nome c'è già
  const aggiunta = gdaTarget !== null
  /** Vero solo quando si aggiungono casse a un GDA *già inviato*. Una bozza
   *  ripresa non è un'aggiunta: confermandola si invia il GDA per la prima
   *  volta, e i testi devono dirlo. */
  const aggiuntaAInviato = aggiunta && !bozza
  const STEPS = useMemo(() => {
    const ids: Step[] = aggiunta ? ['vino', 'dettagli', 'riepilogo'] : ['gda', 'vino', 'dettagli', 'riepilogo']
    return ids.map((id, i) => ({ id, num: i + 1, label: STEP_LABEL[id] }))
  }, [aggiunta])

  // riprendendo una bozza che ha già delle casse si riparte dal riepilogo,
  // così si vede subito cosa c'è dentro e si può aggiungere o inviare
  const [step, setStep] = useState<Step>(
    bozza && gdaTarget!.casse.length > 0 ? 'riepilogo' : aggiunta ? 'vino' : 'gda',
  )
  const [gdaNome, setGdaNome] = useState(gdaTarget?.nome ?? '')
  const [casseAggiunte, setCasseAggiunte] = useState<Cassa[]>(bozza ? gdaTarget!.casse : [])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<WineFilters>(FILTERS_INIT)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<WineRich | null>(null)
  const [nome, setNome] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [showCreaBottiglia, setShowCreaBottiglia] = useState(false)
  const [extraWines, setExtraWines] = useState<WineRich[]>([])
  const [prezziScontati, setPrezziScontati] = useState<Record<string, string>>({})
  const [costiUnitari, setCostiUnitari] = useState<Record<string, string>>({})
  const [costiScontati, setCostiScontati] = useState<Record<string, string>>({})
  const [listinoPdf, setListinoPdf] = useState<File | null>(null)
  // Spedizione e traguardi valgono per tutto il GDA: si impostano una volta
  // e non vengono azzerati quando si passa alla cassa successiva.
  const [locationSpedizione, setLocationSpedizione] = useState(gdaTarget?.locationSpedizione ?? '')
  const [noteSpedizione, setNoteSpedizione] = useState(gdaTarget?.noteSpedizione ?? '')
  /** Sempre ordinati e senza doppioni: ci pensa `aggiungiTraguardo`. */
  const [traguardi, setTraguardi] = useState<Traguardo[]>(gdaTarget?.traguardi ?? [])
  const [nuovoTraguardo, setNuovoTraguardo] = useState('')

  useDemo(mode => {
    if (mode === 'clear') {
      setStep(aggiunta ? 'vino' : 'gda')
      setGdaNome(gdaTarget?.nome ?? '')
      setCasseAggiunte([])
      setQuantities({})
      setFilters(FILTERS_INIT)
      setNome('')
      setNote('')
      setPrezziScontati({})
      setCostiUnitari({})
      setCostiScontati({})
      setListinoPdf(null)
      setLocationSpedizione(gdaTarget?.locationSpedizione ?? '')
      setNoteSpedizione(gdaTarget?.noteSpedizione ?? '')
      setTraguardi([])
      setNuovoTraguardo('')
      return
    }
    if (!aggiunta) setGdaNome(DEMO_CASSA.gdaNome)
    setQuantities(DEMO_CASSA.quantita)
    setNome(DEMO_CASSA.nome)
    setNote(DEMO_CASSA.note)
    setPrezziScontati(DEMO_CASSA.prezziScontati)
    setCostiUnitari(DEMO_CASSA.costiUnitari)
    setCostiScontati(DEMO_CASSA.costiScontati)
    setListinoPdf(demoListino())
    setLocationSpedizione(DEMO_CASSA.locationSpedizione)
    setNoteSpedizione(DEMO_CASSA.noteSpedizione)
    setTraguardi(DEMO_CASSA.traguardi)
    // una cassa già dentro il GDA, così il riepilogo non è vuoto e si vede
    // il caso multi-cassa: quella in lavorazione diventerà la seconda
    if (!aggiunta) setCasseAggiunte([demoDraft()])
  })

  /** Aggiunge un traguardo tenendo la scala ordinata e senza doppioni: due
   *  volte lo stesso numero non vuol dire niente, e uno più piccolo scritto
   *  dopo va comunque letto prima. Lo sconto parte da quello del traguardo che
   *  lo precede: una scala che scende sarebbe un errore, e proporla come punto
   *  di partenza sarebbe peggio. */
  const aggiungiTraguardo = () => {
    const n = parseInt(nuovoTraguardo)
    if (isNaN(n) || n <= 0) return
    setTraguardi(p => {
      if (p.length >= MAX_TRAGUARDI || p.some(t => t.bottiglie === n)) return p
      const precedente = [...p].sort((a, b) => a.bottiglie - b.bottiglie).filter(t => t.bottiglie < n).pop()
      return normalizza([...p, { bottiglie: n, sconto: precedente ? precedente.sconto : 0 }])
    })
    setNuovoTraguardo('')
  }

  /** Cambia lo sconto di un traguardo, lasciando intatti gli altri. */
  const cambiaSconto = (bottiglie: number, sconto: number) =>
    setTraguardi(p => normalizza(p.map(t => t.bottiglie === bottiglie ? { ...t, sconto } : t)))

  const gdaPronto = gdaNome.trim().length > 0
  // le casse di un GDA già inviato si vedono ma non si toccano; quelle di una
  // bozza sono state caricate in casseAggiunte e restano modificabili
  const casseEsistenti = bozza ? [] : gdaTarget?.casse ?? []
  const gdaQty = useMemo(
    () => casseEsistenti.reduce((s, c) => s + c.quantita, 0) + casseAggiunte.reduce((s, c) => s + c.quantita, 0),
    [casseEsistenti, casseAggiunte],
  )
  const traguardoLimitato = parseInt(nuovoTraguardo) === MAX_BOTTIGLIE

  /* Le medie su cui poggia tutta la scala. Un traguardo vale sull'intero GDA,
     quindi si contano insieme le casse già dentro e quelle appena aggiunte:
     è su quelle bottiglie che il gruppo arriverà al traguardo, non su metà. */
  const medie = useMemo(
    () => medieCasse([...casseEsistenti, ...casseAggiunte]),
    [casseEsistenti, casseAggiunte],
  )
  /** Il primo scalino che non sale. Si segnala sulla riga e basta: quanto
   *  scontare è una scelta del produttore, non una regola nostra. */
  const scalaRotta = useMemo(() => traguardoIncoerente(traguardi), [traguardi])

  const setF = (p: Partial<WineFilters>) => setFilters(f => ({ ...f, ...p }))
  const nActive = activeFilterCount(filters)
  const allWines = useMemo(() => [...WINES, ...extraWines], [extraWines])
  const extraResults = useMemo(() => applyFilters(extraWines, filters), [extraWines, filters])
  const siplyResults = useMemo(() => applyFilters(WINES, filters), [filters])
  const results = useMemo(() => [...extraResults, ...siplyResults], [extraResults, siplyResults])

  const totalQty = useMemo(() => Object.values(quantities).reduce((a, b) => a + b, 0), [quantities])
  const selectedWines = useMemo(() => allWines.filter(w => (quantities[w.id] ?? 0) > 0), [allWines, quantities])
  const primaryWine = useMemo(() => selectedWines.length === 0 ? null : selectedWines.reduce((a, b) => (quantities[a.id] ?? 0) >= (quantities[b.id] ?? 0) ? a : b), [selectedWines, quantities])
  const totalPrice = useMemo(() => selectedWines.reduce((sum, w) => sum + w.prezzo * (quantities[w.id] ?? 0), 0), [selectedWines, quantities])

  /** Totale con i prezzi GDA: null finché non c'è almeno uno sconto valido. */
  const totalScontato = useMemo(() => {
    let almenoUno = false
    const somma = selectedWines.reduce((sum, w) => {
      const ps = parseFloat(prezziScontati[w.id] ?? '')
      const qty = quantities[w.id] ?? 0
      if (!isNaN(ps) && ps > 0) { almenoUno = true; return sum + ps * qty }
      return sum + w.prezzo * qty
    }, 0)
    return almenoUno ? somma : null
  }, [selectedWines, quantities, prezziScontati])

  function handleAdd(wine: WineRich) {
    setQuantities(q => {
      const cur = Object.values(q).reduce((a, b) => a + b, 0)
      if (cur >= 6) return q
      return { ...q, [wine.id]: (q[wine.id] ?? 0) + 1 }
    })
  }

  function handleRemove(wineId: string) {
    setQuantities(q => {
      const cur = q[wineId] ?? 0
      if (cur <= 1) {
        const next = { ...q }
        delete next[wineId]
        return next
      }
      return { ...q, [wineId]: cur - 1 }
    })
  }

  /** Congela la cassa in lavorazione dentro il GDA e va al riepilogo. */
  const confermaCassa = () => {
    if (!primaryWine) return
    const cassaBottiglie: CassaBottiglia[] = selectedWines.map(w => ({ bottiglia: w, quantita: quantities[w.id] ?? 0 }))
    const nuova: Cassa = {
      id: `c${Date.now()}`,
      nome: nome.trim() || (selectedWines.length === 1 ? `${primaryWine.nome} ${primaryWine.annata}` : `Selezione mista · ${totalQty} bottiglie`),
      bottiglia: primaryWine,
      quantita: totalQty,
      bottiglie: cassaBottiglie.length > 1 ? cassaBottiglie : undefined,
      note: note.trim() || undefined,
      prezziScontati,
      costiUnitari,
      costiScontati,
    }
    setCasseAggiunte(p => [...p, nuova])
    resetFormCassa()
    setStep('riepilogo')
  }

  /** Svuota i campi della singola cassa, lasciando intatto il GDA.
   *  Spedizione e stima vendite non stanno qui: sono del GDA. */
  const resetFormCassa = () => {
    setQuantities({})
    setFilters(FILTERS_INIT)
    setNome('')
    setNote('')
    setPrezziScontati({})
    setCostiUnitari({})
    setCostiScontati({})
    setListinoPdf(null)
  }

  /** "Aggiungi un'altra cassa" dal riepilogo. */
  const nuovaCassa = () => {
    resetFormCassa()
    setStep('vino')
  }

  /** I campi del GDA come li vede chi li riceve, in un posto solo. */
  const datiGda = (): GdaPayload => ({
    nome: gdaNome,
    casse: casseAggiunte,
    traguardi: traguardi.length > 0 ? traguardi : undefined,
    locationSpedizione: locationSpedizione.trim() || undefined,
    noteSpedizione: noteSpedizione.trim() || undefined,
  })

  const handleInvia = () => {
    if (casseAggiunte.length === 0) return
    inviatoRef.current = true
    setSent(true)
    setTimeout(() => {
      onCreata(gdaTarget?.id ?? null, datiGda())
    }, 1200)
  }

  /* ── Salvataggio bozza ──
     Il wizard viene smontato appena si esce (indietro, tab della nav, invio).
     Un ref tiene sempre l'ultima versione del salvataggio, così la cleanup
     dell'effect — che gira una volta sola — non lavora su valori stantii. */
  const inviatoRef = useRef(false)
  const salvaBozzaRef = useRef<() => void>(() => {})
  salvaBozzaRef.current = () => {
    if (inviatoRef.current) return                    // già finalizzato, niente bozza
    if (aggiunta && !bozza) return                    // casse aggiunte a un GDA inviato: o si conferma o si perde
    onBozza(gdaTarget?.id ?? null, datiGda())
  }
  useEffect(() => () => salvaBozzaRef.current(), [])

  /* Direzione dell'animazione fra gli step: avanti se l'indice cresce, indietro
     se cala. Derivata in render confrontando con l'indice precedente, così
     "Torna indietro" fa davvero tornare indietro anche visivamente. */
  const stepIndex = STEPS.findIndex(s => s.id === step)
  const dirRef = useRef(1)
  const prevStepRef = useRef(stepIndex)
  if (stepIndex !== prevStepRef.current) {
    dirRef.current = stepIndex > prevStepRef.current ? 1 : -1
    prevStepRef.current = stepIndex
  }
  const stepV = M.stepVariants(dirRef.current)

  if (sent) return <SentScreen aggiunta={aggiuntaAInviato} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', backgroundColor: C.bg }}>

      {/* ── Topbar ── */}
      <div style={{ backgroundColor: C.dark, padding: '52px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <M.Button
            onClick={onAnnulla}
            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: alpha(C.white, 0.1), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.2}>
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </M.Button>
          <div>
            <h2 style={{ color: C.bg, fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>
              {bozza ? 'Riprendi la bozza' : aggiunta ? 'Aggiungi una cassa' : 'Nuovo GDA'}
            </h2>
            <p style={{ color: alpha(C.silver, 0.5), fontSize: '12px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {aggiunta ? gdaTarget!.nome : "Gruppo d'acquisto · casse da 6 bottiglie"}
            </p>
          </div>
        </div>

        {/* Step indicator — i passi già fatti si cliccano per tornarci */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingBottom: '0' }}>
          {STEPS.map((s, i) => {
            const corrente = STEPS.findIndex(x => x.id === step)
            const done = corrente > i
            const active = s.id === step
            /* Si torna indietro, non si salta avanti: andare a uno step che non
               si è ancora compilato lascerebbe l'utente davanti a campi vuoti
               senza sapere cosa manca. In più "Dettagli" ha senso solo con
               almeno un vino scelto, altrimenti non avrebbe niente da mostrare. */
            const indietro = i < corrente && (s.id !== 'dettagli' || primaryWine !== null)

            const contenuto = (
              <>
                {/* Il pallino dello step corrente è leggermente più grande:
                    dice "sei qui" senza aggiungere altri elementi. */}
                <motion.div
                  animate={{ scale: active ? 1.12 : 1 }}
                  transition={M.T.press}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', zIndex: 1, position: 'relative', backgroundColor: done ? C.magenta : active ? C.bg : alpha(C.white, 0.1), border: `2px solid ${done || active ? C.magenta : alpha(C.white, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.3s, border-color 0.3s' }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.svg key="ok" variants={M.V.pop} initial="initial" animate="animate" exit="exit" width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    ) : (
                      <motion.span key="num" variants={M.V.fade} initial="initial" animate="animate" exit="exit" style={{ fontSize: '11px', fontWeight: 700, color: active ? C.dark : alpha(C.white, 0.5) }}>{s.num}</motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                <span style={{ fontSize: '10px', fontWeight: active ? 700 : 400, marginTop: '6px', textAlign: 'center', color: active ? C.bg : done ? alpha(C.silver, 0.7) : alpha(C.silver, 0.35) }}>
                  {s.label}
                </span>
              </>
            )

            return (
              <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i > 0 && <div style={{ position: 'absolute', left: 0, top: '14px', width: '50%', height: '2px', backgroundColor: done || active ? C.magenta : alpha(C.white, 0.15), transition: 'background-color 0.3s' }} />}
                {i < STEPS.length - 1 && <div style={{ position: 'absolute', right: 0, top: '14px', width: '50%', height: '2px', backgroundColor: done ? C.magenta : alpha(C.white, 0.15), transition: 'background-color 0.3s' }} />}
                {/* Cliccabile solo dov'è davvero possibile andare: altrove
                    resta un semplice segnaposto, senza falsi inviti. Il
                    bersaglio è il pallino con la sua etichetta, non tutta la
                    colonna: le linee di collegamento arrivano fino al passo
                    accanto e si finirebbe per cliccarle per sbaglio. */}
                {indietro ? (
                  <M.Chip
                    type="button"
                    className="siply-step-torna"
                    onClick={() => setStep(s.id)}
                    aria-label={`Torna al passo ${s.num}: ${s.label}`}
                    title={`Torna a ${s.label}`}
                  >
                    {contenuto}
                  </M.Chip>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {contenuto}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ height: '24px' }} />
      </div>

      {/* Uno step alla volta: `mode="wait"` fa uscire il precedente prima di far
          entrare il successivo, così l'altezza della pagina non sobbalza. */}
      <AnimatePresence mode="wait" initial={false} custom={dirRef.current}>

      {/* ══════════════════════════════════════════════
          STEP 1 — APRI IL GRUPPO D'ACQUISTO
      ══════════════════════════════════════════════ */}
      {step === 'gda' && (
        <motion.div key="gda" variants={stepV} initial="initial" animate="animate" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: '16px' }}>

          {/* Intro */}
          <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
            <Icon.Carrello size={40} style={{ margin: '0 auto 10px' }} />
            <p style={{ color: C.dark, fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Apri il tuo GDA</p>
            <p style={{ color: C.gray, fontSize: '14px', lineHeight: 1.55, maxWidth: '320px', margin: '0 auto' }}>
              Dai un nome al gruppo d'acquisto, poi riempilo con le casse che vuoi. Siply le valuta tutte insieme.
            </p>
          </div>

          {/* Nome del GDA */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 20px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon.Stella size={16} />
              <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Gruppo d'acquisto
              </p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: C.dark, marginBottom: '4px' }}>Nome del GDA</label>
              <p style={{ color: C.gray, fontSize: '12px', marginBottom: '12px' }}>Il mercato o il canale a cui è rivolto il gruppo.</p>
              <input
                type="text"
                placeholder="es. GDA Nordeuropa 2025"
                value={gdaNome}
                onChange={e => setGdaNome(e.target.value)}
                style={{ width: '100%', backgroundColor: alpha(C.dark, 0.04), border: `1.5px solid ${gdaNome ? C.magenta : alpha(C.dark, 0.1)}`, borderRadius: '12px', padding: '13px 16px', color: C.dark, fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>

          {/* Da dove parte la merce: si chiede subito perché vale per tutto il
              GDA. Le note sui casi particolari arrivano nel riepilogo. */}
          <SpedizioneCard
            location={locationSpedizione}
            onLocation={setLocationSpedizione}
            note={noteSpedizione}
            onNote={setNoteSpedizione}
          />

          {/* Come funziona */}
          <div style={{ backgroundColor: alpha(C.ocra, 0.12), borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
            <Icon.Cassa size={22} />
            <div>
              <p style={{ color: C.olive, fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Come si riempie</p>
              <p style={{ color: C.olive, fontSize: '12px', lineHeight: 1.6 }}>
                Ogni cassa contiene fino a <strong>6 bottiglie</strong>. Dopo la prima potrai aggiungerne altre dal riepilogo, prima di inviare il GDA.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
            <M.Button
              onClick={() => setStep('vino')}
              disabled={!gdaPronto}
              style={{
                width: '100%', backgroundColor: gdaPronto ? C.magenta : alpha(C.dark, 0.12),
                color: gdaPronto ? C.bg : alpha(C.dark, 0.35),
                fontWeight: 700, padding: '18px', borderRadius: '16px', fontSize: '16px',
                border: 'none', cursor: gdaPronto ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background-color 0.2s',
              }}
            >
              Aggiungi la prima cassa
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </M.Button>
            {!gdaPronto && (
              <p style={{ color: C.gray, fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>
                Dai un nome al GDA per continuare.
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 2 — SCEGLI IL VINO
      ══════════════════════════════════════════════ */}
      {step === 'vino' && (
        <motion.div key="vino" variants={stepV} initial="initial" animate="animate" exit="exit" style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Sidebar — desktop */}
          <aside
            className="cassa-sidebar"
            style={{ display: 'none', width: '260px', flexShrink: 0, backgroundColor: C.white, borderRight: `1px solid ${alpha(C.dark, 0.08)}`, overflowY: 'auto', maxHeight: 'calc(100vh - 160px)', position: 'sticky', top: 0 }}
          >
            <WineFilterPanel filters={filters} set={setF} onReset={() => setFilters(FILTERS_INIT)} />
          </aside>

          {/* Main */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Search + filter row */}
            <div style={{ padding: '16px 16px 10px', backgroundColor: C.bg, position: 'sticky', top: 0, zIndex: 10, borderBottom: `1px solid ${alpha(C.dark, 0.07)}` }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth={2}>
                    <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Cerca vino, produttore, vitigno..."
                    value={filters.query}
                    onChange={e => setF({ query: e.target.value })}
                    autoFocus
                    style={{ width: '100%', backgroundColor: alpha(C.dark, 0.06), border: '1.5px solid transparent', borderRadius: '12px', padding: '11px 12px 11px 36px', color: C.dark, fontSize: '14px', outline: 'none' }}
                  />
                  {/* La × è centrata con i flex e non con translateY: l'animazione
                      di press scrive la transform e cancellerebbe il -50%. */}
                  {filters.query && (
                    <M.IconButton onClick={() => setF({ query: '' })} style={{ position: 'absolute', right: '10px', top: 0, bottom: 0, display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '18px', lineHeight: 1 }}>×</M.IconButton>
                  )}
                </div>
                {/* Crea bottiglia btn */}
                <M.Button
                  onClick={() => setShowCreaBottiglia(true)}
                  style={{ backgroundColor: C.dark, color: C.bg, border: 'none', cursor: 'pointer', borderRadius: '12px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  Crea
                </M.Button>

                {/* Filter btn — mobile only */}
                <M.Button
                  className="cassa-filter-btn"
                  onClick={() => setDrawerOpen(true)}
                  style={{ backgroundColor: nActive > 0 ? C.magenta : alpha(C.dark, 0.08), color: nActive > 0 ? C.bg : C.dark, border: 'none', cursor: 'pointer', borderRadius: '12px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                  </svg>
                  {nActive > 0 ? `Filtri · ${nActive}` : 'Filtri'}
                </M.Button>
              </div>

              {/* Active chips — entrano ed escono con un pop, e le vicine
                  scivolano al loro posto grazie a `layout` sul chip. */}
              <M.Collapse open={nActive > 0}>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <AnimatePresence initial={false}>
                  {filters.denominazioni.map(d => <ActiveChip key={d} label={d} onRemove={() => setF({ denominazioni: filters.denominazioni.filter(x => x !== d) })} />)}
                  {filters.regioni.map(r => <ActiveChip key={r} label={r} onRemove={() => setF({ regioni: filters.regioni.filter(x => x !== r) })} />)}
                  {filters.vitigni.map(v => <ActiveChip key={v} label={v} onRemove={() => setF({ vitigni: filters.vitigni.filter(x => x !== v) })} />)}
                  {filters.corpi.map(c => <ActiveChip key={c} label={c} onRemove={() => setF({ corpi: filters.corpi.filter(x => x !== c) })} />)}
                  {filters.abbinamenti.map(a => <ActiveChip key={a} label={a} onRemove={() => setF({ abbinamenti: filters.abbinamenti.filter(x => x !== a) })} />)}
                  {(filters.prezzoMin > 0 || filters.prezzoMax < 200) && <ActiveChip key="prezzo" label={`€${filters.prezzoMin}–€${filters.prezzoMax}`} onRemove={() => setF({ prezzoMin: 0, prezzoMax: 200 })} />}
                  {(filters.annataMin > 2015 || filters.annataMax < 2023) && <ActiveChip key="annata" label={`${filters.annataMin}–${filters.annataMax}`} onRemove={() => setF({ annataMin: 2015, annataMax: 2023 })} />}
                  {filters.soloNaturale && <ActiveChip key="bio" label="Bio" onRemove={() => setF({ soloNaturale: false })} />}
                  </AnimatePresence>
                  <M.Button onClick={() => setFilters(FILTERS_INIT)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: alpha(C.dark, 0.4), fontSize: '11px', fontWeight: 600 }}>Rimuovi tutti</M.Button>
                </div>
              </M.Collapse>

              <p style={{ color: alpha(C.dark, 0.38), fontSize: '11px', fontWeight: 500, marginTop: '8px' }}>
                {results.length} {results.length === 1 ? 'vino' : 'vini'}
                {totalQty > 0 && <span style={{ color: C.magenta, fontWeight: 600 }}> · {totalQty}/6 bt selezionate</span>}
              </p>
            </div>

            {/* Wine list — al cambio filtro le card che restano scivolano
                (`layout` su WineCard), le altre sfumano via. */}
            <M.List style={{ flex: 1, padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '56px 0' }}>
                  <Icon.Cerca size={44} style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: C.dark, fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>Nessun vino trovato</p>
                  <M.Button onClick={() => setFilters(FILTERS_INIT)} style={{ color: C.magenta, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', marginTop: '6px' }}>
                    Rimuovi filtri
                  </M.Button>
                </div>
              )}

              {/* "Create da te" section */}
              {extraResults.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '2px' }}>
                    <Icon.Stella size={15} />
                    <p style={{ fontSize: '11px', fontWeight: 700, color: alpha(C.dark, 0.4), textTransform: 'uppercase', letterSpacing: '0.1em' }}>Create da te</p>
                    <div style={{ flex: 1, height: '1px', backgroundColor: alpha(C.dark, 0.08) }} />
                  </div>
                  {extraResults.map(w => (
                    <WineCard
                      key={w.id}
                      wine={w}
                      qty={quantities[w.id] ?? 0}
                      isFiltered={nActive > 0}
                      canAdd={totalQty < 6}
                      onAdd={() => handleAdd(w)}
                      onRemove={() => handleRemove(w.id)}
                      onDetail={() => setDetail(w)}
                    />
                  ))}
                </>
              )}

              {/* Siply catalog section */}
              {siplyResults.length > 0 && (
                <>
                  {extraResults.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '2px' }}>
                      <Icon.Bottiglia size={15} />
                      <p style={{ fontSize: '11px', fontWeight: 700, color: alpha(C.dark, 0.4), textTransform: 'uppercase', letterSpacing: '0.1em' }}>Catalogo Siply</p>
                      <div style={{ flex: 1, height: '1px', backgroundColor: alpha(C.dark, 0.08) }} />
                    </div>
                  )}
                  {siplyResults.map(w => (
                    <WineCard
                      key={w.id}
                      wine={w}
                      qty={quantities[w.id] ?? 0}
                      isFiltered={nActive > 0}
                      canAdd={totalQty < 6}
                      onAdd={() => handleAdd(w)}
                      onRemove={() => handleRemove(w.id)}
                      onDetail={() => setDetail(w)}
                    />
                  ))}
                </>
              )}
            </M.List>
          </div>

          {/* ── Barra del totale, attaccata alla nav ──
              Sale alla prima bottiglia scelta e scende quando la cassa si
              svuota. Arriva fino in fondo allo schermo e lo spazio per la nav
              se lo tiene come padding: così il fondo scuro prosegue sotto la
              nav e fra le due non resta scoperta una striscia di pagina.
              Centrata con i margini, non con translateX: l'animazione di
              entrata usa la transform. */}
          <AnimatePresence>
          {totalQty > 0 && (
            <motion.div
              key="totalbar"
              className="siply-totalbar"
              initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }}
              transition={M.T.surface}
              style={{
                position: 'fixed', bottom: 0,
                left: 0, right: 0, marginInline: 'auto',
                width: '100%', maxWidth: '1280px',
                backgroundColor: C.dark,
                borderTop: `1px solid ${alpha(C.white, 0.08)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 40,
              }}
            >
              <div>
                <p style={{ color: alpha(C.silver, 0.5), fontSize: '11px', fontWeight: 500 }}>
                  <M.Ticker value={totalQty} />/6 bottiglie selezionate
                  {selectedWines.length > 1 && ` · ${selectedWines.length} vini`}
                </p>
                <p style={{ color: C.bg, fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>
                  € <M.Ticker value={totalPrice} />
                </p>
              </div>
              <M.Button
                onClick={() => setStep('dettagli')}
                style={{
                  backgroundColor: C.magenta, color: C.bg,
                  border: 'none', cursor: 'pointer',
                  borderRadius: '14px', padding: '12px 22px',
                  fontWeight: 700, fontSize: '15px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                Avanti
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </M.Button>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 3 — DETTAGLI
      ══════════════════════════════════════════════ */}
      {step === 'dettagli' && primaryWine && (
        <motion.div key="dettagli" variants={stepV} initial="initial" animate="animate" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: '18px' }}>

          {/* Price breakdown */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', backgroundColor: alpha(C.magenta, 0.05), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Composizione della cassa</p>
              <M.Button onClick={() => setStep('vino')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.magenta, fontSize: '12px', fontWeight: 600 }}>
                Modifica
              </M.Button>
            </div>

            {/* Bottle grid */}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'flex-end' }}>
                {(() => {
                  return Array.from({ length: 6 }).map((_, i) => {
                    let accum = 0
                    let slotWine: WineRich | null = null
                    for (const w of selectedWines) {
                      if (i >= accum && i < accum + (quantities[w.id] ?? 0)) { slotWine = w; break }
                      accum += quantities[w.id] ?? 0
                    }
                    const active = slotWine !== null
                    return (
                      <div key={i} style={{ width: '34px', height: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', transition: 'opacity 0.2s', opacity: active ? 1 : 0.18 }}>
                        {active && slotWine?.immagine ? (
                          <img
                            src={slotWine.immagine}
                            alt={slotWine.nome}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))' }}
                          />
                        ) : (
                          <svg width="28" height="90" viewBox="0 0 28 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="9" y="0" width="10" height="14" rx="3" fill={alpha(C.dark, 0.25)} />
                            <rect x="4" y="13" width="20" height="6" rx="2" fill={alpha(C.dark, 0.2)} />
                            <rect x="2" y="18" width="24" height="66" rx="4" fill={alpha(C.dark, 0.2)} />
                            <rect x="6" y="24" width="16" height="20" rx="2" fill={alpha(C.dark, 0.1)} />
                          </svg>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
              <p style={{ textAlign: 'center', color: alpha(C.dark, 0.38), fontSize: '12px', margin: '10px 0 14px' }}>
                {totalQty} {totalQty === 1 ? 'bottiglia' : 'bottiglie'} · {selectedWines.length} {selectedWines.length === 1 ? 'vino' : 'vini'}
              </p>
            </div>

            {/* Per-wine rows */}
            <div style={{ padding: '0 20px', borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
              {selectedWines.map((w, idx) => {
                const ps = prezziScontati[w.id] ?? ''
                const psNum = parseFloat(ps)
                const listino = w.prezzo * (quantities[w.id] ?? 0)
                const scontato = !isNaN(psNum) && psNum > 0 ? psNum * (quantities[w.id] ?? 0) : null
                const qty = quantities[w.id] ?? 0
                const scontoPct = scontato !== null && psNum < w.prezzo ? Math.round((1 - psNum / w.prezzo) * 100) : null
                const lbl: React.CSSProperties = {
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: '3px', whiteSpace: 'nowrap',
                }
                return (
                  <div key={w.id} style={{ padding: '14px 0', borderBottom: idx < selectedWines.length - 1 ? `1px solid ${alpha(C.dark, 0.05)}` : 'none' }}>
                    {/* Vino */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ width: '28px', height: '38px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {w.immagine
                          ? <img src={w.immagine} alt={w.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <Icon.Bottiglia size={20} />}
                      </div>
                      <p style={{ flex: 1, minWidth: 0, color: C.dark, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.nome}</p>
                      <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: C.gray, backgroundColor: alpha(C.dark, 0.06), padding: '3px 9px', borderRadius: '20px' }}>
                        {qty} bt
                      </span>
                    </div>

                    {/* Confronto listino → GDA */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: '12px', rowGap: '10px', backgroundColor: alpha(C.dark, 0.03), borderRadius: '12px', padding: '10px 14px' }}>
                      {/* listino */}
                      <div style={{ flexShrink: 0 }}>
                        <p style={{ ...lbl, color: alpha(C.dark, 0.4) }}>
                          <Spiega k="listino">A listino</Spiega>
                        </p>
                        <p style={{ color: alpha(C.dark, 0.5), fontSize: '18px', fontWeight: 700, lineHeight: 1, textDecoration: scontato !== null ? 'line-through' : 'none' }}>
                          €{w.prezzo}
                        </p>
                      </div>

                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.25)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginBottom: '3px' }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>

                      {/* scontato — campo stretto, solo quanto serve */}
                      <div style={{ flexShrink: 0 }}>
                        <p style={{ ...lbl, color: C.forest }}>
                          <Spiega k="scontatoGda">Scontato GDA</Spiega>
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', borderBottom: `2px solid ${ps ? C.green : alpha(C.dark, 0.2)}`, transition: 'border-color 0.2s' }}>
                          <span style={{ color: ps ? C.forest : alpha(C.dark, 0.3), fontSize: '15px', fontWeight: 700 }}>€</span>
                          <input
                            className="num-clean"
                            type="number"
                            step="0.5"
                            placeholder={String(w.prezzo)}
                            value={ps}
                            onChange={e => setPrezziScontati(p => ({ ...p, [w.id]: e.target.value }))}
                            style={{ width: '58px', backgroundColor: 'transparent', border: 'none', outline: 'none', color: ps ? C.forest : C.dark, fontSize: '18px', fontWeight: 800, lineHeight: 1, padding: '0 0 2px' }}
                          />
                        </div>
                      </div>

                      {scontoPct !== null && scontoPct > 0 && (
                        <Spiega
                          k="scontoPct"
                          calcolo={`€${(w.prezzo - psNum).toFixed(2)} ÷ €${w.prezzo} × 100 = ${scontoPct}%`}
                          style={{ flexShrink: 0, marginBottom: '3px', color: C.forest }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 800, backgroundColor: alpha(C.green, 0.18), padding: '3px 8px', borderRadius: '20px' }}>
                            −{scontoPct}%
                          </span>
                        </Spiega>
                      )}

                      {/* totale riga */}
                      <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ ...lbl, color: alpha(C.dark, 0.4) }}>
                          <Spiega
                            k="totaleRiga"
                            calcolo={`€${scontato !== null ? psNum : w.prezzo} × ${qty} bt = €${(scontato ?? listino).toFixed(0)}`}
                          >
                            Totale {qty} bt
                          </Spiega>
                        </p>
                        <p style={{ color: scontato !== null ? C.forest : C.dark, fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>
                          €{(scontato ?? listino).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Totali della cassa */}
              <div style={{ padding: '14px 0', borderTop: `1px solid ${alpha(C.dark, 0.08)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: totalScontato !== null ? C.gray : C.dark, fontSize: totalScontato !== null ? '13px' : '15px', fontWeight: totalScontato !== null ? 500 : 700 }}>
                    <Spiega
                      k="totaleListino"
                      calcolo={`${selectedWines.map(w => `€${w.prezzo} × ${quantities[w.id] ?? 0}`).join(' + ')} = €${totalPrice}`}
                    >
                      Totale a listino
                    </Spiega>
                  </span>
                  <span style={{ color: totalScontato !== null ? C.gray : C.magenta, fontSize: totalScontato !== null ? '15px' : '22px', fontWeight: totalScontato !== null ? 600 : 800, textDecoration: totalScontato !== null ? 'line-through' : 'none' }}>
                    € {totalPrice}
                  </span>
                </div>
                {totalScontato !== null && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ color: C.dark, fontSize: '15px', fontWeight: 700 }}>
                        <Spiega
                          k="totaleScontato"
                          calcolo={`${selectedWines.map(w => {
                            const p = parseFloat(prezziScontati[w.id] ?? '')
                            return `€${!isNaN(p) && p > 0 ? p : w.prezzo} × ${quantities[w.id] ?? 0}`
                          }).join(' + ')} = €${totalScontato.toFixed(0)}`}
                        >
                          Totale GDA scontato
                        </Spiega>
                      </span>
                      <span style={{ color: C.magenta, fontSize: '22px', fontWeight: 800 }}>€ {totalScontato.toFixed(0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <Spiega
                        k="risparmio"
                        calcolo={`€${totalPrice} − €${totalScontato.toFixed(0)} = €${(totalPrice - totalScontato).toFixed(0)}`}
                        style={{ color: C.forest }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 700, backgroundColor: alpha(C.green, 0.15), padding: '4px 10px', borderRadius: '20px' }}>
                          risparmio €{(totalPrice - totalScontato).toFixed(0)} · −{Math.round((1 - totalScontato / totalPrice) * 100)}%
                        </span>
                      </Spiega>
                    </div>
                  </>
                )}
              </div>

              {/* Il collegamento fra questo passo e la scala del riepilogo.
                  Senza, questi prezzi sembrano l'ultima parola — e poi nel
                  riepilogo ne compaiono altri, più bassi, senza spiegazione. */}
              <div style={{ display: 'flex', gap: '10px', backgroundColor: alpha(C.magenta, 0.06), borderRadius: '12px', padding: '11px 13px', margin: '0 0 16px' }}>
                <Icon.Bersaglio size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ color: C.dark, fontSize: '12px', lineHeight: 1.55 }}>
                  Questo è il <strong>prezzo di partenza</strong>, quello del primo traguardo. Nel riepilogo fissi i traguardi successivi e decidi quanto scendere ancora se il gruppo compra di più.
                </p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: C.dark, marginBottom: '4px' }}>Nome della cassa</label>
            <p style={{ color: C.gray, fontSize: '12px', marginBottom: '12px' }}>Un nome che ti aiuti a riconoscerla subito.</p>
            <input
              type="text"
              placeholder={selectedWines.length === 1 ? `${primaryWine.nome} ${primaryWine.annata}` : `Selezione mista · ${totalQty} bottiglie`}
              value={nome}
              onChange={e => setNome(e.target.value)}
              style={{ width: '100%', backgroundColor: alpha(C.dark, 0.04), border: `1.5px solid ${nome ? C.magenta : alpha(C.dark, 0.1)}`, borderRadius: '12px', padding: '13px 16px', color: C.dark, fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
            />
          </div>

          {/* Note */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', padding: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: C.dark, marginBottom: '4px' }}>
              Note per il team Siply <span style={{ color: C.gray, fontWeight: 400 }}>(opzionale)</span>
            </label>
            <p style={{ color: C.gray, fontSize: '12px', marginBottom: '12px' }}>Mercato di riferimento, stagionalità, caratteristiche particolari…</p>
            <textarea
              placeholder="es. Ottima per il mercato nordeuropeo, da abbinare a formaggi stagionati"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              style={{ width: '100%', backgroundColor: alpha(C.dark, 0.04), border: `1.5px solid ${note ? C.magenta : alpha(C.dark, 0.1)}`, borderRadius: '12px', padding: '13px 16px', color: C.dark, fontSize: '14px', outline: 'none', resize: 'none', lineHeight: 1.5, transition: 'border-color 0.2s' }}
            />
          </div>

          {/* Dati economici & documenti */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '14px 20px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon.Grafico size={16} />
              <p style={{ color: alpha(C.dark, 0.45), fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dati economici & Documenti</p>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Il produttore scrive un numero solo: il suo costo. Quanto
                  incassa esce dal prezzo GDA meno la nostra quota, e va detto
                  qui, altrimenti quella riga verde sembra spuntata dal nulla. */}
              <p style={{ color: C.gray, fontSize: '12.5px', lineHeight: 1.55, backgroundColor: alpha(C.green, 0.08), borderRadius: '12px', padding: '11px 14px' }}>
                Il prezzo a cui vendi a Siply lo decidi tu. Su quello Siply trattiene una commissione del <strong style={{ color: C.forest }}>{COMMISSIONE_PCT}</strong>, e il resto è tuo: la vedi calcolata sotto ogni bottiglia.
              </p>

              {/* Per-wine costo rows */}
              {selectedWines.map((w, idx) => {
                const cu = costiUnitari[w.id] ?? ''
                const cs = costiScontati[w.id] ?? ''
                const cuNum = parseFloat(cu)
                const csNum = parseFloat(cs)
                const margineListino = !isNaN(cuNum) && cuNum > 0 ? w.prezzo - cuNum : null
                // La commissione si calcola su quello che chiedi, quindi finché
                // non lo scrivi non c'è niente da mostrare.
                const chiesto = !isNaN(csNum) && csNum > 0 ? csNum : null
                const quotaSiply = chiesto !== null ? commissione(chiesto) : null
                const incasso = chiesto !== null ? alProduttore(chiesto) : null
                const margineGda = incasso !== null && !isNaN(cuNum) && cuNum > 0 ? incasso - cuNum : null
                return (
                  <div key={w.id} style={{ borderBottom: idx < selectedWines.length - 1 ? `1px solid ${alpha(C.dark, 0.06)}` : 'none', paddingBottom: idx < selectedWines.length - 1 ? '16px' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                      <Icon.Bottiglia size={15} />
                      <p style={{ color: C.dark, fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.nome}</p>
                    </div>
                    <div className="econ-grid" style={{ display: 'grid', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: alpha(C.dark, 0.45), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
                          <Spiega k="costoBottiglia">Costo / bottiglia</Spiega>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '10px', padding: '9px 12px', border: `1.5px solid ${cu ? alpha(C.dark, 0.2) : 'transparent'}` }}>
                          <span style={{ color: C.gray, fontSize: '13px' }}>€</span>
                          <input
                            type="number" step="0.5"
                            placeholder="0.00"
                            value={cu}
                            onChange={e => setCostiUnitari(p => ({ ...p, [w.id]: e.target.value }))}
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.dark, fontSize: '14px', fontWeight: 600 }}
                          />
                        </div>
                        {margineListino !== null && (
                          <p style={{ color: margineListino >= 0 ? C.forest : C.magenta, fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                            <Spiega
                              k="margineListino"
                              calcolo={`€${eur(w.prezzo)} − €${eur(cuNum)} = ${margineListino >= 0 ? '+' : ''}€${eur(margineListino)}`}
                            >
                              Margine listino: {margineListino >= 0 ? '+' : ''}€{eur(margineListino)}
                            </Spiega>
                          </p>
                        )}
                      </div>
                      {/* Il prezzo lo chiede il produttore; sotto, quanto gli
                          resta davvero una volta tolta la commissione. */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: alpha(C.dark, 0.45), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
                          <Spiega k="acquistoSiply">Prezzo acquisto Siply</Spiega>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '10px', padding: '9px 12px', border: `1.5px solid ${cs ? alpha(C.green, 0.4) : 'transparent'}` }}>
                          <span style={{ color: C.gray, fontSize: '13px' }}>€</span>
                          <input
                            type="number" step="0.5"
                            placeholder="0.00"
                            value={cs}
                            onChange={e => setCostiScontati(p => ({ ...p, [w.id]: e.target.value }))}
                            style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.dark, fontSize: '14px', fontWeight: 600 }}
                          />
                        </div>
                        {/* Quanto resta e quanto trattiene Siply stanno qui e non
                            dentro al campo: in colonna stretta il riquadro non
                            regge un prezzo e una pastiglia sulla stessa riga. */}
                        {incasso !== null && quotaSiply !== null && (
                          <p style={{ color: C.forest, fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                            <Spiega
                              k="incassoBottiglia"
                              calcolo={`€${eur(chiesto!)} × ${QUOTA_PCT} = €${eur(incasso)}`}
                            >
                              Incassi tu: €{eur(incasso)}
                            </Spiega>
                            {' · '}
                            <Spiega
                              k="commissioneSiply"
                              calcolo={`€${eur(chiesto!)} × ${COMMISSIONE_PCT} = €${eur(quotaSiply)}`}
                              style={{ color: alpha(C.dark, 0.45) }}
                            >
                              −€{eur(quotaSiply)} Siply
                            </Spiega>
                          </p>
                        )}
                        {margineGda !== null && incasso !== null && (
                          <p style={{ color: margineGda >= 0 ? C.forest : C.magenta, fontSize: '12.5px', fontWeight: 600, marginTop: '2px' }}>
                            <Spiega
                              k="margineGda"
                              calcolo={`€${eur(incasso)} − €${eur(cuNum)} = ${margineGda >= 0 ? '+' : ''}€${eur(margineGda)}`}
                            >
                              Margine GDA: {margineGda >= 0 ? '+' : ''}€{eur(margineGda)}
                            </Spiega>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* PDF listino */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: alpha(C.dark, 0.45), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Listino pubblico (PDF)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: listinoPdf ? alpha(C.green, 0.08) : alpha(C.dark, 0.04), border: `1.5px dashed ${listinoPdf ? C.green : alpha(C.dark, 0.18)}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {listinoPdf ? <Icon.Documento size={24} /> : <Icon.Graffetta size={24} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {listinoPdf ? (
                      <>
                        <p style={{ color: C.forest, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listinoPdf.name}</p>
                        <p style={{ color: C.gray, fontSize: '12px' }}>{(listinoPdf.size / 1024).toFixed(0)} KB</p>
                      </>
                    ) : (
                      <>
                        <p style={{ color: C.dark, fontSize: '13px', fontWeight: 600 }}>Carica listino prezzi</p>
                        <p style={{ color: C.gray, fontSize: '12px' }}>PDF del produttore con i prezzi ufficiali</p>
                      </>
                    )}
                  </div>
                  {listinoPdf && (
                    <M.IconButton
                      onClick={e => { e.preventDefault(); setListinoPdf(null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '18px', flexShrink: 0 }}
                    >×</M.IconButton>
                  )}
                  <input
                    type="file" accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && setListinoPdf(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Riepilogo totali */}
          {(() => {
            const ricavoListino = totalPrice
            const ricavoScontato = selectedWines.reduce((sum, w) => {
              const ps = parseFloat(prezziScontati[w.id] ?? '')
              return sum + (!isNaN(ps) && ps > 0 ? ps * (quantities[w.id] ?? 0) : 0)
            }, 0)
            const costoTotale = selectedWines.reduce((sum, w) => {
              const cu = parseFloat(costiUnitari[w.id] ?? '')
              return sum + (!isNaN(cu) && cu > 0 ? cu * (quantities[w.id] ?? 0) : 0)
            }, 0)
            const chiestoTotale = selectedWines.reduce((sum, w) => {
              const cs = parseFloat(costiScontati[w.id] ?? '')
              return sum + (!isNaN(cs) && cs > 0 ? cs * (quantities[w.id] ?? 0) : 0)
            }, 0)
            const hasDati = costoTotale > 0 || ricavoScontato > 0 || chiestoTotale > 0
            if (!hasDati) return null
            // La parte di Siply non è una differenza fra prezzi battuti a mano:
            // è la sua quota su quanto fattura il produttore.
            const quotaSiply = chiestoTotale > 0 ? commissione(chiestoTotale) : null
            const incasso = chiestoTotale > 0 ? alProduttore(chiestoTotale) : null
            const margineListino = costoTotale > 0 ? ricavoListino - costoTotale : null
            const margineGda = costoTotale > 0 && incasso !== null ? incasso - costoTotale : null
            const pctListino = margineListino !== null && costoTotale > 0 ? (margineListino / costoTotale) * 100 : null
            const pctGda = margineGda !== null && costoTotale > 0 ? (margineGda / costoTotale) * 100 : null
            return (
              <div style={{ backgroundColor: C.dark, borderRadius: '20px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Icon.Trend size={18} />
                  <p style={{ color: alpha(C.silver, 0.5), fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Riepilogo totali</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Row: Ricavo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                      <Spiega k="ricavoListino">Ricavo a listino</Spiega>
                    </span>
                    <span style={{ color: C.bg, fontSize: '15px', fontWeight: 700 }}>€ {eur(ricavoListino)}</span>
                  </div>
                  {ricavoScontato > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega k="ricavoScontato">Ricavo GDA scontato</Spiega>
                      </span>
                      <span style={{ color: C.ocra, fontSize: '15px', fontWeight: 700 }}>€ {eur(ricavoScontato)}</span>
                    </div>
                  )}
                  {costoTotale > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega k="costoTotale">Costo totale</Spiega>
                      </span>
                      <span style={{ color: alpha(C.silver, 0.7), fontSize: '15px', fontWeight: 700 }}>€ {eur(costoTotale)}</span>
                    </div>
                  )}
                  {chiestoTotale > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega k="acquistoSiplyTot">Prezzo acquisto Siply (tot.)</Spiega>
                      </span>
                      <span style={{ color: alpha(C.silver, 0.7), fontSize: '15px', fontWeight: 700 }}>€ {eur(chiestoTotale)}</span>
                    </div>
                  )}
                  {quotaSiply !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega
                          k="commissioneSiply"
                          calcolo={`€${eur(chiestoTotale)} × ${COMMISSIONE_PCT} = €${eur(quotaSiply)}`}
                        >
                          Commissione Siply ({COMMISSIONE_PCT})
                        </Spiega>
                      </span>
                      <span style={{ color: alpha(C.silver, 0.7), fontSize: '15px', fontWeight: 700 }}>− € {eur(quotaSiply)}</span>
                    </div>
                  )}
                  {incasso !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega
                          k="incassoCassa"
                          calcolo={`€${eur(chiestoTotale)} × ${QUOTA_PCT} = €${eur(incasso)}`}
                        >
                          Incassi tu
                        </Spiega>
                      </span>
                      <span style={{ color: C.bg, fontSize: '15px', fontWeight: 700 }}>€ {eur(incasso)}</span>
                    </div>
                  )}
                  <div style={{ height: '1px', backgroundColor: alpha(C.white, 0.08), margin: '4px 0' }} />
                  {margineListino !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega
                          k="margineListino"
                          calcolo={`€${eur(ricavoListino)} − €${eur(costoTotale)} = ${margineListino >= 0 ? '+' : ''}€${eur(margineListino)}`}
                        >
                          Margine a listino
                        </Spiega>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {pctListino !== null && <span style={{ color: margineListino >= 0 ? C.green : C.magenta, fontSize: '12px', fontWeight: 700, backgroundColor: alpha(margineListino >= 0 ? C.green : C.magenta, 0.15), padding: '2px 7px', borderRadius: '20px' }}>{pctListino >= 0 ? '+' : ''}{pct(pctListino)}%</span>}
                        <span style={{ color: margineListino >= 0 ? C.green : C.magenta, fontSize: '18px', fontWeight: 800 }}>{margineListino >= 0 ? '+' : ''}€{eur(margineListino)}</span>
                      </div>
                    </div>
                  )}
                  {margineGda !== null && incasso !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: alpha(C.silver, 0.55), fontSize: '13px' }}>
                        <Spiega
                          k="margineGda"
                          calcolo={`€${eur(incasso)} − €${eur(costoTotale)} = ${margineGda >= 0 ? '+' : ''}€${eur(margineGda)}`}
                        >
                          Margine GDA
                        </Spiega>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {pctGda !== null && <span style={{ color: margineGda >= 0 ? C.green : C.magenta, fontSize: '12px', fontWeight: 700, backgroundColor: alpha(margineGda >= 0 ? C.green : C.magenta, 0.15), padding: '2px 7px', borderRadius: '20px' }}>{pctGda >= 0 ? '+' : ''}{pct(pctGda)}%</span>}
                        <span style={{ color: margineGda >= 0 ? C.green : C.magenta, fontSize: '18px', fontWeight: 800 }}>{margineGda >= 0 ? '+' : ''}€{eur(margineGda)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Info */}
          <div style={{ backgroundColor: alpha(C.ocra, 0.12), borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
            <Icon.Appunti size={22} />
            <div>
              <p style={{ color: C.olive, fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>Cosa succede dopo?</p>
              <p style={{ color: C.olive, fontSize: '12px', lineHeight: 1.6 }}>
                Questa cassa entra nel GDA <strong>{gdaNome.trim()}</strong>. Dal riepilogo potrai aggiungerne altre prima di inviare.
              </p>
            </div>
          </div>

          <M.Button
            onClick={confermaCassa}
            style={{ width: '100%', backgroundColor: C.magenta, color: C.bg, fontWeight: 700, padding: '18px', borderRadius: '16px', fontSize: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 'auto' }}
          >
            Aggiungi la cassa al GDA
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </M.Button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════
          STEP 4 — RIEPILOGO DEL GDA
      ══════════════════════════════════════════════ */}
      {step === 'riepilogo' && (
        <motion.div key="riepilogo" variants={stepV} initial="initial" animate="animate" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <Icon.Carrello size={38} style={{ margin: '0 auto 8px' }} />
            <p style={{ color: C.dark, fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Il tuo GDA</p>
            <p style={{ color: C.gray, fontSize: '14px', lineHeight: 1.5 }}>
              {aggiuntaAInviato
                ? 'Puoi aggiungere altre casse prima di confermare. Il GDA resta in attesa di approvazione.'
                : 'Puoi aggiungere altre casse prima di inviare. Una volta inviato, il GDA andrà in revisione.'}
            </p>
          </div>

          {/* Casse contenute nel GDA */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ backgroundColor: C.dark, padding: '20px' }}>
              <p style={{ color: alpha(C.silver, 0.5), fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Gruppo d'acquisto
              </p>
              <p style={{ color: C.bg, fontSize: '18px', fontWeight: 800 }}>{gdaNome.trim()}</p>
              <p style={{ color: alpha(C.silver, 0.5), fontSize: '12px', marginTop: '4px' }}>
                {casseEsistenti.length + casseAggiunte.length} cass{casseEsistenti.length + casseAggiunte.length === 1 ? 'a' : 'e'} · {gdaQty} bottiglie
              </p>
            </div>

            <div style={{ padding: '8px 20px 0' }}>
              {/* Casse già nel GDA: si vedono ma non si toccano */}
              {casseEsistenti.map(c => (
                <div key={c.id} style={{ padding: '14px 0', borderBottom: `1px solid ${alpha(C.dark, 0.07)}`, opacity: 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Icon.Cassa size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <p style={{ color: C.dark, fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: C.gray, backgroundColor: alpha(C.dark, 0.08), padding: '2px 6px', borderRadius: '20px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>già inviata</span>
                      </div>
                      <p style={{ color: C.gray, fontSize: '12px', marginTop: '2px', lineHeight: 1.45 }}>
                        {c.bottiglie
                          ? c.bottiglie.map(b => `${b.bottiglia.nome} · ${b.quantita} bt`).join(' · ')
                          : `${c.bottiglia.nome} ${c.bottiglia.annata} · ${c.quantita} bt`}
                      </p>
                    </div>
                    <span style={{ color: C.dark, fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>€{cassaTotale(c)}</span>
                  </div>
                </div>
              ))}

              {/* Le casse aggiunte entrano dal basso e, se rimosse, le altre
                  risalgono al loro posto invece di saltare. */}
              <AnimatePresence initial={false}>
              {casseAggiunte.map((c, i) => (
                <motion.div
                  key={c.id} layout
                  variants={M.V.item} initial="initial" animate="animate" exit="exit"
                  style={{ padding: '14px 0', borderBottom: i < casseAggiunte.length - 1 ? `1px solid ${alpha(C.dark, 0.07)}` : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Icon.Cassa size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: C.dark, fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                      <p style={{ color: C.gray, fontSize: '12px', marginTop: '2px', lineHeight: 1.45 }}>
                        {c.bottiglie
                          ? c.bottiglie.map(b => `${b.bottiglia.nome} · ${b.quantita} bt`).join(' · ')
                          : `${c.bottiglia.nome} ${c.bottiglia.annata} · ${c.quantita} bt`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ color: C.dark, fontSize: '14px', fontWeight: 800 }}>€{cassaTotale(c)}</span>
                      <M.IconButton
                        onClick={() => setCasseAggiunte(prev => prev.filter(x => x.id !== c.id))}
                        title="Rimuovi la cassa dal GDA"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: alpha(C.dark, 0.3), fontSize: '18px', lineHeight: 1, padding: '0 2px' }}
                      >×</M.IconButton>
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
              {casseAggiunte.length === 0 && (
                <p style={{ color: C.gray, fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                  {aggiuntaAInviato
                    ? 'Nessuna nuova cassa. Aggiungine almeno una per confermare.'
                    : 'Nessuna cassa nel GDA. Aggiungine almeno una per poter inviare.'}
                </p>
              )}
            </div>

          </div>

          {/* Aggiungi un'altra cassa */}
          <M.Button
            onClick={nuovaCassa}
            style={{
              width: '100%', backgroundColor: 'transparent', color: C.magenta,
              padding: '16px', borderRadius: '16px', fontSize: '15px', fontWeight: 700,
              border: `2px dashed ${alpha(C.magenta, 0.4)}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <span style={{ fontSize: '18px' }}>＋</span>
            Aggiungi un'altra cassa
          </M.Button>

          {/* Spedizione — qui si corregge l'indirizzo e si aggiungono le note */}
          <SpedizioneCard
            compatto conNote
            location={locationSpedizione}
            onLocation={setLocationSpedizione}
            note={noteSpedizione}
            onNote={setNoteSpedizione}
          />

          {/* ── Traguardi e sconti ──
              Il patto con chi compra sta tutto in questa scheda: quante
              bottiglie, quanto sconto, e cosa vuol dire in soldi. Prima erano
              due schede separate — i numeri di bottiglie qui, la stima dei
              ricavi più sotto — e il legame fra le due cose, che è poi il
              punto, non si vedeva da nessuna parte. */}
          <div style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 20px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon.Bersaglio size={16} />
              <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Traguardi e sconti</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: C.dark, marginBottom: '4px' }}>
                <Spiega k="traguardi">Più il gruppo compra, meno paga</Spiega>
              </label>
              <p style={{ color: C.gray, fontSize: '12px', lineHeight: 1.55 }}>
                Decidi quante bottiglie deve vendere il GDA e quanto scendi di prezzo a ogni scalino. Il primo traguardo si paga al prezzo che hai già messo sulle bottiglie; da lì in su lo sconto in più lo aggiungi tu. Fino a {MAX_TRAGUARDI} traguardi, {num(MAX_BOTTIGLIE)} bottiglie l'uno.
              </p>

              {/* L'esempio prima della scala: chi non ha mai visto come
                  funziona lo trova sulla strada, senza doverlo cercare. */}
              <EsempioScala />

              {/* La scala, uno scalino per riga */}
              {traguardi.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <AnimatePresence initial={false}>
                    {traguardi.map((t, i) => (
                      <motion.div
                        key={t.bottiglie} layout
                        variants={M.V.item} initial="initial" animate="animate" exit="exit"
                      >
                        <RigaTraguardo
                          indice={i}
                          traguardo={t}
                          medie={medie}
                          incoerente={i === scalaRotta}
                          onSconto={v => cambiaSconto(t.bottiglie, v)}
                          onRimuovi={() => setTraguardi(p => normalizza(p.filter(x => x.bottiglie !== t.bottiglie)))}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {medie.acquisto > 0 && <StrisciaCommissione />}

                  {medie.bottiglie > 0 && (medie.acquisto === 0 || medie.costo === 0) && (
                    <p style={{ color: C.gray, fontSize: '12px', lineHeight: 1.5, marginTop: '12px' }}>
                      {medie.acquisto === 0
                        ? 'Scrivi il prezzo acquisto Siply nel passo Dettagli per sapere quanto incassi a ogni traguardo.'
                        : 'Scrivi il costo di produzione nel passo Dettagli per vedere anche quanto ti resta netto.'}
                    </p>
                  )}
                </div>
              )}

              {traguardi.length === 0 && (
                <p style={{ color: C.gray, fontSize: '12.5px', lineHeight: 1.55, backgroundColor: alpha(C.dark, 0.035), borderRadius: '12px', padding: '12px 14px', margin: '12px 0 0' }}>
                  Nessun traguardo fissato. Senza una scala il gruppo compra al prezzo di partenza e basta: nessuno ha un motivo per aggiungere bottiglie.
                </p>
              )}

              {/* Aggiungi uno scalino */}
              {traguardi.length < MAX_TRAGUARDI && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px', padding: '12px 12px 12px 16px', border: `1.5px solid ${nuovoTraguardo ? C.magenta : alpha(C.dark, 0.1)}`, transition: 'border-color 0.2s', marginTop: '14px' }}>
                  <Icon.Bottiglia size={22} />
                  <input
                    type="number"
                    min="1"
                    max={MAX_BOTTIGLIE}
                    placeholder={traguardi.length === 0 ? 'es. 600 bottiglie' : 'un altro traguardo'}
                    value={nuovoTraguardo}
                    onChange={e => setNuovoTraguardo(clampTraguardo(e.target.value))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); aggiungiTraguardo() } }}
                    style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.dark, fontSize: '20px', fontWeight: 800 }}
                  />
                  <M.Chip
                    type="button"
                    onClick={aggiungiTraguardo}
                    disabled={!nuovoTraguardo}
                    style={{
                      flexShrink: 0, backgroundColor: nuovoTraguardo ? C.magenta : alpha(C.dark, 0.1),
                      color: nuovoTraguardo ? C.bg : alpha(C.dark, 0.35),
                      border: 'none', borderRadius: '10px', padding: '9px 14px',
                      fontSize: '13px', fontWeight: 700, cursor: nuovoTraguardo ? 'pointer' : 'default',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    Aggiungi
                  </M.Chip>
                </div>
              )}
              {traguardoLimitato && (
                <p style={{ color: C.magenta, fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
                  Il massimo consentito è {num(MAX_BOTTIGLIE)} bottiglie.
                </p>
              )}
              {traguardi.length >= MAX_TRAGUARDI && (
                <p style={{ color: C.gray, fontSize: '12px', marginTop: '12px' }}>
                  Hai fissato {MAX_TRAGUARDI} traguardi: è il massimo. Togline uno per aggiungerne un altro.
                </p>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: alpha(C.green, 0.1), borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
            <Icon.Campana size={22} />
            <p style={{ color: C.forest, fontSize: '13px', lineHeight: 1.6 }}>
              Dopo l'invio lo stato sarà <strong>In attesa di approvazione</strong>. Tieni d'occhio la sezione "I miei GDA" o la tua email.
            </p>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
            <M.Button
              onClick={handleInvia}
              disabled={casseAggiunte.length === 0}
              style={{
                width: '100%',
                backgroundColor: casseAggiunte.length ? C.magenta : alpha(C.dark, 0.12),
                color: casseAggiunte.length ? C.bg : alpha(C.dark, 0.35),
                fontWeight: 700, padding: '18px', borderRadius: '16px', fontSize: '16px',
                border: 'none', cursor: casseAggiunte.length ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background-color 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinejoin="round" strokeLinecap="round" /></svg>
              {aggiuntaAInviato
                ? `Aggiungi ${casseAggiunte.length === 1 ? 'la cassa' : `le ${casseAggiunte.length} casse`} al GDA`
                : 'Invia il GDA per approvazione'}
            </M.Button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Crea Bottiglia sheet ── */}
      <AnimatePresence>
        {showCreaBottiglia && (
          <CreaBottigliaSheet
            onClose={() => setShowCreaBottiglia(false)}
            onCreata={w => { setExtraWines(p => [...p, w]); setShowCreaBottiglia(false) }}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile filter drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <M.Overlay onClose={() => setDrawerOpen(false)} kind="sheet" z={200} veil={0.5} panelStyle={{
            backgroundColor: C.bg, borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <h3 style={{ color: C.dark, fontSize: '18px', fontWeight: 800 }}>Filtra vini</h3>
              <M.IconButton onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '20px' }}>✕</M.IconButton>
            </div>
            <WineFilterPanel filters={filters} set={setF} onReset={() => setFilters(FILTERS_INIT)} />
            <div style={{ padding: '12px 20px 36px' }}>
              <M.Button onClick={() => setDrawerOpen(false)} style={{ width: '100%', backgroundColor: C.magenta, color: C.bg, padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>
                Mostra {results.length} vini
              </M.Button>
            </div>
          </M.Overlay>
        )}
      </AnimatePresence>

      {/* ── Wine detail sheet ── */}
      <AnimatePresence>
        {detail && (
          <WineDetailSheet wine={detail} qty={quantities[detail.id] ?? 0} canAdd={totalQty < 6} onAdd={() => handleAdd(detail)} onRemove={() => handleRemove(detail.id)} onClose={() => setDetail(null)} />
        )}
      </AnimatePresence>

      <style>{`
        /* Passo già fatto: si può tornarci. La velatura all'hover è l'unico
           segno che è cliccabile — un bordo o un colore diverso lo farebbe
           sembrare uno stato dello stepper, che è tutt'altra cosa. */
        .siply-step-torna {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: none;
          border: none;
          padding: 4px 10px 3px;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .siply-step-torna:hover { background-color: ${alpha(C.white, 0.09)}; }

        /* Lo spazio della nav sta dentro alla barra, non sotto: il fondo scuro
           prosegue fino al bordo dello schermo. L'altezza la scrive la nav
           stessa in --siply-nav-h; il valore di scorta serve solo al primo
           frame, prima che la misura arrivi. */
        .siply-totalbar {
          padding: 12px 16px calc(var(--siply-nav-h, 68px) + 12px);
        }
        @media (min-width: 768px) {
          /* Da tablet in su la nav sta in alto: qui sotto non c'è niente. */
          .siply-totalbar { padding: 12px 16px; }
          .cassa-sidebar { display: block !important; }
          .cassa-filter-btn { display: none !important; }
          .econ-grid { grid-template-columns: 1fr 1fr !important; }
        }
        .econ-grid { grid-template-columns: 1fr; }
        /* le frecce dello stepper sono solo rumore su questi campi */
        .num-clean::-webkit-outer-spin-button,
        .num-clean::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .num-clean { -moz-appearance: textfield; appearance: textfield; }
      `}</style>
    </div>
  )
}

/* ── Wine card with bottom stepper bar ─────────────────────────────────────── */
function WineCard({ wine, qty, isFiltered, canAdd, onAdd, onRemove, onDetail }: {
  wine: WineRich
  qty: number
  isFiltered: boolean
  canAdd: boolean
  onAdd: () => void
  onRemove: () => void
  onDetail: () => void
}) {
  const isSelected = qty > 0
  return (
    <M.Item layout style={{
      backgroundColor: C.white,
      borderRadius: '16px',
      border: `2px solid ${isSelected ? C.magenta : isFiltered ? alpha(C.magenta, 0.18) : 'transparent'}`,
      boxShadow: isSelected ? `0 0 0 4px ${alpha(C.magenta, 0.08)}` : '0 1px 5px rgba(0,0,0,0.07)',
      overflow: 'hidden',
      transition: 'border-color 0.18s, box-shadow 0.18s',
    }}>
      {/* Top: tap area for detail */}
      <M.RowButton
        onClick={onDetail}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px', minWidth: 0 }}
      >
        {/* Thumbnail */}
        <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: alpha(C.forest, 0.05), flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {wine.immagine
            ? <img src={wine.immagine} alt={wine.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Icon.Bottiglia size={20} />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <p style={{ color: C.dark, fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {wine.nome}
            </p>
            {wine.biologico && <Icon.Foglia size={13} />}
          </div>
          <p style={{ color: C.gray, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wine.produttore} · {wine.annata}
          </p>
          <div style={{ display: 'flex', gap: '5px', marginTop: '5px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: C.forest, backgroundColor: alpha(C.forest, 0.1), padding: '2px 7px', borderRadius: '20px' }}>{wine.denominazione}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: C.green, backgroundColor: alpha(C.green, 0.1), padding: '2px 7px', borderRadius: '20px' }}>{wine.regione}</span>
          </div>
        </div>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.25)} strokeWidth={2} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
      </M.RowButton>

      {/* Bottom bar: price + stepper */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderTop: `1px solid ${isSelected ? alpha(C.magenta, 0.15) : alpha(C.dark, 0.07)}`,
        backgroundColor: isSelected ? alpha(C.magenta, 0.04) : 'transparent',
        padding: '8px 14px',
        gap: '8px',
      }}>
        {/* Price */}
        <span style={{ color: isSelected ? C.magenta : C.gray, fontWeight: 700, fontSize: '14px', flex: 1 }}>
          € {wine.prezzo} <span style={{ fontWeight: 400, fontSize: '11px', color: alpha(isSelected ? C.magenta : C.dark, 0.4) }}>/ bt</span>
        </span>

        {/* Stepper */}
        <div style={{
          display: 'flex', alignItems: 'center',
          border: `1.5px solid ${qty === 0 ? alpha(C.dark, 0.12) : alpha(C.magenta, 0.3)}`,
          borderRadius: '10px', overflow: 'hidden',
          transition: 'border-color 0.18s',
        }}>
          <M.IconButton
            onClick={e => { e.stopPropagation(); onRemove() }}
            disabled={qty === 0}
            style={{
              width: '32px', height: '32px',
              backgroundColor: qty === 0 ? alpha(C.dark, 0.04) : alpha(C.magenta, 0.1),
              border: 'none',
              boxShadow: `inset -1px 0 0 ${qty === 0 ? alpha(C.dark, 0.12) : alpha(C.magenta, 0.25)}`,
              color: qty === 0 ? alpha(C.dark, 0.28) : C.magenta,
              cursor: qty === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 300, lineHeight: 1,
              transition: 'background-color 0.18s, color 0.18s',
            }}
          >−</M.IconButton>

          <div style={{
            minWidth: '36px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: C.white,
          }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: qty === 0 ? alpha(C.dark, 0.22) : C.magenta, transition: 'color 0.18s' }}>
              <M.Ticker value={qty} />
            </span>
          </div>

          <M.IconButton
            onClick={e => { e.stopPropagation(); onAdd() }}
            disabled={!canAdd || qty === 6}
            style={{
              width: '32px', height: '32px',
              backgroundColor: (!canAdd || qty === 6) ? alpha(C.dark, 0.04) : C.magenta,
              border: 'none',
              boxShadow: `inset 1px 0 0 ${(!canAdd || qty === 6) ? alpha(C.dark, 0.12) : alpha(C.magenta, 0.4)}`,
              color: (!canAdd || qty === 6) ? alpha(C.dark, 0.28) : C.white,
              cursor: (!canAdd || qty === 6) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 300, lineHeight: 1,
              transition: 'background-color 0.18s, color 0.18s',
            }}
          >+</M.IconButton>
        </div>
      </div>
    </M.Item>
  )
}

/* ── Wine detail bottom sheet ───────────────────────────────────────────────── */
function WineDetailSheet({ wine, qty, canAdd, onAdd, onRemove, onClose }: {
  wine: WineRich
  qty: number
  canAdd: boolean
  onAdd: () => void
  onRemove: () => void
  onClose: () => void
}) {
  return (
    <M.Overlay onClose={onClose} kind="sheet" z={300} panelStyle={{
      maxWidth: '600px', backgroundColor: C.bg, borderRadius: '24px 24px 0 0',
      maxHeight: '88vh', overflowY: 'auto',
    }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15) }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: C.magenta, backgroundColor: alpha(C.magenta, 0.12), padding: '3px 9px', borderRadius: '20px' }}>{wine.denominazione}</span>
              {wine.biologico && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: C.green, backgroundColor: alpha(C.green, 0.12), padding: '3px 9px', borderRadius: '20px' }}>
                  <Icon.Foglia size={12} color={C.green} blob={null} /> Bio
                </span>
              )}
            </div>
            <h3 style={{ color: C.dark, fontSize: '22px', fontWeight: 800, lineHeight: 1.2, marginBottom: '4px' }}>{wine.nome}</h3>
            <p style={{ color: C.gray, fontSize: '14px' }}>{wine.produttore}</p>
          </div>
          <M.IconButton onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '22px', flexShrink: 0, lineHeight: 1, padding: '4px' }}>✕</M.IconButton>
        </div>

        {/* Sections */}
        <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Identità */}
          <DetailGroup title="Identità" Icona={Icon.Tag}>
            <DetailRow label="Produttore" value={wine.produttore} />
            <DetailRow label="Regione" value={wine.regione} />
            <DetailRow label="Annata" value={String(wine.annata)} />
            <DetailRow label="Denominazione" value={wine.denominazione} last />
          </DetailGroup>

          {/* Caratteristiche */}
          <DetailGroup title="Caratteristiche" Icona={Icon.Uva}>
            <DetailRow label="Vitigno" value={wine.vitigno} />
            <DetailRow label="Struttura" value={wine.corpo} />
            <DetailRow label="Biologico" value={wine.biologico ? 'Sì' : 'No'} last />
          </DetailGroup>

          {/* Abbinamenti */}
          <DetailGroup title="Abbinamenti" Icona={Icon.Piatto}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '12px 0' }}>
              {wine.abbinamenti.map(a => (
                <span key={a} style={{ fontSize: '13px', fontWeight: 500, color: C.dark, backgroundColor: alpha(C.dark, 0.06), padding: '6px 14px', borderRadius: '20px' }}>{a}</span>
              ))}
            </div>
          </DetailGroup>

          {/* Prezzo */}
          <div style={{ backgroundColor: C.dark, borderRadius: '18px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: alpha(C.silver, 0.5), fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                <Spiega k="listino">Prezzo</Spiega>
              </p>
              <p style={{ color: C.bg, fontSize: '14px' }}>
                <span style={{ fontWeight: 800, fontSize: '22px' }}>€{wine.prezzo}</span>
                <span style={{ color: alpha(C.silver, 0.5) }}> / bottiglia</span>
              </p>
            </div>
            <Icon.Bottiglia size={32} />
          </div>

          {/* Inline stepper CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: `1.5px solid ${qty === 0 ? alpha(C.dark, 0.12) : alpha(C.magenta, 0.3)}`,
              borderRadius: '14px', overflow: 'hidden', height: '52px',
            }}>
              <M.IconButton
                onClick={onRemove} disabled={qty === 0}
                style={{ width: '52px', height: '52px', backgroundColor: qty === 0 ? alpha(C.dark, 0.04) : alpha(C.magenta, 0.1), border: 'none', boxShadow: `inset -1px 0 0 ${qty === 0 ? alpha(C.dark, 0.1) : alpha(C.magenta, 0.2)}`, color: qty === 0 ? alpha(C.dark, 0.25) : C.magenta, cursor: qty === 0 ? 'default' : 'pointer', fontSize: '24px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >−</M.IconButton>
              <div style={{ minWidth: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: qty === 0 ? alpha(C.dark, 0.22) : C.magenta }}><M.Ticker value={qty} /></span>
              </div>
              <M.IconButton
                onClick={onAdd} disabled={!canAdd || qty === 6}
                style={{ width: '52px', height: '52px', backgroundColor: (!canAdd || qty === 6) ? alpha(C.dark, 0.04) : C.magenta, border: 'none', boxShadow: `inset 1px 0 0 ${(!canAdd || qty === 6) ? alpha(C.dark, 0.1) : alpha(C.magenta, 0.4)}`, color: (!canAdd || qty === 6) ? alpha(C.dark, 0.25) : C.white, cursor: (!canAdd || qty === 6) ? 'default' : 'pointer', fontSize: '24px', fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</M.IconButton>
            </div>
            <M.Button
              onClick={onClose}
              style={{ flex: 1, height: '52px', backgroundColor: qty > 0 ? C.magenta : alpha(C.dark, 0.08), color: qty > 0 ? C.bg : C.dark, border: 'none', cursor: 'pointer', borderRadius: '14px', fontWeight: 700, fontSize: '15px' }}
            >
              {qty > 0 ? 'Conferma selezione' : 'Chiudi'}
            </M.Button>
          </div>
        </div>
    </M.Overlay>
  )
}

/* ── Sent ──────────────────────────────────────────────────────────────────── */
function SentScreen({ aggiunta }: { aggiunta: boolean }) {
  return (
    <M.List style={{ minHeight: '100vh', backgroundColor: C.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center' }}>
      {/* Il cerchio "sboccia" con un filo di rimbalzo: è il momento di premio
          del flusso, l'unico punto dove una molla elastica è giustificata. */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: alpha(C.magenta, 0.2), border: `2px solid ${alpha(C.magenta, 0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}
      >
        <Icon.Mascotte height={52} />
      </motion.div>
      <M.Item>
        <h2 style={{ color: C.bg, fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>
          {aggiunta ? 'Cassa aggiunta!' : 'GDA inviato!'}
        </h2>
      </M.Item>
      <M.Item>
        <p style={{ color: alpha(C.silver, 0.6), fontSize: '15px', lineHeight: 1.6, maxWidth: '280px', marginBottom: '12px' }}>
          {aggiunta
            ? 'Il GDA aggiornato resta in attesa di approvazione. Il team Siply lo valuterà nel suo insieme.'
            : 'Il team Siply lo esaminerà entro 48 ore e ti darà riscontro via email.'}
        </p>
      </M.Item>
      <M.Item>
        <p style={{ color: C.ocra, fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>Condividi sorsi senza rimorsi.</p>
      </M.Item>
    </M.List>
  )
}

/* ── Spedizione ────────────────────────────────────────────────────────────
   Lo stesso blocco compare due volte: all'apertura del GDA (solo l'indirizzo,
   per non appesantire il primo passo) e nel riepilogo, dove si può correggere
   e aggiungere le note sui casi particolari. Un componente solo così i due
   punti non divergono. */
function SpedizioneCard({ location, onLocation, note, onNote, conNote, compatto }: {
  location: string
  onLocation: (v: string) => void
  note: string
  onNote: (v: string) => void
  /** mostra anche il campo note: serve nel riepilogo, non all'apertura */
  conNote?: boolean
  /** intestazione più discreta, per il riepilogo */
  compatto?: boolean
}) {
  return (
    <div style={{ backgroundColor: C.white, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '14px 20px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon.Cassa size={16} />
        <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spedizione</p>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: C.dark, marginBottom: '4px' }}>
          Location di partenza
        </label>
        <p style={{ color: C.gray, fontSize: '12px', marginBottom: '12px' }}>
          {compatto
            ? 'Controlla che sia giusta prima di inviare.'
            : "Scrivi le prime lettere e scegli l'indirizzo dai suggerimenti."}
        </p>
        {/* Suggerito, non battuto a mano: un indirizzo scelto da un elenco
            arriva a noi sempre nella stessa forma, e chi compila fa meno
            fatica. Vedi src/components/IndirizzoInput.tsx. */}
        <IndirizzoInput
          value={location}
          onChange={onLocation}
          placeholder="es. Via Roma 12, Barolo (CN)"
        />

        {/* Dove arriva la merce: si dichiara qui, accanto a dove parte. */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', backgroundColor: alpha(C.ocra, 0.12), borderRadius: '12px', padding: '12px 14px' }}>
          <Icon.Cassa size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ color: C.olive, fontSize: '12.5px', lineHeight: 1.6 }}>
            Le casse vengono spedite al nostro polo di <strong>Settimo Torinese (TO)</strong>.
            L'indirizzo completo e le istruzioni di consegna te li diamo al momento del ritiro:
            per i dettagli chiama o scrivi ai{' '}
            <M.Button
              type="button"
              onClick={scrollToFooter}
              style={{ display: 'inline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.magenta, fontWeight: 700, fontSize: '12.5px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              nostri contatti
            </M.Button>.
          </p>
        </div>

        {conNote && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${alpha(C.dark, 0.07)}` }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: C.dark, marginBottom: '4px' }}>
              Note sulla spedizione <span style={{ color: C.gray, fontWeight: 400 }}>· facoltative</span>
            </label>
            <p style={{ color: C.gray, fontSize: '12px', marginBottom: '12px' }}>
              Altri indirizzi di partenza, orari di ritiro, vincoli sui trasporti: tutto quello che Siply deve sapere.
            </p>
            <textarea
              placeholder="es. Le casse di Amarone partono dal deposito di Verona, ritiro solo il mattino."
              value={note}
              onChange={e => onNote(e.target.value)}
              rows={3}
              style={{ width: '100%', backgroundColor: alpha(C.dark, 0.04), border: `1.5px solid ${note ? C.magenta : alpha(C.dark, 0.1)}`, borderRadius: '12px', padding: '13px 16px', color: C.dark, fontSize: '14px', outline: 'none', resize: 'none', lineHeight: 1.5, transition: 'border-color 0.2s' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shared pieces ─────────────────────────────────────────────────────────── */
function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout variants={M.V.pop} initial="initial" animate="animate" exit="exit"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: alpha(C.magenta, 0.12), color: C.magenta, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}
    >
      {label}
      <M.IconButton onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.magenta, fontSize: '14px', lineHeight: 1, padding: 0 }}>×</M.IconButton>
    </motion.span>
  )
}


function DetailGroup({ title, Icona, children }: { title: string; Icona: React.ComponentType<Icon.IconProps>; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: C.white, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '12px 16px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icona size={16} />
        <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</p>
      </div>
      <div style={{ padding: '0 16px' }}>{children}</div>
    </div>
  )
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: last ? 'none' : `1px solid ${alpha(C.dark, 0.06)}` }}>
      <span style={{ color: C.gray, fontSize: '13px' }}>{label}</span>
      <span style={{ color: C.dark, fontSize: '14px', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

/* ── Crea Bottiglia Sheet ─────────────────────────────────────────────────── */
interface CreaBottigliaForm {
  name: string
  barcode: string
  list_price: string
  costo_produzione: string
  producer: string
  image_url: string
  cantina: string
  annata: string
  formato: string
  gradazione_alcolica: string
  uve: string
  denominazione: string
  tipologia: string
  regione: string
  nazione: string
  quantita_massima: string
}

const FORM_DEFAULTS: CreaBottigliaForm = {
  name: 'Barolo DOCG 2019',
  barcode: '8001234567890',
  list_price: '30',
  costo_produzione: '18',
  producer: 'Cantina Rossi',
  image_url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=200&h=300&fit=crop&auto=format',
  cantina: 'Cantina Rossi',
  annata: '2019',
  formato: '0,75 L',
  gradazione_alcolica: '14%',
  uve: 'Nebbiolo',
  denominazione: 'Barolo DOCG',
  tipologia: 'Rosso',
  regione: 'Piemonte',
  nazione: 'Italia',
  quantita_massima: '12',
}

function CreaBottigliaSheet({ onClose, onCreata }: { onClose: () => void; onCreata: (w: WineRich) => void }) {
  const [form, setForm] = useState<CreaBottigliaForm>(FORM_DEFAULTS)
  const [errors, setErrors] = useState<Partial<Record<keyof CreaBottigliaForm, string>>>({})

  const set = (k: keyof CreaBottigliaForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function validate() {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = 'Campo obbligatorio'
    if (!form.producer.trim()) errs.producer = 'Campo obbligatorio'
    if (!form.annata || isNaN(Number(form.annata))) errs.annata = 'Anno non valido'
    if (!form.list_price || isNaN(Number(form.list_price))) errs.list_price = 'Valore non valido'
    if (!form.denominazione.trim()) errs.denominazione = 'Campo obbligatorio'
    if (!form.uve.trim()) errs.uve = 'Campo obbligatorio'
    if (!form.regione.trim()) errs.regione = 'Campo obbligatorio'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const wine: WineRich = {
      id: `custom-${Date.now()}`,
      nome: form.name.trim(),
      annata: Number(form.annata),
      denominazione: form.denominazione.trim(),
      prezzo: Number(form.list_price),
      produttore: form.producer.trim(),
      regione: form.regione.trim(),
      vitigno: form.uve.trim(),
      corpo: 'Pieno',
      abbinamenti: [],
      biologico: false,
      immagine: form.image_url.trim() || undefined,
    }
    onCreata(wine)
  }

  const fieldStyle = (err?: string): React.CSSProperties => ({
    width: '100%',
    backgroundColor: alpha(C.dark, 0.04),
    border: `1.5px solid ${err ? '#e53e3e' : alpha(C.dark, 0.12)}`,
    borderRadius: '10px',
    padding: '11px 14px',
    color: C.dark,
    fontSize: '14px',
    outline: 'none',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: alpha(C.dark, 0.5),
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '5px',
  }

  const sectionTitle = (Icona: React.ComponentType<Icon.IconProps>, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', marginTop: '4px' }}>
      <Icona size={16} />
      <p style={{ fontSize: '12px', fontWeight: 700, color: alpha(C.dark, 0.4), textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
    </div>
  )

  return (
    <M.Overlay onClose={onClose} kind="sheet" z={400} veil={0.6} panelStyle={{
      maxWidth: '640px',
      backgroundColor: C.bg,
      borderRadius: '24px 24px 0 0',
      maxHeight: '92vh',
      display: 'flex', flexDirection: 'column',
    }}>
        {/* Handle + header */}
        <div style={{ flexShrink: 0, padding: '12px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15) }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div>
              <h3 style={{ color: C.dark, fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>Crea Bottiglia</h3>
              <p style={{ color: C.gray, fontSize: '13px', marginTop: '3px' }}>Aggiungi un nuovo vino al catalogo</p>
            </div>
            <M.IconButton onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '22px', lineHeight: 1, padding: '4px', marginTop: '-2px' }}>✕</M.IconButton>
          </div>
          {/* SKU auto row */}
          <div style={{ backgroundColor: alpha(C.ocra, 0.1), borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', marginTop: '8px' }}>
            <Icon.Tag size={16} />
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: C.olive, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SKU</p>
              <p style={{ color: C.olive, fontSize: '12px', fontWeight: 500 }}>Automatizzato da noi alla creazione</p>
            </div>
          </div>
        </div>

        {/* Scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>

          {/* Informazioni principali */}
          <div style={{ backgroundColor: C.white, borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {sectionTitle(Icon.Bottiglia, 'Informazioni principali')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input style={fieldStyle(errors.name)} value={form.name} onChange={set('name')} placeholder="es. Barolo DOCG 2019" />
                {errors.name && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.name}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Prezzo di listino (€) *</label>
                  <input type="number" style={fieldStyle(errors.list_price)} value={form.list_price} onChange={set('list_price')} placeholder="30.00" />
                  {errors.list_price && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.list_price}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Costo di produzione (€)</label>
                  <input type="number" style={fieldStyle()} value={form.costo_produzione} onChange={set('costo_produzione')} placeholder="18.00" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Produttore *</label>
                <input style={fieldStyle(errors.producer)} value={form.producer} onChange={set('producer')} placeholder="es. Cantina Rossi" />
                {errors.producer && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.producer}</p>}
              </div>
              <div>
                <label style={labelStyle}>Barcode</label>
                <input style={fieldStyle()} value={form.barcode} onChange={set('barcode')} placeholder="es. 8001234567890" />
              </div>
              <div>
                <label style={labelStyle}>URL Immagine</label>
                <input style={fieldStyle()} value={form.image_url} onChange={set('image_url')} placeholder="https://cdn.example/vino.jpg" />
              </div>
            </div>
          </div>

          {/* Attributi vino */}
          <div style={{ backgroundColor: C.white, borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {sectionTitle(Icon.Uva, 'Attributi del vino')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Annata *</label>
                  <input type="number" style={fieldStyle(errors.annata)} value={form.annata} onChange={set('annata')} placeholder="2019" />
                  {errors.annata && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.annata}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Formato</label>
                  <input style={fieldStyle()} value={form.formato} onChange={set('formato')} placeholder="0,75 L" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Denominazione *</label>
                  <input style={fieldStyle(errors.denominazione)} value={form.denominazione} onChange={set('denominazione')} placeholder="es. Barolo DOCG" />
                  {errors.denominazione && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.denominazione}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Tipologia</label>
                  <select style={{ ...fieldStyle(), appearance: 'none' }} value={form.tipologia} onChange={set('tipologia')}>
                    {['Rosso', 'Bianco', 'Rosato', 'Spumante', 'Passito', 'Dolce'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Uve (vitigno) *</label>
                <input style={fieldStyle(errors.uve)} value={form.uve} onChange={set('uve')} placeholder="es. Nebbiolo" />
                {errors.uve && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.uve}</p>}
              </div>
              <div>
                <label style={labelStyle}>Cantina</label>
                <input style={fieldStyle()} value={form.cantina} onChange={set('cantina')} placeholder="es. Cantina Rossi" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Gradazione alcolica</label>
                  <input style={fieldStyle()} value={form.gradazione_alcolica} onChange={set('gradazione_alcolica')} placeholder="14%" />
                </div>
                <div>
                  <label style={labelStyle}>Qtà massima</label>
                  <input type="number" style={fieldStyle()} value={form.quantita_massima} onChange={set('quantita_massima')} placeholder="12" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Regione *</label>
                  <input style={fieldStyle(errors.regione)} value={form.regione} onChange={set('regione')} placeholder="es. Piemonte" />
                  {errors.regione && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{errors.regione}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Nazione</label>
                  <input style={fieldStyle()} value={form.nazione} onChange={set('nazione')} placeholder="es. Italia" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div style={{ flexShrink: 0, padding: '12px 20px 36px', borderTop: `1px solid ${alpha(C.dark, 0.07)}`, display: 'flex', gap: '10px' }}>
          <M.Button
            onClick={onClose}
            style={{ flex: '0 0 auto', padding: '0 20px', height: '52px', backgroundColor: 'transparent', color: C.gray, border: `1.5px solid ${alpha(C.dark, 0.12)}`, borderRadius: '14px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
          >
            Annulla
          </M.Button>
          <M.Button
            onClick={handleSubmit}
            style={{ flex: 1, height: '52px', backgroundColor: C.dark, color: C.bg, border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Crea bottiglia
          </M.Button>
        </div>
    </M.Overlay>
  )
}
