import { C, alpha } from '../colors'
import * as Icon from './Icons'

/** Ancora usata da chi vuole portare l'utente quaggiù (es. la scheda spedizione). */
export const FOOTER_ID = 'siply-footer'

/**
 * Porta l'utente al footer, ma solo se non lo sta già vedendo: se è già a
 * schermo uno scroll improvviso disorienterebbe e basta.
 */
export function scrollToFooter() {
  const el = document.getElementById(FOOTER_ID)
  if (!el) return
  const r = el.getBoundingClientRect()
  // "già visibile" deve voler dire che si leggono i contatti, non che si
  // intravede il bordo del footer: serve che occupi almeno i due terzi bassi
  // dello schermo, altrimenti si vedrebbe solo la striscia del logo.
  const giaVisibile = r.bottom > 0 && r.top <= window.innerHeight * 0.35
  if (giaVisibile) return
  // Posizione calcolata invece di scrollIntoView: quello scorre il minimo
  // indispensabile e lascia in vista solo il bordo del footer, mentre qui
  // servono i contatti, che stanno appena sotto.
  window.scrollTo({ top: window.scrollY + r.top - 8, behavior: 'smooth' })
}

/* ── Icone di riga, in stile lineare come il footer del sito ──────────────── */
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function MailIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...line}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 6.5l9 6 9-6" /></svg>
}
function PhoneIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...line}><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.9 2.2z" /></svg>
}
function PinIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...line}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
}

const SOCIAL = [
  {
    nome: 'Instagram',
    path: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></>,
  },
  {
    nome: 'TikTok',
    path: <path d="M14.5 3v11.2a3.3 3.3 0 11-2.6-3.2M14.5 3c.3 2.4 2 4.1 4.4 4.3M14.5 3h2.6" />,
  },
  {
    nome: 'YouTube',
    path: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10.2 9.4l4.6 2.6-4.6 2.6z" /></>,
  },
  {
    nome: 'LinkedIn',
    path: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10.5V17M7 7.2v.1M11 17v-3.6a2.2 2.2 0 014.4 0V17" /></>,
  },
  {
    nome: 'Facebook',
    path: <><circle cx="12" cy="12" r="9.2" /><path d="M14.6 8.4h-1.4c-.9 0-1.4.5-1.4 1.4V12m-1.6 0h4.2" /><path d="M12.4 12v5.6" /></>,
  },
]

const POLICY = [
  'Privacy Policy',
  'Cookie Policy',
  'Preferenze cookie',
  'Termini e condizioni',
  "Segnala l'errore di un prodotto",
]

export default function Footer() {
  const silver = alpha(C.silver, 0.72)

  return (
    <>
      <style>{`
        /* Il padding in fondo tiene conto della nav fissa (mobile): così il
           fondo scuro arriva sotto la nav e l'ultima riga resta leggibile. */
        .siply-footer {
          background-color: ${C.dark};
          color: ${silver};
          padding: 44px 24px 112px;
        }
        @media (min-width: 768px) {
          .siply-footer { padding-bottom: 32px; }
        }
        .siply-footer-inner {
          width: 100%;
          max-width: 80rem;
          margin-inline: auto;
        }
        /* Mobile: una colonna. Da tablet in su le quattro colonne del sito. */
        .siply-footer-cols {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 720px) {
          /* L'ultima colonna sta larga quanto basta alle cinque icone in fila
             (5×34 + 4×10 = 210px): più stretta e andrebbero a capo. */
          .siply-footer-cols {
            grid-template-columns: 1.2fr 1.5fr 1.1fr 1fr;
            gap: 40px;
          }
        }
        .siply-footer h4 {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: ${C.bg};
          margin-bottom: 16px;
        }
        /* Solo design: sembrano link ma non portano da nessuna parte. */
        .siply-footer-link {
          display: block;
          font-size: 13.5px;
          line-height: 1.5;
          color: ${silver};
          padding: 4px 0;
          cursor: pointer;
          transition: color 0.15s;
        }
        .siply-footer-link:hover { color: ${C.bg}; }
        .siply-footer-riga {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          line-height: 1.5;
          color: ${silver};
          padding: 5px 0;
          cursor: pointer;
          transition: color 0.15s;
        }
        .siply-footer-riga:hover { color: ${C.bg}; }
        .siply-footer-riga svg { flex-shrink: 0; margin-top: 2px; }
        .siply-footer-social {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .siply-footer-social span {
          width: 34px; height: 34px;
          border-radius: 9px;
          border: 1px solid ${alpha(C.silver, 0.35)};
          display: flex; align-items: center; justify-content: center;
          color: ${silver};
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .siply-footer-social span:hover { border-color: ${C.bg}; color: ${C.bg}; }
        .siply-footer-legale {
          margin-top: 40px;
          border-top: 1px solid ${alpha(C.silver, 0.18)};
          padding-top: 22px;
          text-align: center;
          font-size: 12px;
          line-height: 1.75;
          color: ${alpha(C.silver, 0.55)};
        }
      `}</style>

      <footer id={FOOTER_ID} className="siply-footer">
        <div className="siply-footer-inner">
          <div className="siply-footer-cols">

            {/* Marchio */}
            <div>
              <Icon.Logo height={46} />
              <p style={{ marginTop: '12px', fontSize: '13.5px', fontStyle: 'italic', color: silver }}>
                Condividi sorsi senza rimorsi
              </p>
            </div>

            {/* Contatti */}
            <div>
              <h4>Contatti</h4>
              <div className="siply-footer-riga"><MailIcon /> info@siply.it</div>
              <div className="siply-footer-riga"><PhoneIcon /> +39 3240123122</div>
              <div className="siply-footer-riga">
                <PinIcon />
                <span>Strada da Bertolla All'Abbadia di Stura 140/142, 10156 Torino (IT)</span>
              </div>
            </div>

            {/* Policy */}
            <div>
              <h4>Policy</h4>
              {POLICY.map(v => <span key={v} className="siply-footer-link">{v}</span>)}
            </div>

            {/* Social */}
            <div>
              <h4>Seguici</h4>
              <div className="siply-footer-social">
                {SOCIAL.map(s => (
                  <span key={s.nome} title={s.nome}>
                    <svg width="17" height="17" viewBox="0 0 24 24" {...line}>{s.path}</svg>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Dati societari */}
          <div className="siply-footer-legale">
            <p>Copyright Siply® 2025.</p>
            <p>Siply® è un marchio registrato, tutti i diritti sono riservati.</p>
            <p>
              Sede legale: Nexus Hub S.R.L. Via Roncaglia 14, 20146 Milano (IT).
              Sede operativa: Strada da Bertolla All'Abbadia di Stura 140/142, 10156 Torino (IT).
            </p>
            <p>Capitale Sociale €330.500 euro, CF/P.IVA 13979840967, Cam. Com. MI REA 2754855.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
