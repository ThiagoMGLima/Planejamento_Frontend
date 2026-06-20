import { useEffect, useState } from 'react'
import { useStore } from '../store/store.jsx'
import SidePanel from '../components/SidePanel.jsx'
import { toISO } from '../lib/dates.js'

/**
 * Painel do Evento (handoff §4) — seletor de classe (define a cor e pré-marca
 * "Acompanhar conclusão" pelo padrão da classe), início/fim/detalhes, repetir,
 * conclusão (só se rastreável), e rodapé Excluir/Salvar. O calendário continua
 * visível atrás. O editor completo de recorrência chega no Marco 3.
 *
 * @param {{ eventId: string }} props
 */
export default function EventPanel({ eventId }) {
  const store = useStore()
  const evento = store.eventoById(eventId)

  const [form, setForm] = useState(() => fromEvento(evento, store))

  useEffect(() => {
    setForm(fromEvento(store.eventoById(eventId), store))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  if (!evento) return null
  const classe = store.classeById(form.classe)

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function onClasse(id) {
    const c = store.classeById(id)
    // Trocar de classe re-aplica o padrão de rastreamento da nova classe.
    set({ classe: id, rastrear_conclusao: c ? c.rastreia_conclusao : form.rastrear_conclusao })
  }

  function salvar() {
    store.updateEvento({
      id: evento.id,
      titulo: form.titulo.trim() || 'Sem título',
      classe: form.classe,
      inicio: toISO(form.inicio),
      fim: toISO(form.fim),
      detalhes: form.detalhes || undefined,
      rastrear_conclusao: form.rastrear_conclusao,
      status: form.rastrear_conclusao ? evento.status ?? 'AGENDADO' : undefined,
    })
    store.closePanel()
  }

  return (
    <SidePanel title="Evento" accent={classe?.cor?.st} onClose={store.closePanel}>
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
        <select className="field__input" value={form.classe} onChange={(e) => onClasse(e.target.value)}>
          {store.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Início</span>
          <input
            type="datetime-local"
            className="field__input mono"
            value={toLocalInput(form.inicio)}
            onChange={(e) => set({ inicio: new Date(e.target.value) })}
          />
        </label>
        <label className="field">
          <span className="field__label">Fim</span>
          <input
            type="datetime-local"
            className="field__input mono"
            value={toLocalInput(form.fim)}
            onChange={(e) => set({ fim: new Date(e.target.value) })}
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

      <label className="check">
        <input
          type="checkbox"
          checked={form.rastrear_conclusao}
          onChange={(e) => set({ rastrear_conclusao: e.target.checked })}
        />
        <span>Acompanhar conclusão</span>
      </label>

      {/* Repetir na rotina — editor completo de recorrência no Marco 3 */}
      <div className="field">
        <span className="field__label">Repetir na rotina</span>
        <p className="field__hint">Editor de recorrência (dias + ignorar feriados) chega no Marco 3.</p>
      </div>

      {/* Conclusão — só para eventos rastreáveis */}
      {form.rastrear_conclusao && (
        <div className="panel-section">
          <div className="panel-section__row">
            <span className="field__label">Status</span>
            <span className={`statustag statustag--${(evento.status ?? 'AGENDADO').toLowerCase()}`}>
              {labelStatus(evento.status)}
            </span>
          </div>
          <div className="panel-section__actions">
            <button
              className="btn btn--done"
              type="button"
              disabled={evento.status === 'CONCLUIDO'}
              onClick={() => store.concluir(evento.id)}
            >
              ✓ Concluir
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => store.remarcar(evento.id)}>
              ↻ Remarcar
            </button>
          </div>
        </div>
      )}

      <footer className="panel-footer">
        <button
          className="btn btn--danger"
          type="button"
          onClick={() => {
            store.removeEvento(evento.id)
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

function fromEvento(evento, store) {
  if (!evento) {
    return { titulo: '', classe: store.classes[0]?.id ?? '', inicio: new Date(), fim: new Date(), detalhes: '', rastrear_conclusao: false }
  }
  return {
    titulo: evento.titulo,
    classe: evento.classe,
    inicio: new Date(evento.inicio),
    fim: new Date(evento.fim),
    detalhes: evento.detalhes ?? '',
    rastrear_conclusao: !!evento.rastrear_conclusao,
  }
}

/** Date → "YYYY-MM-DDTHH:mm" para <input type="datetime-local">. */
function toLocalInput(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

function labelStatus(s) {
  return { AGENDADO: 'Agendado', PENDENTE: 'Pendente', CONCLUIDO: 'Concluído', REMARCADO: 'Remarcado' }[s] ?? 'Agendado'
}
