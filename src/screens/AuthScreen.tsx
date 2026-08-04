import { useEffect, useState } from 'react'
import { C, alpha } from '../colors'
import { useDemo, DEMO_AUTH } from '../demo'
import * as M from '../motion'
import { motion, AnimatePresence, useReducedMotion } from '../motion'
import * as Icon from '../components/Icons'

interface Props {
  onLogin: (admin: boolean) => void
}

export default function AuthScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  /** Entrare come Siply invece che come cantina. Solo per le demo. */
  const [admin, setAdmin] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nome: '', cantina: '', regione: '' })
  const [loading, setLoading] = useState(false)

  useDemo(m => {
    if (m === 'clear') {
      setForm({ email: '', password: '', nome: '', cantina: '', regione: '' })
      return
    }
    // passa a "Registrati" così si vedono tutti e cinque i campi compilati
    setMode('register')
    setForm(DEMO_AUTH)
  })

  const handle = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin(admin) }, 900)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.dark }}>
      <div className="max-w-7xl mx-auto" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Hero — gli elementi entrano in sequenza dall'alto verso il basso.
            "GDA", logo, filetto e claim sono un blocco solo: stanno stretti,
            altrimenti si leggono come quattro cose separate invece che come
            l'intestazione del marchio. Il padding sopra e sotto è uguale,
            così il gruppo resta davvero al centro dello spazio libero. */}
        <M.List style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <M.Item>
            <TitoloGda />
          </M.Item>
          {/* Niente `maxWidth` sul logo: la percentuale si misurava sul
              contenitore, che è largo quanto il logo stesso, quindi non faceva
              da rete per gli schermi stretti — rimpiccioliva l'immagine e
              basta. Il riquadro restava della misura piena e l'immagine ci
              stava dentro a sinistra, fuori asse di 23px; `objectFit: contain`
              in più la centrava in verticale lasciando 8px vuoti sopra e sotto.
              A 320px di schermo il logo ci sta comodo: 212px contro 272
              disponibili. */}
          <M.Item>
            <Icon.Logo height={72} style={{ marginBottom: '14px' }} />
          </M.Item>
          {/* Il filetto si disegna: chiude visivamente il blocco del logo */}
          <motion.div
            initial={{ width: 0 }} animate={{ width: 32 }}
            transition={{ ...M.T.enter, delay: 0.24 }}
            style={{ height: '2px', backgroundColor: C.magenta, marginBottom: '12px' }}
          />
          <M.Item>
            <p style={{ color: alpha(C.silver, 0.6), fontSize: '14px', textAlign: 'center', maxWidth: '240px', lineHeight: 1.5 }}>
              Condividi sorsi senza rimorsi.
            </p>
          </M.Item>
        </M.List>

        {/* Card — sale dal bordo inferiore, come un pannello che si apre */}
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ ...M.T.surface, delay: 0.1 }}
          style={{ backgroundColor: C.bg, borderRadius: '28px 28px 0 0', padding: '32px 24px 48px' }}
        >
          {/* Da che parte si entra. Le due versioni si somigliano molto, quindi
              la scelta sta prima del form e non fra le righe: si decide chi si
              è, poi si accede. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: admin ? alpha(C.magenta, 0.07) : alpha(C.dark, 0.04), border: `1.5px solid ${admin ? alpha(C.magenta, 0.35) : 'transparent'}`, borderRadius: '16px', padding: '12px 14px', marginBottom: '16px', transition: 'background-color .2s, border-color .2s' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700 }}>
                {admin ? 'Entri come Siply' : 'Entri come cantina'}
              </p>
              <p style={{ color: C.gray, fontSize: '11.5px', lineHeight: 1.4, marginTop: '1px' }}>
                {admin
                  ? 'Richieste da valutare, conversazioni e statistiche'
                  : 'I tuoi GDA, le tue casse e la chat con noi'}
              </p>
            </div>
            <Interruttore acceso={admin} onCambia={setAdmin} etichetta="Entra nell'area Siply" />
          </div>

          {/* Tabs — la pillola scura è una sola e scivola fra i due tab.
              L'area Siply non si registra: gli account li facciamo noi, quindi
              con l'interruttore acceso la scelta sparisce del tutto. */}
          <M.Collapse open={!admin}>
          <div style={{ display: 'flex', backgroundColor: alpha(C.dark, 0.1), borderRadius: '14px', padding: '4px', marginBottom: '32px' }}>
            {(['login', 'register'] as const).map(m => (
              <M.Chip
                key={m}
                onClick={() => setMode(m)}
                style={{
                  position: 'relative', flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, backgroundColor: 'transparent',
                  color: mode === m ? C.bg : C.gray, transition: 'color 0.2s',
                }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="auth-tab"
                    transition={M.T.press}
                    style={{ position: 'absolute', inset: 0, backgroundColor: C.dark, borderRadius: '10px', zIndex: 0 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{m === 'login' ? 'Accedi' : 'Registrati'}</span>
              </M.Chip>
            ))}
          </div>
          </M.Collapse>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* I campi extra della registrazione si aprono in altezza invece di
                comparire di colpo: si capisce che il form è cresciuto. */}
            <M.Collapse open={mode === 'register'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
                <Field label="Nome e cognome" type="text" placeholder="Marco Ferretti" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
                <Field label="Nome cantina" type="text" placeholder="Cantina Ferretti" value={form.cantina} onChange={v => setForm(f => ({ ...f, cantina: v }))} />
                <Field label="Regione" type="text" placeholder="Toscana" value={form.regione} onChange={v => setForm(f => ({ ...f, regione: v }))} />
              </div>
            </M.Collapse>
            <Field label="Email" type="email" placeholder="marco@cantina.it" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
            <Field label="Password" type="password" placeholder="••••••••" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />

            <M.Button
              type="submit"
              disabled={loading}
              animate={{ opacity: loading ? 0.6 : 1 }}
              transition={M.T.micro}
              style={{
                marginTop: '8px', backgroundColor: C.magenta, color: C.bg, fontWeight: 600,
                padding: '16px', borderRadius: '14px', fontSize: '15px', border: 'none', cursor: 'pointer',
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={loading ? 'loading' : mode}
                  variants={M.V.fade} initial="initial" animate="animate" exit="exit"
                  style={{ display: 'block' }}
                >
                  {loading
                    ? 'Un momento...'
                    : admin
                      ? "Entra nell'area Siply"
                      : mode === 'login' ? 'Entra nella piattaforma' : 'Crea il tuo account'}
                </motion.span>
              </AnimatePresence>
            </M.Button>
          </form>

          <M.Collapse open={mode === 'login' && !admin}>
            <p style={{ textAlign: 'center', fontSize: '13px', color: C.gray, marginTop: '24px' }}>
              Non hai ancora un account?{' '}
              <M.Button type="button" onClick={() => setMode('register')} style={{ display: 'inline-block', color: C.magenta, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Registrati
              </M.Button>
            </p>
          </M.Collapse>
        </motion.div>
      </div>
    </div>
  )
}

/** Interruttore: la pallina scivola da una parte all'altra, così si capisce
 *  che è una levetta e non due bottoni. Resta un `checkbox` per chi naviga da
 *  tastiera o con lo screen reader. */
function Interruttore({ acceso, onCambia, etichetta }: { acceso: boolean; onCambia: (v: boolean) => void; etichetta: string }) {
  return (
    <label style={{ flexShrink: 0, cursor: 'pointer', display: 'block' }}>
      <input
        type="checkbox"
        checked={acceso}
        onChange={e => onCambia(e.target.checked)}
        aria-label={etichetta}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />
      <motion.span
        animate={{ backgroundColor: acceso ? C.magenta : alpha(C.dark, 0.18) }}
        transition={M.T.micro}
        style={{ display: 'flex', alignItems: 'center', width: '50px', height: '28px', borderRadius: '999px', padding: '3px' }}
      >
        <motion.span
          layout
          transition={M.T.press}
          style={{
            width: '22px', height: '22px', borderRadius: '50%', backgroundColor: C.white,
            marginLeft: acceso ? 'auto' : 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </motion.span>
    </label>
  )
}

/* ── Occhiello sopra al logo ─────────────────────────────────────────────── */

const FRASE = "Gruppi d'acquisto"
/** Posizioni delle lettere che formano la sigla: **G**ruppi **d**'**a**cquisto. */
const SIGLA = new Set([0, 7, 9])

/**
 * L'occhiello dice per esteso cos'è un GDA, poi si accorcia nella sigla: le
 * lettere di troppo se ne vanno e le tre che restano scivolano al loro posto.
 * Così chi non conosce l'acronimo lo impara guardandolo formarsi.
 *
 * Si alterna ogni 5 secondi. Chi ha chiesto meno movimento nelle preferenze di
 * sistema vede la frase per esteso, ferma: un testo che cambia da solo senza
 * che nessuno l'abbia chiesto è esattamente ciò da cui si vuole stare alla
 * larga.
 */
function TitoloGda() {
  const ridotto = useReducedMotion()
  const [sigla, setSigla] = useState(false)

  useEffect(() => {
    if (ridotto) return
    const t = setInterval(() => setSigla(s => !s), 5000)
    return () => clearInterval(t)
  }, [ridotto])

  const lettere = [...FRASE]
    .map((ch, i) => ({ ch, i }))
    .filter(({ i }) => !sigla || SIGLA.has(i))

  return (
    <span
      style={{
        position: 'relative', display: 'flex', justifyContent: 'center',
        color: C.magenta, fontSize: '15px', fontWeight: 600,
        letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px',
      }}
    >
      {/* Spezzata in singole lettere il testo è illeggibile per uno screen
          reader: la frase intera resta qui, invisibile ma annunciabile. */}
      <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>
        {FRASE}
      </span>

      {/* `popLayout` toglie subito dal flusso la lettera che esce, così le
          altre si stringono mentre quella sfuma invece che dopo. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {lettere.map(({ ch, i }) => (
          <motion.span
            key={i}
            layout
            aria-hidden
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={M.T.collapse}
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
          >
            {ch}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
}

function Field({ label, type, placeholder, value, onChange }: { label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.gray, marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', backgroundColor: C.white,
          border: `1.5px solid ${focused ? C.magenta : alpha(C.dark, 0.12)}`,
          borderRadius: '12px', padding: '14px 16px', color: C.dark, fontSize: '14px',
          outline: 'none', transition: 'border-color 0.2s',
        }}
      />
    </div>
  )
}
