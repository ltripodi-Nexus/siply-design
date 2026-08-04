import { cassaTotale, type Cassa } from '../App'
import { alProduttore, commissione } from '../economia'
import { daCatalogo, produttore, type Richiesta, type StatoRichiesta } from './dati'

/* ──────────────────────────────────────────────────────────────────────────
   I conti delle statistiche, separati da come si disegnano.

   Stanno qui e non dentro la schermata perché sono l'unica parte che si può
   sbagliare in silenzio: un grafico storto si vede, una media calcolata sul
   denominatore sbagliato no.
   ────────────────────────────────────────────────────────────────────────── */

/** Tutte le bottiglie di una cassa, anche quando il vino è uno solo. */
export const vociCassa = (c: Cassa) =>
  c.bottiglie ?? [{ bottiglia: c.bottiglia, quantita: c.quantita }]

/** Quanto costa la cassa ai prezzi del gruppo, non a listino. */
export function cassaScontata(c: Cassa): number {
  return vociCassa(c).reduce((s, v) => {
    const p = parseFloat(c.prezziScontati?.[v.bottiglia.id] ?? '')
    return s + (!isNaN(p) && p > 0 ? p : v.bottiglia.prezzo) * v.quantita
  }, 0)
}

/** Somma un campo economico della cassa, per id vino. */
function somma(c: Cassa, campo: 'prezziScontati' | 'costiScontati' | 'costiUnitari'): number {
  return vociCassa(c).reduce((s, v) => {
    const n = parseFloat(c[campo]?.[v.bottiglia.id] ?? '')
    return s + (!isNaN(n) && n > 0 ? n * v.quantita : 0)
  }, 0)
}

/** Tutti i numeri di una cassa, calcolati una volta sola. */
export function economiaCassa(c: Cassa) {
  const listino = cassaTotale(c)
  const scontato = cassaScontata(c)
  const acquisto = somma(c, 'costiScontati')
  const costo = somma(c, 'costiUnitari')
  return {
    listino,
    scontato,
    acquisto,
    costo,
    /** quanto risparmia chi compra, in percentuale sul listino */
    sconto: listino > 0 ? (1 - scontato / listino) * 100 : 0,
    /** quanto resta al produttore, tolta la commissione */
    incasso: alProduttore(acquisto),
    quotaSiply: commissione(acquisto),
    margine: alProduttore(acquisto) - costo,
  }
}

export interface Voce {
  etichetta: string
  valore: number
  /** riga sotto l'etichetta, quando serve un contesto */
  dettaglio?: string
}

export interface Statistiche {
  totale: number
  perStato: Record<StatoRichiesta, number>
  /** quota di approvate sulle sole richieste già decise */
  tassoApprovazione: number | null
  regioni: Voce[]
  viniCatalogo: number
  viniNuovi: number
  /** richieste che contengono almeno un vino non nostro */
  richiesteConVinoNuovo: number
  prezzoMedioCassaListino: number
  prezzoMedioCassaScontato: number
  prezzoMedioBottiglia: number
  bottiglieTotali: number
  casseTotali: number
  classifica: {
    inviate: Voce[]
    approvate: Voce[]
    rifiutate: Voce[]
    inAttesa: Voce[]
  }
}

/** Ordina per valore e taglia: le classifiche lunghe non le legge nessuno. */
function podio(conteggi: Map<string, number>, quanti = 5): Voce[] {
  return [...conteggi.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, quanti)
    .map(([etichetta, valore]) => ({ etichetta, valore }))
}

export function statistiche(richieste: Richiesta[]): Statistiche {
  const perStato: Record<StatoRichiesta, number> = { pending_approval: 0, approved: 0, refused: 0 }

  const perRegione = new Map<string, number>()
  const cantinePerRegione = new Map<string, Set<string>>()
  const inviate = new Map<string, number>()
  const approvate = new Map<string, number>()
  const rifiutate = new Map<string, number>()
  const inAttesa = new Map<string, number>()

  const viniVisti = new Map<string, boolean>()   // id → viene dal catalogo
  let richiesteConVinoNuovo = 0

  let sommaCasseListino = 0, sommaCasseScontato = 0, casseTotali = 0
  let sommaBottiglie = 0, bottiglieTotali = 0

  const piu = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

  for (const r of richieste) {
    perStato[r.stato]++
    const p = produttore(r.produttoreId)

    piu(perRegione, p.regione)
    if (!cantinePerRegione.has(p.regione)) cantinePerRegione.set(p.regione, new Set())
    cantinePerRegione.get(p.regione)!.add(p.cantina)

    piu(inviate, p.cantina)
    if (r.stato === 'approved') piu(approvate, p.cantina)
    if (r.stato === 'refused') piu(rifiutate, p.cantina)
    if (r.stato === 'pending_approval') piu(inAttesa, p.cantina)

    let haVinoNuovo = false
    for (const c of r.casse) {
      casseTotali++
      sommaCasseListino += cassaTotale(c)
      sommaCasseScontato += cassaScontata(c)
      for (const v of vociCassa(c)) {
        const dal = daCatalogo(v.bottiglia)
        viniVisti.set(v.bottiglia.id, dal)
        if (!dal) haVinoNuovo = true
        bottiglieTotali += v.quantita
        sommaBottiglie += v.bottiglia.prezzo * v.quantita
      }
    }
    if (haVinoNuovo) richiesteConVinoNuovo++
  }

  const decise = perStato.approved + perStato.refused
  const viniValori = [...viniVisti.values()]

  return {
    totale: richieste.length,
    perStato,
    tassoApprovazione: decise > 0 ? (perStato.approved / decise) * 100 : null,
    regioni: [...perRegione.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([regione, valore]) => {
        const n = cantinePerRegione.get(regione)!.size
        return { etichetta: regione, valore, dettaglio: `${n} cantin${n === 1 ? 'a' : 'e'}` }
      }),
    viniCatalogo: viniValori.filter(Boolean).length,
    viniNuovi: viniValori.filter(v => !v).length,
    richiesteConVinoNuovo,
    prezzoMedioCassaListino: casseTotali > 0 ? sommaCasseListino / casseTotali : 0,
    prezzoMedioCassaScontato: casseTotali > 0 ? sommaCasseScontato / casseTotali : 0,
    // pesata sulle bottiglie vere, non sui vini diversi: un vino messo in sei
    // bottiglie conta sei volte, ed è giusto così se si cerca il prezzo medio
    // di quello che passa davvero dal gruppo
    prezzoMedioBottiglia: bottiglieTotali > 0 ? sommaBottiglie / bottiglieTotali : 0,
    bottiglieTotali,
    casseTotali,
    classifica: {
      inviate: podio(inviate),
      approvate: podio(approvate),
      rifiutate: podio(rifiutate),
      inAttesa: podio(inAttesa),
    },
  }
}
