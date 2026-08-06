import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { C, alpha } from '../colors'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'

/* ──────────────────────────────────────────────────────────────────────────
   Campo indirizzo con autocompletamento.

   Un indirizzo scritto a mano arriva a noi in venti forme diverse: "Montalcino",
   "Montalcino (SI)", "via delle Cantine 12 Montalcino Siena". Con i suggerimenti
   di Google chi compila sceglie invece di scrivere, e quello che arriva è sempre
   un indirizzo vero, scritto allo stesso modo.

   Gli indirizzi non stanno dentro all'app e non ci possono stare: sono
   milioni, cambiano di continuo, e le condizioni d'uso di Google vietano di
   tenerne una copia. Si chiedono quindi a chi li ha, mentre si scrive. Tre
   sorgenti, in ordine, e la prima che risponde vince:

     1. Google Places, se c'è una chiave. Mettila in un `.env` alla radice come
        `VITE_GOOGLE_MAPS_API_KEY=...`, con "Places API (New)" attiva sul
        progetto Google Cloud. È la sorgente migliore, e si paga a chiamata.
     2. Photon, il motore di ricerca di OpenStreetMap: indirizzi veri di tutta
        Europa, nessuna chiave, gratuito. È quello che risponde adesso sul sito
        pubblicato, ed è nato apposta per i campi che suggeriscono mentre
        scrivi. Risponde in mezzo secondo scarso invece che all'istante, e per
        questo mentre cerca il menù mostra che sta cercando. Per volumi seri
        conviene ospitarselo o passare a Google.
     3. Una manciata di indirizzi scritti qui sotto, buoni solo se la rete non
        risponde: senza, il campo resterebbe muto proprio mentre lo si prova.

   Chi ha risposto sta sempre scritto in fondo al menù. Non è cortesia: Google
   e OpenStreetMap lo chiedono, e chi compila ha diritto di sapere a chi sta
   dando le lettere che batte.
   ────────────────────────────────────────────────────────────────────────── */

const CHIAVE = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

/** Chi ha risposto: cambia la riga di coda del menù, che non deve mai mentire. */
type Sorgente = 'google' | 'osm' | 'esempi'

interface Suggerimento {
  id: string
  /** La riga forte: la via, o il nome del posto. */
  principale: string
  /** La riga sotto: comune, provincia, regione. */
  secondario?: string
  /** Quello che finisce nel campo quando si sceglie. */
  testo: string
}

/* ── Google Places ───────────────────────────────────────────────────────── */

/** Una sola volta per pagina: la seconda chiamata riusa la stessa promessa. */
let caricamento: Promise<unknown> | null = null

function caricaGoogle(): Promise<unknown> {
  if (!CHIAVE) return Promise.reject(new Error('nessuna chiave'))
  if (caricamento) return caricamento
  caricamento = new Promise((risolvi, rifiuta) => {
    const g = (window as any).google
    if (g?.maps?.places) { risolvi(g); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CHIAVE)}&libraries=places&language=it&region=IT&loading=async`
    s.async = true
    s.onload = () => risolvi((window as any).google)
    s.onerror = () => rifiuta(new Error('Google Maps non raggiungibile'))
    document.head.appendChild(s)
  })
  return caricamento
}

/**
 * Chiede i suggerimenti a Google. Prima con l'API nuova
 * (`AutocompleteSuggestion`), che è quella supportata; se la libreria caricata
 * è più vecchia si ripiega su `AutocompleteService`, che fa la stessa cosa con
 * la forma di prima. Nessun paese imposto: i produttori europei esistono, e
 * l'elenco lo restringe già quello che si sta scrivendo.
 */
async function chiediAGoogle(q: string, token: unknown): Promise<Suggerimento[]> {
  const g = (await caricaGoogle()) as any
  const places = g?.maps?.places
  if (!places) return []

  if (places.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: q,
      language: 'it',
      region: 'it',
      sessionToken: token,
    })
    return (suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.placeId ?? p.text?.toString() ?? '',
        principale: p.mainText?.toString() ?? p.text?.toString() ?? '',
        secondario: p.secondaryText?.toString(),
        testo: p.text?.toString() ?? '',
      }))
  }

  if (places.AutocompleteService) {
    const servizio = new places.AutocompleteService()
    const previsioni: any[] = await new Promise(risolvi => {
      servizio.getPlacePredictions(
        { input: q, sessionToken: token },
        (r: any[] | null) => risolvi(r ?? []),
      )
    })
    return previsioni.map(p => ({
      id: p.place_id,
      principale: p.structured_formatting?.main_text ?? p.description,
      secondario: p.structured_formatting?.secondary_text,
      testo: p.description,
    }))
  }

  return []
}

/* ── OpenStreetMap, senza chiave ─────────────────────────────────────────── */

/** Riquadro dell'Europa, da Capo San Vincenzo al Baltico e da Malta a Capo
 *  Nord. Photon cerca in tutto il mondo: senza recinto una "via Roma" tira su
 *  anche il Sudamerica, e nessuna cantina spedisce da lì. */
const EUROPA = '-25,33,45,72'

/** Le righe come le scrive Photon: via e civico sopra, dove sta sotto. Il
 *  paese si scrive solo se non è l'Italia — "Montalcino, Italia" è rumore,
 *  "Deidesheim, Deutschland" invece è l'informazione che serve. */
function daPhoton(f: any): Suggerimento | null {
  const p = f?.properties
  if (!p) return null
  const via = [p.street ?? p.name, p.housenumber].filter(Boolean).join(' ')
  const dove = [p.postcode, p.city ?? p.county, p.state, p.countrycode === 'IT' ? null : p.country]
    .filter(Boolean).join(', ')
  if (!via) return null
  return {
    id: `${p.osm_type ?? ''}${p.osm_id ?? via}`,
    principale: via,
    secondario: dove || undefined,
    testo: dove ? `${via}, ${dove}` : via,
  }
}

/* Niente `lang`: l'istanza pubblica accetta solo default, de, en e fr, e con
   una lingua che non conosce risponde 400. Il valore di default sono i nomi
   come stanno scritti sul posto — in Italia, in italiano. */
async function chiediAOsm(q: string, segnale: AbortSignal): Promise<Suggerimento[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=${EUROPA}`
  const r = await fetch(url, { signal: segnale })
  if (!r.ok) throw new Error(`Photon ha risposto ${r.status}`)
  const dati = await r.json()
  return ((dati?.features ?? []) as any[])
    .map(daPhoton)
    .filter((x): x is Suggerimento => x !== null)
    .slice(0, 6)
}

/* ── Ripiego a rete assente ──────────────────────────────────────────────── */

/** Indirizzi veri di zone vinicole, per quando non risponde nessuno. Sono
 *  pochi e si vede: il menù lo dice invece di far finta di niente. */
const ESEMPI: { via: string; luogo: string }[] = [
  { via: 'Via delle Cantine 12', luogo: 'Montalcino (SI) — Toscana' },
  { via: 'Via Chiantigiana 77', luogo: 'Greve in Chianti (FI) — Toscana' },
  { via: 'Via Bolgherese 4', luogo: 'Castagneto Carducci (LI) — Toscana' },
  { via: 'Via Roma 4', luogo: 'Barolo (CN) — Piemonte' },
  { via: 'Strada Gavi 21', luogo: 'Gavi (AL) — Piemonte' },
  { via: 'Corso Langhe 33', luogo: 'Alba (CN) — Piemonte' },
  { via: 'Via Valpolicella 8', luogo: 'Negrar di Valpolicella (VR) — Veneto' },
  { via: 'Via Cartizze 15', luogo: 'Valdobbiadene (TV) — Veneto' },
  { via: 'Via Soave 2', luogo: 'Soave (VR) — Veneto' },
  { via: 'Contrada Feudo 9', luogo: 'Randazzo (CT) — Sicilia' },
  { via: 'Via Etnea 140', luogo: 'Linguaglossa (CT) — Sicilia' },
  { via: 'SP 66 km 4', luogo: 'Manduria (TA) — Puglia' },
  { via: 'Via Salento 18', luogo: 'Copertino (LE) — Puglia' },
  { via: 'Via Adriatica 3', luogo: 'Ortona (CH) — Abruzzo' },
  { via: 'Via del Tratturo 21', luogo: 'Loreto Aprutino (PE) — Abruzzo' },
  { via: 'Via Nazionale 60', luogo: 'Montefalco (PG) — Umbria' },
  { via: 'Via del Trebbiano 5', luogo: 'Orvieto (TR) — Umbria' },
  { via: 'Via Franciacorta 44', luogo: 'Erbusco (BS) — Lombardia' },
  { via: 'Via Valtellina 7', luogo: 'Sondrio (SO) — Lombardia' },
  { via: 'Via Mazzini 11', luogo: 'Bolgheri (LI) — Toscana' },
  { via: 'Via San Michele 30', luogo: 'Appiano sulla Strada del Vino (BZ) — Alto Adige' },
  { via: 'Via Collio 19', luogo: 'Cormons (GO) — Friuli-Venezia Giulia' },
  { via: 'Via Vesuvio 6', luogo: 'Boscotrecase (NA) — Campania' },
  { via: 'Via Taurasi 25', luogo: 'Taurasi (AV) — Campania' },
  { via: 'Località Su Baroni 3', luogo: 'Serdiana (SU) — Sardegna' },
]

/** Senza accenti e senza maiuscole: chi cerca "montalcino" deve trovare
 *  "Montalcino", e chi scrive "citta" deve trovare "Città". */
const SEGNI = /[̀-ͯ]/g
const piatto = (s: string) => s.toLowerCase().normalize('NFD').replace(SEGNI, '')

function cercaNegliEsempi(q: string): Suggerimento[] {
  const parole = piatto(q).split(/\s+/).filter(Boolean)
  if (parole.length === 0) return []
  return ESEMPI
    .filter(e => {
      const testo = piatto(`${e.via} ${e.luogo}`)
      return parole.every(p => testo.includes(p))
    })
    .slice(0, 6)
    .map(e => ({ id: `${e.via}|${e.luogo}`, principale: e.via, secondario: e.luogo, testo: `${e.via}, ${e.luogo}` }))
}

/* ── Evidenziazione ──────────────────────────────────────────────────────── */

/** Il pezzo che corrisponde a quello che si è scritto va in grassetto: così si
 *  capisce a colpo d'occhio perché una riga è finita nell'elenco. */
function Evidenzia({ testo, query }: { testo: string; query: string }) {
  const parole = piatto(query).split(/\s+/).filter(p => p.length > 1)
  if (parole.length === 0) return <>{testo}</>

  const base = piatto(testo)
  const marcati = new Array<boolean>(testo.length).fill(false)
  for (const p of parole) {
    let da = base.indexOf(p)
    while (da !== -1) {
      for (let i = da; i < da + p.length; i++) marcati[i] = true
      da = base.indexOf(p, da + p.length)
    }
  }

  const pezzi: { testo: string; forte: boolean }[] = []
  for (let i = 0; i < testo.length; i++) {
    const ultimo = pezzi[pezzi.length - 1]
    if (ultimo && ultimo.forte === marcati[i]) ultimo.testo += testo[i]
    else pezzi.push({ testo: testo[i], forte: marcati[i] })
  }

  return (
    <>
      {pezzi.map((p, i) =>
        p.forte
          ? <strong key={i} style={{ color: C.magenta, fontWeight: 800 }}>{p.testo}</strong>
          : <span key={i}>{p.testo}</span>,
      )}
    </>
  )
}

/* ── Il segno che sta lavorando ──────────────────────────────────────────── */

/** Un cerchio che gira: mezzo secondo di attesa senza niente sullo schermo si
 *  legge come un campo che non funziona. */
function Giracchio() {
  return (
    <motion.svg
      width="15" height="15" viewBox="0 0 24 24" fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="9" stroke={alpha(C.dark, 0.12)} strokeWidth={3} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke={C.magenta} strokeWidth={3} strokeLinecap="round" />
    </motion.svg>
  )
}

/* ── Componente ──────────────────────────────────────────────────────────── */

export default function IndirizzoInput({ value, onChange, placeholder, style }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  const [voci, setVoci] = useState<Suggerimento[]>([])
  const [aperto, setAperto] = useState(false)
  const [attivo, setAttivo] = useState(-1)
  /** Chi ha risposto per ultimo: la coda del menù lo scrive. */
  const [sorgente, setSorgente] = useState<Sorgente>('esempi')
  /** Una richiesta è in volo. OpenStreetMap ci mette qualche decimo di secondo:
   *  senza dirlo, il campo sembrerebbe rotto proprio nell'attimo in cui sta
   *  lavorando, e si ricomincerebbe a scrivere sopra. */
  const [cercando, setCercando] = useState(false)
  const [riquadro, setRiquadro] = useState<{ left: number; top: number; width: number } | null>(null)

  const boxRef = useRef<HTMLDivElement>(null)
  const attesa = useRef<number | null>(null)
  /** Cresce a ogni ricerca: una risposta lenta di una richiesta vecchia non
   *  deve sovrascrivere i risultati di quella nuova. */
  const giro = useRef(0)
  /** Token di sessione di Google: tiene insieme le battute di uno stesso
   *  indirizzo, che è come Google conta (e fattura) una ricerca sola. */
  const token = useRef<unknown>(null)
  /** La chiamata in volo, per fermarla appena ne parte una più nuova. */
  const richiesta = useRef<AbortController | null>(null)
  const annullaRichiesta = () => {
    richiesta.current?.abort()
    richiesta.current = null
  }
  const listaId = useId()

  /** Il menù sta in un portale — dentro alla card lo taglierebbero i bordi
   *  arrotondati — quindi la posizione va misurata e tenuta aggiornata. */
  const misura = () => {
    const r = boxRef.current?.getBoundingClientRect()
    if (r) setRiquadro({ left: r.left, top: r.bottom + 6, width: r.width })
  }

  useEffect(() => {
    if (!aperto) return
    misura()
    const su = () => misura()
    window.addEventListener('scroll', su, true)
    window.addEventListener('resize', su)
    return () => {
      window.removeEventListener('scroll', su, true)
      window.removeEventListener('resize', su)
    }
  }, [aperto, voci.length])

  // Un clic fuori chiude: il menù è in un portale, quindi "fuori" va deciso
  // guardando sia il campo sia il menù stesso.
  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => {
      const t = e.target as Node
      if (boxRef.current?.contains(t)) return
      if ((t as HTMLElement).closest?.('.siply-suggerimenti')) return
      setAperto(false)
    }
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [aperto])

  useEffect(() => () => {
    if (attesa.current !== null) clearTimeout(attesa.current)
    richiesta.current?.abort()
  }, [])

  /**
   * Si cerca dopo una pausa di battitura: una richiesta per lettera sarebbe un
   * lampeggio continuo, e a Google si paga a chiamata.
   *
   * Le sorgenti si provano in fila e ci si ferma alla prima che risponde con
   * qualcosa. Se Google c'è ma non risponde — chiave scaduta, quota finita — si
   * scende a OpenStreetMap invece di lasciare il campo muto; e se non risponde
   * nemmeno quello restano gli esempi, che sono pochi ma esistono.
   */
  const cerca = (q: string) => {
    if (attesa.current !== null) clearTimeout(attesa.current)
    annullaRichiesta()
    if (q.trim().length < 3) { setVoci([]); setCercando(false); setAperto(false); return }
    const mio = ++giro.current
    attesa.current = window.setTimeout(async () => {
      const controllo = new AbortController()
      richiesta.current = controllo
      // il menù si apre subito col suo giracchio: l'attesa si vede, e chi
      // scrive sa che deve solo aspettare invece di riprovare
      setCercando(true)
      setAperto(true)

      let risultati: Suggerimento[] = []
      let chi: Sorgente = 'esempi'

      if (CHIAVE) {
        try {
          const g = (await caricaGoogle()) as any
          if (token.current === null && g?.maps?.places?.AutocompleteSessionToken) {
            token.current = new g.maps.places.AutocompleteSessionToken()
          }
          risultati = await chiediAGoogle(q, token.current)
          chi = 'google'
        } catch { /* si prova con la sorgente dopo */ }
      }

      if (risultati.length === 0) {
        try {
          risultati = await chiediAOsm(q, controllo.signal)
          chi = 'osm'
        } catch (e) {
          // Una ricerca annullata perché ne è partita una nuova non è un
          // errore: lasciare il posto a quella dopo è proprio il suo mestiere,
          // e il loader lo spegnerà lei quando avrà finito.
          if ((e as Error)?.name === 'AbortError') return
          risultati = cercaNegliEsempi(q)
          chi = 'esempi'
        }
      }

      if (mio !== giro.current) return          // è arrivata prima una ricerca più nuova
      setSorgente(chi)
      setVoci(risultati)
      setAttivo(-1)
      setCercando(false)
      setAperto(true)                           // anche a mani vuote: va detto
    }, 220)
  }

  const scegli = (s: Suggerimento) => {
    onChange(s.testo)
    setAperto(false)
    setVoci([])
    setCercando(false)
    annullaRichiesta()
    token.current = null                        // indirizzo scelto: sessione chiusa
  }

  const tasti = (e: React.KeyboardEvent) => {
    if (!aperto || voci.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAttivo(i => (i + 1) % voci.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAttivo(i => (i <= 0 ? voci.length : i) - 1) }
    else if (e.key === 'Enter' && attivo >= 0) { e.preventDefault(); scegli(voci[attivo]) }
    else if (e.key === 'Escape') { setAperto(false) }
    else if (e.key === 'Tab') { setAperto(false) }
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <svg
        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke={value ? C.magenta : alpha(C.dark, 0.3)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      <input
        type="text"
        role="combobox"
        aria-expanded={aperto}
        aria-controls={listaId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); cerca(e.target.value) }}
        onFocus={() => { if (voci.length > 0 || cercando) setAperto(true) }}
        onKeyDown={tasti}
        style={{
          width: '100%', backgroundColor: alpha(C.dark, 0.04),
          border: `1.5px solid ${value ? C.magenta : alpha(C.dark, 0.1)}`,
          borderRadius: '12px', padding: '13px 16px 13px 40px',
          color: C.dark, fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
          ...style,
        }}
      />

      {createPortal(
        <AnimatePresence>
          {/* Aperto anche a mani vuote: una ricerca finita male deve dirlo,
              se no il menù sparisce e sembra che il campo abbia ignorato. Il
              controllo sulle tre lettere tiene fuori il caso in cui nessuna
              ricerca sia mai partita. */}
          {aperto && riquadro && (voci.length > 0 || cercando || value.trim().length >= 3) && (
            <motion.div
              key="sugg"
              className="siply-suggerimenti"
              id={listaId}
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={M.T.press}
              style={{
                position: 'fixed',
                left: `${riquadro.left}px`,
                top: `${riquadro.top}px`,
                width: `${riquadro.width}px`,
                zIndex: 320,
                backgroundColor: C.white,
                borderRadius: '14px',
                border: `1px solid ${alpha(C.dark, 0.1)}`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              {/* Prima riga: sta cercando. Resta in cima anche quando i primi
                  risultati sono già arrivati da un'altra sorgente, così non
                  sembra che l'elenco sia quello definitivo. */}
              {cercando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: voci.length > 0 ? `1px solid ${alpha(C.dark, 0.06)}` : 'none' }}>
                  <Giracchio />
                  <span style={{ color: C.gray, fontSize: '13px', fontWeight: 600 }}>Cerco l'indirizzo…</span>
                </div>
              )}

              {!cercando && voci.length === 0 && (
                <div style={{ padding: '13px 14px' }}>
                  <p style={{ color: C.dark, fontSize: '13px', fontWeight: 600 }}>Nessun indirizzo trovato</p>
                  <p style={{ color: C.gray, fontSize: '12px', marginTop: '2px', lineHeight: 1.45 }}>
                    Prova col nome della via e del comune, o scrivi l'indirizzo a mano: va bene lo stesso.
                  </p>
                </div>
              )}

              {voci.map((s, i) => (
                <M.RowButton
                  key={s.id || i}
                  type="button"
                  role="option"
                  aria-selected={i === attivo}
                  onMouseEnter={() => setAttivo(i)}
                  // il mousedown toglierebbe il fuoco al campo prima del clic
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => scegli(s)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
                    textAlign: 'left', border: 'none', cursor: 'pointer',
                    padding: '11px 14px',
                    backgroundColor: i === attivo ? alpha(C.magenta, 0.07) : 'transparent',
                    borderBottom: i < voci.length - 1 ? `1px solid ${alpha(C.dark, 0.06)}` : 'none',
                    transition: 'background-color 0.12s',
                  }}
                >
                  <svg style={{ flexShrink: 0, marginTop: '2px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.35)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: C.dark, fontSize: '13.5px', fontWeight: 600, lineHeight: 1.35 }}>
                      <Evidenzia testo={s.principale} query={value} />
                    </span>
                    {s.secondario && (
                      <span style={{ display: 'block', color: C.gray, fontSize: '12px', lineHeight: 1.35, marginTop: '1px' }}>
                        <Evidenzia testo={s.secondario} query={value} />
                      </span>
                    )}
                  </span>
                </M.RowButton>
              ))}

              {/* Chi risponde va detto: è una richiesta di Google quando i dati
                  sono suoi, ed è onestà quando invece sono i nostri esempi. */}
              {voci.length > 0 && (
              <div style={{ padding: '7px 14px', backgroundColor: alpha(C.dark, 0.035), borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
                <p style={{ color: alpha(C.dark, 0.4), fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {sorgente === 'google' ? 'powered by Google'
                    : sorgente === 'osm' ? 'Indirizzi © OpenStreetMap contributors'
                    : 'Indirizzi di esempio · la ricerca non risponde'}
                </p>
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
