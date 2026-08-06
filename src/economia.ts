/* ──────────────────────────────────────────────────────────────────────────
   Le regole economiche del gruppo d'acquisto, in un posto solo.

   Siply non rivende a un prezzo suo deciso caso per caso: le bottiglie le
   compra al prezzo del gruppo e trattiene una quota fissa sul venduto, e le
   compra solo quando il traguardo di bottiglie è stato raggiunto. Quindi il
   guadagno di Siply non è la differenza fra due prezzi battuti a mano — è una
   percentuale del fatturato, e basta.

   Il numero sta scritto qui una volta sola: cambiarlo cambia ogni schermata,
   ogni spiegazione e ogni stima, senza doverlo inseguire in giro.
   ────────────────────────────────────────────────────────────────────────── */

/** Quota che Siply trattiene sul fatturato del gruppo. */
export const COMMISSIONE = 0.05

/** Come si scrive nei testi: "5%". Derivata, così non può discordare. */
export const COMMISSIONE_PCT = `${COMMISSIONE * 100}%`.replace('.', ',')

/** Quanto resta al produttore, in percentuale: "95%". */
export const QUOTA_PCT = `${(1 - COMMISSIONE) * 100}%`.replace('.', ',')

/** Quanto trattiene Siply su un dato fatturato. */
export const commissione = (fatturato: number) => fatturato * COMMISSIONE

/** Quanto arriva al produttore, tolta la commissione. */
export const alProduttore = (fatturato: number) => fatturato * (1 - COMMISSIONE)

/**
 * Importo in euro all'italiana: punto per le migliaia, virgola per i decimali.
 * "€45.200,00" invece di "€45200.00": sopra le mille le cifre di fila non si
 * leggono più.
 */
export const eur = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Numero intero di bottiglie: "1.200". */
export const num = (n: number) => n.toLocaleString('it-IT')

/** Percentuale con un decimale, virgola compresa: "146,3". */
export const pct = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
