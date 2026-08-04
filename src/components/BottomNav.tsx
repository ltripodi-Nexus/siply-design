import { useEffect, useRef, type ReactElement } from 'react'
import { C, alpha } from '../colors'
import * as M from '../motion'
import { motion } from '../motion'
import * as Icon from './Icons'

/** Una voce della barra. Le due versioni dell'app hanno tab diversi ma la
 *  stessa barra: cambia l'elenco, non il componente. */
export interface Tab {
  id: string
  label: string
  icon: (p: { color: string }) => ReactElement
  /** altre schermate che tengono acceso questo tab (es. il dettaglio di un GDA) */
  anche?: string[]
}

interface Props {
  current: string
  onChange: (s: string) => void
  /** se assente vale la barra del produttore */
  tabs?: Tab[]
}

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function BoxIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" strokeLinejoin="round" />
      <path d="M12 3v18M3 8l9 5 9-5" strokeLinejoin="round" />
    </svg>
  )
}

function ChatIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinejoin="round" />
    </svg>
  )
}

function ListaIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )
}

function GraficoIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M6 21V11M11 21V5M16 21v-7M21 21v-4" />
    </svg>
  )
}

const TAB_PRODUTTORE: Tab[] = [
  { id: 'dashboard', label: 'Home', icon: HomeIcon },
  { id: 'gda', label: 'I miei GDA', icon: BoxIcon, anche: ['gda-detail'] },
  { id: 'nuovo-gda', label: 'Nuovo GDA', icon: PlusIcon },
  { id: 'chat', label: 'Chat', icon: ChatIcon },
]

export const ICONE = { HomeIcon, BoxIcon, PlusIcon, ChatIcon, GraficoIcon, ListaIcon }

export default function BottomNav({ current, onChange, tabs = TAB_PRODUTTORE }: Props) {
  const navRef = useRef<HTMLElement>(null)

  /**
   * Pubblica l'altezza reale della nav in `--siply-nav-h`.
   *
   * La nav è alta quanto il suo contenuto, non un numero fisso: chi le deve
   * stare sopra (la barra del totale, il footer) senza lasciare scoperta una
   * striscia di sfondo non può tirare a indovinare. Ricalcolata quando cambia,
   * per esempio al caricamento del font o girando lo schermo.
   */
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const scrivi = () =>
      document.documentElement.style.setProperty('--siply-nav-h', `${el.offsetHeight}px`)
    scrivi()
    const ro = new ResizeObserver(scrivi)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--siply-nav-h')
    }
  }, [])

  return (
    <>
      <style>{`
        /* La barra è full-bleed: il fondo scuro arriva ai bordi dello schermo. */
        .siply-nav {
          position: fixed;
          bottom: 0;
          top: auto;
          left: 0;
          right: 0;
          width: 100%;
          background-color: ${C.dark};
          border-top: 1px solid ${alpha(C.white, 0.08)};
          border-bottom: none;
          z-index: 50;
        }
        /* Il contenuto della nav resta allineato al contenuto della pagina (max-w-7xl). */
        .siply-nav-inner {
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 80rem;
          margin-inline: auto;
        }
        .siply-nav-brand { display: none; }
        .siply-nav-tabs {
          display: flex;
          flex: 1;
        }
        .siply-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 0 16px;
          background: none;
          border: none;
          cursor: pointer;
          position: relative;
          transition: opacity 0.15s;
        }
        .siply-nav-item span {
          font-size: 11px;
          font-weight: 500;
        }
        /* Niente translateX per centrare: l'animazione di layout scrive lei
           stessa la transform e cancellerebbe il -50%, sfalsando la barretta. */
        .siply-nav-indicator {
          position: absolute;
          top: 0; left: 50%; margin-left: -12px;
          width: 24px; height: 2px;
          border-radius: 0 0 2px 2px;
          background-color: ${C.magenta};
        }

        @media (min-width: 768px) {
          .siply-nav {
            top: 0;
            bottom: auto;
            border-top: none;
            border-bottom: 1px solid ${alpha(C.white, 0.08)};
            height: 60px;
          }
          .siply-nav-inner {
            height: 100%;
            padding: 0 24px;
          }
          .siply-nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-right: 32px;
            flex-shrink: 0;
          }
          .siply-nav-tabs {
            flex: 1;
            display: flex;
            gap: 4px;
            justify-content: flex-start;
          }
          .siply-nav-item {
            flex: none;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 10px;
          }
          .siply-nav-item span {
            font-size: 13px;
            font-weight: 600;
          }
          .siply-nav-indicator {
            top: auto; bottom: 0;
            left: 0; right: 0; margin-left: 0;
            width: 100%; height: 2px;
            border-radius: 2px 2px 0 0;
          }
        }
      `}</style>

      <nav ref={navRef} className="siply-nav">
        <div className="siply-nav-inner">
          {/* Brand — desktop only */}
          <div className="siply-nav-brand">
            <Icon.Logo height={30} />
          </div>

          {/* Tabs */}
          <div className="siply-nav-tabs">
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = current === tab.id || (tab.anche?.includes(current) ?? false)
              return (
                <M.Chip
                  key={tab.id}
                  className="siply-nav-item"
                  onClick={() => onChange(tab.id)}
                  style={{ backgroundColor: active ? alpha(C.white, 0.07) : 'transparent' }}
                >
                  {/* Un solo indicatore condiviso fra i tab: `layoutId` lo fa
                      scivolare da quello vecchio a quello nuovo invece di
                      farlo sparire e riapparire. */}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="siply-nav-indicator"
                      transition={M.T.press}
                    />
                  )}
                  <motion.span
                    animate={{ opacity: active ? 1 : 0.75, scale: active ? 1 : 0.94 }}
                    transition={M.T.micro}
                    style={{ display: 'flex' }}
                  >
                    <Icon color={active ? C.bg : alpha(C.silver, 0.4)} />
                  </motion.span>
                  <span style={{ color: active ? C.bg : alpha(C.silver, 0.4), transition: 'color 0.18s' }}>
                    {tab.label}
                  </span>
                </M.Chip>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
