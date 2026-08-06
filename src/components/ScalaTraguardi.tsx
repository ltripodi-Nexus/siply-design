import { useState } from 'react'
import { C, alpha } from '../colors'
import { COMMISSIONE, COMMISSIONE_PCT, QUOTA_PCT, alProduttore, eur, num, pct } from '../economia'
import {
  ESEMPIO, MAX_BOTTIGLIE, MAX_SCONTO, SCONTI_RAPIDI,
  prezzoAlTraguardo, scontoTotale, type Traguardo,
} from '../traguardi'
import type { Cassa } from '../App'
import * as M from '../motion'
import { motion } from '../motion'
import * as Icon from './Icons'
import Spiega from './Spiega'

/* ──────────────────────────────────────────────────────────────────────────
   La scala degli sconti, disegnata.

   Un traguardo e il suo sconto sono la stessa cosa detta da due parti — "mille
   bottiglie" e "meno cinque per cento" — e finché stavano su due schede diverse
   nessuno li leggeva insieme. Qui stanno su una riga sola: le bottiglie, lo
   sconto, il prezzo che ne esce e i soldi che ne escono. Chi legge non deve
   ricostruire niente.

   Le stesse righe servono al produttore che compila e a chi in Siply legge la
   richiesta: cambia solo se i comandi ci sono o no.
   ────────────────────────────────────────────────────────────────────────── */

/* ── Le medie del GDA ─────────────────────────────────────────────────────
   Un traguardo vale su tutte le casse insieme, ma ogni cassa ha i suoi vini e
   i suoi prezzi. Per parlare di "una bottiglia" servono quindi delle medie
   pesate sulle quantità: un vino che c'è in tre bottiglie pesa il triplo di
   uno che c'è in una sola. */

export interface Medie {
  /** bottiglie contate in tutte le casse */
  bottiglie: number
  /** prezzo medio di listino */
  listino: number
  /** prezzo medio GDA di partenza, quello del primo traguardo */
  gda: number
  /** prezzo medio a cui il produttore vende a Siply, di partenza */
  acquisto: number
  /** costo medio di produzione */
  costo: number
}

const VUOTE: Medie = { bottiglie: 0, listino: 0, gda: 0, acquisto: 0, costo: 0 }

export function medieCasse(casse: Cassa[]): Medie {
  let n = 0, listino = 0, gda = 0, acquisto = 0, costo = 0
  for (const c of casse) {
    const voci = c.bottiglie ?? [{ bottiglia: c.bottiglia, quantita: c.quantita }]
    for (const v of voci) {
      const id = v.bottiglia.id
      const val = (r?: Record<string, string>) => {
        const x = parseFloat(r?.[id] ?? '')
        return !isNaN(x) && x > 0 ? x : 0
      }
      // senza prezzo GDA scritto vale il listino: è quello che si paga
      const prezzoGda = val(c.prezziScontati) || v.bottiglia.prezzo
      n += v.quantita
      listino += v.bottiglia.prezzo * v.quantita
      gda += prezzoGda * v.quantita
      acquisto += val(c.costiScontati) * v.quantita
      costo += val(c.costiUnitari) * v.quantita
    }
  }
  if (n === 0) return VUOTE
  return { bottiglie: n, listino: listino / n, gda: gda / n, acquisto: acquisto / n, costo: costo / n }
}

/**
 * I numeri di un traguardo, tutti derivati dalle medie e dallo sconto.
 *
 * `sconto` e `base` non stanno in rapporto uno a uno con lo sconto in più, e
 * questo confonde: mettere −5% su un prezzo già scontato del 15% non porta lo
 * sconto sul listino al 20%, ma al 19%. Il motivo è che il 5% si toglie dal
 * prezzo del gruppo — che è più basso del listino — quindi vale meno di cinque
 * punti pieni. I due numeri escono entrambi da qui, e la riga li mostra
 * insieme invece di lasciare il conto a chi guarda.
 */
export function contiTraguardo(t: Traguardo, m: Medie) {
  const prezzo = prezzoAlTraguardo(m.gda, t.sconto)
  const acquisto = prezzoAlTraguardo(m.acquisto, t.sconto)
  /* Arrotondati qui e non a video: se il totale si arrotonda per eccesso e la
     base per difetto, la somma scritta a schermo non torna e sembra un errore
     di conto nostro. Questi tre numeri sono sempre coerenti fra loro. */
  const sconto = Math.round(scontoTotale(m.listino, m.gda, t.sconto))
  const base = Math.round(scontoTotale(m.listino, m.gda, 0))
  return {
    prezzo,
    acquisto,
    sconto,
    /** Lo sconto di partenza, senza il contributo di questo traguardo. */
    base,
    /** I punti di sconto che questo traguardo aggiunge davvero al listino. */
    punti: sconto - base,
    valore: prezzo * t.bottiglie,
    incasso: acquisto > 0 ? alProduttore(acquisto * t.bottiglie) : null,
    netto: acquisto > 0 && m.costo > 0
      ? alProduttore(acquisto * t.bottiglie) - m.costo * t.bottiglie
      : null,
  }
}

/* ── Una riga della scala ────────────────────────────────────────────────── */

const ETICHETTA: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: alpha(C.dark, 0.42),
}

export function RigaTraguardo({ indice, traguardo: t, medie: m, onBottiglie, onSconto, onRiordina, onRimuovi, incoerente }: {
  indice: number
  traguardo: Traguardo
  medie: Medie
  /** presente = si possono cambiare le bottiglie; assente = riga in sola lettura */
  onBottiglie?: (v: number) => void
  /** presente = si può cambiare lo sconto; assente = riga in sola lettura */
  onSconto?: (v: number) => void
  /** chiamata quando si esce dal campo bottiglie: è lì che la scala si
   *  riordina, non a ogni cifra battuta — righe che saltano sotto le dita
   *  mentre si scrive sono peggio di una scala momentaneamente storta. */
  onRiordina?: () => void
  onRimuovi?: () => void
  /** la scala non sale: più bottiglie ma sconto uguale o più basso */
  incoerente?: boolean
}) {
  const primo = indice === 0
  const conti = contiTraguardo(t, m)
  const numeri = m.bottiglie > 0 && m.listino > 0

  return (
    <div style={{ padding: '14px 0', borderTop: indice > 0 ? `1px solid ${alpha(C.dark, 0.08)}` : 'none' }}>

      {/* Bottiglie e sconto sulla stessa riga: è il patto, e si legge tutto
          insieme o non si legge. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {onBottiglie ? (
          <CampoBottiglie valore={t.bottiglie} onCambia={onBottiglie} onFine={onRiordina} />
        ) : (
          <span style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: '4px',
            backgroundColor: alpha(C.magenta, 0.09), border: `1.5px solid ${alpha(C.magenta, 0.3)}`,
            borderRadius: '10px', padding: '5px 11px',
          }}>
            <span style={{ color: C.magenta, fontSize: '15px', fontWeight: 800 }}>{num(t.bottiglie)}</span>
            <span style={{ color: alpha(C.magenta, 0.7), fontSize: '11px', fontWeight: 600 }}>bt</span>
          </span>
        )}

        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={alpha(C.dark, 0.25)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>

        {primo ? (
          <span style={{ flex: 1, minWidth: 0, color: C.gray, fontSize: '12.5px', fontWeight: 600 }}>
            <Spiega k="traguardoBase">Prezzo di partenza</Spiega>
          </span>
        ) : onSconto ? (
          <StepperSconto valore={t.sconto} onCambia={onSconto} />
        ) : (
          <span style={{ flex: 1, minWidth: 0, color: C.forest, fontSize: '13px', fontWeight: 700 }}>
            −{t.sconto}% <span style={{ color: C.gray, fontWeight: 500, fontSize: '12px' }}>in più</span>
          </span>
        )}

        {onRimuovi && (
          <M.IconButton
            onClick={onRimuovi}
            title={`Togli il traguardo di ${num(t.bottiglie)} bottiglie`}
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: alpha(C.dark, 0.35), fontSize: '17px', lineHeight: 1, padding: '0 2px' }}
          >×</M.IconButton>
        )}
      </div>

      {incoerente && (
        <p style={{ color: C.olive, fontSize: '11.5px', lineHeight: 1.5, marginTop: '8px', backgroundColor: alpha(C.ocra, 0.16), borderRadius: '10px', padding: '7px 10px' }}>
          Più bottiglie ma non più sconto: così questo traguardo non dà a nessuno un motivo per arrivarci.
        </p>
      )}

      {/* Cosa vuol dire, in prezzo e in soldi */}
      {numeri ? (
        <div style={{ marginTop: '10px', backgroundColor: alpha(C.dark, 0.035), borderRadius: '12px', padding: '11px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ minWidth: 0 }}>
              <p style={ETICHETTA}>
                <Spiega
                  k="scontoTotaleListino"
                  calcolo={t.sconto > 0
                    ? `€${eur(m.listino)} × ${100 - conti.base}% × ${100 - t.sconto}% = €${eur(conti.prezzo)}`
                    : `€${eur(m.listino)} × ${100 - conti.base}% = €${eur(conti.prezzo)}`}
                >
                  Sconto sul listino
                </Spiega>
              </p>
              <p style={{ display: 'flex', alignItems: 'baseline', gap: '7px', color: C.forest, fontSize: '19px', fontWeight: 800, lineHeight: 1.2 }}>
                −{conti.sconto}%
                {/* Quanto ha aggiunto *questo* traguardo, in punti di listino.
                    È il numero che manca per capire perché uno sconto in più
                    del 5% non porta il totale di cinque punti: si applica al
                    prezzo del gruppo, che è già sceso. */}
                {conti.punti > 0 && (
                  <span style={{ color: C.forest, fontSize: '12px', fontWeight: 700, backgroundColor: alpha(C.forest, 0.12), borderRadius: '20px', padding: '2px 8px' }}>
                    +{conti.punti} punti
                  </span>
                )}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <p style={ETICHETTA}>
                <Spiega
                  k="prezzoTraguardo"
                  calcolo={t.sconto > 0
                    ? `€${eur(m.gda)} × ${100 - t.sconto}% = €${eur(conti.prezzo)}`
                    : undefined}
                >
                  Prezzo a bottiglia
                </Spiega>
              </p>
              <p style={{ color: C.dark, fontSize: '19px', fontWeight: 800, lineHeight: 1.2 }}>
                €{eur(conti.prezzo)}
              </p>
            </div>
          </div>

          {/* Quanto si scende, visto. La barra è in due pezzi: quello chiaro è
              lo sconto che c'era già, quello pieno è il tratto aggiunto da
              questo traguardo. Il pezzo pieno si vede corto rispetto al numero
              battuto sopra, ed è esattamente il punto da capire. */}
          <div style={{ height: '7px', borderRadius: '4px', backgroundColor: alpha(C.dark, 0.08), marginTop: '10px', overflow: 'hidden', display: 'flex' }}>
            <motion.div
              initial={false}
              animate={{ width: `${Math.min(100, Math.max(0, conti.base) * 2)}%` }}
              transition={M.T.press}
              style={{ height: '100%', backgroundColor: alpha(C.forest, 0.32), flexShrink: 0 }}
            />
            <motion.div
              initial={false}
              animate={{ width: `${Math.min(100, Math.max(0, conti.punti) * 2)}%` }}
              transition={M.T.press}
              style={{ height: '100%', backgroundColor: C.forest, flexShrink: 0 }}
            />
          </div>

          {/* La somma scritta per esteso: nessuno deve dedurla, e i tre numeri
              tornano sempre perché sono arrotondati insieme in contiTraguardo. */}
          {conti.punti > 0 && (
            <p style={{ color: C.gray, fontSize: '11.5px', lineHeight: 1.5, marginTop: '7px' }}>
              <strong style={{ color: alpha(C.forest, 0.85), fontWeight: 700 }}>−{conti.base}%</strong> di partenza
              {' + '}
              <strong style={{ color: C.forest, fontWeight: 700 }}>{conti.punti} punti</strong> da questo traguardo.
              {' '}Il <strong style={{ color: C.dark, fontWeight: 700 }}>−{t.sconto}%</strong> si toglie dal prezzo del gruppo, non dal listino: quel prezzo è già sceso, quindi sul listino pesa meno di {t.sconto} punti.
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: '11px' }}>
            <Voce
              etichetta={<Spiega k="valoreGda" calcolo={`€${eur(conti.prezzo)} × ${num(t.bottiglie)} bt = €${eur(conti.valore)}`}>Il gruppo spende</Spiega>}
              valore={`€${eur(conti.valore)}`}
            />
            <Voce
              etichetta={<Spiega k="ricavoProduttore" calcolo={conti.incasso !== null ? `€${eur(conti.acquisto)} × ${num(t.bottiglie)} bt × ${QUOTA_PCT} = €${eur(conti.incasso)}` : undefined}>Incassi tu</Spiega>}
              valore={conti.incasso !== null ? `€${eur(conti.incasso)}` : '—'}
              colore={C.magenta}
            />
            {conti.netto !== null && conti.incasso !== null && (
              <Voce
                etichetta={<Spiega k="margineNetto" calcolo={`€${eur(conti.incasso)} − €${eur(m.costo * t.bottiglie)} = ${conti.netto >= 0 ? '+' : ''}€${eur(conti.netto)}`}>Ti resta netto</Spiega>}
                valore={`${conti.netto >= 0 ? '+' : ''}€${eur(conti.netto)}`}
                colore={conti.netto >= 0 ? C.forest : C.magenta}
              />
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: C.gray, fontSize: '12px', lineHeight: 1.5, marginTop: '8px' }}>
          Aggiungi una cassa con i suoi prezzi e qui compaiono lo sconto sul listino e i tuoi ricavi.
        </p>
      )}
    </div>
  )
}

function Voce({ etichetta, valore, colore }: { etichetta: React.ReactNode; valore: string; colore?: string }) {
  return (
    <div style={{ minWidth: '92px' }}>
      <p style={ETICHETTA}>{etichetta}</p>
      <p style={{ color: colore ?? C.dark, fontSize: '14px', fontWeight: 800, lineHeight: 1.3 }}>{valore}</p>
    </div>
  )
}

/* ── I comandi della riga ────────────────────────────────────────────────── */

/**
 * Le bottiglie del traguardo, modificabili sul posto.
 *
 * Il testo battuto vive qui dentro e non nello stato del GDA: svuotando il
 * campo per riscriverlo, un numero solo diventerebbe uno zero che ricompare
 * sotto le dita. Fuori esce solo un numero valido; all'uscita, se è rimasto
 * vuoto, si rimette quello di prima.
 */
function CampoBottiglie({ valore, onCambia, onFine }: {
  valore: number
  onCambia: (v: number) => void
  onFine?: () => void
}) {
  const [testo, setTesto] = useState(String(valore))
  const [fuoco, setFuoco] = useState(false)

  const scrivi = (v: string) => {
    const pulito = v.replace(/[^\d]/g, '').slice(0, 6)
    setTesto(pulito)
    const n = parseInt(pulito)
    if (!isNaN(n) && n > 0) onCambia(Math.min(n, MAX_BOTTIGLIE))
  }

  const esci = () => {
    setFuoco(false)
    const n = parseInt(testo)
    if (isNaN(n) || n <= 0) setTesto(String(valore))
    else setTesto(String(Math.min(n, MAX_BOTTIGLIE)))
    onFine?.()
  }

  return (
    <label style={{
      flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: '4px',
      backgroundColor: alpha(C.magenta, fuoco ? 0.14 : 0.09),
      border: `1.5px solid ${alpha(C.magenta, fuoco ? 0.7 : 0.3)}`,
      borderRadius: '10px', padding: '5px 11px', cursor: 'text',
      transition: 'background-color 0.15s, border-color 0.15s',
    }}>
      <input
        className="num-clean"
        type="text"
        inputMode="numeric"
        value={testo}
        onChange={e => scrivi(e.target.value)}
        onFocus={e => { setFuoco(true); e.target.select() }}
        onBlur={esci}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        aria-label="Bottiglie del traguardo"
        style={{
          width: `${Math.max(2, testo.length)}ch`,
          background: 'none', border: 'none', outline: 'none', padding: 0,
          color: C.magenta, fontSize: '15px', fontWeight: 800, textAlign: 'right',
        }}
      />
      <span style={{ color: alpha(C.magenta, 0.7), fontSize: '11px', fontWeight: 600 }}>bt</span>
    </label>
  )
}

function StepperSconto({ valore, onCambia }: { valore: number; onCambia: (v: number) => void }) {
  const cambia = (d: number) => onCambia(Math.min(MAX_SCONTO, Math.max(0, valore + d)))
  const bottone: React.CSSProperties = {
    width: '30px', height: '30px', border: 'none', cursor: 'pointer',
    backgroundColor: alpha(C.dark, 0.05), color: C.dark,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', fontWeight: 300, lineHeight: 1,
  }
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {/* Su cosa si applica sta scritto sotto l'etichetta e non dentro alla
          spiegazione: è la domanda che viene guardando il numero, e la
          risposta deve stare lì, non a un clic di distanza. */}
      <span style={{ color: C.gray, fontSize: '12px', fontWeight: 600, lineHeight: 1.25 }}>
        <Spiega k="scontoInPiu">Sconto in più</Spiega>
        <span style={{ display: 'block', color: alpha(C.dark, 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>
          sul prezzo del gruppo
        </span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${alpha(C.forest, 0.3)}`, borderRadius: '10px', overflow: 'hidden' }}>
        <M.IconButton onClick={() => cambia(-1)} disabled={valore <= 0} style={{ ...bottone, color: valore <= 0 ? alpha(C.dark, 0.25) : C.dark, cursor: valore <= 0 ? 'default' : 'pointer' }}>−</M.IconButton>
        <span style={{ minWidth: '52px', textAlign: 'center', color: C.forest, fontSize: '14px', fontWeight: 800, backgroundColor: C.white }}>
          −{valore}%
        </span>
        <M.IconButton onClick={() => cambia(1)} disabled={valore >= MAX_SCONTO} style={{ ...bottone, color: valore >= MAX_SCONTO ? alpha(C.dark, 0.25) : C.dark, cursor: valore >= MAX_SCONTO ? 'default' : 'pointer' }}>+</M.IconButton>
      </div>
      {valore === 0 && (
        // A zero il traguardo non sblocca niente: le scorciatoie tolgono di
        // mezzo la domanda "quanto ci metto?" al momento in cui si presenta.
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {SCONTI_RAPIDI.map(s => (
            <M.Chip
              key={s}
              type="button"
              onClick={() => onCambia(s)}
              style={{ backgroundColor: alpha(C.forest, 0.08), color: C.forest, border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              −{s}%
            </M.Chip>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Cosa cambia dal primo all'ultimo traguardo ────────────────────────────
   Riga per riga si legge cosa succede a ogni scalino, ma non si legge la cosa
   che conta: che il prezzo scende di poco e l'incasso sale di molto. È la
   frase che convince a fissare una scala invece di un prezzo solo, e finché
   bisogna ricavarla confrontando due righe distanti nessuno la ricava.

   Qui i due estremi stanno uno sopra l'altro, con le barre lunghe quanto i
   soldi che portano. La differenza si vede prima di leggerla.
   ───────────────────────────────────────────────────────────────────────── */

/** Moltiplicatore leggibile: "4" quando è tondo, "3,6" quando non lo è. */
const volteTxt = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? num(Math.round(v)) : pct(v))

/* I toni su fondo scuro.
   Il primo traguardo si scrive più quieto dell'ultimo — è l'ultimo il punto
   dove si vuole arrivare, e la gerarchia serve — ma "più quieto" non vuol
   dire smorzato fino a sparire: sotto a queste soglie il testo piccolo su
   `C.dark` scende oltre 4,5:1 e non si legge più. Sono il pavimento, non un
   suggerimento: per far risaltare l'ultimo traguardo si alza quello, non si
   abbassa il primo. */
const SCURO = {
  /** titolo della scheda e didascalia sotto */
  titolo: alpha(C.silver, 0.8),
  didascalia: alpha(C.silver, 0.7),
  /** riga del primo traguardo: leggibile, non in evidenza */
  etichetta: alpha(C.silver, 0.75),
  numero: C.silver,
  unita: alpha(C.silver, 0.7),
  /** elemento grafico: gli basta 3:1, ma sotto non si distingue dal binario */
  barra: alpha(C.silver, 0.5),
  testo: alpha(C.silver, 0.8),
} as const

export function ImpattoScala({ traguardi, medie: m }: { traguardi: Traguardo[]; medie: Medie }) {
  // Con un traguardo solo non c'è nessun "da … a …" da raccontare, e senza
  // prezzi scritti non ci sono numeri da confrontare.
  if (traguardi.length < 2 || m.bottiglie === 0 || m.listino === 0) return null

  const tPrimo = traguardi[0]
  const tUltimo = traguardi[traguardi.length - 1]
  const primo = contiTraguardo(tPrimo, m)
  const ultimo = contiTraguardo(tUltimo, m)

  /* Si confronta quello che entra in tasca al produttore. Finché non ha
     scritto il prezzo a cui vende a Siply quel numero non esiste: allora si
     confronta quanto spende il gruppo. Cambia l'etichetta, non il discorso. */
  const suIncasso = primo.incasso !== null && ultimo.incasso !== null && primo.incasso > 0
  const aPrimo = suIncasso ? primo.incasso! : primo.valore
  const aUltimo = suIncasso ? ultimo.incasso! : ultimo.valore
  const massimo = Math.max(aPrimo, aUltimo, 1)
  const volte = aPrimo > 0 ? aUltimo / aPrimo : 0
  const volteBottiglie = tPrimo.bottiglie > 0 ? tUltimo.bottiglie / tPrimo.bottiglie : 0
  const puntiInPiu = ultimo.sconto - primo.sconto
  const etichettaSoldi = suIncasso ? 'quanto incassi tu' : 'quanto spende il gruppo'

  return (
    <div style={{ backgroundColor: C.dark, borderRadius: '16px', padding: '15px 16px', margin: '14px 0 4px' }}>
      {/* Il tratto dell'icona è scuro di suo e su questo fondo sparirebbe:
          qui prende il colore dell'etichetta che accompagna. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
        <Icon.Trend size={16} color={SCURO.titolo} />
        <p style={{ color: SCURO.titolo, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          Cosa cambia con la scala
        </p>
      </div>
      {/* Cosa misurano le barre: senza, sono due lunghezze e basta. */}
      <p style={{ color: SCURO.didascalia, fontSize: '11px', fontWeight: 600, marginBottom: '13px', paddingLeft: '23px' }}>
        lunghezza delle barre: {etichettaSoldi}
      </p>

      <Confronto
        etichetta="Primo traguardo"
        bottiglie={tPrimo.bottiglie}
        prezzo={primo.prezzo}
        sconto={primo.sconto}
        soldi={aPrimo}
        quota={aPrimo / massimo}
      />
      <Confronto
        forte
        etichetta="Ultimo traguardo"
        bottiglie={tUltimo.bottiglie}
        prezzo={ultimo.prezzo}
        sconto={ultimo.sconto}
        soldi={aUltimo}
        quota={aUltimo / massimo}
      />

      <p style={{ color: SCURO.testo, fontSize: '12px', lineHeight: 1.6, marginTop: '13px', paddingTop: '12px', borderTop: `1px solid ${alpha(C.white, 0.12)}` }}>
        {puntiInPiu > 0 ? (
          <>
            La bottiglia scende da €{eur(primo.prezzo)} a €{eur(ultimo.prezzo)}: sconti{' '}
            <strong style={{ color: C.bg, fontWeight: 700 }}>{puntiInPiu} punti in più</strong> sul listino, ma vendi{' '}
            <strong style={{ color: C.bg, fontWeight: 700 }}>{volteTxt(volteBottiglie)} volte</strong> le bottiglie —{' '}
            {suIncasso ? (
              <><strong style={{ color: C.ocra, fontWeight: 800 }}>{volteTxt(volte)} volte di più</strong> in tasca.</>
            ) : (
              <>il gruppo spende <strong style={{ color: C.ocra, fontWeight: 800 }}>{volteTxt(volte)} volte di più</strong>.</>
            )}
          </>
        ) : (
          <>
            Il prezzo non scende salendo di traguardo: chi compra paga €{eur(ultimo.prezzo)} a bottiglia
            comunque, quindi nessuno ha un motivo per arrivare fino in fondo. Aggiungi uno sconto in più
            ai traguardi grandi.
          </>
        )}
      </p>
    </div>
  )
}

/** Un estremo della scala: i suoi numeri e una barra lunga quanto i suoi soldi. */
function Confronto({ etichetta, bottiglie, prezzo, sconto, soldi, quota, forte }: {
  etichetta: string
  bottiglie: number
  prezzo: number
  sconto: number
  soldi: number
  /** frazione della barra più lunga, da 0 a 1 */
  quota: number
  /** il traguardo grande: si scrive più forte, perché è lì che si vuole arrivare */
  forte?: boolean
}) {
  return (
    <div style={{ marginTop: forte ? '12px' : 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ color: forte ? C.bg : SCURO.etichetta, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {etichetta}
        </span>
        <span style={{ color: forte ? C.bg : SCURO.numero, fontSize: '13px', fontWeight: 800 }}>
          {num(bottiglie)} bt
        </span>
        <span style={{ marginLeft: 'auto', color: forte ? C.bg : SCURO.numero, fontSize: '13px', fontWeight: 800 }}>
          €{eur(prezzo)}
          <span style={{ color: SCURO.unita, fontSize: '10px', fontWeight: 600 }}>/bt</span>
        </span>
        <span style={{ color: C.bg, fontSize: '10.5px', fontWeight: 700, backgroundColor: alpha(C.green, forte ? 0.45 : 0.35), borderRadius: '20px', padding: '2px 7px' }}>
          −{sconto}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
        <div style={{ flex: 1, minWidth: 0, height: '10px', borderRadius: '5px', backgroundColor: alpha(C.white, 0.09), overflow: 'hidden' }}>
          <motion.div
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(0, quota * 100))}%` }}
            transition={M.T.press}
            style={{ height: '100%', borderRadius: '5px', backgroundColor: forte ? C.ocra : SCURO.barra }}
          />
        </div>
        <span style={{ flexShrink: 0, color: forte ? C.ocra : SCURO.numero, fontSize: forte ? '16px' : '13px', fontWeight: 800, lineHeight: 1 }}>
          €{eur(soldi)}
        </span>
      </div>
    </div>
  )
}

/* ── La scala in sola lettura ─────────────────────────────────────────────
   Per il dettaglio del GDA e per chi in Siply legge la richiesta: gli stessi
   numeri che ha visto il produttore mentre li decideva, compreso il confronto
   fra i due estremi. */

export function ScalaTraguardi({ traguardi, casse }: { traguardi: Traguardo[]; casse: Cassa[] }) {
  const medie = medieCasse(casse)
  if (traguardi.length === 0) return null
  return (
    <div>
      <ImpattoScala traguardi={traguardi} medie={medie} />
      {traguardi.map((t, i) => (
        <RigaTraguardo key={`${t.bottiglie}-${i}`} indice={i} traguardo={t} medie={medie} />
      ))}
    </div>
  )
}

/* ── L'esempio ───────────────────────────────────────────────────────────── */

/**
 * Una scala finta, con numeri veri, da leggere prima di compilare la propria.
 * Sta chiusa: chi ha già capito non se la trova fra i piedi, chi non ha capito
 * la apre. I risultati escono dalle stesse funzioni che macinano i dati veri,
 * quindi l'esempio non può promettere un conto diverso da quello che poi fa
 * l'app.
 */
export function EsempioScala() {
  const [aperto, setAperto] = useState(false)
  const e = ESEMPIO
  const m: Medie = { bottiglie: 1, listino: e.listino, gda: e.prezzoGda, acquisto: e.acquistoSiply, costo: 0 }
  const righe = e.traguardi.map(t => ({ t, c: contiTraguardo(t, m) }))
  const primo = righe[0]
  const ultimo = righe[righe.length - 1]
  const volte = primo.c.incasso && ultimo.c.incasso ? ultimo.c.incasso / primo.c.incasso : 0

  return (
    <div style={{ marginTop: '12px' }}>
      <M.Button
        type="button"
        onClick={() => setAperto(a => !a)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px', width: '100%',
          backgroundColor: aperto ? alpha(C.ocra, 0.2) : alpha(C.ocra, 0.12),
          border: 'none', cursor: 'pointer', borderRadius: '12px', padding: '11px 13px',
          color: C.olive, fontSize: '13px', fontWeight: 700, textAlign: 'left',
          transition: 'background-color 0.2s',
        }}
      >
        <Icon.Appunti size={17} />
        <span style={{ flex: 1 }}>{aperto ? "Chiudi l'esempio" : 'Guarda un esempio con i numeri'}</span>
        <M.Chevron open={aperto} size={15} color={C.olive} />
      </M.Button>

      <M.Collapse open={aperto}>
        <div style={{ padding: '14px 2px 2px' }}>
          <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
            La cantina mette in GDA il <strong>{e.vino}</strong>: listino <strong>€{e.listino}</strong>, prezzo del gruppo di partenza <strong>€{e.prezzoGda}</strong> e a Siply lo vende a <strong>€{e.acquistoSiply}</strong>. Poi fissa tre traguardi.
          </p>

          {righe.map(({ t, c }, i) => (
            <div
              key={t.bottiglie}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                padding: '10px 12px', borderRadius: '12px', marginBottom: '6px',
                backgroundColor: alpha(C.dark, i === righe.length - 1 ? 0.06 : 0.035),
              }}
            >
              <span style={{ flexShrink: 0, color: C.magenta, fontSize: '13px', fontWeight: 800, minWidth: '58px' }}>
                {num(t.bottiglie)} bt
              </span>
              <span style={{ flexShrink: 0, color: C.gray, fontSize: '11.5px', minWidth: '92px' }}>
                {i === 0 ? 'parte da qui' : `sconto in più −${t.sconto}%`}
              </span>
              <span style={{ flexShrink: 0, color: C.dark, fontSize: '13px', fontWeight: 800, minWidth: '56px' }}>
                €{eur(c.prezzo)}
              </span>
              <span style={{ flexShrink: 0, color: C.forest, fontSize: '11.5px', fontWeight: 700, backgroundColor: alpha(C.forest, 0.1), borderRadius: '20px', padding: '2px 8px' }}>
                −{c.sconto}% sul listino
              </span>
              <span style={{ marginLeft: 'auto', color: C.gray, fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                incassi <strong style={{ color: C.dark, fontSize: '12.5px' }}>€{eur(c.incasso ?? 0)}</strong>
              </span>
            </div>
          ))}

          <p style={{ color: C.olive, fontSize: '12.5px', lineHeight: 1.6, marginTop: '10px', backgroundColor: alpha(C.ocra, 0.14), borderRadius: '12px', padding: '11px 13px' }}>
            All'ultimo traguardo la bottiglia scende da €{eur(primo.c.prezzo)} a €{eur(ultimo.c.prezzo)}: <strong>sconti il {ultimo.c.sconto}% invece del {primo.c.sconto}%</strong>, ma vendi {Math.round(ultimo.t.bottiglie / primo.t.bottiglie)} volte le bottiglie —
            {' '}<strong>incassi {pct(volte)} volte di più</strong>, €{eur(ultimo.c.incasso ?? 0)} invece di €{eur(primo.c.incasso ?? 0)}. È questo che lo sconto compra.
          </p>
        </div>
      </M.Collapse>
    </div>
  )
}

/* ── La fetta di Siply ───────────────────────────────────────────────────── */

/** Sempre uguale a qualunque traguardo — è una percentuale — quindi si dice
 *  una volta sola in fondo alla scala, non ripetuta a ogni riga. */
export function StrisciaCommissione() {
  return (
    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${alpha(C.dark, 0.08)}` }}>
      <div style={{ height: '7px', borderRadius: '4px', backgroundColor: alpha(C.dark, 0.08), overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1 - COMMISSIONE, backgroundColor: C.ocra, borderRadius: '4px 0 0 4px' }} />
        <div style={{ flex: COMMISSIONE, backgroundColor: C.green, borderRadius: '0 4px 4px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', gap: '10px' }}>
        <span style={{ color: C.olive, fontSize: '11.5px', fontWeight: 600 }}>Di quello che chiedi, tuo il {QUOTA_PCT}</span>
        <span style={{ color: C.forest, fontSize: '11.5px', fontWeight: 600 }}>
          <Spiega k="commissioneSiply">Siply {COMMISSIONE_PCT}</Spiega>
        </span>
      </div>
    </div>
  )
}
