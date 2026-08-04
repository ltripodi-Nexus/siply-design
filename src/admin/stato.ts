import { useCallback, useState } from 'react'
import type { Allegato } from '../screens/ChatScreen'
import { CONVERSAZIONI, RICHIESTE, type Richiesta, type StatoRichiesta } from './dati'

/* ──────────────────────────────────────────────────────────────────────────
   Lo stato del lato Siply: richieste, conversazioni, proposte di modifica e
   documenti emessi.

   Sta tutto in un posto perché le quattro cose si muovono insieme: accettare
   una proposta cambia il prezzo dentro la richiesta, approvare una richiesta
   emette un documento e scrive in chat. Sparpagliato fra le schermate, il
   riepilogo direbbe una cosa e la chat un'altra.
   ────────────────────────────────────────────────────────────────────────── */

/** Quale dei due prezzi si sta ritrattando. */
export type CampoPrezzo = 'gda' | 'siply'

export const NOME_CAMPO: Record<CampoPrezzo, string> = {
  gda: 'Prezzo scontato GDA',
  siply: 'Prezzo acquisto Siply',
}

export interface Proposta {
  id: string
  richiestaId: string
  cassaId: string
  vinoId: string
  vinoNome: string
  campo: CampoPrezzo
  da: number
  a: number
  nota?: string
  stato: 'attesa' | 'accettata' | 'rifiutata'
}

export interface Messaggio {
  id: string
  da: 'siply' | 'produttore'
  ora: string
  testo?: string
  /** il messaggio è una proposta di modifica prezzo */
  propostaId?: string
  /** il messaggio è il documento emesso all'approvazione */
  documento?: boolean
  /** casse o bottiglie della richiesta agganciate al messaggio */
  allegati?: Allegato[]
}

export interface Documento {
  protocollo: string
  data: string
}

function ora() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

let seq = 0
const nuovoId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

/** Il numero di protocollo del documento: anno + progressivo, come una fattura. */
const protocollo = (n: number) => `SIP-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`

function conversazioniIniziali(): Record<string, Messaggio[]> {
  const out: Record<string, Messaggio[]> = {}
  for (const r of RICHIESTE) {
    out[r.id] = (CONVERSAZIONI[r.id] ?? []).map((m, i) => ({
      id: `${r.id}-m${i}`,
      da: m.da,
      testo: m.testo,
      ora: m.ora,
    }))
  }
  return out
}

export function useAdmin() {
  const [richieste, setRichieste] = useState<Richiesta[]>(RICHIESTE)
  const [messaggi, setMessaggi] = useState<Record<string, Messaggio[]>>(conversazioniIniziali)
  const [proposte, setProposte] = useState<Proposta[]>([])
  const [documenti, setDocumenti] = useState<Record<string, Documento>>({})

  const aggiungi = (richiestaId: string, m: Omit<Messaggio, 'id' | 'ora'> & { ora?: string }) =>
    setMessaggi(p => ({
      ...p,
      [richiestaId]: [...(p[richiestaId] ?? []), { id: nuovoId('m'), ora: m.ora ?? ora(), ...m }],
    }))

  /** Scrive un messaggio dal lato Siply e finge una risposta del produttore. */
  const invia = useCallback((richiestaId: string, testo: string, allegati?: Allegato[]) => {
    aggiungi(richiestaId, { da: 'siply', testo, allegati: allegati?.length ? allegati : undefined })
    window.setTimeout(() => {
      aggiungi(richiestaId, {
        da: 'produttore',
        testo: RISPOSTE[Math.floor(Math.random() * RISPOSTE.length)],
      })
    }, 1500)
  }, [])

  const proponi = useCallback((p: Omit<Proposta, 'id' | 'stato'>) => {
    const proposta: Proposta = { ...p, id: nuovoId('p'), stato: 'attesa' }
    setProposte(prev => [...prev, proposta])
    aggiungi(p.richiestaId, { da: 'siply', propostaId: proposta.id })
  }, [])

  /**
   * Il produttore risponde alla proposta. Accettandola il prezzo cambia
   * davvero dentro la richiesta: da quel momento il riepilogo, i totali e le
   * stime raccontano il prezzo nuovo, che è il punto di tutta la trattativa.
   */
  const rispondiProposta = useCallback((p: Proposta, accetta: boolean) => {
    setProposte(prev => prev.map(x => x.id === p.id ? { ...x, stato: accetta ? 'accettata' : 'rifiutata' } : x))
    if (accetta) {
      setRichieste(rs => rs.map(r => r.id !== p.richiestaId ? r : {
        ...r,
        casse: r.casse.map(c => {
          if (c.id !== p.cassaId) return c
          const chiave = p.campo === 'gda' ? 'prezziScontati' : 'costiScontati'
          return { ...c, [chiave]: { ...(c[chiave] ?? {}), [p.vinoId]: String(p.a) } }
        }),
      }))
    }
    aggiungi(p.richiestaId, {
      da: 'produttore',
      testo: accetta
        ? `Va bene, accetto: ${NOME_CAMPO[p.campo].toLowerCase()} di ${p.vinoNome} a €${p.a.toFixed(2)}.`
        : `Su ${p.vinoNome} non me la sento, preferirei restare a €${p.da.toFixed(2)}.`,
    })
  }, [])

  const decidi = useCallback((richiestaId: string, stato: StatoRichiesta, motivo?: string) => {
    setRichieste(prev => prev.map(r => r.id === richiestaId ? { ...r, stato, motivoRifiuto: stato === 'refused' ? motivo : undefined } : r))
    if (stato === 'approved') {
      setDocumenti(prev => ({
        ...prev,
        [richiestaId]: {
          protocollo: protocollo(Object.keys(prev).length + 1),
          data: new Date().toISOString().slice(0, 10),
        },
      }))
      aggiungi(richiestaId, { da: 'siply', testo: 'Richiesta approvata: il GDA è in regola e va sul catalogo. Qui sotto il documento.' })
      aggiungi(richiestaId, { da: 'siply', documento: true })
    } else {
      aggiungi(richiestaId, { da: 'siply', testo: `Richiesta non approvata. ${motivo ?? ''}`.trim() })
    }
  }, [])

  return { richieste, messaggi, proposte, documenti, invia, proponi, rispondiProposta, decidi }
}

const RISPOSTE = [
  'Perfetto, grazie! Resto in attesa.',
  'Chiaro. Ne parlo in cantina e vi faccio sapere.',
  'Ottimo, per me si può procedere così.',
  'Grazie del riscontro rapido!',
]
