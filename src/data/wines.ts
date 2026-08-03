import img458 from '@/imports/Frame_458.png'
import img459 from '@/imports/Frame_459.png'

const A = img458
const B = img459

export interface WineRich {
  id: string
  nome: string
  annata: number
  denominazione: string
  prezzo: number
  produttore: string
  regione: string
  vitigno: string
  corpo: 'Leggero' | 'Medio' | 'Pieno'
  abbinamenti: string[]
  biologico: boolean
  immagine?: string
}

export const WINES: WineRich[] = [
  { id: '1', nome: 'Brunello di Montalcino', annata: 2019, denominazione: 'DOCG', prezzo: 42, produttore: 'Cantina Ferretti', regione: 'Toscana', vitigno: 'Sangiovese', corpo: 'Pieno', abbinamenti: ['Carne', 'Formaggi'], biologico: true, immagine: A },
  { id: '2', nome: 'Barolo Cannubi', annata: 2018, denominazione: 'DOCG', prezzo: 58, produttore: 'Tenute Rossi', regione: 'Piemonte', vitigno: 'Nebbiolo', corpo: 'Pieno', abbinamenti: ['Carne', 'Selvaggina'], biologico: false, immagine: B },
  { id: '3', nome: 'Chianti Classico Riserva', annata: 2020, denominazione: 'DOCG', prezzo: 24, produttore: 'Podere Vinci', regione: 'Toscana', vitigno: 'Sangiovese', corpo: 'Medio', abbinamenti: ['Pasta', 'Pizza', 'Formaggi'], biologico: false, immagine: A },
  { id: '4', nome: 'Amarone della Valpolicella', annata: 2017, denominazione: 'DOCG', prezzo: 65, produttore: 'Famiglia Borghetti', regione: 'Veneto', vitigno: 'Corvina', corpo: 'Pieno', abbinamenti: ['Carne', 'Formaggi', 'Selvaggina'], biologico: false, immagine: B },
  { id: '5', nome: 'Sagrantino di Montefalco', annata: 2019, denominazione: 'DOCG', prezzo: 32, produttore: 'Cantina Ferretti', regione: 'Umbria', vitigno: 'Sagrantino', corpo: 'Pieno', abbinamenti: ['Carne', 'Selvaggina'], biologico: true, immagine: A },
  { id: '6', nome: 'Primitivo di Manduria', annata: 2021, denominazione: 'DOC', prezzo: 18, produttore: 'Masseria Del Sud', regione: 'Puglia', vitigno: 'Primitivo', corpo: 'Pieno', abbinamenti: ['Carne', 'Pizza', 'Pasta'], biologico: false, immagine: B },
  { id: '7', nome: 'Vermentino di Sardegna', annata: 2022, denominazione: 'DOC', prezzo: 14, produttore: 'Tenute Sarde', regione: 'Sardegna', vitigno: 'Vermentino', corpo: 'Leggero', abbinamenti: ['Pesce', 'Antipasti'], biologico: true, immagine: A },
  { id: '8', nome: 'Etna Rosso Riserva', annata: 2020, denominazione: 'DOC', prezzo: 28, produttore: 'Vulcano Wines', regione: 'Sicilia', vitigno: 'Nerello Mascalese', corpo: 'Medio', abbinamenti: ['Carne', 'Pasta', 'Pesce'], biologico: true, immagine: B },
  { id: '9', nome: 'Soave Classico Superiore', annata: 2022, denominazione: 'DOC', prezzo: 12, produttore: 'Cantine Venete', regione: 'Veneto', vitigno: 'Garganega', corpo: 'Leggero', abbinamenti: ['Pesce', 'Antipasti', 'Formaggi'], biologico: false, immagine: A },
  { id: '10', nome: "Nero d'Avola Riserva", annata: 2019, denominazione: 'IGT', prezzo: 22, produttore: 'Masseria Del Sud', regione: 'Sicilia', vitigno: "Nero d'Avola", corpo: 'Pieno', abbinamenti: ['Carne', 'Pizza', 'Formaggi'], biologico: false, immagine: B },
  { id: '11', nome: 'Gavi di Gavi DOCG', annata: 2022, denominazione: 'DOCG', prezzo: 16, produttore: 'Cascina Bianca', regione: 'Piemonte', vitigno: 'Cortese', corpo: 'Leggero', abbinamenti: ['Pesce', 'Antipasti'], biologico: true, immagine: A },
  { id: '12', nome: "Montepulciano d'Abruzzo", annata: 2021, denominazione: 'DOC', prezzo: 15, produttore: 'Vigna Adriatica', regione: 'Abruzzo', vitigno: 'Montepulciano', corpo: 'Medio', abbinamenti: ['Carne', 'Pasta', 'Pizza'], biologico: false, immagine: B },
]

export const DENOMINAZIONI = ['DOCG', 'DOC', 'IGT', 'VdT']
export const REGIONI = ['Toscana', 'Piemonte', 'Veneto', 'Sicilia', 'Puglia', 'Umbria', 'Sardegna', 'Abruzzo']
export const VITIGNI = ['Sangiovese', 'Nebbiolo', 'Corvina', 'Sagrantino', 'Primitivo', 'Vermentino', 'Nerello Mascalese', 'Garganega', "Nero d'Avola", 'Cortese', 'Montepulciano']
export const CORPI = ['Leggero', 'Medio', 'Pieno']
export const ABBINAMENTI = ['Carne', 'Pesce', 'Pasta', 'Pizza', 'Formaggi', 'Antipasti', 'Selvaggina']
export const ANNI = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]

export interface WineFilters {
  query: string
  denominazioni: string[]
  regioni: string[]
  vitigni: string[]
  corpi: string[]
  abbinamenti: string[]
  prezzoMin: number
  prezzoMax: number
  annataMin: number
  annataMax: number
  soloNaturale: boolean
}

export const FILTERS_INIT: WineFilters = {
  query: '',
  denominazioni: [],
  regioni: [],
  vitigni: [],
  corpi: [],
  abbinamenti: [],
  prezzoMin: 0,
  prezzoMax: 200,
  annataMin: 2015,
  annataMax: 2023,
  soloNaturale: false,
}

export function applyFilters(wines: WineRich[], f: WineFilters): WineRich[] {
  return wines.filter(b => {
    if (f.query && !`${b.nome} ${b.produttore} ${b.vitigno} ${b.regione}`.toLowerCase().includes(f.query.toLowerCase())) return false
    if (f.denominazioni.length && !f.denominazioni.includes(b.denominazione)) return false
    if (f.regioni.length && !f.regioni.includes(b.regione)) return false
    if (f.vitigni.length && !f.vitigni.includes(b.vitigno)) return false
    if (f.corpi.length && !f.corpi.includes(b.corpo)) return false
    if (f.abbinamenti.length && !f.abbinamenti.some(a => b.abbinamenti.includes(a))) return false
    if (b.prezzo < f.prezzoMin || b.prezzo > f.prezzoMax) return false
    if (b.annata < f.annataMin || b.annata > f.annataMax) return false
    if (f.soloNaturale && !b.biologico) return false
    return true
  })
}

export function toggleArr(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export function activeFilterCount(f: WineFilters) {
  let n = 0
  if (f.denominazioni.length) n++
  if (f.regioni.length) n++
  if (f.vitigni.length) n++
  if (f.corpi.length) n++
  if (f.abbinamenti.length) n++
  if (f.prezzoMin > 0 || f.prezzoMax < 200) n++
  if (f.annataMin > 2015 || f.annataMax < 2023) n++
  if (f.soloNaturale) n++
  return n
}
