import { useEffect } from 'react'

/* ──────────────────────────────────────────────────────────────────────────
   Demo mode — mock data + un piccolo event bus.

   Lo stato dei form vive dentro le singole schermate, quindi invece di
   spingere props ovunque il FAB emette un evento e ogni schermata riempie
   (o svuota) i propri campi. Serve solo per le demo del mockup.
   ────────────────────────────────────────────────────────────────────────── */

export type DemoMode = 'fill' | 'clear'

const DEMO_EVENT = 'siply:demo'

export function fireDemo(mode: DemoMode) {
  window.dispatchEvent(new CustomEvent<DemoMode>(DEMO_EVENT, { detail: mode }))
}

/** Registra un handler per il FAB demo. Nessuna dep array: l'handler viene
 *  riagganciato a ogni render così legge sempre lo stato aggiornato. */
export function useDemo(handler: (mode: DemoMode) => void) {
  useEffect(() => {
    const fn = (e: Event) => handler((e as CustomEvent<DemoMode>).detail)
    window.addEventListener(DEMO_EVENT, fn)
    return () => window.removeEventListener(DEMO_EVENT, fn)
  })
}

/* ── Auth ── */
export const DEMO_AUTH = {
  nome: 'Marco Ferretti',
  cantina: 'Cantina Ferretti',
  regione: 'Toscana',
  email: 'marco@cantinaferretti.it',
  password: 'siply2025',
}

/* ── Nuova Cassa ──
   Le chiavi sono gli id di WINES in data/wines.ts:
   1 = Brunello (listino 42) · 2 = Barolo (58) · 3 = Chianti Riserva (24).
   Le quantità sommano a 6, il massimo previsto per una cassa GDA. */
export const DEMO_CASSA = {
  /** usato solo se non esiste ancora nessun GDA a cui agganciarsi */
  gdaNome: 'GDA Nordeuropa 2025',
  quantita: { '1': 3, '2': 2, '3': 1 } as Record<string, number>,
  /** prezzo di vendita GDA scontato, € / bottiglia */
  prezziScontati: { '1': '36', '2': '49', '3': '20' } as Record<string, string>,
  /** costo di produzione, € / bottiglia */
  costiUnitari: { '1': '17', '2': '24', '3': '9' } as Record<string, string>,
  nome: 'Selezione Toscana & Piemonte 2025',
  note: "Selezione pensata per il mercato nordeuropeo. Disponibilità confermata fino a dicembre, possibilità di rifornimento entro 3 settimane.",
  locationSpedizione: 'Via delle Cantine 12, Montalcino (SI) — Toscana',
  noteSpedizione: 'Le casse di Barolo partono dal deposito di Alba (CN). Ritiro solo dal lunedì al giovedì, 8:00–13:00.',
  /** obiettivi di vendita sull'intero GDA, non sulla singola cassa */
  obiettivi: [600, 1200, 2400],
}

/** File finto per il campo "Listino pubblico (PDF)". */
export function demoListino(): File {
  return new File([new Uint8Array(248 * 1024)], 'listino-cantina-ferretti-2025.pdf', {
    type: 'application/pdf',
  })
}

/* ── Chat ── */
export const DEMO_CHAT = "Buongiorno, avrei bisogno di capire se posso ancora modificare il prezzo di acquisto su questa cassa."
