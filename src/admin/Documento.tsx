import { C, alpha } from '../colors'
import { num } from '../economia'
import * as M from '../motion'
import * as Icon from '../components/Icons'
import { produttore, type Richiesta } from './dati'
import type { Documento } from './stato'

/* Bozza dell'atto che si emette approvando un GDA. Il testo delle clausole è
   ancora lorem ipsum: la struttura, i dati e i numeri sono invece quelli veri
   della richiesta, così si vede subito dove finirà il testo definitivo. */

const CLAUSOLE: { titolo: string; testo: string }[] = [
  {
    titolo: 'Oggetto',
    testo: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    titolo: 'Prezzi e condizioni economiche',
    testo: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    titolo: 'Obiettivi di vendita',
    testo: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
  {
    titolo: 'Consegna e trasporto',
    testo: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
  },
  {
    titolo: 'Durata e recesso',
    testo: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
  },
  {
    titolo: 'Foro competente',
    testo: 'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.',
  },
]

interface Props {
  richiesta: Richiesta
  documento: Documento
  onClose: () => void
}

export default function DocumentoModale({ richiesta: r, documento: d, onClose }: Props) {
  const p = produttore(r.produttoreId)
  const bottiglie = r.casse.reduce((s, c) => s + c.quantita, 0)
  const data = new Date(d.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <M.Overlay onClose={onClose} kind="modal" z={600} veil={0.7} panelStyle={{
      width: '100%', maxWidth: '560px', maxHeight: '88vh',
      backgroundColor: C.bg, borderRadius: '22px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 14px 44px rgba(0,0,0,0.4)',
    }}>
      {/* Intestazione */}
      <div style={{ backgroundColor: C.dark, padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '14px', flexShrink: 0 }}>
        <Icon.Documento size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: alpha(C.silver, 0.5), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
            Atto di attivazione GDA
          </p>
          <h3 style={{ color: C.bg, fontSize: '17px', fontWeight: 800, lineHeight: 1.25 }}>{r.nome}</h3>
          <p style={{ color: C.ocra, fontSize: '12px', marginTop: '3px' }}>Protocollo {d.protocollo} · {data}</p>
        </div>
        <M.IconButton onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: alpha(C.silver, 0.6), fontSize: '20px', lineHeight: 1, padding: '2px', flexShrink: 0 }}>✕</M.IconButton>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Avviso: è una bozza, e non deve sembrare altro */}
        <div style={{ backgroundColor: alpha(C.ocra, 0.16), borderRadius: '12px', borderLeft: `3px solid ${C.ocra}`, padding: '11px 14px', marginBottom: '18px' }}>
          <p style={{ color: C.olive, fontSize: '12px', lineHeight: 1.5 }}>
            <strong>Bozza.</strong> Struttura e dati sono quelli veri della richiesta; il testo delle clausole è segnaposto, in attesa di quello dell'ufficio legale.
          </p>
        </div>

        {/* Parti */}
        <div style={{ backgroundColor: C.white, borderRadius: '14px', padding: '4px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <Riga etichetta="Tra" valore="Nexus Hub S.R.L. — Siply®" />
          <Riga etichetta="E" valore={`${p.cantina} — ${p.referente}`} />
          <Riga etichetta="Sede del produttore" valore={`${p.citta}, ${p.regione}`} />
          <Riga etichetta="Casse conferite" valore={`${r.casse.length} · ${bottiglie} bottiglie`} />
          <Riga etichetta="Obiettivi di vendita" valore={`${r.obiettivi.map(num).join(' · ')} bottiglie`} />
          <Riga etichetta="Partenza merce" valore={r.locationSpedizione} ultima />
        </div>

        {/* Clausole */}
        {CLAUSOLE.map((c, i) => (
          <div key={c.titolo} style={{ marginBottom: '14px' }}>
            <p style={{ color: C.dark, fontSize: '13px', fontWeight: 800, marginBottom: '4px' }}>
              Art. {i + 1} — {c.titolo}
            </p>
            <p style={{ color: C.gray, fontSize: '12.5px', lineHeight: 1.6 }}>{c.testo}</p>
          </div>
        ))}

        {/* Firme */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '22px' }}>
          {['Per Siply', `Per ${p.cantina}`].map(chi => (
            <div key={chi} style={{ flex: 1 }}>
              <div style={{ height: '1px', backgroundColor: alpha(C.dark, 0.25), marginBottom: '6px' }} />
              <p style={{ color: C.gray, fontSize: '11px' }}>{chi}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '12px 20px 20px', borderTop: `1px solid ${alpha(C.dark, 0.07)}`, display: 'flex', gap: '10px' }}>
        <M.Button
          onClick={() => window.print()}
          style={{ flex: 1, backgroundColor: alpha(C.dark, 0.08), color: C.dark, fontWeight: 700, padding: '14px', borderRadius: '14px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          Stampa
        </M.Button>
        <M.Button
          onClick={onClose}
          style={{ flex: 1, backgroundColor: C.magenta, color: C.bg, fontWeight: 700, padding: '14px', borderRadius: '14px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          Chiudi
        </M.Button>
      </div>
    </M.Overlay>
  )
}

function Riga({ etichetta, valore, ultima }: { etichetta: string; valore: string; ultima?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '14px', padding: '11px 0', borderBottom: ultima ? 'none' : `1px solid ${alpha(C.dark, 0.06)}` }}>
      <span style={{ color: C.gray, fontSize: '12px', flexShrink: 0 }}>{etichetta}</span>
      <span style={{ color: C.dark, fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{valore}</span>
    </div>
  )
}
