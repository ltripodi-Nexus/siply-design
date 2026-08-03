import { alpha } from './colors'
import type { GdaStatus } from './App'

/**
 * Colori degli stati di un GDA, in un posto solo.
 *
 * I colori di marca al 15% di opacità non si distinguevano a colpo d'occhio:
 * l'ocra su bianco stava a 2.2:1 di contrasto (illeggibile) e il verde a 4.0:1,
 * sotto lo standard AA. Qui ogni stato ha due varianti, ognuna verificata:
 *
 *  - `solid` → badge pieni e barrette sulle card, con testo bianco sopra
 *  - `light` → testo e icone sul fondo scuro dell'header, dove i colori pieni
 *              sparirebbero (il magenta di marca su #212721 sta a 1.7:1)
 *
 * Sono le tinte di marca portate su una luminosità che regge il contrasto, non
 * colori nuovi: stesso verde salvia, stessa ocra, stesso magenta.
 */
export interface StatusColors {
  /** fondo dei badge e barretta laterale delle card (testo bianco sopra) */
  solid: string
  /** testo e icone sopra il fondo scuro */
  light: string
  /** velatura per i pannelli espansi */
  soft: string
}

export const STATUS: Record<GdaStatus, StatusColors> = {
  // contrasto bianco/solid 6.18:1 — light/scuro 7.11:1
  bozza: { solid: '#5F625F', light: '#AEB2AF', soft: alpha('#5F625F', 0.1) },
  // 5.04:1 — 8.45:1
  pending_approval: { solid: '#8A6A22', light: '#D6BE92', soft: alpha('#8A6A22', 0.12) },
  // 5.75:1 — 7.31:1
  approved: { solid: '#4A6E54', light: '#9DBBA3', soft: alpha('#4A6E54', 0.12) },
  // 9.14:1 — 4.83:1
  refused: { solid: '#910048', light: '#E0699A', soft: alpha('#910048', 0.09) },
}
