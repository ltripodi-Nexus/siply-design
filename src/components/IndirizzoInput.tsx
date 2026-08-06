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

   Serve una chiave: mettila in un file `.env` alla radice del progetto come

       VITE_GOOGLE_MAPS_API_KEY=...

   con l'API "Places API (New)" attiva sul progetto Google Cloud. Senza chiave
   il campo non si rompe e non si svuota: mostra una manciata di indirizzi di
   esempio delle zone vinicole italiane, così il flusso resta dimostrabile —
   ed è scritto nel menù che quelli sono esempi, per non far credere a nessuno
   che stia parlando con Google.
   ────────────────────────────────────────────────────────────────────────── */

const CHIAVE = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

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
 * la forma di prima. Ristretto all'Italia: le nostre cantine stanno lì.
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
      includedRegionCodes: ['it'],
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
        { input: q, componentRestrictions: { country: 'it' }, sessionToken: token },
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

/* ── Ripiego senza chiave ────────────────────────────────────────────────── */

/** Indirizzi veri di zone vinicole: senza chiave il menù mostra questi, e lo
 *  dice. Servono a far vedere come si comporta il campo, non a spedire merce. */
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
  /** Vero quando i suggerimenti arrivano davvero da Google: cambia la scritta
   *  in fondo al menù, che non deve mai mentire su chi sta rispondendo. */
  const [daGoogle, setDaGoogle] = useState(false)
  const [riquadro, setRiquadro] = useState<{ left: number; top: number; width: number } | null>(null)

  const boxRef = useRef<HTMLDivElement>(null)
  const attesa = useRef<number | null>(null)
  /** Cresce a ogni ricerca: una risposta lenta di una richiesta vecchia non
   *  deve sovrascrivere i risultati di quella nuova. */
  const giro = useRef(0)
  /** Token di sessione di Google: tiene insieme le battute di uno stesso
   *  indirizzo, che è come Google conta (e fattura) una ricerca sola. */
  const token = useRef<unknown>(null)
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

  useEffect(() => () => { if (attesa.current !== null) clearTimeout(attesa.current) }, [])

  /** Si cerca dopo una pausa di battitura: una richiesta per lettera sarebbe
   *  un lampeggio continuo, e a Google si paga a chiamata. */
  const cerca = (q: string) => {
    if (attesa.current !== null) clearTimeout(attesa.current)
    if (q.trim().length < 3) { setVoci([]); setAperto(false); return }
    const mio = ++giro.current
    attesa.current = window.setTimeout(async () => {
      let risultati: Suggerimento[] = []
      let google = false
      if (CHIAVE) {
        try {
          const g = (await caricaGoogle()) as any
          if (token.current === null && g?.maps?.places?.AutocompleteSessionToken) {
            token.current = new g.maps.places.AutocompleteSessionToken()
          }
          risultati = await chiediAGoogle(q, token.current)
          google = true
        } catch {
          // Chiave sbagliata, quota finita, rete assente: meglio i suggerimenti
          // di esempio che un campo che smette di rispondere.
          risultati = cercaNegliEsempi(q)
        }
      } else {
        risultati = cercaNegliEsempi(q)
      }
      if (mio !== giro.current) return          // è arrivata prima una ricerca più nuova
      setDaGoogle(google)
      setVoci(risultati)
      setAttivo(-1)
      setAperto(risultati.length > 0)
    }, 220)
  }

  const scegli = (s: Suggerimento) => {
    onChange(s.testo)
    setAperto(false)
    setVoci([])
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
        onFocus={() => { if (voci.length > 0) setAperto(true) }}
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
          {aperto && riquadro && voci.length > 0 && (
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
              <div style={{ padding: '7px 14px', backgroundColor: alpha(C.dark, 0.035), borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
                <p style={{ color: alpha(C.dark, 0.4), fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {daGoogle ? 'powered by Google' : 'Indirizzi di esempio · con la chiave Google arrivano quelli veri'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
