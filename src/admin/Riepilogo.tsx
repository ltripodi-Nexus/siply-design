import { useState } from 'react'
import { C, alpha } from '../colors'
import { COMMISSIONE_PCT, QUOTA_PCT, eur, num } from '../economia'
import * as M from '../motion'
import { motion } from '../motion'
import Spiega from '../components/Spiega'
import * as Icon from '../components/Icons'
import { daCatalogo, produttore, type Richiesta } from './dati'
import { economiaCassa, vociCassa } from './statistiche'

/* Il riassunto della richiesta, in cima a ogni conversazione: chi ha scritto,
   cosa ha messo nelle casse e quanto vale, prezzo per prezzo. È il pannello su
   cui si decide, quindi mostra i numeri aggiornati — se una proposta viene
   accettata, qui si legge subito il prezzo nuovo. */

export default function Riepilogo({ richiesta: r }: { richiesta: Richiesta }) {
  const [aperto, setAperto] = useState(true)
  const p = produttore(r.produttoreId)

  const bottiglie = r.casse.reduce((s, c) => s + c.quantita, 0)
  const tot = r.casse.reduce(
    (acc, c) => {
      const e = economiaCassa(c)
      return {
        listino: acc.listino + e.listino,
        scontato: acc.scontato + e.scontato,
        acquisto: acc.acquisto + e.acquisto,
        incasso: acc.incasso + e.incasso,
        quotaSiply: acc.quotaSiply + e.quotaSiply,
      }
    },
    { listino: 0, scontato: 0, acquisto: 0, incasso: 0, quotaSiply: 0 },
  )
  const nuovi = new Set(
    r.casse.flatMap(c => vociCassa(c).filter(v => !daCatalogo(v.bottiglia)).map(v => v.bottiglia.id)),
  ).size

  return (
    <div style={{ backgroundColor: C.white, borderRadius: '18px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
      <M.RowButton
        onClick={() => setAperto(a => !a)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <Icon.Appunti size={17} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Riepilogo della richiesta
          </p>
          <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.casse.length} cass{r.casse.length === 1 ? 'a' : 'e'} · {bottiglie} bottiglie · €{eur(tot.scontato)} al GDA
          </p>
        </div>
        <M.Chevron open={aperto} color={alpha(C.dark, 0.3)} />
      </M.RowButton>

      <M.Collapse open={aperto}>
        <div style={{ padding: '0 16px 16px' }}>
          {/* Chi ha scritto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon.Persona size={17} color={C.bg} blob={null} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: C.dark, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cantina}</p>
              <p style={{ color: C.gray, fontSize: '11.5px' }}>{p.referente} · {p.citta}, {p.regione}</p>
            </div>
            <span style={{ flexShrink: 0, fontSize: '11px', color: C.gray }}>
              {new Date(r.dataInvio).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* I quattro numeri che si guardano per primi */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <Numero etichetta="Valore a listino" valore={`€${eur(tot.listino)}`} />
            <Numero etichetta="Valore al GDA" valore={`€${eur(tot.scontato)}`} accento={C.magenta} />
            <Numero
              etichetta="Incassa il produttore"
              valore={`€${eur(tot.incasso)}`}
              nota={`${QUOTA_PCT} di €${eur(tot.acquisto)}`}
            />
            <Numero
              etichetta={`Commissione Siply`}
              valore={`€${eur(tot.quotaSiply)}`}
              nota={`${COMMISSIONE_PCT} del fatturato`}
              accento={C.forest}
            />
          </div>

          {/* Vini caricati dal produttore: è la cosa da controllare a mano */}
          {nuovi > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', backgroundColor: alpha(C.ocra, 0.14), borderRadius: '12px', padding: '10px 13px', marginBottom: '12px' }}>
              <Icon.Stella size={16} />
              <p style={{ color: C.olive, fontSize: '12px', lineHeight: 1.45 }}>
                <strong>{nuovi} vin{nuovi === 1 ? 'o' : 'i'} non {nuovi === 1 ? 'è' : 'sono'} nel nostro catalogo</strong>: {nuovi === 1 ? "l'ha" : 'li ha'} caricat{nuovi === 1 ? 'o' : 'i'} il produttore, {nuovi === 1 ? 'va' : 'vanno'} verificat{nuovi === 1 ? 'o' : 'i'}.
              </p>
            </div>
          )}

          {/* Le casse, una per una */}
          {r.casse.map(c => <CassaBlocco key={c.id} cassa={c} />)}

          {/* Obiettivi dichiarati */}
          <div style={{ marginTop: '12px', padding: '12px 14px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px' }}>
            <p style={{ color: alpha(C.dark, 0.45), fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '7px' }}>
              <Spiega k="obiettivi">Obiettivi di vendita</Spiega>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {r.obiettivi.map(n => (
                <span key={n} style={{ fontSize: '12px', fontWeight: 700, color: C.magenta, backgroundColor: alpha(C.magenta, 0.09), border: `1px solid ${alpha(C.magenta, 0.3)}`, padding: '4px 10px', borderRadius: '20px' }}>
                  {num(n)} bt
                </span>
              ))}
            </div>
          </div>

          {r.nota && (
            <div style={{ marginTop: '10px', padding: '11px 14px', backgroundColor: alpha(C.ocra, 0.12), borderRadius: '12px', borderLeft: `3px solid ${C.ocra}` }}>
              <p style={{ color: C.olive, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Nota del produttore</p>
              <p style={{ color: C.dark, fontSize: '12.5px', lineHeight: 1.5 }}>{r.nota}</p>
            </div>
          )}
        </div>
      </M.Collapse>
    </div>
  )
}

function Numero({ etichetta, valore, nota, accento }: { etichetta: string; valore: string; nota?: string; accento?: string }) {
  return (
    <div style={{ backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px', padding: '10px 12px' }}>
      <p style={{ color: alpha(C.dark, 0.45), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{etichetta}</p>
      <p style={{ color: accento ?? C.dark, fontSize: '16px', fontWeight: 800, lineHeight: 1.3 }}>{valore}</p>
      {nota && <p style={{ color: C.gray, fontSize: '10.5px' }}>{nota}</p>}
    </div>
  )
}

/** Una cassa: le bottiglie con i tre prezzi in fila, poi i totali. */
function CassaBlocco({ cassa: c }: { cassa: import('../App').Cassa }) {
  const e = economiaCassa(c)
  return (
    <div style={{ border: `1px solid ${alpha(C.dark, 0.09)}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', backgroundColor: alpha(C.dark, 0.04) }}>
        <Icon.Cassa size={15} />
        <p style={{ flex: 1, minWidth: 0, color: C.dark, fontSize: '12.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
        <span style={{ flexShrink: 0, fontSize: '11px', color: C.gray }}>{c.quantita} bt</span>
      </div>

      <div style={{ padding: '0 13px' }}>
        {vociCassa(c).map((v, i, arr) => {
          const listino = v.bottiglia.prezzo
          const gda = parseFloat(c.prezziScontati?.[v.bottiglia.id] ?? '') || listino
          const siply = parseFloat(c.costiScontati?.[v.bottiglia.id] ?? '') || 0
          const sconto = listino > 0 ? Math.round((1 - gda / listino) * 100) : 0
          return (
            <div key={v.bottiglia.id} style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${alpha(C.dark, 0.06)}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                <p style={{ flex: 1, minWidth: 0, color: C.dark, fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.bottiglia.nome}
                </p>
                {!daCatalogo(v.bottiglia) && (
                  <span style={{ flexShrink: 0, fontSize: '9.5px', fontWeight: 700, color: C.olive, backgroundColor: alpha(C.ocra, 0.22), padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    vino nuovo
                  </span>
                )}
                <span style={{ flexShrink: 0, fontSize: '11px', color: C.gray }}>{v.quantita} bt</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 10px', fontSize: '12px' }}>
                <Spiega k="listino" style={{ color: alpha(C.dark, 0.45) }}>
                  <span style={{ textDecoration: 'line-through' }}>€{eur(listino)}</span>
                </Spiega>
                {/* Il prezzo cambia quando il produttore accetta una proposta:
                    il lampo dice dov'è successo, senza doverlo cercare. */}
                <Lampo chiave={gda}>
                  <Spiega k="scontatoGda" style={{ color: C.magenta, fontWeight: 700 }}>
                    €{eur(gda)}
                  </Spiega>
                </Lampo>
                {sconto > 0 && (
                  <span style={{ color: C.forest, fontSize: '11px', fontWeight: 700, backgroundColor: alpha(C.green, 0.16), padding: '1px 7px', borderRadius: '20px' }}>
                    −{sconto}%
                  </span>
                )}
                {siply > 0 && (
                  <Lampo chiave={siply}>
                    <Spiega k="acquistoSiply" style={{ color: C.gray }}>
                      <span>a Siply €{eur(siply)}</span>
                    </Spiega>
                  </Lampo>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', padding: '9px 13px', backgroundColor: alpha(C.dark, 0.03), borderTop: `1px solid ${alpha(C.dark, 0.06)}` }}>
        <Spiega k="totaleScontato" style={{ color: C.dark, fontSize: '12px', fontWeight: 700 }}>
          GDA €{eur(e.scontato)}
        </Spiega>
        <Spiega k="incassoCassa" style={{ color: C.gray, fontSize: '12px' }}>
          produttore €{eur(e.incasso)}
        </Spiega>
        {e.costo > 0 && (
          <Spiega k="margineGda" style={{ color: e.margine >= 0 ? C.forest : C.magenta, fontSize: '12px', fontWeight: 600 }}>
            margine {e.margine >= 0 ? '+' : ''}€{eur(e.margine)}
          </Spiega>
        )}
      </div>
    </div>
  )
}

/** Riquadro che pulsa una volta quando il numero dentro cambia: dopo aver
 *  accettato una proposta si vede subito *dove* è cambiato qualcosa. */
export function Lampo({ chiave, children }: { chiave: string | number; children: React.ReactNode }) {
  return (
    <motion.span
      key={chiave}
      initial={{ backgroundColor: alpha(C.ocra, 0.55) }}
      animate={{ backgroundColor: alpha(C.ocra, 0) }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      style={{ borderRadius: '6px', padding: '0 3px', margin: '0 -3px' }}
    >
      {children}
    </motion.span>
  )
}
