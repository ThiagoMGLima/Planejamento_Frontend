import { describe, it, expect } from 'vitest'
import { corClasse, corParaTema, hexToHsl, hslToHex } from './colors.js'

describe('corClasse', () => {
  it('usa o trio EXATO do handoff para as classes padrão', () => {
    expect(corClasse('#e6f1fb')).toEqual({ bg: '#e6f1fb', st: '#9cc4e8', tx: '#185fa5' }) // Aula
    expect(corClasse('#ecf4df')).toEqual({ bg: '#ecf4df', st: '#b9d795', tx: '#3b6d11' }) // Estudar
    expect(corClasse('#e1f5ee')).toEqual({ bg: '#e1f5ee', st: '#9fe1cb', tx: '#0f6e56' }) // Trabalho
  })

  it('é case-insensitive no hex de fundo', () => {
    expect(corClasse('#ECF4DF')).toEqual({ bg: '#ECF4DF', st: '#b9d795', tx: '#3b6d11' })
  })

  it('deriva st/tx mais escuros para classe custom', () => {
    const { bg, st, tx } = corClasse('#e9d5ff') // violeta claro custom
    expect(bg).toBe('#e9d5ff')
    const lbg = hexToHsl(bg).l
    expect(hexToHsl(st).l).toBeLessThan(lbg) // traço mais escuro que o fundo
    expect(hexToHsl(tx).l).toBeLessThan(hexToHsl(st).l) // texto ainda mais escuro
  })

  it('não quebra com hex inválido', () => {
    const r = corClasse('lixo')
    expect(r.bg).toBe('lixo')
    expect(r.st).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('corParaTema', () => {
  const cor = corClasse('#e6f1fb') // Aula

  it('no tema claro devolve a cor sem alteração', () => {
    expect(corParaTema(cor, 'light')).toEqual(cor)
    expect(corParaTema(cor, undefined)).toEqual(cor)
  })

  it('no escuro escurece o fundo e clareia o texto, preservando a hue', () => {
    const dark = corParaTema(cor, 'dark')
    expect(hexToHsl(dark.bg).l).toBeLessThan(0.25) // fundo escuro
    expect(hexToHsl(dark.tx).l).toBeGreaterThan(0.6) // texto claro
    // mesma família de cor (hue próxima do fundo claro original)
    expect(hexToHsl(dark.bg).h).toBeCloseTo(hexToHsl(cor.bg).h, 1)
  })

  it('tolera cor ausente', () => {
    expect(corParaTema(undefined, 'dark')).toBeUndefined()
  })
})

describe('hexToHsl / hslToHex round-trip', () => {
  it('preserva a cor aproximadamente', () => {
    const { h, s, l } = hexToHsl('#3b6d11')
    const back = hexToHsl(hslToHex(h, s, l))
    expect(back.h).toBeCloseTo(h, 2)
    expect(back.s).toBeCloseTo(s, 2)
    expect(back.l).toBeCloseTo(l, 2)
  })
})
