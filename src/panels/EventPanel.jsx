import { useEffect, useState } from 'react'
import { useStore } from '../store/store.jsx'
import SidePanel from '../components/SidePanel.jsx'
import { toISO, WEEKDAYS_SHORT } from '../lib/dates.js'
import { statusEfetivo } from '../lib/status.js'

/**
 * Painel do Evento (handoff §4) — seletor de classe (define a cor e pré-marca
 * "Acompanhar conclusão"), início/fim/detalhes, "Repetir na rotina" (dias da
 * semana + ignorar feriados), conclusão (só se rastreável) e rodapé
 * Excluir/Salvar. Salvar edita a SÉRIE (evento-base); Concluir/Remarcar agem
 * sobre a OCORRÊNCIA selecionada.
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
  // Instância para a conclusão: a selecionada (pode ser uma ocorrência) ou o
  // próprio evento tratado como instância única.
  const instance = store.selectedInstance ?? baseInstance(evento)
  const status = statusEfetivo(instance, store.now)

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function onClasse(id) {
    const c = store.classeById(id)
    set({ classe: id, rastrear_conclusao: c ? c.rastreia_conclusao : form.rastrear_conclusao })
  }

  function toggleDia(d) {
    set({ dias: form.dias.includes(d) ? form.dias.filter((x) => x !== d) : [...form.dias, d].sort() })
  }

  function salvar() {
    const repetir = form.repetir && form.dias.length > 0
    store.updateEvento({
      id: evento.id,
      titulo: form.titulo.trim() || 'Sem título',
      classe: form.classe,
      inicio: toISO(form.inicio),
      fim: toISO(form.fim),
      detalhes: form.detalhes || undefined,
      rastrear_conclusao: form.rastrear_conclusao,
      status: form.rastrear_conclusao ? (evento.status ?? 'AGENDADO') : undefined,
      regra_recorrencia: repetir
        ? { tipo: 'SEMANAL', dias: form.dias, ignorar_feriados: form.ignorarFeriados }
        : undefined,
    })
    store.closePanel()
  }

  return (
    <SidePanel title="Evento" accent={classe?.cor?.st} onClose={store.closePanel}>
      <label className="field">
        <span className="field__label">Título</span>
        <input className="field__input" value={form.titulo} onChange={(e) => set({ titulo: e.target.value })} />
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

      {/* Repetir na rotina — dias da semana + ignorar feriados (handoff §4) */}
      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={form.repetir}
            onChange={(e) => set({ repetir: e.target.checked, dias: e.target.checked && form.dias.length === 0 ? [form.inicio.getDay()] : form.dias })}
          />
          <span>Repetir na rotina</span>
        </label>
        {form.repetir && (
          <div className="recur">
            <div className="recur__dias">
              {WEEKDAYS_SHORT.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className={`recur__dia ${form.dias.includes(i) ? 'recur__dia--on' : ''}`}
                  onClick={() => toggleDia(i)}
                >
                  {d[0]}
                </button>
              ))}
            </div>
            <label className="check check--sm">
              <input
                type="checkbox"
                checked={form.ignorarFeriados}
                onChange={(e) => set({ ignorarFeriados: e.target.checked })}
              />
              <span>Ignorar feriados</span>
            </label>
          </div>
        )}
      </div>

      {/* Conclusão — só para eventos/ocorrências rastreáveis */}
      {form.rastrear_conclusao && (
        <div className="panel-section">
          <div className="panel-section__row">
            <span className="field__label">
              Status{instance.recorrente ? ' (esta ocorrência)' : ''}
            </span>
            <span className={`statustag statustag--${(status ?? 'AGENDADO').toLowerCase()}`}>
              {labelStatus(status)}
            </span>
          </div>
          <div className="panel-section__actions">
            <button
              className="btn btn--done"
              type="button"
              disabled={status === 'CONCLUIDO'}
              onClick={() => store.concluir(instance)}
            >
              ✓ Concluir
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => store.remarcar(instance)}>
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
    return {
      titulo: '', classe: store.classes[0]?.id ?? '', inicio: new Date(), fim: new Date(),
      detalhes: '', rastrear_conclusao: false, repetir: false, dias: [], ignorarFeriados: false,
    }
  }
  const regra = evento.regra_recorrencia
  return {
    titulo: evento.titulo,
    classe: evento.classe,
    inicio: new Date(evento.inicio),
    fim: new Date(evento.fim),
    detalhes: evento.detalhes ?? '',
    rastrear_conclusao: !!evento.rastrear_conclusao,
    repetir: !!(regra && regra.dias?.length),
    dias: regra?.dias ?? [],
    ignorarFeriados: !!regra?.ignorar_feriados,
  }
}

/** Constrói uma instância única a partir de um evento não-recorrente. */
function baseInstance(evento) {
  return {
    id: evento.id,
    eventoId: evento.id,
    recorrente: false,
    occDateISO: null,
    rastrear_conclusao: !!evento.rastrear_conclusao,
    status: evento.status,
    inicio: evento.inicio,
    fim: evento.fim,
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
