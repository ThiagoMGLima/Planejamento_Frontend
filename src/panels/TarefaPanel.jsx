import { useEffect, useState } from 'react'
import { useStore } from '../store/store.jsx'
import SidePanel from '../components/SidePanel.jsx'
import { corParaTema } from '../lib/colors.js'
import { useTheme } from '../lib/theme.jsx'

/**
 * Painel da Tarefa — abre ao clicar num card do Inbox (modo normal). Edita os
 * mesmos campos do form de criação (título, classe, prazo, esforço, detalhes),
 * mas completos: dá para LIMPAR prazo/esforço/classe (o mapper envia null). É o
 * caminho para completar uma tarefa inelegível ao plano sem recriá-la.
 *
 * @param {{ tarefaId: string }} props
 */
export default function TarefaPanel({ tarefaId }) {
  const store = useStore()
  const { theme } = useTheme()
  const tarefa = store.tarefas.find((t) => t.id === tarefaId)

  const [form, setForm] = useState(() => fromTarefa(tarefa))

  useEffect(() => {
    setForm(fromTarefa(store.tarefas.find((t) => t.id === tarefaId)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefaId])

  if (!tarefa) return null
  const classe = store.classeById(form.classe)

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function salvar() {
    const horas = parseFloat(form.esforcoH)
    store.updateTarefa({
      ...tarefa,
      titulo: form.titulo.trim() || 'Sem título',
      classe: form.classe || null,
      deadline: form.deadline ? new Date(`${form.deadline}T23:59`).toISOString() : null,
      esforco_estimado: Number.isFinite(horas) && horas > 0 ? Math.round(horas * 60) : null,
      detalhes: form.detalhes,
    })
    store.closePanel()
  }

  return (
    <SidePanel
      title="Tarefa"
      accent={classe?.cor ? corParaTema(classe.cor, theme).st : undefined}
      onClose={store.closePanel}
    >
      <label className="field">
        <span className="field__label">Título</span>
        <input
          className="field__input"
          value={form.titulo}
          onChange={(e) => set({ titulo: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field__label">Classe</span>
        <select
          className="field__input"
          value={form.classe}
          onChange={(e) => set({ classe: e.target.value })}
        >
          <option value="">sem classe</option>
          {store.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Prazo</span>
          <input
            type="date"
            className="field__input mono"
            value={form.deadline}
            onChange={(e) => set({ deadline: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">Esforço (h)</span>
          <input
            type="number"
            min="0"
            step="0.5"
            className="field__input mono"
            value={form.esforcoH}
            onChange={(e) => set({ esforcoH: e.target.value })}
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Detalhes</span>
        <textarea
          className="field__input field__input--area"
          rows={2}
          value={form.detalhes}
          onChange={(e) => set({ detalhes: e.target.value })}
        />
      </label>

      <p className="field__hint">
        Para entrar num plano a tarefa precisa de prazo, esforço e classe.
      </p>

      <footer className="panel-footer">
        <button
          className="btn btn--danger"
          type="button"
          onClick={() => {
            store.removeTarefa(tarefa.id)
            store.closePanel()
          }}
        >
          Excluir
        </button>
        <button className="btn btn--ui" type="button" onClick={salvar}>
          Salvar
        </button>
      </footer>
    </SidePanel>
  )
}

function fromTarefa(tarefa) {
  if (!tarefa) return { titulo: '', classe: '', deadline: '', esforcoH: '', detalhes: '' }
  return {
    titulo: tarefa.titulo,
    classe: tarefa.classe ?? '',
    deadline: tarefa.deadline ? toDateInput(tarefa.deadline) : '',
    esforcoH: tarefa.esforco_estimado != null ? String(tarefa.esforco_estimado / 60) : '',
    detalhes: tarefa.detalhes ?? '',
  }
}

/** ISO → "YYYY-MM-DD" no fuso local para <input type="date">. */
function toDateInput(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
