import { WINES } from '../data/wines'
import type { Bottiglia, Cassa } from '../App'
import type { Traguardo } from '../traguardi'

/* ──────────────────────────────────────────────────────────────────────────
   I dati del lato Siply.

   Il produttore vede i propri GDA; qui si vedono quelli di tutti, e servono
   abbastanza cantine, regioni ed esiti diversi perché le statistiche dicano
   qualcosa invece di essere tre barrette a caso.

   Le cifre economiche non sono scritte a mano una per una: si generano dal
   listino con `cassa()`. A mano sarebbero centinaia di numeri da tenere
   coerenti, e il primo refuso passerebbe inosservato.
   ────────────────────────────────────────────────────────────────────────── */

export type StatoRichiesta = 'pending_approval' | 'approved' | 'refused'

export interface Produttore {
  id: string
  cantina: string
  referente: string
  regione: string
  citta: string
  email: string
}

export const PRODUTTORI: Produttore[] = [
  { id: 'pr1', cantina: 'Cantina Ferretti', referente: 'Marco Ferretti', regione: 'Toscana', citta: 'Montalcino (SI)', email: 'marco@cantinaferretti.it' },
  { id: 'pr2', cantina: 'Tenute Rossi', referente: 'Anna Rossi', regione: 'Piemonte', citta: 'Barolo (CN)', email: 'anna@tenuterossi.it' },
  { id: 'pr3', cantina: 'Podere Vinci', referente: 'Luca Vinci', regione: 'Toscana', citta: 'Greve in Chianti (FI)', email: 'luca@poderevinci.it' },
  { id: 'pr4', cantina: 'Famiglia Borghetti', referente: 'Elena Borghetti', regione: 'Veneto', citta: 'Negrar (VR)', email: 'elena@borghetti.wine' },
  { id: 'pr5', cantina: 'Masseria Del Sud', referente: 'Giuseppe Chiaro', regione: 'Puglia', citta: 'Manduria (TA)', email: 'g.chiaro@masseriadelsud.it' },
  { id: 'pr6', cantina: 'Vulcano Wines', referente: 'Sara Interlandi', regione: 'Sicilia', citta: 'Randazzo (CT)', email: 'sara@vulcanowines.it' },
  { id: 'pr7', cantina: 'Cascina Bianca', referente: 'Paolo Neri', regione: 'Piemonte', citta: 'Gavi (AL)', email: 'paolo@cascinabianca.it' },
  { id: 'pr8', cantina: 'Vigna Adriatica', referente: 'Ilaria Di Nardo', regione: 'Abruzzo', citta: 'Ortona (CH)', email: 'ilaria@vignaadriatica.it' },
]

export const produttore = (id: string) => PRODUTTORI.find(p => p.id === id)!

/**
 * Vini caricati dai produttori, che nel catalogo Siply non c'erano.
 * L'id che parte per `p-` è quello che distingue le due provenienze in tutte
 * le statistiche: un flag in più su ogni bottiglia sarebbe una cosa da tenere
 * allineata a mano per sempre.
 */
export const VINI_PRODUTTORE: Bottiglia[] = [
  { id: 'p-1', nome: 'Rosso di Montalcino', annata: 2021, denominazione: 'DOC', prezzo: 26, produttore: 'Cantina Ferretti' },
  { id: 'p-2', nome: 'Barbaresco Asili', annata: 2019, denominazione: 'DOCG', prezzo: 54, produttore: 'Tenute Rossi' },
  { id: 'p-3', nome: 'Vin Santo del Chianti', annata: 2016, denominazione: 'DOC', prezzo: 38, produttore: 'Podere Vinci' },
  { id: 'p-4', nome: 'Valpolicella Ripasso', annata: 2020, denominazione: 'DOC', prezzo: 21, produttore: 'Famiglia Borghetti' },
  { id: 'p-5', nome: 'Fiano Salento', annata: 2022, denominazione: 'IGT', prezzo: 13, produttore: 'Masseria Del Sud' },
  { id: 'p-6', nome: 'Carricante Etna Bianco', annata: 2021, denominazione: 'DOC', prezzo: 24, produttore: 'Vulcano Wines' },
  { id: 'p-7', nome: 'Cerasuolo d\'Abruzzo', annata: 2022, denominazione: 'DOC', prezzo: 11, produttore: 'Vigna Adriatica' },
]

const TUTTI: Bottiglia[] = [...WINES, ...VINI_PRODUTTORE]

/** `true` se la bottiglia arriva dal nostro catalogo, `false` se l'ha creata il produttore. */
export const daCatalogo = (b: Bottiglia) => !b.id.startsWith('p-')

export const vino = (id: string) => TUTTI.find(w => w.id === id)!

/** Arrotonda ai 50 centesimi: i prezzi del vino si scrivono così. */
const mezzo = (n: number) => Math.round(n * 2) / 2

/**
 * Una cassa a partire dai vini e da uno sconto.
 * Il prezzo scontato scende del `sconto` sul listino, quello a cui il
 * produttore vende a Siply sta il 28% sotto lo scontato, il costo di
 * produzione al 42% del listino: proporzioni verosimili e, soprattutto,
 * sempre coerenti fra loro.
 */
function cassa(id: string, nome: string, voci: [string, number][], sconto: number, note?: string): Cassa {
  const bottiglie = voci.map(([wid, q]) => ({ bottiglia: vino(wid), quantita: q }))
  const prezziScontati: Record<string, string> = {}
  const costiScontati: Record<string, string> = {}
  const costiUnitari: Record<string, string> = {}
  for (const { bottiglia } of bottiglie) {
    const scontato = mezzo(bottiglia.prezzo * (1 - sconto / 100))
    prezziScontati[bottiglia.id] = String(scontato)
    costiScontati[bottiglia.id] = String(mezzo(scontato * 0.72))
    costiUnitari[bottiglia.id] = String(mezzo(bottiglia.prezzo * 0.42))
  }
  const principale = bottiglie.reduce((a, b) => (a.quantita >= b.quantita ? a : b))
  return {
    id,
    nome,
    bottiglia: principale.bottiglia,
    quantita: bottiglie.reduce((s, b) => s + b.quantita, 0),
    bottiglie: bottiglie.length > 1 ? bottiglie : undefined,
    note,
    prezziScontati,
    costiUnitari,
    costiScontati,
  }
}

export interface Richiesta {
  id: string
  nome: string
  produttoreId: string
  stato: StatoRichiesta
  /** giorno in cui è arrivata a noi */
  dataInvio: string
  casse: Cassa[]
  traguardi: Traguardo[]
  locationSpedizione: string
  /** nota del produttore al team */
  nota?: string
  /** motivo del rifiuto, scritto da noi */
  motivoRifiuto?: string
}

export const RICHIESTE: Richiesta[] = [
  /* ── In attesa: sono queste che devono saltare all'occhio ───────────────── */
  {
    id: 'r1', nome: 'GDA Nordeuropa Autunno', produttoreId: 'pr1', stato: 'pending_approval',
    dataInvio: '2026-07-29',
    traguardi: [{ bottiglie: 600, sconto: 0 }, { bottiglie: 1200, sconto: 5 }, { bottiglie: 2400, sconto: 10 }],
    locationSpedizione: 'Via delle Cantine 12, Montalcino (SI)',
    nota: 'Selezione pensata per il mercato nordeuropeo. Disponibilità confermata fino a dicembre.',
    casse: [
      cassa('r1c1', 'Toscana Classica', [['1', 3], ['3', 2], ['p-1', 1]], 14, 'Annata molto buona sul Brunello.'),
      cassa('r1c2', 'Rossi da invecchiamento', [['1', 2], ['5', 4]], 12),
    ],
  },
  {
    id: 'r2', nome: 'GDA Ristorazione Milano', produttoreId: 'pr4', stato: 'pending_approval',
    dataInvio: '2026-07-27',
    traguardi: [{ bottiglie: 900, sconto: 0 }, { bottiglie: 1800, sconto: 5 }],
    locationSpedizione: 'Via Valpolicella 8, Negrar (VR)',
    nota: 'Ci interessa il canale ristorazione: possiamo garantire rifornimento settimanale.',
    casse: [
      cassa('r2c1', 'Veneto in tavola', [['4', 2], ['p-4', 3], ['9', 1]], 18),
    ],
  },
  {
    id: 'r3', nome: 'GDA Enoteche Sicilia', produttoreId: 'pr6', stato: 'pending_approval',
    dataInvio: '2026-07-24',
    traguardi: [{ bottiglie: 450, sconto: 0 }],
    locationSpedizione: 'Contrada Feudo, Randazzo (CT)',
    casse: [
      cassa('r3c1', 'Etna in purezza', [['8', 3], ['p-6', 3]], 10),
      cassa('r3c2', 'Vulcanici', [['8', 6]], 15),
    ],
  },
  {
    id: 'r4', nome: 'GDA Estate Puglia', produttoreId: 'pr5', stato: 'pending_approval',
    dataInvio: '2026-07-18',
    traguardi: [{ bottiglie: 1500, sconto: 0 }, { bottiglie: 3000, sconto: 5 }],
    locationSpedizione: 'SP 66 km 4, Manduria (TA)',
    nota: 'Volumi alti, prezzo aggressivo: puntiamo alla grande distribuzione.',
    casse: [
      cassa('r4c1', 'Sud pieno', [['6', 4], ['10', 2]], 22),
      cassa('r4c2', 'Bianchi del Salento', [['p-5', 6]], 20),
    ],
  },
  {
    id: 'r5', nome: 'GDA Bianchi Piemonte', produttoreId: 'pr7', stato: 'pending_approval',
    dataInvio: '2026-07-11',
    traguardi: [{ bottiglie: 720, sconto: 0 }],
    locationSpedizione: 'Strada Gavi 21, Gavi (AL)',
    casse: [
      cassa('r5c1', 'Gavi selezione', [['11', 6]], 12),
    ],
  },

  /* ── Approvate ──────────────────────────────────────────────────────────── */
  {
    id: 'r6', nome: 'GDA Primavera Toscana', produttoreId: 'pr1', stato: 'approved',
    dataInvio: '2026-05-14',
    traguardi: [{ bottiglie: 800, sconto: 0 }, { bottiglie: 1600, sconto: 5 }],
    locationSpedizione: 'Via delle Cantine 12, Montalcino (SI)',
    casse: [
      cassa('r6c1', 'Sangiovese in tre annate', [['1', 2], ['3', 2], ['5', 2]], 15),
    ],
  },
  {
    id: 'r7', nome: 'GDA Grandi Rossi', produttoreId: 'pr2', stato: 'approved',
    dataInvio: '2026-04-02',
    traguardi: [{ bottiglie: 500, sconto: 0 }, { bottiglie: 1000, sconto: 5 }, { bottiglie: 2000, sconto: 10 }],
    locationSpedizione: 'Via Roma 4, Barolo (CN)',
    casse: [
      cassa('r7c1', 'Nebbiolo alto', [['2', 3], ['p-2', 3]], 10),
      cassa('r7c2', 'Barolo verticale', [['2', 6]], 8),
    ],
  },
  {
    id: 'r8', nome: 'GDA Chianti Selection', produttoreId: 'pr3', stato: 'approved',
    dataInvio: '2026-03-19',
    traguardi: [{ bottiglie: 1000, sconto: 0 }],
    locationSpedizione: 'Via Chiantigiana 77, Greve in Chianti (FI)',
    casse: [
      cassa('r8c1', 'Chianti e dintorni', [['3', 4], ['p-3', 2]], 16),
    ],
  },
  {
    id: 'r9', nome: 'GDA Natale 2025', produttoreId: 'pr1', stato: 'approved',
    dataInvio: '2025-11-08',
    traguardi: [{ bottiglie: 1200, sconto: 0 }],
    locationSpedizione: 'Via delle Cantine 12, Montalcino (SI)',
    casse: [
      cassa('r9c1', 'Regalo Toscana', [['1', 3], ['5', 3]], 12),
    ],
  },
  {
    id: 'r10', nome: 'GDA Pesce e bollicine', produttoreId: 'pr8', stato: 'approved',
    dataInvio: '2026-02-27',
    traguardi: [{ bottiglie: 600, sconto: 0 }],
    locationSpedizione: 'Via Adriatica 3, Ortona (CH)',
    casse: [
      cassa('r10c1', 'Freschi di costa', [['7', 3], ['p-7', 3]], 18),
    ],
  },

  /* ── Rifiutate ──────────────────────────────────────────────────────────── */
  {
    id: 'r11', nome: 'GDA Enoteche Veneto', produttoreId: 'pr4', stato: 'refused',
    dataInvio: '2026-06-05',
    traguardi: [{ bottiglie: 300, sconto: 0 }],
    locationSpedizione: 'Via Valpolicella 8, Negrar (VR)',
    motivoRifiuto: 'Fascia di prezzo fuori dalla selezione attiva: servono bottiglie fra €15 e €35.',
    casse: [
      cassa('r11c1', 'Amarone selection', [['4', 6]], 6),
    ],
  },
  {
    id: 'r12', nome: 'GDA Sfusi Puglia', produttoreId: 'pr5', stato: 'refused',
    dataInvio: '2026-05-21',
    traguardi: [{ bottiglie: 2000, sconto: 0 }],
    locationSpedizione: 'SP 66 km 4, Manduria (TA)',
    motivoRifiuto: 'Sconto proposto troppo alto: il margine per il produttore scendeva sotto il costo.',
    casse: [
      cassa('r12c1', 'Primitivo base', [['6', 6]], 34),
    ],
  },
  {
    id: 'r13', nome: 'GDA Test Autunno', produttoreId: 'pr5', stato: 'refused',
    dataInvio: '2026-01-15',
    traguardi: [{ bottiglie: 400, sconto: 0 }],
    locationSpedizione: 'SP 66 km 4, Manduria (TA)',
    motivoRifiuto: 'Documentazione del listino mancante.',
    casse: [
      cassa('r13c1', 'Misto Sud', [['10', 3], ['6', 3]], 25),
    ],
  },
  {
    id: 'r14', nome: 'GDA Bianchi Sardegna', produttoreId: 'pr6', stato: 'refused',
    dataInvio: '2025-12-02',
    traguardi: [{ bottiglie: 500, sconto: 0 }],
    locationSpedizione: 'Contrada Feudo, Randazzo (CT)',
    motivoRifiuto: 'Quantità non sufficienti a coprire il primo traguardo.',
    casse: [
      cassa('r14c1', 'Bianchi isolani', [['7', 6]], 12),
    ],
  },
]

/* ── Messaggi di partenza di ogni conversazione ──────────────────────────── */

export interface MsgIniziale {
  da: 'siply' | 'produttore'
  testo: string
  ora: string
}

/** Due battute per thread: la chat non parte mai da vuota. */
export const CONVERSAZIONI: Record<string, MsgIniziale[]> = {
  r1: [
    { da: 'produttore', testo: 'Buongiorno! Ho caricato le due casse per il GDA autunnale, fatemi sapere se i prezzi vanno bene.', ora: '09:12' },
    { da: 'siply', testo: 'Ciao Marco, grazie: la stiamo guardando adesso. Ti diciamo qualcosa entro domani.', ora: '09:40' },
  ],
  r2: [
    { da: 'produttore', testo: 'Vi ho mandato la cassa per la ristorazione. Il Ripasso è quello nuovo, non era nel vostro catalogo.', ora: '15:02' },
  ],
  r3: [
    { da: 'produttore', testo: "Due casse dall'Etna. Sul bianco possiamo ragionare sul prezzo se serve.", ora: '11:25' },
  ],
  r4: [
    { da: 'produttore', testo: 'Come discusso, qui puntiamo ai volumi. Ditemi se lo sconto regge.', ora: '17:48' },
    { da: 'siply', testo: 'Ricevuto Giuseppe. Verifichiamo i margini e ti scriviamo.', ora: '18:03' },
  ],
  r5: [
    { da: 'produttore', testo: 'Solo Gavi per ora, se funziona aggiungiamo il resto della linea.', ora: '10:05' },
  ],
  r6: [
    { da: 'siply', testo: 'GDA approvato e pubblicato sul catalogo. Complimenti per la selezione!', ora: '14:30' },
    { da: 'produttore', testo: 'Grazie mille! Quando sarà visibile agli acquirenti?', ora: '14:52' },
    { da: 'siply', testo: 'Già da oggi pomeriggio. Buone vendite!', ora: '15:00' },
  ],
  r7: [
    { da: 'siply', testo: 'Approvato. Abbiamo tenuto il prezzo che avevi proposto sul Barbaresco.', ora: '11:10' },
  ],
  r8: [
    { da: 'siply', testo: 'Tutto in regola, GDA approvato. Il Vin Santo lo mettiamo in evidenza in home.', ora: '16:20' },
  ],
  r9: [
    { da: 'siply', testo: 'Approvato in tempo per le feste. Documento emesso e allegato.', ora: '09:30' },
  ],
  r10: [
    { da: 'siply', testo: 'Approvato! Ottimo rapporto qualità prezzo sui bianchi.', ora: '12:45' },
  ],
  r11: [
    { da: 'siply', testo: "Purtroppo l'Amarone da solo esce dalla fascia di prezzo della selezione attiva.", ora: '10:00' },
    { da: 'produttore', testo: 'Capito. Posso proporre il Ripasso a €21?', ora: '10:12' },
    { da: 'siply', testo: 'Sì, aprine uno nuovo con quello e lo valutiamo volentieri.', ora: '10:15' },
  ],
  r12: [
    { da: 'siply', testo: 'Con questo sconto il tuo margine va sotto il costo di produzione: non possiamo approvarlo così.', ora: '15:30' },
  ],
  r13: [
    { da: 'siply', testo: 'Ci manca il PDF del listino ufficiale. Senza quello non possiamo procedere.', ora: '08:50' },
  ],
  r14: [
    { da: 'siply', testo: 'Le quantità non coprono il primo traguardo dichiarato. Rivediamo i numeri insieme?', ora: '13:15' },
  ],
}
