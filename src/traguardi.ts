/* ──────────────────────────────────────────────────────────────────────────
   La scala degli sconti del gruppo d'acquisto.

   Un traguardo non è solo un numero di bottiglie: è un numero di bottiglie
   *e* lo sconto che il produttore concede se il gruppo ci arriva. È questo il
   patto che tiene insieme le due cose — "più comprate, meno vi costa" — e
   finché i due dati vivevano separati (le bottiglie nel wizard, i prezzi nelle
   casse) non si capiva come si legassero.

   Come funziona, in tre righe:
     · il primo traguardo è il punto di partenza: si paga il prezzo GDA che il
       produttore ha scritto sulle bottiglie, sconto in più = 0
     · ogni traguardo successivo aggiunge uno sconto sopra a quel prezzo
     · lo sconto totale che vede chi compra è la somma dei due effetti, cioè
       quanto si scende rispetto al listino

   Lo sconto in più vale su entrambi i prezzi: quello che paga il gruppo e
   quello che il produttore chiede a Siply. Se scendesse solo il primo, lo
   sconto lo pagherebbe Siply — e non è così: Siply trattiene una commissione
   fissa sul venduto (vedi src/economia.ts), non la differenza fra due prezzi.
   ────────────────────────────────────────────────────────────────────────── */

export interface Traguardo {
  /** Bottiglie da vendere su tutto il GDA per sbloccarlo. */
  bottiglie: number
  /** Sconto in più rispetto al prezzo del primo traguardo, in punti
   *  percentuali. Il primo traguardo ha sempre 0: è il prezzo di partenza. */
  sconto: number
  /** Identità della riga, che le bottiglie non possono fare perché si
   *  modificano mentre si scrive: senza, a ogni cifra battuta React
   *  butterebbe via il campo e lo rifarebbe, portandosi via il cursore.
   *  Lo mette il wizard; i dati finti non ce l'hanno e non ne hanno bisogno. */
  id?: string
}

/** Tetto alle bottiglie di un traguardo. */
export const MAX_BOTTIGLIE = 100000
/** Quanti traguardi si possono fissare: oltre, non si confrontano più a occhio. */
export const MAX_TRAGUARDI = 6
/** Sconto in più massimo: oltre, il prezzo del gruppo scende sotto a qualsiasi
 *  margine ragionevole e la scala smette di avere senso. */
export const MAX_SCONTO = 40

/** Prezzo a un traguardo: il prezzo di partenza meno lo sconto in più. */
export const prezzoAlTraguardo = (prezzoBase: number, sconto: number) =>
  prezzoBase * (1 - sconto / 100)

/**
 * Sconto totale sul listino a un dato traguardo, in percentuale.
 * È il numero che interessa a chi compra: di quanto si scende rispetto al
 * prezzo di listino, contando sia lo sconto GDA di partenza sia quello in più.
 */
export const scontoTotale = (listino: number, prezzoBase: number, sconto: number) =>
  listino > 0 ? (1 - prezzoAlTraguardo(prezzoBase, sconto) / listino) * 100 : 0

/** In ordine di bottiglie crescenti, e il primo sempre a sconto 0: è il
 *  traguardo di partenza, e un traguardo di partenza scontato rispetto a cosa
 *  non si saprebbe dire. */
export function normalizza(t: Traguardo[]): Traguardo[] {
  const ordinati = [...t].sort((a, b) => a.bottiglie - b.bottiglie)
  return ordinati.map((x, i) => (i === 0 ? { ...x, sconto: 0 } : x))
}

/**
 * Indice del primo traguardo che rompe la scala: più bottiglie ma sconto uguale
 * o più basso del precedente. Non è un errore da bloccare — è il produttore che
 * decide — ma va detto, perché un traguardo così non invoglia nessuno a
 * comprare di più. `-1` quando la scala sale come deve.
 */
export function traguardoIncoerente(t: Traguardo[]): number {
  for (let i = 1; i < t.length; i++) {
    if (t[i].sconto <= t[i - 1].sconto) return i
  }
  return -1
}

/** Scaletta di sconti pronti, per non dover pensare a un numero da zero. */
export const SCONTI_RAPIDI = [3, 5, 8, 10, 15]

/* ── Aggiungere uno scalino ──────────────────────────────────────────────── */

let contatore = 0
const nuovoId = () => `t${Date.now()}-${contatore++}`

/** Dà un'identità alle righe che arrivano da fuori (bozze, dati di demo), così
 *  anche quelle si possono modificare senza perdere il cursore. */
export const conId = (t: Traguardo[]): Traguardo[] =>
  t.map(x => (x.id ? x : { ...x, id: nuovoId() }))

/**
 * Lo scalino successivo, già proposto: il doppio delle bottiglie dell'ultimo e
 * cinque punti di sconto in più.
 *
 * Un traguardo aggiunto vuoto sarebbe un modulo da riempire, e chi non sa
 * ancora cosa scriverci resta fermo lì. Aggiunto già pieno è invece una
 * proposta: si legge cosa comporta, e si correggono i due numeri se non
 * convince. Premuto tre volte di fila su un GDA vuoto dà 600 · 1.200 · 2.400
 * con −0%, −5% e −10%: esattamente la scala dell'esempio.
 */
export function prossimoTraguardo(esistenti: Traguardo[]): Traguardo {
  if (esistenti.length === 0) return { id: nuovoId(), bottiglie: 600, sconto: 0 }
  const ultimo = [...esistenti].sort((a, b) => a.bottiglie - b.bottiglie)[esistenti.length - 1]

  let bottiglie = Math.min(MAX_BOTTIGLIE, ultimo.bottiglie * 2)
  // Al tetto il raddoppio non si muove più: si scosta di poco, perché due
  // traguardi con le stesse bottiglie sono lo stesso traguardo scritto due volte.
  const presi = new Set(esistenti.map(t => t.bottiglie))
  while (presi.has(bottiglie) && bottiglie > 0) bottiglie -= 100

  return {
    id: nuovoId(),
    bottiglie: Math.max(1, bottiglie),
    sconto: Math.min(MAX_SCONTO, ultimo.sconto + 5),
  }
}

/* ── L'esempio ────────────────────────────────────────────────────────────
   Numeri finti ma realistici, usati dalla scheda "guarda un esempio": servono
   a far vedere il meccanismo a chi apre la pagina con i campi ancora vuoti.
   I risultati non stanno scritti qui: li calcolano le stesse funzioni che
   girano sui dati veri, così l'esempio non può raccontare una cosa diversa da
   quella che poi succede davvero. */
export const ESEMPIO = {
  vino: 'Brunello di Montalcino 2019',
  listino: 40,
  /** prezzo GDA di partenza, quello che il produttore scrive sulla bottiglia */
  prezzoGda: 32,
  /** prezzo di partenza a cui il produttore vende a Siply */
  acquistoSiply: 24,
  traguardi: [
    { bottiglie: 600, sconto: 0 },
    { bottiglie: 1200, sconto: 5 },
    { bottiglie: 2400, sconto: 10 },
  ] as Traguardo[],
}
