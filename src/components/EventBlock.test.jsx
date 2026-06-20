import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventBlock from './EventBlock.jsx'

const classe = {
  id: 'estudar',
  nome: 'Estudar',
  cor: { bg: '#ecf4df', st: '#b9d795', tx: '#3b6d11' },
}
const base = {
  id: 'e1',
  titulo: 'Estudar P1',
  inicio: new Date(2026, 5, 15, 13, 0).toISOString(),
  fim: new Date(2026, 5, 15, 15, 0).toISOString(),
  rastrear_conclusao: true,
}
const now = new Date(2026, 5, 15, 12, 0) // antes do fim

describe('EventBlock', () => {
  it('renderiza título e horário (cor = classe)', () => {
    render(<EventBlock instance={{ ...base, status: 'AGENDADO' }} classe={classe} now={now} />)
    expect(screen.getByText('Estudar P1')).toBeInTheDocument()
    expect(screen.getByText('13:00–15:00')).toBeInTheDocument()
    const btn = screen.getByRole('button')
    expect(btn.style.background).toBeTruthy()
  })

  it('marca pendente (⚠) por DERIVAÇÃO quando o horário venceu', () => {
    const venceu = new Date(2026, 5, 15, 16, 0)
    render(<EventBlock instance={{ ...base, status: 'AGENDADO' }} classe={classe} now={venceu} />)
    expect(screen.getByText(/⚠/)).toBeInTheDocument()
    expect(screen.getByRole('button').className).toContain('event--pend')
  })

  it('mostra ✓ e estilo concluído quando CONCLUIDO', () => {
    render(<EventBlock instance={{ ...base, status: 'CONCLUIDO' }} classe={classe} now={now} />)
    expect(screen.getByText(/✓/)).toBeInTheDocument()
    expect(screen.getByRole('button').className).toContain('event--done')
  })

  it('aplica o estado selecionado', () => {
    render(
      <EventBlock instance={{ ...base, status: 'AGENDADO' }} classe={classe} now={now} selected />,
    )
    expect(screen.getByRole('button').className).toContain('event--selected')
  })

  it('dispara onClick', async () => {
    const onClick = vi.fn()
    render(
      <EventBlock
        instance={{ ...base, status: 'AGENDADO' }}
        classe={classe}
        now={now}
        onClick={onClick}
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('evento que não rastreia nunca fica pendente/concluído', () => {
    const aula = { ...base, rastrear_conclusao: false }
    const venceu = new Date(2026, 5, 15, 18, 0)
    render(<EventBlock instance={aula} classe={classe} now={venceu} />)
    const cls = screen.getByRole('button').className
    expect(cls).not.toContain('event--pend')
    expect(cls).not.toContain('event--done')
  })
})
