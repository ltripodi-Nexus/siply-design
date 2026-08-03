import { useState } from 'react'
import { C, alpha } from '../colors'
import { useDemo, DEMO_AUTH } from '../demo'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'
import * as Icon from '../components/Icons'

interface Props {
  onLogin: () => void
}

export default function AuthScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
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
    setTimeout(() => { setLoading(false); onLogin() }, 900)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.dark }}>
      <div className="max-w-7xl mx-auto" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Hero — gli elementi entrano in sequenza dall'alto verso il basso */}
        <M.List style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 40px' }}>
          <M.Item>
            <span style={{ display: 'block', color: C.magenta, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '20px' }}>
              GDA
            </span>
          </M.Item>
          <M.Item>
            <Icon.Logo height={72} style={{ marginBottom: '20px', maxWidth: '78%', objectFit: 'contain' }} />
          </M.Item>
          {/* Il filetto si disegna: chiude visivamente il blocco del logo */}
          <motion.div
            initial={{ width: 0 }} animate={{ width: 32 }}
            transition={{ ...M.T.enter, delay: 0.24 }}
            style={{ height: '2px', backgroundColor: C.magenta, marginBottom: '16px' }}
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
          {/* Tabs — la pillola scura è una sola e scivola fra i due tab */}
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
                  {loading ? 'Un momento...' : mode === 'login' ? 'Entra nella piattaforma' : 'Crea il tuo account'}
                </motion.span>
              </AnimatePresence>
            </M.Button>
          </form>

          <M.Collapse open={mode === 'login'}>
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
