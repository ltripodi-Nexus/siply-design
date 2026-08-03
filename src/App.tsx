import { useState, useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import * as M from './motion'
import { C } from './colors'
import img458 from './imports/Frame_458.png'
import img459 from './imports/Frame_459.png'
import AuthScreen from './screens/AuthScreen'
import DashboardScreen from './screens/DashboardScreen'
import GdaScreen from './screens/GdaScreen'
import GdaDetailScreen from './screens/GdaDetailScreen'
import NuovoGdaScreen from './screens/NuovoGdaScreen'
import ChatScreen from './screens/ChatScreen'
import BottomNav from './components/BottomNav'
import DemoFab from './components/DemoFab'
import Footer from './components/Footer'

export type Screen = 'auth' | 'dashboard' | 'gda' | 'gda-detail' | 'nuovo-gda' | 'chat'

export interface User {
  nome: string
  cantina: string
  email: string
  regione: string
}

export interface Bottiglia {
  id: string
  nome: string
  annata: number
  denominazione: string
  prezzo: number
  immagine?: string
  produttore: string
}

export interface CassaBottiglia {
  bottiglia: Bottiglia
  quantita: number
}

/** Unità da 6 bottiglie. Vive sempre dentro un GDA, non ha vita propria. */
export interface Cassa {
  id: string
  nome: string
  bottiglia: Bottiglia          // vino principale (più bottiglie, o unico vino)
  quantita: number              // bottiglie totali, max 6
  bottiglie?: CassaBottiglia[]  // tutti i vini quando la cassa è mista
  note?: string
  // Dati economici inseriti nel wizard, per id vino. Stanno qui e non nel wizard
  // così una bozza ripresa ritrova i prezzi già battuti.
  // Quanto incassa il produttore non si scrive: è il prezzo scontato meno la
  // commissione Siply (vedi src/economia.ts).
  prezziScontati?: Record<string, string>
  costiUnitari?: Record<string, string>
}

/** `bozza` = creazione mai finalizzata, modificabile e non ancora vista da Siply. */
export type GdaStatus = 'bozza' | 'pending_approval' | 'approved' | 'refused'

/** Entità principale: il gruppo d'acquisto. Stato, approvazione e chat stanno qui. */
export interface Gda {
  id: string
  nome: string
  status: GdaStatus
  dataCreazione: string
  casse: Cassa[]
  /** Obiettivi di bottiglie sull'intero GDA, in ordine crescente. Più di uno:
   *  il gruppo può fermarsi al primo scaglione o arrivare in fondo, e ognuno
   *  ha la sua stima di ricavi. */
  obiettivi?: number[]
  /** Indirizzo da cui parte la merce. Vale per tutto il GDA, non per la singola
   *  cassa: si spedisce dalla cantina, non da una cassa. */
  locationSpedizione?: string
  /** Casi particolari sulla spedizione: altri indirizzi, orari, vincoli. */
  noteSpedizione?: string
  note?: string
}

/** Quello che il wizard consegna: i campi del GDA, senza id né stato. */
export interface GdaPayload {
  nome: string
  casse: Cassa[]
  obiettivi?: number[]
  locationSpedizione?: string
  noteSpedizione?: string
}

export function cassaTotale(c: Cassa): number {
  return c.bottiglie
    ? c.bottiglie.reduce((s, b) => s + b.bottiglia.prezzo * b.quantita, 0)
    : c.bottiglia.prezzo * c.quantita
}

export function gdaBottiglie(g: Gda): number {
  return g.casse.reduce((s, c) => s + c.quantita, 0)
}

export function gdaTotale(g: Gda): number {
  return g.casse.reduce((s, c) => s + cassaTotale(c), 0)
}

const mockUser: User = {
  nome: 'Marco Ferretti',
  cantina: 'Cantina Ferretti',
  email: 'marco@cantinaferretti.it',
  regione: 'Toscana',
}

const mockBottiglie: Bottiglia[] = [
  { id: '1', nome: 'Brunello di Montalcino', annata: 2019, denominazione: 'DOCG', prezzo: 42, produttore: 'Cantina Ferretti', immagine: img458 },
  { id: '2', nome: 'Barolo Cannubi', annata: 2018, denominazione: 'DOCG', prezzo: 58, produttore: 'Tenute Rossi', immagine: img459 },
  { id: '3', nome: 'Chianti Classico Riserva', annata: 2020, denominazione: 'DOCG', prezzo: 24, produttore: 'Podere Vinci', immagine: img458 },
  { id: '4', nome: 'Amarone della Valpolicella', annata: 2017, denominazione: 'DOCG', prezzo: 65, produttore: 'Famiglia Borghetti', immagine: img459 },
]

const mockGda: Gda[] = [
  {
    id: 'g1',
    nome: 'GDA Nordeuropa 2025',
    status: 'approved',
    dataCreazione: '2025-03-12',
    note: 'Perfetto per il mercato nordeuropeo',
    locationSpedizione: 'Via delle Cantine 12, Montalcino (SI) — Toscana',
    noteSpedizione: 'Per ordini oltre le 20 casse si spedisce dal deposito di Firenze.',
    obiettivi: [600, 1200, 2400],
    casse: [
      { id: 'c1', nome: 'Estate Selection 2019', bottiglia: mockBottiglie[0], quantita: 6 },
      { id: 'c2', nome: 'Grandi Rossi Piemontesi', bottiglia: mockBottiglie[1], quantita: 6 },
    ],
  },
  {
    id: 'g2',
    nome: 'GDA Ristorazione Milano',
    status: 'pending_approval',
    dataCreazione: '2025-04-28',
    locationSpedizione: 'Via delle Cantine 12, Montalcino (SI) — Toscana',
    obiettivi: [900],
    casse: [
      { id: 'c3', nome: 'Toscana Classica', bottiglia: mockBottiglie[2], quantita: 6 },
    ],
  },
  {
    id: 'g3',
    nome: 'GDA Enoteche Veneto',
    status: 'refused',
    dataCreazione: '2025-02-15',
    note: 'Non rientra nella fascia di prezzo della selezione attiva',
    casse: [
      { id: 'c4', nome: 'Amarone Selection', bottiglia: mockBottiglie[3], quantita: 6 },
    ],
  },
]

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [gdaList, setGdaList] = useState<Gda[]>(mockGda)
  const [selectedGda, setSelectedGda] = useState<Gda | null>(null)
  const [chatGdaId, setChatGdaId] = useState<string | null>(null)
  /** GDA a cui il wizard sta aggiungendo casse; null = si sta creando un GDA nuovo */
  const [aggiungiAGdaId, setAggiungiAGdaId] = useState<string | null>(null)

  /* Ogni schermata riparte dall'alto. Senza, chi era sceso fino al footer
     cambiando scheda si ritrovava a metà della pagina nuova.
     A scorrere è la finestra e non `.app-content`: la shell cresce in
     min-height, quindi il suo overflow interno non entra mai in gioco. */
  useEffect(() => { window.scrollTo({ top: 0 }) }, [screen])

  const goNuovoGda =() => { setAggiungiAGdaId(null); setScreen('nuovo-gda') }
  /** Vale sia per aggiungere casse a un GDA in attesa che per riprendere una bozza. */
  const goAggiungiCassa = (g: Gda) => { setAggiungiAGdaId(g.id); setScreen('nuovo-gda') }

  /** Il tab "Nuovo GDA" deve sempre ripartire da un GDA vuoto. */
  const handleNav = (s: Screen) => {
    if (s === 'nuovo-gda') setAggiungiAGdaId(null)
    setScreen(s)
  }

  const gdaTarget = gdaList.find(g => g.id === aggiungiAGdaId) ?? null

  /** Il wizard consegna il GDA completo, oppure le nuove casse per un GDA esistente. */
  const handleCreata = (gdaId: string | null, d: GdaPayload) => {
    const { nome, casse, obiettivi, locationSpedizione, noteSpedizione } = d
    if (gdaId) {
      setGdaList(p => p.map(g => {
        if (g.id !== gdaId) return g
        // una bozza inviata diventa un GDA in attesa e porta con sé tutte le sue casse
        return g.status === 'bozza'
          ? { ...g, nome: nome.trim() || g.nome, status: 'pending_approval', casse, obiettivi, locationSpedizione, noteSpedizione }
          : { ...g, casse: [...g.casse, ...casse], obiettivi, locationSpedizione, noteSpedizione }
      }))
    } else {
      const nuovo: Gda = {
        id: `g${Date.now()}`,
        nome: nome.trim() || `GDA ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
        status: 'pending_approval',
        dataCreazione: new Date().toISOString().split('T')[0],
        casse,
        obiettivi,
        locationSpedizione,
        noteSpedizione,
      }
      setGdaList(p => [nuovo, ...p])
    }
    setAggiungiAGdaId(null)
    setScreen('gda')
  }

  /** Il wizard chiama questa uscendo senza inviare: quello che c'è resta come bozza. */
  const handleBozza = (gdaId: string | null, d: GdaPayload) => {
    const { nome, casse, obiettivi, locationSpedizione, noteSpedizione } = d
    // anche il solo indirizzo di partenza è lavoro fatto: vale la pena salvarlo
    const vuota = casse.length === 0 && !nome.trim() && !locationSpedizione?.trim()

    if (gdaId) {
      // una bozza svuotata del tutto sparisce, invece di restare come riga fantasma
      if (vuota) { setGdaList(p => p.filter(g => !(g.id === gdaId && g.status === 'bozza'))); return }
      setGdaList(p => p.map(g =>
        g.id === gdaId && g.status === 'bozza'
          ? { ...g, nome: nome.trim() || g.nome, casse, obiettivi, locationSpedizione, noteSpedizione }
          : g,
      ))
      return
    }

    if (vuota) return
    const bozza: Gda = {
      id: `g${Date.now()}`,
      nome: nome.trim() || `Bozza del ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`,
      status: 'bozza',
      dataCreazione: new Date().toISOString().split('T')[0],
      casse,
      obiettivi,
      locationSpedizione,
      noteSpedizione,
    }
    setGdaList(p => [bozza, ...p])
  }

  /* `mode="wait"` fa uscire la schermata vecchia prima di far entrare la nuova:
     senza, le due si sovrapporrebbero nel flusso e la pagina salterebbe.
     La shell dell'app resta un div normale, senza motion: un antenato con
     `transform` diventa il contenitore dei figli `position: fixed`, e la nav
     full-bleed e i modali a tutto schermo si romperebbero. */
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!isLoggedIn ? (
        <M.Page key="auth">
          <AuthScreen onLogin={() => setIsLoggedIn(true)} />
          <DemoFab />
        </M.Page>
      ) : (
        <div key="app" className="max-w-7xl mx-auto" style={{
          minHeight: '100vh', backgroundColor: C.bg,
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          <style>{`
            /* Niente padding in fondo: lo spazio per la nav fissa lo mette il
               footer dentro di sé, altrimenti fra la fine del footer e la nav
               resta scoperta una striscia chiara di sfondo. */
            .app-content { display: flex; flex-direction: column; padding-bottom: 0; padding-top: 0; }
            @media (min-width: 768px) { .app-content { padding-top: 60px; } }
          `}</style>
          <div className="app-content" style={{ flex: 1, overflowY: 'auto' }}>
            <AnimatePresence mode="wait" initial={false}>
              {screen === 'dashboard' && <M.Page key="dashboard"><DashboardScreen user={mockUser} gdaList={gdaList} onNuovoGda={goNuovoGda} onNavigate={handleNav} /></M.Page>}
              {screen === 'gda' && <M.Page key="gda"><GdaScreen gdaList={gdaList} onNuovoGda={goNuovoGda} onDetail={g => { setSelectedGda(g); setScreen('gda-detail') }} onChat={g => { setChatGdaId(g.id); setScreen('chat') }} onAggiungiCassa={goAggiungiCassa} /></M.Page>}
              {screen === 'gda-detail' && selectedGda && <M.Page key="gda-detail"><GdaDetailScreen gda={selectedGda} onBack={() => setScreen('gda')} /></M.Page>}
              {screen === 'nuovo-gda' && (
                <M.Page key="nuovo-gda">
                  <NuovoGdaScreen
                    key={aggiungiAGdaId ?? 'nuovo'}
                    gdaTarget={gdaTarget}
                    onCreata={handleCreata}
                    onBozza={handleBozza}
                    onAnnulla={() => { setAggiungiAGdaId(null); setScreen('gda') }}
                  />
                </M.Page>
              )}
              {screen === 'chat' && <M.Page key="chat"><ChatScreen user={mockUser} gdaList={gdaList} openGdaId={chatGdaId} onOpenHandled={() => setChatGdaId(null)} /></M.Page>}
            </AnimatePresence>
            {/* Sotto la schermata, dentro l'area che scorre: la pagina riempie
                comunque tutta l'altezza, quindi il footer si raggiunge scrollando. */}
            <Footer />
          </div>
          <BottomNav current={screen} onChange={handleNav} />
          <DemoFab />
        </div>
      )}
    </AnimatePresence>
  )
}
