/**
 * Derivação de cor de classe. O backend guarda UM hex por classe (o fundo / bg);
 * o frontend renderiza com o trio { bg, st, tx } (fundo, traço, texto) do handoff
 * §2.2. Para as 5 classes padrão usamos os valores EXATOS do handoff; para
 * classes criadas pelo usuário, derivamos `st`/`tx` de `bg` por HSL.
 */

/** Trio exato das classes padrão, indexado pelo hex de fundo (lowercase). */
const PADRAO = {
  '#e6f1fb': { st: '#9cc4e8', tx: '#185fa5' }, // Aula
  '#f0efe9': { st: '#d8d6cd', tx: '#6a695f' }, // Tarefas básicas
  '#ecf4df': { st: '#b9d795', tx: '#3b6d11' }, // Estudar
  '#fbeaea': { st: '#e0b0b0', tx: '#a32d2d' }, // Prova
  '#e1f5ee': { st: '#9fe1cb', tx: '#0f6e56' }, // Trabalho
}

/**
 * @param {string} bg hex de fundo (#RRGGBB)
 * @returns {{ bg: string, st: string, tx: string }}
 */
export function corClasse(bg) {
  const key = String(bg ?? '').toLowerCase()
  const exato = PADRAO[key]
  if (exato) return { bg, st: exato.st, tx: exato.tx }

  // Derivação para classes custom: escurece (e satura um pouco) o fundo.
  const { h, s, l } = hexToHsl(key) ?? { h: 0, s: 0, l: 0.9 }
  const st = hslToHex(h, clamp(s + 0.05), clamp(l - 0.22))
  const tx = hslToHex(h, clamp(s + 0.2), clamp(Math.min(l - 0.5, 0.36)))
  return { bg, st, tx }
}

const clamp = (n) => Math.min(1, Math.max(0, n))

/** "#RRGGBB" → { h(0..1), s(0..1), l(0..1) } ou null se inválido. */
export function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h, s, l }
}

/** (h,s,l) em 0..1 → "#RRGGBB". */
export function hslToHex(h, s, l) {
  let r
  let g
  let b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}
