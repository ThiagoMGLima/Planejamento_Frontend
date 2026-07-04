import { describe, it, expect, vi } from 'vitest'
import { scheduleTarefaDrop, moverEventoDrop } from './schedule.js'
import { decimalHour, toDateISO } from './dates.js'

function fakeStore(tarefas) {
  return {
    tarefas,
    promoverTarefa: vi.fn(() => 'evento_novo'),
    openEventPanel: vi.fn(),
  }
}

describe('scheduleTarefaDrop', () => {
  it('cria evento com duração = esforço estimado e abre o painel', async () => {
    const store = fakeStore([
      { id: 't1', titulo: 'Estudar', esforco_estimado: 120, status: 'INBOX' },
    ])
    const inicio = new Date(2026, 5, 15, 14, 0)
    await scheduleTarefaDrop(store, 't1', inicio)

    expect(store.promoverTarefa).toHaveBeenCalledTimes(1)
    const [, passedInicio, fim] = store.promoverTarefa.mock.calls[0]
    expect(passedInicio).toBe(inicio)
    expect(decimalHour(fim)).toBe(16) // 14:00 + 2h
    expect(store.openEventPanel).toHaveBeenCalledWith('evento_novo')
  })

  it('usa 1h quando a tarefa não tem esforço', async () => {
    const store = fakeStore([{ id: 't2', titulo: 'Ler', status: 'INBOX' }])
    await scheduleTarefaDrop(store, 't2', new Date(2026, 5, 15, 9, 0))
    const fim = store.promoverTarefa.mock.calls[0][2]
    expect(decimalHour(fim)).toBe(10)
  })

  it('recorta o fim na faixa (23:30)', async () => {
    const store = fakeStore([
      { id: 't3', titulo: 'Projeto', esforco_estimado: 180, status: 'INBOX' },
    ])
    await scheduleTarefaDrop(store, 't3', new Date(2026, 5, 15, 23, 0))
    const fim = store.promoverTarefa.mock.calls[0][2]
    expect(decimalHour(fim)).toBe(23.5)
  })

  it('ignora drop de tarefa inexistente', async () => {
    const store = fakeStore([])
    await scheduleTarefaDrop(store, 'naoexiste', new Date())
    expect(store.promoverTarefa).not.toHaveBeenCalled()
  })
})

describe('moverEventoDrop', () => {
  const fakeStore = () => ({ updateEvento: vi.fn() })

  it('move o evento para o novo início preservando a duração', async () => {
    const store = fakeStore()
    const inicio = new Date(2026, 5, 16, 10, 0)
    await moverEventoDrop(store, { eventoId: 'e1', durMin: 90 }, inicio)

    expect(store.updateEvento).toHaveBeenCalledTimes(1)
    const arg = store.updateEvento.mock.calls[0][0]
    expect(arg.id).toBe('e1')
    expect(toDateISO(new Date(arg.inicio))).toBe('2026-06-16')
    expect(decimalHour(new Date(arg.inicio))).toBe(10)
    expect((new Date(arg.fim) - new Date(arg.inicio)) / 60000).toBe(90) // 1h30
  })

  it('recorta o fim na faixa (23:30)', async () => {
    const store = fakeStore()
    await moverEventoDrop(store, { eventoId: 'e2', durMin: 180 }, new Date(2026, 5, 16, 23, 0))
    const arg = store.updateEvento.mock.calls[0][0]
    expect(decimalHour(new Date(arg.fim))).toBe(23.5)
  })

  it('ignora payload sem eventoId', async () => {
    const store = fakeStore()
    await moverEventoDrop(store, {}, new Date())
    expect(store.updateEvento).not.toHaveBeenCalled()
  })
})
