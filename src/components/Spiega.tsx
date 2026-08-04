import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { C, alpha } from '../colors'
import { COMMISSIONE_PCT, QUOTA_PCT } from '../economia'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'

/**
 * Spiegazione di una voce economica.
 *
 * Un'unica sorgente per *cosa vuol dire* e *come si calcola* ogni numero che
 * compare nell'app: se domani la formula cambia, si corregge qui e cambia
 * ovunque. Le schermate non scrivono testi propri, scelgono una chiave.
 *
 * Comportamento, uguale per tutte le voci:
 *  - dove c'è il mouse, passandoci sopra compare un tooltip
 *  - dove non c'è (touch), l'iconcina ⓘ si tocca e apre la stessa spiegazione
 *    in un pannello dal basso, dove c'è spazio per leggerla
 *  - dentro a un foglio o a un modale, sempre a clic e sempre in un pannello:
 *    un tooltip che scompare al primo scorrimento del pannello sotto, dentro
 *    una superficie che si scorre, non si riesce a leggere
 *
 * Uso:
 *   <Spiega k="listino">A listino</Spiega>          // etichetta + ⓘ
 *   <Spiega k="scontoPct" calcolo="(1 − 18 ÷ 24) × 100 = 25%" />   // solo ⓘ
 */

type Voce = {
  titolo: string
  /** Cosa rappresenta il numero, detto come lo diresti a voce. */
  cosa: string
  /** L'operazione, e basta: "a × b". Niente parentesi, niente frasi — il
   *  contorno va in `nota`, così la formula resta leggibile a colpo d'occhio.
   *  Assente quando il numero non si calcola ma lo scrive l'utente. */
  formula?: string
  /** Il contorno della formula: cosa si somma, da dove esce un termine. */
  nota?: string
}

const VOCI = {
  /* ── Prezzi ────────────────────────────────────────────────────────────── */
  listino: {
    titolo: 'Prezzo di listino',
    cosa: 'Il prezzo di una bottiglia quando la vendi normalmente, senza sconti: quello scritto sul tuo listino ufficiale. Da qui parte tutto il resto, perché lo sconto del gruppo si calcola su questo numero.',
    nota: 'Non si calcola: è il prezzo che hai messo tu nella scheda del vino.',
  },
  scontatoGda: {
    titolo: 'Prezzo scontato GDA',
    cosa: "Quanto paga una bottiglia chi compra dentro al gruppo d'acquisto. È il prezzo che vede il cliente al posto di quello di listino.",
    nota: 'Lo decidi tu, di solito più basso del listino. Se lasci il campo vuoto, vale il prezzo di listino.',
  },
  scontoPct: {
    titolo: 'Sconto applicato',
    cosa: "Di quanto scende il prezzo entrando nel gruppo d'acquisto. Un −20% vuol dire che chi compra spende un quinto in meno del listino.",
    formula: 'risparmio per bottiglia ÷ prezzo di listino × 100',
    nota: 'Il risparmio per bottiglia è il prezzo di listino meno il prezzo scontato.',
  },
  totaleRiga: {
    titolo: 'Totale della riga',
    cosa: 'Quanto pesa questo vino sul prezzo della cassa: tante bottiglie, tante volte il suo prezzo.',
    formula: 'prezzo di una bottiglia × numero di bottiglie',
    nota: "Si usa il prezzo scontato se l'hai messo, altrimenti quello di listino.",
  },
  totaleListino: {
    titolo: 'Totale a listino',
    cosa: 'Quanto costerebbe la stessa cassa ai prezzi normali, senza lo sconto del gruppo. Serve da confronto: è il prezzo da battere.',
    formula: 'prezzo di listino × bottiglie',
    nota: 'Si fa per ogni vino della cassa, poi si sommano i risultati.',
  },
  totaleScontato: {
    titolo: 'Totale GDA scontato',
    cosa: "Il prezzo vero della cassa per chi compra nel gruppo d'acquisto.",
    formula: 'prezzo scontato × bottiglie',
    nota: 'Si fa per ogni vino della cassa, poi si sommano i risultati.',
  },
  risparmio: {
    titolo: 'Risparmio del gruppo',
    cosa: "Quanti soldi in meno spende chi compra nel gruppo invece che a listino. È il motivo per cui il gruppo d'acquisto conviene.",
    formula: 'totale a listino − totale GDA scontato',
  },

  /* ── Costi e margini ───────────────────────────────────────────────────── */
  costoBottiglia: {
    titolo: 'Costo / bottiglia',
    cosa: 'Quanto ti costa una bottiglia fra uva, lavorazione, vetro, tappo ed etichetta. È un dato tuo: non lo vede chi compra, serve qui dentro per calcolare quanto ci guadagni.',
    nota: 'Non si calcola: lo scrivi tu.',
  },
  acquistoSiply: {
    titolo: 'Prezzo acquisto Siply',
    cosa: 'Il prezzo a cui vendi una bottiglia a Siply: quanto chiedi tu per ognuna, e sta in mezzo fra il tuo costo di produzione e il prezzo che paga chi compra.',
    nota: 'Non si calcola: lo proponi tu e lo confermiamo quando approviamo il GDA.',
  },
  incassoBottiglia: {
    titolo: 'Quanto incassi tu',
    cosa: `Quello che ti arriva davvero in tasca per ogni bottiglia venduta nel gruppo: il prezzo che hai chiesto a Siply, meno la commissione del ${COMMISSIONE_PCT}.`,
    formula: `prezzo acquisto Siply × ${QUOTA_PCT}`,
    nota: `Il ${QUOTA_PCT} è quello che resta una volta tolto il ${COMMISSIONE_PCT} di commissione.`,
  },
  commissioneSiply: {
    titolo: 'Commissione Siply',
    cosa: `Quello che tiene Siply per il servizio: una quota fissa del ${COMMISSIONE_PCT} su quanto fatturi. Non è la differenza fra due prezzi decisi a mano — è una percentuale su quello che guadagni, uguale per tutti.`,
    formula: `prezzo acquisto Siply × ${COMMISSIONE_PCT}`,
    nota: "Si paga solo a obiettivo raggiunto: è allora che Siply compra le bottiglie. Se il gruppo non ci arriva non compra nessuno e non deve niente nessuno.",
  },
  margineListino: {
    titolo: 'Margine a listino',
    cosa: 'Quanto ti resta in tasca vendendo al prezzo pieno, tolto quello che hai speso per produrre.',
    formula: 'prezzo di listino − costo di produzione',
  },
  margineGda: {
    titolo: 'Margine GDA',
    cosa: 'Quanto ti resta in tasca vendendo dentro al gruppo: quello che incassi meno quello che hai speso per produrre. È il numero da confrontare con il margine a listino per capire se il gruppo ti conviene.',
    formula: 'quanto incassi − costo di produzione',
  },

  /* ── Riepiloghi ────────────────────────────────────────────────────────── */
  ricavoListino: {
    titolo: 'Ricavo a listino',
    cosa: 'Quanto incasseresti vendendo tutta la cassa ai prezzi di listino, senza sconti.',
    formula: 'prezzo di listino × bottiglie',
    nota: 'Si fa per ogni vino, poi si somma.',
  },
  ricavoScontato: {
    titolo: 'Ricavo GDA scontato',
    cosa: "Quanto vale la cassa ai prezzi del gruppo d'acquisto: è quello che pagherà chi compra.",
    formula: 'prezzo scontato × bottiglie',
    nota: 'Si fa per ogni vino, poi si somma.',
  },
  costoTotale: {
    titolo: 'Costo totale',
    cosa: 'Quanto ti costa produrre tutte le bottiglie della cassa.',
    formula: 'costo per bottiglia × bottiglie',
    nota: 'Si fa per ogni vino, poi si somma.',
  },
  totaleGda: {
    titolo: 'Totale GDA',
    cosa: "Quanto vale, ai prezzi di listino, tutto quello che hai messo in questo gruppo d'acquisto: tutte le casse insieme.",
    formula: 'totale prima cassa + totale seconda cassa + …',
  },
  acquistoSiplyTot: {
    titolo: 'Prezzo acquisto Siply (totale)',
    cosa: 'Quanto chiedi a Siply per tutta la cassa, se si vende per intero.',
    formula: 'prezzo acquisto Siply × bottiglie',
    nota: 'Si fa per ogni vino, poi si somma.',
  },
  incassoCassa: {
    titolo: 'Quanto incassi tu (cassa intera)',
    cosa: 'Quanto ti resta di questa cassa, se si vende tutta, tolta la commissione Siply.',
    formula: `prezzo acquisto Siply (totale) × ${QUOTA_PCT}`,
  },

  /* ── Stima a obiettivo ─────────────────────────────────────────────────── */
  obiettivi: {
    titolo: 'Obiettivi di vendita',
    cosa: "Quante bottiglie punti a vendere in tutto il gruppo. Puoi fissarne più di uno: il gruppo può fermarsi al primo scaglione o tirare fino all'ultimo, e per ognuno vedi quanto porti a casa.",
    nota: "Non si calcola: li decidi tu. Sono una stima, non un impegno — servono a farsi due conti prima di partire.",
  },
  valoreGda: {
    titolo: 'Valore totale GDA',
    cosa: "Quanto spende chi compra arrivando a questo obiettivo: è il giro d'affari del gruppo. Attenzione, non è il tuo guadagno — tu incassi il prezzo che hai chiesto a Siply, che è più basso.",
    formula: 'stima del prezzo a bottiglia × bottiglie obiettivo',
    nota: "La stima è la media dei prezzi scontati di tutte le bottiglie che hai messo nelle casse, contate una per una: un vino che c'è in tre bottiglie pesa il triplo di uno che c'è in una sola.",
  },
  ricavoProduttore: {
    titolo: 'Quanto incassi tu',
    cosa: "Quanto ti arriva se il gruppo raggiunge questo obiettivo: quello che hai chiesto per quelle bottiglie, meno la commissione di Siply.",
    formula: `stima del prezzo acquisto Siply × bottiglie obiettivo × ${QUOTA_PCT}`,
    nota: 'La stima è la media dei prezzi che hai chiesto, contando le bottiglie una per una. Vale finché le casse si vendono più o meno nelle proporzioni in cui le hai composte.',
  },
  margineNetto: {
    titolo: 'Margine netto',
    cosa: "Il tuo guadagno vero a obiettivo raggiunto: quello che incassi meno quello che ti è costato produrre quelle bottiglie.",
    formula: 'quanto incassi − costo di produzione totale',
    nota: 'Il costo di produzione è la media dei costi che hai scritto, moltiplicata per le bottiglie obiettivo.',
  },
} satisfies Record<string, Voce>

export type SpiegaKey = keyof typeof VOCI

/* ── Rilevamento del tipo di puntatore ───────────────────────────────────── */

/** `true` dove l'hover non esiste (telefoni, tablet): lì serve il tocco. */
function useTouch() {
  const [touch, setTouch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}

/* ── Icona ───────────────────────────────────────────────────────────────── */

/** Misura in `em`: l'icona vale quanto il testo che accompagna, a qualunque
 *  corpo, senza doverlo ripetere a ogni chiamata. */
function InfoIcon() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="9.3" />
      <path d="M12 11v5.4" />
      <path d="M12 7.6v.1" />
    </svg>
  )
}

/* ── Formule ─────────────────────────────────────────────────────────────── */

const OPERATORI = new Set(['×', '÷', '+', '−', '='])

/**
 * Spezza una formula nei suoi pezzi: i termini da una parte, i segni dall'altra.
 * Scritta di fila, una formula lunga va a capo dove capita — anche in mezzo a
 * "prezzo scontato" — e diventa illeggibile. A pezzi invece si può andare a
 * capo solo *fra* un termine e l'altro.
 *
 * Un segno conta come operazione solo se sta da solo fra due spazi: così
 * "+€158.00" resta un valore col segno e non diventa una somma.
 */
function pezzi(testo: string) {
  const out: { op: boolean; testo: string }[] = []
  for (const tok of testo.split(' ')) {
    if (OPERATORI.has(tok)) { out.push({ op: true, testo: tok }); continue }
    const ultimo = out[out.length - 1]
    if (ultimo && !ultimo.op) ultimo.testo += ' ' + tok
    else out.push({ op: false, testo: tok })
  }
  return out
}

/** La formula come si scriverebbe alla lavagna: termini in blocchi, segni in
 *  mezzo, e il risultato dopo l'uguale messo in evidenza.
 *  Ogni segno viaggia insieme al termine che lo segue: da solo finirebbe in
 *  fondo a una riga, staccato da quello che sta operando. */
function Formula({ testo, chiaro, accento }: { testo: string; chiaro?: boolean; accento?: boolean }) {
  const parti = pezzi(testo)

  // raggruppo in [segno?, termine], così è il gruppo intero ad andare a capo
  const gruppi: { segno?: string; termine: string; risultato: boolean }[] = []
  let segno: string | undefined
  let dopoUguale = false
  for (const p of parti) {
    if (p.op) {
      if (p.testo === '=') dopoUguale = true
      segno = p.testo
      continue
    }
    gruppi.push({ segno, termine: p.testo, risultato: dopoUguale })
    segno = undefined
  }

  const base = accento ? C.ocra : (chiaro ? C.dark : C.bg)
  const fondo = accento
    ? alpha(C.ocra, chiaro ? 0.16 : 0.14)
    : (chiaro ? alpha(C.dark, 0.07) : alpha(C.white, 0.09))
  const colSegno = accento ? C.ocra : (chiaro ? alpha(C.dark, 0.6) : alpha(C.silver, 0.8))

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 4px' }}>
      {gruppi.map((g, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          {/* Il × di Formiga è disegnato all'altezza delle minuscole: a corpo
              testo sembrerebbe una x sperduta, quindi va un po' più grande. */}
          {g.segno && (
            <span style={{ color: colSegno, fontSize: '20px', fontWeight: 700, lineHeight: 1, padding: '0 1px' }}>
              {g.segno}
            </span>
          )}
          <span
            style={{
              color: base,
              // il risultato è contornato invece che pieno: si stacca dagli
              // ingredienti senza urlare
              backgroundColor: g.risultato ? 'transparent' : fondo,
              border: g.risultato ? `1.5px solid ${accento ? alpha(C.ocra, 0.55) : fondo}` : 'none',
              borderRadius: '8px',
              padding: g.risultato ? '4px 10px' : '5.5px 10px',
              fontSize: '13.5px',
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {g.termine}
          </span>
        </span>
      ))}
    </div>
  )
}

/* ── Contenuto, identico su tooltip e pannello ───────────────────────────── */

function Corpo({ v, calcolo, chiaro }: { v: Voce; calcolo?: string; chiaro?: boolean }) {
  // Con una cassa sola il conto diventa "€144 = €144", che non spiega niente:
  // si mostra solo se a sinistra dell'uguale c'è davvero un'operazione.
  const conto = calcolo && /[×÷+−-]/.test(calcolo.split('=')[0]) ? calcolo : undefined

  const testo = chiaro ? alpha(C.dark, 0.75) : alpha(C.silver, 0.85)
  const etich = chiaro ? alpha(C.dark, 0.45) : alpha(C.silver, 0.55)
  const forte = chiaro ? C.dark : C.bg

  const Titoletto = ({ children }: { children: ReactNode }) => (
    <p style={{
      color: etich, fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em', margin: '14px 0 7px',
    }}>
      {children}
    </p>
  )

  return (
    <>
      <p style={{ color: forte, fontSize: chiaro ? '18px' : '15.5px', fontWeight: 700, marginBottom: '7px' }}>
        {v.titolo}
      </p>
      <p style={{ color: testo, fontSize: chiaro ? '14.5px' : '14px', lineHeight: 1.6 }}>{v.cosa}</p>

      <Titoletto>Come si calcola</Titoletto>
      {v.formula
        ? <Formula testo={v.formula} chiaro={chiaro} />
        : <p style={{ color: forte, fontSize: chiaro ? '14px' : '13.5px', lineHeight: 1.55, fontWeight: 600 }}>{v.nota}</p>}

      {v.formula && v.nota && (
        <p style={{ color: etich, fontSize: chiaro ? '13px' : '12.5px', lineHeight: 1.5, marginTop: '8px' }}>
          {v.nota}
        </p>
      )}

      {conto && (
        <>
          <Titoletto>Con i tuoi numeri</Titoletto>
          <Formula testo={conto} chiaro={chiaro} accento />
        </>
      )}
    </>
  )
}

/* ── Componente ──────────────────────────────────────────────────────────── */

export default function Spiega({ k, calcolo, style, children }: {
  k: SpiegaKey
  /** Il conto con i numeri veri di questa riga, es. "€24 × 6 = €144". */
  calcolo?: string
  /** Per allineare il gruppo etichetta+ⓘ dentro la riga che lo ospita. */
  style?: CSSProperties
  /** L'etichetta da rendere spiegabile. Senza, resta la sola ⓘ. */
  children?: ReactNode
}) {
  const v = VOCI[k]
  const touch = useTouch()
  /** Se si è dentro a un pannello, la spiegazione va disegnata sopra al suo
   *  velo: sennò è lì ma non la vede nessuno. */
  const livello = M.useLivello()
  const sopra = Math.max(400, livello + 60)
  /** Dentro a un pannello e col dito: niente hover, si apre a clic. */
  const aClic = touch || livello > 0
  const ref = useRef<HTMLSpanElement>(null)
  /** Bordi dell'etichetta a cui il tooltip si aggancia. */
  const [tip, setTip] = useState<{ left: number; su: number; giu: number } | null>(null)
  /** Posizione definitiva, decisa dopo averlo misurato davvero. */
  const [pos, setPos] = useState<{ top: number; sotto: boolean } | null>(null)
  const [sheet, setSheet] = useState(false)
  const attesa = useRef<number | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  /** Largo abbastanza da tenere una formula su una riga o due: stretto, i
   *  termini andavano a capo in mezzo e non si capiva più dove finivano. */
  const LARG = 344
  const MARG = 8

  const apriTip = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const largh = Math.min(LARG, window.innerWidth - 24)
    const left = Math.min(
      Math.max(10, r.left + r.width / 2 - largh / 2),
      window.innerWidth - largh - 10,
    )
    setPos(null)
    setTip({ left, su: r.top, giu: r.bottom })
  }

  /**
   * Dove sta il tooltip lo si può decidere solo dopo averlo misurato: le voci
   * vanno da poche righe a mezza schermata, e a stima una spiegazione lunga
   * finiva fuori dal bordo alto. Il calcolo sta in un layout effect, quindi
   * avviene prima che il browser disegni: non si vede nessuno spostamento.
   */
  useLayoutEffect(() => {
    if (!tip) return
    const el = tipRef.current
    if (!el) return
    const h = el.offsetHeight
    const vh = window.innerHeight
    const sopra = tip.su - MARG - h        // appoggiato sopra all'etichetta
    const sotto = tip.giu + MARG           // appoggiato sotto

    // Sopra è la posizione preferita: non copre il valore a cui si riferisce.
    // Se non ci sta va sotto; se non ci sta da nessuna delle due parti, si
    // appoggia al bordo più capiente, che è meglio di uscire dallo schermo.
    const top = sopra >= MARG
      ? sopra
      : sotto + h <= vh - MARG
        ? sotto
        : Math.max(MARG, Math.min(vh - h - MARG, tip.su > vh - tip.giu ? sopra : sotto))
    setPos({ top, sotto: top > tip.su })
  }, [tip])

  /** Attesa prima che il tooltip compaia: senza, passando il mouse sopra a una
   *  riga di prezzi si aprirebbero e chiuderebbero riquadri a raffica. Chi
   *  vuole leggere si ferma; chi sta solo attraversando non vede niente. */
  const RITARDO = 750

  const programma = () => {
    annulla()
    attesa.current = window.setTimeout(apriTip, RITARDO)
  }
  const annulla = () => {
    if (attesa.current !== null) {
      clearTimeout(attesa.current)
      attesa.current = null
    }
  }
  const chiudi = () => { annulla(); setTip(null) }

  // Uscendo dalla pagina o smontando il componente il timer resterebbe appeso.
  useEffect(() => annulla, [])

  // Scorrendo o ridimensionando il tooltip resterebbe appeso al vuoto: si chiude.
  useEffect(() => {
    if (!tip) return
    const via = () => setTip(null)
    window.addEventListener('scroll', via, true)
    window.addEventListener('resize', via)
    return () => {
      window.removeEventListener('scroll', via, true)
      window.removeEventListener('resize', via)
    }
  }, [tip])

  /** Clic sull'icona: è una richiesta esplicita, quindi niente attesa. */
  const attiva = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    annulla()
    if (aClic) setSheet(true)
    else if (tip) setTip(null)
    else apriTip()
  }

  return (
    <>
      <span
        ref={ref}
        className="siply-spiega"
        // dove si apre a clic, si prende tutta l'etichetta e non la sola
        // iconcina: col dito è la differenza fra centrare e non centrare
        onClick={aClic ? attiva : undefined}
        style={aClic ? { cursor: 'pointer', ...style } : style}
        onMouseEnter={aClic ? undefined : programma}
        onMouseLeave={aClic ? undefined : chiudi}
      >
        {children}
        <M.IconButton
          type="button"
          className="siply-spiega-ico"
          aria-label={`Cosa vuol dire "${v.titolo}"`}
          onClick={attiva}
          onFocus={aClic ? undefined : apriTip}
          onBlur={aClic ? undefined : chiudi}
        >
          <InfoIcon />
        </M.IconButton>
      </span>

      {/* Fuori dall'albero della card: dentro verrebbe tagliato dagli overflow
          e dai bordi arrotondati. */}
      {createPortal(
        <AnimatePresence>
          {tip && (
            <motion.div
              key="tip"
              ref={tipRef}
              role="tooltip"
              variants={M.tipVariants(pos?.sotto ?? true)}
              initial="initial" animate="animate" exit="exit"
              style={{
                position: 'fixed',
                left: `${tip.left}px`,
                // finché non è misurato sta sotto all'etichetta; il layout
                // effect lo sistema prima che il browser disegni
                top: `${pos ? pos.top : tip.giu + MARG}px`,
                width: `${Math.min(LARG, window.innerWidth - 24)}px`,
                zIndex: sopra,
                pointerEvents: 'none',
                transformOrigin: pos?.sotto === false ? 'bottom center' : 'top center',
                backgroundColor: C.dark,
                borderRadius: '14px',
                padding: '14px 16px',
                boxShadow: '0 10px 34px rgba(0,0,0,0.3)',
                border: `1px solid ${alpha(C.white, 0.08)}`,
              }}
            >
              <Corpo v={v} calcolo={calcolo} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {sheet && (
            <M.Overlay
              // col dito sale dal basso, dove arriva il pollice; col mouse si
              // apre al centro, che con un puntatore è dove si sta guardando
              kind={touch ? 'sheet' : 'modal'}
              z={sopra}
              veil={livello > 0 ? 0.4 : 0.55}
              onClose={() => setSheet(false)}
              panelStyle={{
                maxWidth: '520px',
                width: touch ? undefined : '100%',
                backgroundColor: C.white,
                borderRadius: touch ? '24px 24px 0 0' : '22px',
                padding: '10px 22px 22px',
                maxHeight: '82vh',
                overflowY: 'auto',
                boxShadow: touch ? undefined : '0 24px 60px rgba(0,0,0,0.35)',
              }}
            >
              {touch
                ? <div style={{ width: '38px', height: '4px', borderRadius: '2px', backgroundColor: alpha(C.dark, 0.15), margin: '0 auto 16px' }} />
                : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 -8px 2px 0' }}>
                    <M.IconButton
                      onClick={() => setSheet(false)}
                      aria-label="Chiudi"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray, fontSize: '19px', lineHeight: 1, padding: '4px 8px' }}
                    >
                      ✕
                    </M.IconButton>
                  </div>
                )}
              <Corpo v={v} calcolo={calcolo} chiaro />
              <M.Button
                onClick={() => setSheet(false)}
                style={{
                  width: '100%', marginTop: '20px', padding: '14px',
                  backgroundColor: alpha(C.dark, 0.06), color: C.dark,
                  border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Ho capito
              </M.Button>
            </M.Overlay>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
