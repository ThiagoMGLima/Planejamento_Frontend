import { describe, it, expect } from 'vitest'
import {
  snapHourFromY,
  formatDecimalHour,
  dateAtHour,
  gridPosition,
  startOfWeek,
  weekDays,
  sameDay,
  HOUR_PX,
  DAY_START,
  DAY_END,
} from './dates.js'

describe('snap de 15min (arrasto)', () => {
  it('y=0 cai no início da faixa (06:00)', () => {
    expect(snapHourFromY(0)).toBe(DAY_START)
  })

  it('arredonda para o quarto de hora mais próximo', () => {
    expect(formatDecimalHour(snapHourFromY(HOUR_PX * 0.2))).toBe('06:15') // 0.2h → 12min → 15min
    expect(formatDecimalHour(snapHourFromY(HOUR_PX * 1.1))).toBe('07:00') // 1.1h → 7h06 → 07:00
  })

  it('recorta no fim da faixa (23:30)', () => {
    expect(snapHourFromY(HOUR_PX * 100)).toBe(DAY_END)
  })
})

describe('formatDecimalHour', () => {
  it('formata hora decimal como HH:MM', () => {
    expect(formatDecimalHour(13.25)).toBe('13:15')
    expect(formatDecimalHour(9)).toBe('09:00')
    expect(formatDecimalHour(23.5)).toBe('23:30')
  })
})

describe('dateAtHour', () => {
  it('aplica a hora decimal a um dia', () => {
    const d = dateAtHour(new Date(2026, 5, 15), 14.5)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
  })
})

describe('gridPosition', () => {
  it('posiciona e dimensiona pela faixa 06:00–23:30', () => {
    const inicio = new Date(2026, 5, 15, 8, 0)
    const fim = new Date(2026, 5, 15, 10, 0)
    const { top, height } = gridPosition(inicio, fim)
    expect(top).toBe((8 - DAY_START) * HOUR_PX)
    expect(height).toBe(2 * HOUR_PX)
  })

  it('garante altura mínima legível', () => {
    const inicio = new Date(2026, 5, 15, 8, 0)
    const fim = new Date(2026, 5, 15, 8, 5)
    expect(gridPosition(inicio, fim).height).toBeGreaterThanOrEqual(16)
  })
})

describe('semana (Seg→Dom)', () => {
  it('startOfWeek cai na segunda', () => {
    // 2026-06-17 é quarta; a segunda da semana é 2026-06-15
    const seg = startOfWeek(new Date(2026, 5, 17))
    expect(seg.getDay()).toBe(1)
    expect(seg.getDate()).toBe(15)
  })

  it('weekDays retorna 7 dias começando na segunda', () => {
    const dias = weekDays(new Date(2026, 5, 17))
    expect(dias).toHaveLength(7)
    expect(dias[0].getDay()).toBe(1)
    expect(dias[6].getDay()).toBe(0)
    expect(sameDay(dias[2], new Date(2026, 5, 17))).toBe(true)
  })
})
