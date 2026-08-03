import { C, alpha } from '../colors'
import * as M from '../motion'
import { motion, AnimatePresence } from '../motion'
import * as Icon from './Icons'
import {
  DENOMINAZIONI, REGIONI, VITIGNI, CORPI, ABBINAMENTI, ANNI,
  toggleArr,
  type WineFilters,
} from '../data/wines'

interface Props {
  filters: WineFilters
  set: (p: Partial<WineFilters>) => void
  onReset: () => void
}

export default function WineFilterPanel({ filters, set, onReset }: Props) {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <p style={{ color: alpha(C.dark, 0.4), fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Filtri
        </p>
        <M.Button onClick={onReset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.magenta, fontSize: '12px', fontWeight: 600 }}>
          Azzera tutto
        </M.Button>
      </div>

      <Section title="Denominazione">
        <Chips items={DENOMINAZIONI} active={filters.denominazioni} onToggle={v => set({ denominazioni: toggleArr(filters.denominazioni, v) })} />
      </Section>

      <Section title="Regione">
        <Chips items={REGIONI} active={filters.regioni} onToggle={v => set({ regioni: toggleArr(filters.regioni, v) })} />
      </Section>

      <Section title="Vitigno">
        <Chips items={VITIGNI} active={filters.vitigni} onToggle={v => set({ vitigni: toggleArr(filters.vitigni, v) })} />
      </Section>

      <Section title="Struttura / Corpo">
        <Chips items={CORPI} active={filters.corpi} onToggle={v => set({ corpi: toggleArr(filters.corpi, v) })} />
      </Section>

      <Section title="Abbinamenti">
        <Chips items={ABBINAMENTI} active={filters.abbinamenti} onToggle={v => set({ abbinamenti: toggleArr(filters.abbinamenti, v) })} />
      </Section>

      <Section title="Fascia di prezzo">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {[
            { label: '< €20', min: 0, max: 20 },
            { label: '€20–40', min: 20, max: 40 },
            { label: '€40–60', min: 40, max: 60 },
            { label: '> €60', min: 60, max: 200 },
          ].map(r => {
            const active = filters.prezzoMin === r.min && filters.prezzoMax === r.max
            return (
              <FilterChip key={r.label} label={r.label} active={active}
                onClick={() => set(active ? { prezzoMin: 0, prezzoMax: 200 } : { prezzoMin: r.min, prezzoMax: r.max })} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <NumInput label="Min €" value={filters.prezzoMin} min={0} max={filters.prezzoMax - 1} onChange={v => set({ prezzoMin: v })} />
          <span style={{ color: C.gray }}>–</span>
          <NumInput label="Max €" value={filters.prezzoMax} min={filters.prezzoMin + 1} max={200} onChange={v => set({ prezzoMax: v })} />
        </div>
      </Section>

      <Section title="Annata">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {ANNI.map(y => {
            const single = filters.annataMin === y && filters.annataMax === y
            return (
              <FilterChip key={y} label={String(y)} active={single}
                onClick={() => set(single ? { annataMin: 2015, annataMax: 2023 } : { annataMin: y, annataMax: y })} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <NumInput label="Dal" value={filters.annataMin} min={2015} max={filters.annataMax} onChange={v => set({ annataMin: v })} />
          <span style={{ color: C.gray }}>–</span>
          <NumInput label="Al" value={filters.annataMax} min={filters.annataMin} max={2023} onChange={v => set({ annataMax: v })} />
        </div>
      </Section>

      <Section title="Certificazioni" last>
        <M.Button
          onClick={() => set({ soloNaturale: !filters.soloNaturale })}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {/* Stessa spunta animata del selettore allegati in chat */}
          <motion.div
            animate={{
              borderColor: filters.soloNaturale ? C.green : alpha(C.dark, 0.2),
              backgroundColor: filters.soloNaturale ? C.green : 'rgba(0,0,0,0)',
            }}
            transition={M.T.micro}
            style={{
              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
              borderWidth: '2px', borderStyle: 'solid',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AnimatePresence>
              {filters.soloNaturale && (
                <motion.svg key="check" variants={M.V.pop} initial="initial" animate="animate" exit="exit" width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.div>
          <span style={{ color: C.dark, fontSize: '14px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Solo Bio / Naturale <Icon.Foglia size={16} />
          </span>
        </M.Button>
      </Section>
    </div>
  )
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : '20px' }}>
      <p style={{ color: C.dark, fontSize: '12px', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.03em' }}>{title}</p>
      {children}
      {!last && <div style={{ height: '1px', backgroundColor: alpha(C.dark, 0.07), marginTop: '18px' }} />}
    </div>
  )
}

function Chips({ items, active, onToggle }: { items: string[]; active: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {items.map(item => (
        <FilterChip key={item} label={item} active={active.includes(item)} onClick={() => onToggle(item)} />
      ))}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <M.Chip
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s',
        border: `1.5px solid ${active ? C.magenta : alpha(C.dark, 0.15)}`,
        backgroundColor: active ? alpha(C.magenta, 0.1) : 'transparent',
        color: active ? C.magenta : C.dark,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </M.Chip>
  )
}

function NumInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: '10px', color: C.gray, marginBottom: '4px' }}>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', backgroundColor: C.white, border: `1.5px solid ${alpha(C.dark, 0.12)}`, borderRadius: '8px', padding: '8px 10px', color: C.dark, fontSize: '13px', outline: 'none' }}
      />
    </div>
  )
}
