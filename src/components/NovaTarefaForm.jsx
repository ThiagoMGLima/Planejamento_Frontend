import { useState } from 'react'
import { useStore } from '../store/store.jsx'
import { makeId } from '../lib/id.js'

/**
 * Form leve de "Nova tarefa" no Inbox. Cria uma tarefa via `store.addTarefa`
 * (localStorage ou POST /tarefas/, conforme a fonte de dados). Para entrar no
 * montador de rotina a tarefa precisa de prazo + esforço + classe — os três
 * campos ficam aqui, mas só o título é obrigatório (tarefa incompleta aparece
 * como inelegível no modo Planejar, com o motivo).
 */
export default function NovaTarefaForm({ onClose }) {
  const store = useStore()
  const [titulo, setTitulo] = useState('')
  const [classe, setClasse] = useState('')
  const [deadline, setDeadline] = useState('')
  const [esforcoH, setEsforcoH] = useState('')

  function submit(e) {
    e.preventDefault()
    const nome = titulo.trim()
    if (!nome) return
    const horas = parseFloat(esforcoH)
    store.addTarefa({
      id: makeId('tarefa'),
      titulo: nome,
      classe: classe || undefined,
      deadline: deadline || undefined,
      esforco_estimado: Number.isFinite(horas) && horas > 0 ? Math.round(horas * 60) : undefined,
      status: 'INBOX',
    })
    onClose?.()
  }

  return (
    <form className="novatarefa" onSubmit={submit}>
      <input
        className="novatarefa__titulo"
        type="text"
        placeholder="Nova tarefa…"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
        aria-label="Título da tarefa"
      />
      <div className="novatarefa__linha">
        <select
          className="novatarefa__campo"
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          aria-label="Classe"
        >
          <option value="">classe…</option>
          {store.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <input
          className="novatarefa__campo mono"
          type="number"
          min="0"
          step="0.5"
          placeholder="esforço (h)"
          value={esforcoH}
          onChange={(e) => setEsforcoH(e.target.value)}
          aria-label="Esforço em horas"
        />
      </div>
      <input
        className="novatarefa__campo mono"
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        aria-label="Prazo"
      />
      <div className="novatarefa__acoes">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--ui btn--sm" disabled={!titulo.trim()}>
          Adicionar
        </button>
      </div>
    </form>
  )
}
