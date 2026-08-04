import { useMemo } from 'react'
import { C, alpha } from '../../colors'
import { eur, num } from '../../economia'
import * as M from '../../motion'
import { motion } from '../../motion'
import * as Icon from '../../components/Icons'
import { STATUS } from '../../status'
import type { Richiesta } from '../../admin/dati'
import { statistiche, type Voce } from '../../admin/statistiche'

/* Le statistiche del lato Siply. Ogni riquadro risponde a una domanda sola,
   scritta nel titolo: se per capire un grafico serve una legenda, il grafico
   è sbagliato. */

export default function StatisticheScreen({ richieste }: { richieste: Richiesta[] }) {
  const s = useMemo(() => statistiche(richieste), [richieste])
  const viniTot = s.viniCatalogo + s.viniNuovi
  const quotaNuovi = viniTot > 0 ? (s.viniNuovi / viniTot) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ backgroundColor: C.dark, padding: '56px 24px 24px' }}>
        <h2 style={{ color: C.bg, fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Statistiche</h2>
        <p style={{ color: alpha(C.silver, 0.5), fontSize: '13px', marginBottom: '18px' }}>
          Su tutte le richieste ricevute da Siply
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Grande valore={String(s.totale)} etichetta="Richieste" colore={C.bg} />
          <Grande
            valore={s.tassoApprovazione !== null ? `${Math.round(s.tassoApprovazione)}%` : '—'}
            etichetta="Approvate"
            colore={STATUS.approved.light}
            nota={`su ${s.perStato.approved + s.perStato.refused} decise`}
          />
          <Grande valore={num(s.bottiglieTotali)} etichetta="Bottiglie" colore={C.ocra} />
        </div>
      </div>

      <M.List style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Regioni */}
        <Riquadro icona={Icon.Bersaglio} titolo="Da quali regioni arrivano i GDA">
          <Barre voci={s.regioni} colore={C.magenta} suffisso={v => `${v} richiest${v === 1 ? 'a' : 'e'}`} />
        </Riquadro>

        {/* Catalogo vs vini nuovi */}
        <Riquadro icona={Icon.Bottiglia} titolo="Vini presi dal catalogo o caricati dal produttore">
          <div style={{ height: '12px', borderRadius: '6px', overflow: 'hidden', display: 'flex', backgroundColor: alpha(C.dark, 0.08), marginBottom: '10px' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${100 - quotaNuovi}%` }} transition={M.T.surface}
              style={{ backgroundColor: C.green }}
            />
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${quotaNuovi}%` }} transition={{ ...M.T.surface, delay: 0.08 }}
              style={{ backgroundColor: C.ocra }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Quota colore={C.green} valore={s.viniCatalogo} etichetta="dal catalogo Siply" totale={viniTot} />
            <Quota colore={C.ocra} valore={s.viniNuovi} etichetta="caricati dai produttori" totale={viniTot} />
          </div>
          <p style={{ color: C.gray, fontSize: '12px', lineHeight: 1.55, marginTop: '12px' }}>
            Il catalogo è quello sincronizzato da Shopify. Un vino nuovo va controllato a mano prima di pubblicarlo:
            succede in <strong style={{ color: C.dark }}>{s.richiesteConVinoNuovo}</strong> richieste su {s.totale}.
          </p>
        </Riquadro>

        {/* Prezzi medi */}
        <Riquadro icona={Icon.Grafico} titolo="Quanto vale in media quello che ci arriva">
          <div className="stat-griglia" style={{ display: 'grid', gap: '10px' }}>
            <Media etichetta="Cassa a listino" valore={`€${eur(s.prezzoMedioCassaListino)}`} nota={`su ${s.casseTotali} casse`} />
            <Media etichetta="Cassa al prezzo GDA" valore={`€${eur(s.prezzoMedioCassaScontato)}`} nota="quello che paga chi compra" accento={C.magenta} />
            <Media etichetta="Bottiglia a listino" valore={`€${eur(s.prezzoMedioBottiglia)}`} nota={`su ${num(s.bottiglieTotali)} bottiglie`} />
          </div>
        </Riquadro>

        {/* Classifiche per cantina */}
        <Riquadro icona={Icon.Trend} titolo="Le cantine più attive">
          <div className="stat-griglia" style={{ display: 'grid', gap: '16px' }}>
            <Podio titolo="Più GDA inviati" voci={s.classifica.inviate} colore={C.magenta} />
            <Podio titolo="Più GDA approvati" voci={s.classifica.approvate} colore={STATUS.approved.solid} />
            <Podio titolo="Più GDA rifiutati" voci={s.classifica.rifiutate} colore={STATUS.refused.solid} />
            <Podio titolo="Più GDA in attesa" voci={s.classifica.inAttesa} colore={STATUS.pending_approval.solid} />
          </div>
        </Riquadro>
      </M.List>

      <style>{`
        .stat-griglia { grid-template-columns: 1fr; }
        @media (min-width: 700px) { .stat-griglia { grid-template-columns: 1fr 1fr; } }
      `}</style>
    </div>
  )
}

/* ── Mattoncini ──────────────────────────────────────────────────────────── */

function Grande({ valore, etichetta, colore, nota }: { valore: string; etichetta: string; colore: string; nota?: string }) {
  return (
    <div style={{ flex: 1, backgroundColor: alpha(C.white, 0.07), borderRadius: '14px', padding: '12px' }}>
      <p style={{ color: colore, fontSize: '24px', fontWeight: 800, lineHeight: 1.1 }}>{valore}</p>
      <p style={{ color: alpha(C.silver, 0.55), fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>{etichetta}</p>
      {nota && <p style={{ color: alpha(C.silver, 0.35), fontSize: '10px', marginTop: '1px' }}>{nota}</p>}
    </div>
  )
}

function Riquadro({ icona: Icona, titolo, children }: { icona: typeof Icon.Trend; titolo: string; children: React.ReactNode }) {
  return (
    <M.Item style={{ backgroundColor: C.white, borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '13px 18px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}` }}>
        <Icona size={16} />
        <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700 }}>{titolo}</p>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </M.Item>
  )
}

/** Barre orizzontali: la più alta fa da 100%, le altre si leggono in rapporto. */
function Barre({ voci, colore, suffisso }: { voci: Voce[]; colore: string; suffisso: (v: number) => string }) {
  const max = Math.max(...voci.map(v => v.valore), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
      {voci.map((v, i) => (
        <div key={v.etichetta}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
            <span style={{ color: C.dark, fontSize: '13px', fontWeight: 600 }}>{v.etichetta}</span>
            <span style={{ color: C.gray, fontSize: '11.5px', flexShrink: 0 }}>
              {suffisso(v.valore)}{v.dettaglio ? ` · ${v.dettaglio}` : ''}
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', backgroundColor: alpha(C.dark, 0.07), overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(v.valore / max) * 100}%` }}
              transition={{ ...M.T.surface, delay: 0.04 * i }}
              style={{ height: '100%', borderRadius: '4px', backgroundColor: colore }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Quota({ colore, valore, etichetta, totale }: { colore: string; valore: number; etichetta: string; totale: number }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colore, flexShrink: 0 }} />
        <span style={{ color: C.dark, fontSize: '20px', fontWeight: 800 }}>{valore}</span>
        <span style={{ color: C.gray, fontSize: '12px' }}>
          {totale > 0 ? `${Math.round((valore / totale) * 100)}%` : ''}
        </span>
      </div>
      <p style={{ color: C.gray, fontSize: '12px', marginTop: '1px' }}>{etichetta}</p>
    </div>
  )
}

function Media({ etichetta, valore, nota, accento }: { etichetta: string; valore: string; nota: string; accento?: string }) {
  return (
    <div style={{ backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px', padding: '12px 14px' }}>
      <p style={{ color: alpha(C.dark, 0.45), fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{etichetta}</p>
      <p style={{ color: accento ?? C.dark, fontSize: '20px', fontWeight: 800, lineHeight: 1.3 }}>{valore}</p>
      <p style={{ color: C.gray, fontSize: '11px' }}>{nota}</p>
    </div>
  )
}

/** Chi guida la classifica sta in evidenza; gli altri fanno da contesto. */
function Podio({ titolo, voci, colore }: { titolo: string; voci: Voce[]; colore: string }) {
  return (
    <div>
      <p style={{ color: alpha(C.dark, 0.45), fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        {titolo}
      </p>
      {voci.length === 0 ? (
        <p style={{ color: C.gray, fontSize: '12.5px' }}>Nessuna.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {voci.map((v, i) => (
            <div key={v.etichetta} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{
                flexShrink: 0, width: '20px', height: '20px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 800,
                backgroundColor: i === 0 ? colore : alpha(C.dark, 0.07),
                color: i === 0 ? C.white : C.gray,
              }}>{i + 1}</span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: '12.5px',
                fontWeight: i === 0 ? 700 : 500, color: i === 0 ? C.dark : C.gray,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{v.etichetta}</span>
              <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: 800, color: i === 0 ? colore : C.gray }}>{v.valore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
