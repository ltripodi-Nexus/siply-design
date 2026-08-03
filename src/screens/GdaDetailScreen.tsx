import { C, alpha } from '../colors'
import { cassaTotale, gdaBottiglie, gdaTotale, type Cassa, type Gda } from '../App'
import { num } from '../economia'
import * as M from '../motion'
import { STATUS } from '../status'
import { scrollToFooter } from '../components/Footer'
import Spiega from '../components/Spiega'
import * as Icon from '../components/Icons'

interface Props {
  gda: Gda
  onBack: () => void
}

const sCfg = {
  bozza: { label: 'Bozza non inviata', Icona: Icon.Matita, ...STATUS.bozza, desc: "Questo GDA non è ancora stato inviato. Riprendilo da \"I miei GDA\" per completarlo." },
  pending_approval: { label: 'In attesa di approvazione', Icona: Icon.Attesa, ...STATUS.pending_approval, desc: 'Il tuo GDA è sotto esame. Il team Siply ti farà sapere entro 48 ore lavorative.' },
  approved: { label: 'Approvato', Icona: Icon.Check, ...STATUS.approved, desc: 'Ottimo lavoro! Il tuo GDA è stato approvato ed è pubblicato sul catalogo Siply.' },
  refused: { label: 'Rifiutato', Icona: Icon.Croce, ...STATUS.refused, desc: 'Questo GDA non è stato approvato. Leggi le note per capire come migliorarlo.' },
}

export default function GdaDetailScreen({ gda, onBack }: Props) {
  const cfg = sCfg[gda.status]
  const totale = gdaTotale(gda)
  const bottiglie = gdaBottiglie(gda)
  const viniDiversi = new Set(
    gda.casse.flatMap(c => c.bottiglie ? c.bottiglie.map(b => b.bottiglia.id) : [c.bottiglia.id])
  ).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', backgroundColor: C.bg }}>

      {/* Header */}
      <div style={{ backgroundColor: C.dark, padding: '52px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <M.IconButton
            onClick={onBack}
            style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: alpha(C.white, 0.1), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </M.IconButton>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: alpha(C.silver, 0.45), fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Gruppo d'acquisto</p>
            <h2 style={{ color: C.bg, fontSize: '20px', fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gda.nome}</h2>
          </div>
        </div>

        {/* Status badge — su fondo scuro: variante chiara su velatura marcata */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: alpha(cfg.light, 0.18), border: `1.5px solid ${alpha(cfg.light, 0.45)}`, borderRadius: '12px', padding: '8px 14px' }}>
          <cfg.Icona size={16} color={cfg.light} blob={null} />
          <span style={{ color: cfg.light, fontSize: '13px', fontWeight: 700 }}>{cfg.label}</span>
        </div>
      </div>

      {/* Content — i blocchi entrano uno dopo l'altro dall'alto */}
      <M.List style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Status description */}
        <M.Item style={{ backgroundColor: C.white, borderRadius: '16px', padding: '16px', boxShadow: '0 1px 5px rgba(0,0,0,0.06)', borderLeft: `6px solid ${cfg.solid}` }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: cfg.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <cfg.Icona size={19} blob={cfg.solid} />
            </div>
            <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.6, paddingTop: '2px' }}>{cfg.desc}</p>
          </div>
          {gda.note && (
            <div style={{ marginTop: '12px', padding: '12px 14px', backgroundColor: alpha(C.ocra, 0.1), borderRadius: '12px', borderLeft: `3px solid ${C.ocra}` }}>
              <p style={{ color: C.olive, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Note Siply</p>
              <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.55 }}>{gda.note}</p>
            </div>
          )}
        </M.Item>

        {/* Price summary */}
        <M.Item style={{ backgroundColor: C.dark, borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: alpha(C.silver, 0.45), fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              <Spiega
                k="totaleGda"
                calcolo={`${gda.casse.map(c => `€${cassaTotale(c)}`).join(' + ')} = €${totale}`}
              >
                Totale GDA
              </Spiega>
            </p>
            <p style={{ color: C.bg, fontSize: '30px', fontWeight: 800, lineHeight: 1 }}>€ <M.Ticker value={totale} /></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: alpha(C.silver, 0.45), fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Bottiglie</p>
            <p style={{ color: C.bg, fontSize: '30px', fontWeight: 800, lineHeight: 1 }}><M.Ticker value={bottiglie} /></p>
          </div>
        </M.Item>

        {/* Casse del GDA */}
        {gda.casse.map(cassa => (
          <CassaBlock key={cassa.id} cassa={cassa} />
        ))}

        {/* Metadata */}
        <M.Item style={{ backgroundColor: C.white, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon.Appunti size={16} />
            <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Informazioni</p>
          </div>
          <div style={{ padding: '0 16px' }}>
            <InfoRow label="Data creazione" value={new Date(gda.dataCreazione).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <InfoRow label="Casse nel GDA" value={`${gda.casse.length} cass${gda.casse.length === 1 ? 'a' : 'e'}`} />
            <InfoRow label="Numero bottiglie" value={`${bottiglie} bottigli${bottiglie === 1 ? 'a' : 'e'}`} />
            <InfoRow label="Vini diversi" value={String(viniDiversi)} last={!gda.obiettivi?.length} />
            {gda.obiettivi && gda.obiettivi.length > 0 && (
              <InfoRow
                label={gda.obiettivi.length === 1 ? 'Obiettivo di vendita' : 'Obiettivi di vendita'}
                value={`${gda.obiettivi.map(num).join(' · ')} bottiglie`}
                last
              />
            )}
          </div>
        </M.Item>

        {/* Spedizione — dato del GDA, non della singola cassa */}
        {(gda.locationSpedizione || gda.noteSpedizione) && (
          <M.Item style={{ backgroundColor: C.white, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 16px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon.Cassa size={16} />
              <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Spedizione</p>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {gda.locationSpedizione && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <svg style={{ flexShrink: 0, marginTop: '2px' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.magenta} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <div>
                    <p style={{ color: C.gray, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Location di partenza</p>
                    <p style={{ color: C.dark, fontSize: '13px', fontWeight: 600, lineHeight: 1.45 }}>{gda.locationSpedizione}</p>
                  </div>
                </div>
              )}
              {gda.noteSpedizione && (
                <div style={{ marginTop: gda.locationSpedizione ? '12px' : 0, padding: '12px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px', borderLeft: `3px solid ${C.ocra}` }}>
                  <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note</p>
                  <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.5 }}>{gda.noteSpedizione}</p>
                </div>
              )}
              <p style={{ marginTop: '12px', color: C.gray, fontSize: '12.5px', lineHeight: 1.6 }}>
                Destinazione: nostro polo di <strong style={{ color: C.dark }}>Settimo Torinese (TO)</strong>. Per i dettagli di consegna scrivi ai{' '}
                <M.Button
                  type="button"
                  onClick={scrollToFooter}
                  style={{ display: 'inline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.magenta, fontWeight: 700, fontSize: '12.5px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                >
                  nostri contatti
                </M.Button>.
              </p>
            </div>
          </M.Item>
        )}

      </M.List>
    </div>
  )
}

/* ── Una cassa dentro il GDA ─────────────────────────────────────────────── */
function CassaBlock({ cassa }: { cassa: Cassa }) {
  const totale = cassaTotale(cassa)

  return (
    <M.Item style={{ backgroundColor: C.white, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 5px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '12px 16px', backgroundColor: alpha(C.dark, 0.03), borderBottom: `1px solid ${alpha(C.dark, 0.06)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon.Cassa size={16} />
        <p style={{ flex: 1, minWidth: 0, color: alpha(C.dark, 0.55), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cassa.nome}
        </p>
        <Spiega
          k="totaleListino"
          calcolo={`${(cassa.bottiglie ?? [{ bottiglia: cassa.bottiglia, quantita: cassa.quantita }])
            .map(b => `€${b.bottiglia.prezzo} × ${b.quantita}`).join(' + ')} = €${totale}`}
          style={{ color: C.gray, flexShrink: 0 }}
        >
          <span style={{ fontSize: '12px' }}>{cassa.quantita} bt · €{totale}</span>
        </Spiega>
      </div>
      <div style={{ padding: '0 16px' }}>
        {cassa.bottiglie ? (
          cassa.bottiglie.map((b, i) => (
            <BottigliaRow
              key={b.bottiglia.id}
              nome={b.bottiglia.nome}
              produttore={b.bottiglia.produttore}
              annata={b.bottiglia.annata}
              prezzo={b.bottiglia.prezzo}
              quantita={b.quantita}
              immagine={b.bottiglia.immagine}
              last={i === cassa.bottiglie!.length - 1}
            />
          ))
        ) : (
          <BottigliaRow
            nome={cassa.bottiglia.nome}
            produttore={cassa.bottiglia.produttore}
            annata={cassa.bottiglia.annata}
            prezzo={cassa.bottiglia.prezzo}
            quantita={cassa.quantita}
            immagine={cassa.bottiglia.immagine}
            last
          />
        )}
      </div>
      {cassa.note && (
        <div style={{ margin: '0 16px 14px', padding: '12px', backgroundColor: alpha(C.dark, 0.04), borderRadius: '12px', borderLeft: `3px solid ${C.ocra}` }}>
          <p style={{ color: alpha(C.dark, 0.45), fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Note</p>
          <p style={{ color: C.dark, fontSize: '13px', lineHeight: 1.5 }}>{cassa.note}</p>
        </div>
      )}
    </M.Item>
  )
}

function BottigliaRow({ nome, produttore, annata, prezzo, quantita, immagine, last }: {
  nome: string; produttore: string; annata: number; prezzo: number; quantita: number; immagine?: string; last?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${alpha(C.dark, 0.06)}` }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: alpha(C.forest, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
        {immagine
          ? <img src={immagine} alt={nome} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Icon.Bottiglia size={20} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: C.dark, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</p>
        <p style={{ color: C.gray, fontSize: '12px' }}>{produttore} · {annata}</p>
        <p style={{ color: C.gray, fontSize: '12.5px', marginTop: '3px' }}>
          <Spiega
            k="totaleRiga"
            calcolo={`€${prezzo} × ${quantita} bt = €${prezzo * quantita}`}
          >
            {quantita} bt × €{prezzo}
          </Spiega>
        </p>
      </div>
      <p style={{ color: C.dark, fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>€{prezzo * quantita}</p>
    </div>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${alpha(C.dark, 0.06)}` }}>
      <span style={{ color: C.gray, fontSize: '13px' }}>{label}</span>
      <span style={{ color: C.dark, fontSize: '13px', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
