import { C, alpha } from '../colors'
import { gdaBottiglie, type User, type Gda, type Screen } from '../App'
import * as M from '../motion'
import { STATUS } from '../status'
import * as Icon from '../components/Icons'

interface Props {
  user: User
  gdaList: Gda[]
  onNuovoGda: () => void
  onNavigate: (s: Screen) => void
}

const statusCfg = {
  bozza: { label: 'Bozza', ...STATUS.bozza },
  pending_approval: { label: 'In attesa', ...STATUS.pending_approval },
  approved: { label: 'Approvato', ...STATUS.approved },
  refused: { label: 'Rifiutato', ...STATUS.refused },
}

export default function DashboardScreen({ user, gdaList, onNuovoGda, onNavigate }: Props) {
  const approved = gdaList.filter(g => g.status === 'approved').length
  const pending = gdaList.filter(g => g.status === 'pending_approval').length
  const refused = gdaList.filter(g => g.status === 'refused').length
  const recent = gdaList.slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ backgroundColor: C.dark, padding: '56px 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <p style={{ color: alpha(C.silver, 0.5), fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', marginBottom: '4px' }}>
              Benvenuto
            </p>
            <h2 style={{ color: C.bg, fontSize: '26px', fontWeight: 800, lineHeight: 1.2, marginBottom: '2px' }}>
              {user.nome}
            </h2>
            <p style={{ color: C.ocra, fontSize: '13px', fontWeight: 500 }}>
              {user.cantina}
            </p>
          </div>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: C.magenta, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.bg, fontSize: '18px', fontWeight: 700, flexShrink: 0,
          }}>
            {user.nome.charAt(0)}
          </div>
        </div>

        {/* Stats */}
        {/* Sul fondo scuro servono le varianti chiare: il magenta pieno qui
            starebbe a 1.7:1 di contrasto, cioè non si leggerebbe. */}
        <M.List style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <StatCard label="Approvati" value={approved} valueColor={STATUS.approved.light} />
          <StatCard label="In attesa" value={pending} valueColor={STATUS.pending_approval.light} />
          <StatCard label="Rifiutati" value={refused} valueColor={STATUS.refused.light} />
        </M.List>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Quick actions */}
        <div>
          <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Azioni rapide
          </p>
          <ActionCard
            title="Nuovo GDA"
            subtitle="Apri un gruppo d'acquisto da inviare a Siply"
            icon="+"
            bg={C.magenta}
            textColor={C.bg}
            onClick={onNuovoGda}
          />
        </div>

        {/* Recent cases */}
        {recent.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Ultimi GDA
              </p>
              <M.Button
                onClick={() => onNavigate('gda')}
                style={{ color: C.magenta, fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Vedi tutte →
              </M.Button>
            </div>
            <M.List style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recent.map(g => (
                <RecentCard key={g.id} gda={g} />
              ))}
            </M.List>
          </div>
        )}

        {/* Chat banner */}
        <div style={{
          backgroundColor: alpha(C.green, 0.12),
          border: `1px solid ${alpha(C.green, 0.28)}`,
          borderRadius: '16px', padding: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Icon.Chat size={20} style={{ marginTop: '1px' }} />
            <p style={{ color: C.forest, fontSize: '13px', lineHeight: 1.5 }}>
              Hai domande su un GDA?{' '}
              <M.Button
                onClick={() => onNavigate('chat')}
                style={{ display: 'inline-block', color: C.magenta, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                Apri la chat con Siply
              </M.Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, valueColor }: { label: string; value: number; valueColor: string }) {
  return (
    <M.Item style={{
      backgroundColor: alpha(C.white, 0.08), borderRadius: '16px',
      padding: '12px', textAlign: 'center',
    }}>
      {/* Il numero si sostituisce con uno scorrimento verticale quando cambia */}
      <p style={{ color: valueColor, fontSize: '28px', fontWeight: 800, lineHeight: 1 }}>
        <M.Ticker value={value} />
      </p>
      <p style={{ color: alpha(C.silver, 0.55), fontSize: '11px', marginTop: '4px' }}>{label}</p>
    </M.Item>
  )
}

function ActionCard({ title, subtitle, icon, bg, textColor, onClick }: {
  title: string; subtitle: string; icon: string; bg: string; textColor: string; onClick: () => void
}) {
  return (
    <M.CardButton
      onClick={onClick}
      style={{
        width: '100%',
        backgroundColor: bg, color: textColor, borderRadius: '18px',
        padding: '18px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      <span style={{ fontSize: '22px', opacity: 0.85 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2, color: textColor }}>{title}</p>
        <p style={{ fontSize: '12px', opacity: 0.55, marginTop: '2px', color: textColor }}>{subtitle}</p>
      </div>
    </M.CardButton>
  )
}

function RecentCard({ gda }: { gda: Gda }) {
  const cfg = statusCfg[gda.status]
  return (
    <M.Item style={{
      backgroundColor: C.white, borderRadius: '16px',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: `6px solid ${cfg.solid}`,
    }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cfg.solid, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: C.dark, fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gda.nome}
        </p>
        <p style={{ color: C.gray, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gda.casse.length} cass{gda.casse.length === 1 ? 'a' : 'e'} · {gdaBottiglie(gda)} bottiglie
        </p>
      </div>
      <span style={{
        fontSize: '11px', fontWeight: 700, padding: '5px 11px', borderRadius: '20px', flexShrink: 0,
        backgroundColor: cfg.solid, color: C.white,
      }}>
        {cfg.label}
      </span>
    </M.Item>
  )
}
