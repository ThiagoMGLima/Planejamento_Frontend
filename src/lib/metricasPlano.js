/**
 * Apresentação das métricas de cenário (W3). Puro — o backend fornece os números
 * (HANDOFF §4); aqui só decidimos rótulo, formato e a leitura semântica do delta
 * vs. base: verde = melhora, âmbar = custo, neutro = zero (nunca vermelho — não
 * é erro, é trade-off, §6).
 */

/** As 3–4 métricas exibidas no card, na ordem, com o sentido de "melhor". */
export const METRICAS_CARD = [
  { chave: 'pico_min_dia', rotulo: 'pico/dia', tipo: 'min', maiorMelhor: false },
  { chave: 'dias_livres', rotulo: 'dias livres', tipo: 'int', maiorMelhor: true },
  { chave: 'folga_media_h', rotulo: 'folga média', tipo: 'h', maiorMelhor: true },
  { chave: 'min_fora_janela', rotulo: 'fora da janela', tipo: 'min', maiorMelhor: false },
]

/** 'melhora' | 'custo' | 'neutro' a partir do delta e do sentido da métrica. */
export function sentidoDelta(delta, maiorMelhor) {
  if (!delta) return 'neutro'
  const melhora = maiorMelhor ? delta > 0 : delta < 0
  return melhora ? 'melhora' : 'custo'
}

/** Formata um valor de métrica conforme o tipo. */
export function formatMetrica(valor, tipo) {
  if (valor == null) return '—'
  if (tipo === 'min') return formatMinutos(valor)
  if (tipo === 'h') return `${arredonda1(valor)}h`
  return `${valor}`
}

/** Formata o delta com seta (sem cor — a cor vem de `sentidoDelta`). */
export function formatDelta(delta, tipo) {
  if (!delta) return null
  const seta = delta > 0 ? '▲' : '▼'
  const mag = tipo === 'h' ? `${arredonda1(Math.abs(delta))}h` : formatMinutosMagnitude(Math.abs(delta), tipo)
  return `${seta} ${mag}`
}

/** Minutos de carga por dia da semana (seg=0 … dom=6), a partir das sessões. */
export function densidadePorDia(sessoes) {
  const dias = Array(7).fill(0)
  for (const s of sessoes ?? []) {
    const off = (new Date(s.inicio).getDay() + 6) % 7 // Date: dom=0 → seg=0
    dias[off] += s.dur_min ?? 0
  }
  return dias
}

function formatMinutos(min) {
  if (min % 60 === 0) return `${min / 60}h`
  if (min > 60) return `${Math.floor(min / 60)}h${min % 60}min`
  return `${min}min`
}

function formatMinutosMagnitude(min, tipo) {
  return tipo === 'min' ? formatMinutos(min) : `${min}`
}

function arredonda1(n) {
  return Math.round(n * 10) / 10
}
