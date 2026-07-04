import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TarefaPanel from './TarefaPanel.jsx'

// Store e tema mockados: o painel é puro sobre eles.
const mockStore = {
  tarefas: [],
  classes: [
    { id: 'c1', nome: 'Estudar', cor: { bg: '#ecf4df', st: '#b9d795', tx: '#3b6d11' } },
    { id: 'c2', nome: 'Trabalho', cor: { bg: '#e1f5ee', st: '#8fd8bd', tx: '#0f6b4d' } },
  ],
  classeById(id) {
    return this.classes.find((c) => c.id === id)
  },
  updateTarefa: vi.fn(),
  removeTarefa: vi.fn(),
  closePanel: vi.fn(),
}

vi.mock('../store/store.jsx', () => ({ useStore: () => mockStore }))
vi.mock('../lib/theme.jsx', () => ({ useTheme: () => ({ theme: 'light' }) }))

const TAREFA = {
  id: 't1',
  titulo: 'Física 2',
  classe: 'c1',
  deadline: new Date(2026, 6, 20, 23, 59).toISOString(),
  esforco_estimado: 90,
  detalhes: 'cap. 3',
  status: 'INBOX',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockStore.tarefas = [TAREFA]
})

describe('TarefaPanel', () => {
  it('preenche o form a partir da tarefa (esforço em horas)', () => {
    render(<TarefaPanel tarefaId="t1" />)
    expect(screen.getByLabelText('Título')).toHaveValue('Física 2')
    expect(screen.getByLabelText('Classe')).toHaveValue('c1')
    expect(screen.getByLabelText('Prazo')).toHaveValue('2026-07-20')
    expect(screen.getByLabelText('Esforço (h)')).toHaveValue(1.5)
    expect(screen.getByLabelText('Detalhes')).toHaveValue('cap. 3')
  })

  it('salvar converte horas→minutos e fecha o painel', async () => {
    render(<TarefaPanel tarefaId="t1" />)
    const esforco = screen.getByLabelText('Esforço (h)')
    await userEvent.clear(esforco)
    await userEvent.type(esforco, '2.5')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(mockStore.updateTarefa).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', esforco_estimado: 150 }),
    )
    expect(mockStore.closePanel).toHaveBeenCalled()
  })

  it('limpar prazo/esforço/classe persiste como null (tarefa volta a inelegível)', async () => {
    render(<TarefaPanel tarefaId="t1" />)
    await userEvent.clear(screen.getByLabelText('Prazo'))
    await userEvent.clear(screen.getByLabelText('Esforço (h)'))
    await userEvent.selectOptions(screen.getByLabelText('Classe'), '')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(mockStore.updateTarefa).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: null, esforco_estimado: null, classe: null }),
    )
  })

  it('esforço zero ou inválido vira null, nunca NaN', async () => {
    render(<TarefaPanel tarefaId="t1" />)
    const esforco = screen.getByLabelText('Esforço (h)')
    await userEvent.clear(esforco)
    await userEvent.type(esforco, '0')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(mockStore.updateTarefa).toHaveBeenCalledWith(
      expect.objectContaining({ esforco_estimado: null }),
    )
  })

  it('título só de espaços vira "Sem título"', async () => {
    render(<TarefaPanel tarefaId="t1" />)
    const titulo = screen.getByLabelText('Título')
    await userEvent.clear(titulo)
    await userEvent.type(titulo, '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(mockStore.updateTarefa).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Sem título' }),
    )
  })

  it('prazo salvo cai no FIM do dia local (23:59), não na meia-noite UTC', async () => {
    render(<TarefaPanel tarefaId="t1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    const { deadline } = mockStore.updateTarefa.mock.calls[0][0]
    const d = new Date(deadline)
    expect([d.getHours(), d.getMinutes()]).toEqual([23, 59])
    expect(d.getDate()).toBe(20) // não escorregou de dia por fuso
  })

  it('excluir remove a tarefa e fecha', async () => {
    render(<TarefaPanel tarefaId="t1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(mockStore.removeTarefa).toHaveBeenCalledWith('t1')
    expect(mockStore.closePanel).toHaveBeenCalled()
    expect(mockStore.updateTarefa).not.toHaveBeenCalled()
  })

  it('tarefa inexistente (apagada por outra via) não renderiza nem quebra', () => {
    mockStore.tarefas = []
    const { container } = render(<TarefaPanel tarefaId="t-sumiu" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('tarefa sem classe/prazo/esforço renderiza com campos vazios', () => {
    mockStore.tarefas = [{ id: 't2', titulo: 'Solta', status: 'INBOX' }]
    render(<TarefaPanel tarefaId="t2" />)
    expect(screen.getByLabelText('Classe')).toHaveValue('')
    expect(screen.getByLabelText('Prazo')).toHaveValue('')
    expect(screen.getByLabelText('Esforço (h)')).toHaveValue(null)
  })
})
