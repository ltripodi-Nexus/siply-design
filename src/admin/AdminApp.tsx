import { useEffect, useState } from 'react'
import { C, alpha } from '../colors'
import * as M from '../motion'
import { AnimatePresence } from '../motion'
import BottomNav, { ICONE, type Tab } from '../components/BottomNav'
import Footer from '../components/Footer'
import * as Icon from '../components/Icons'
import RichiesteScreen from '../screens/admin/RichiesteScreen'
import ChatAdminScreen from '../screens/admin/ChatAdminScreen'
import StatisticheScreen from '../screens/admin/StatisticheScreen'
import { useAdmin } from './stato'

/* Il lato Siply. Stessa scocca dell'app del produttore — stessa barra, stesso
   footer, stesse animazioni fra le schermate — ma tre destinazioni diverse:
   le richieste da valutare, le conversazioni e i numeri. */

type Vista = 'richieste' | 'chat' | 'statistiche'

const TAB: Tab[] = [
  { id: 'richieste', label: 'Richieste', icon: ICONE.ListaIcon },
  { id: 'chat', label: 'Chat', icon: ICONE.ChatIcon },
  { id: 'statistiche', label: 'Statistiche', icon: ICONE.GraficoIcon },
]

export default function AdminApp({ onEsci }: { onEsci: () => void }) {
  const [vista, setVista] = useState<Vista>('richieste')
  /** conversazione aperta; vive qui perché ci si arriva anche dalle richieste */
  const [apertaId, setApertaId] = useState<string | null>(null)
  const a = useAdmin()

  useEffect(() => { window.scrollTo({ top: 0 }) }, [vista])

  /** Dalle richieste si entra direttamente nella conversazione: è lì che si
   *  decide, e passare dall'elenco delle chat sarebbe un giro a vuoto. */
  const apriRichiesta = (id: string) => {
    setApertaId(id)
    setVista('chat')
  }

  return (
    <div className="max-w-7xl mx-auto" style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="app-content" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Striscia che ricorda dove si è: le due versioni si somigliano
            troppo perché ci si possa fidare della memoria. */}
        <div style={{ backgroundColor: C.magenta, padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Icon.Lucchetto size={13} color={C.bg} blob={null} />
          <p style={{ color: C.bg, fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Area Siply — gestione richieste
          </p>
          <M.Chip
            onClick={onEsci}
            style={{ background: alpha(C.white, 0.18), border: 'none', color: C.bg, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', cursor: 'pointer' }}
          >
            Esci
          </M.Chip>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {vista === 'richieste' && (
            <M.Page key="richieste">
              <RichiesteScreen richieste={a.richieste} onApri={r => apriRichiesta(r.id)} />
            </M.Page>
          )}
          {vista === 'chat' && (
            <M.Page key="chat">
              <ChatAdminScreen
                richieste={a.richieste}
                messaggi={a.messaggi}
                proposte={a.proposte}
                documenti={a.documenti}
                apertaId={apertaId}
                onApri={setApertaId}
                onInvia={a.invia}
                onProponi={a.proponi}
                onRispondiProposta={a.rispondiProposta}
                onDecidi={a.decidi}
              />
            </M.Page>
          )}
          {vista === 'statistiche' && (
            <M.Page key="statistiche">
              <StatisticheScreen richieste={a.richieste} />
            </M.Page>
          )}
        </AnimatePresence>
        <Footer />
      </div>
      <BottomNav current={vista} onChange={v => setVista(v as Vista)} tabs={TAB} />
    </div>
  )
}
