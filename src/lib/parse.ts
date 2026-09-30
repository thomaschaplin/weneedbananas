export interface ParsedItem {
  name: string
  qty: number | null
  unit: string | null
  note: string | null
}

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gr: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l', ltr: 'l', cl: 'cl',
  lb: 'lb', lbs: 'lb', oz: 'oz', pt: 'pint', pint: 'pint', pints: 'pint',
  pack: 'pack', packs: 'pack', pk: 'pack', packet: 'pack', packets: 'pack',
  tin: 'tin', tins: 'tin', can: 'can', cans: 'can',
  jar: 'jar', jars: 'jar', bottle: 'bottle', bottles: 'bottle',
  bag: 'bag', bags: 'bag', box: 'box', boxes: 'box',
  bunch: 'bunch', bunches: 'bunch', loaf: 'loaf', loaves: 'loaf',
  tub: 'tub', tubs: 'tub', dozen: 'dozen', doz: 'dozen',
}

const NUM = String.raw`(\d+(?:[.,]\d+)?|½|¼|¾)`
const UNIT = String.raw`(${Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length).join('|')})`

// "500g mince", "2 x milk", "2x milk", "3 tins tomatoes", "2 milk"
const LEADING = new RegExp(String.raw`^${NUM}\s*(?:${UNIT}\b\.?|x\b)?\s*(?:of\s+)?(.+)$`, 'i')
// "bananas x6", "bananas 6", "mince 500g", "milk x 2"
const TRAILING = new RegExp(String.raw`^(.+?)\s+(?:x\s*)?${NUM}\s*(?:${UNIT}\b\.?)?$`, 'i')

function toNumber(s: string): number {
  if (s === '½') return 0.5
  if (s === '¼') return 0.25
  if (s === '¾') return 0.75
  return parseFloat(s.replace(',', '.'))
}

export function parseItem(raw: string): ParsedItem | null {
  let text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return null

  // Notes in brackets or after a dash: "eggs (free range)", "bread - seeded"
  let note: string | null = null
  const bracket = text.match(/^(.*?)\s*\(([^)]*)\)\s*(.*)$/)
  if (bracket) {
    note = bracket[2].trim() || null
    text = `${bracket[1]} ${bracket[3]}`.trim()
  } else {
    const dash = text.match(/^(.+?)\s+[-–—]\s+(.+)$/)
    if (dash) {
      text = dash[1]
      note = dash[2].trim()
    }
  }

  let qty: number | null = null
  let unit: string | null = null
  let name = text

  const lead = text.match(LEADING)
  const trail = text.match(TRAILING)
  if (lead && lead[3].trim()) {
    qty = toNumber(lead[1])
    unit = lead[2] ? UNIT_ALIASES[lead[2].toLowerCase()] : null
    name = lead[3]
  } else if (trail) {
    name = trail[1]
    qty = toNumber(trail[2])
    unit = trail[3] ? UNIT_ALIASES[trail[3].toLowerCase()] : null
  }

  name = name.trim()
  if (!name) return null
  if (qty !== null && (!isFinite(qty) || qty <= 0)) qty = null
  return { name, qty, unit, note }
}

/** Split pasted text (newlines, commas, bullet points) into separate items. */
export function parseMany(raw: string): ParsedItem[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of raw) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if ((ch === '\n' || ch === ',' || ch === ';') && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  return parts
    .map((p) => p.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '').replace(/^\[[ x]?\]\s*/i, ''))
    .map(parseItem)
    .filter((p): p is ParsedItem => p !== null)
}

/** Lowercase, singular key used for de-duplication and aisle lookup. */
export function itemKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s&'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

export function singular(w: string): string {
  if (w.length <= 3 || /(ss|us|is)$/.test(w)) return w
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y'
  if (/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2)
  if (/ves$/.test(w) && !/(olives|chives|cloves|endives)$/.test(w)) return w.slice(0, -3) + 'f'
  if (/s$/.test(w)) return w.slice(0, -1)
  return w
}

export function formatQty(qty: number | null, unit: string | null): string {
  if (qty === null && !unit) return ''
  const n = qty === null ? '' : Number.isInteger(qty) ? String(qty) : String(+qty.toFixed(2))
  if (!unit) return n
  if (/^(g|kg|ml|l|cl|lb|oz)$/.test(unit)) return `${n}${unit}`
  const plural = qty !== null && qty !== 1 && unit !== 'dozen'
  const u = plural ? (unit === 'box' || unit === 'bunch' ? `${unit}es` : unit === 'loaf' ? 'loaves' : `${unit}s`) : unit
  return `${n} ${u}`.trim()
}
