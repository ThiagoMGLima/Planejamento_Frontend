import { describe, it, expect, vi } from 'vitest'
import { scheduleTarefaDrop } from './schedule.js'
import { decimalHour } from './dates.js'

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
