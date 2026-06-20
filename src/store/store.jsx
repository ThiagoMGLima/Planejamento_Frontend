import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { STORAGE_KEY, buildInitialState } from './seed.js'
import { makeId } from '../lib/id.js'
import { addDays, addMonths, toDateISO, toISO } from '../lib/dates.js'
import { expandInstances, instancesOfDay } from '../lib/recurrence.js'
import { statusEfetivo } from '../lib/status.js'

/**
 * Store local — fonte única de estado/CRUD (Marcos 1–3). A interface exposta é a
 * MESMA que o Marco 4 vai reimplementar sobre HTTP. No Marco 3 ganhou: expansão
 * local de recorrência, pendência derivada (status_efetivo via relógio) e a
 * promoção de tarefa (drag → horário).
 *
 * Persistência: localStorage "planejador:v2" (domínio + view + cursor). Seleção,
 * painel e relógio são transientes.
 */

// Exportado para o ApiStoreProvider (Marco 4) reusar o MESMO contexto/hook.
// eslint-disable-next-line react-refresh/only-export-components
export const StoreContext = createContext(null)

function persistable(state) {
  const { classes, tarefas, eventos, feriados, view, cursorISO } = state
  return { classes, tarefas, eventos, feriados, view, cursorISO }
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyUi(), ...JSON.parse(raw) }
  } catch {
    /* indisponível/corrompido — cai para o seed */
  }
  return { ...emptyUi(), ...buildInitialState() }
}

function emptyUi() {
  return { selectedId: null, selectedInstance: null, panel: null }
}

/** Devolve uma tarefa ao Inbox: reaproveita a de origem ou cria uma nova. */
function devolverAoInbox(tarefas, evento) {
  if (evento.origem_tarefa && tarefas.some((t) => t.id === evento.origem_tarefa)) {
    return tarefas.map((t) => (t.id === evento.origem_tarefa ? { ...t, status: 'INBOX' } : t))
  }
  return [
    ...tarefas,
    { id: makeId('tarefa'), titulo: evento.titulo, classe: evento.classe, status: 'INBOX' },
  ]
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'SET_CURSOR':
      return { ...state, cursorISO: action.cursorISO }
    case 'TODAY':
      return { ...state, cursorISO: toDateISO(new Date()) }
    case 'STEP': {
      const base = new Date(state.cursorISO)
      const next =
        state.view === 'dia'
          ? addDays(base, action.dir)
          : state.view === 'mes'
            ? addMonths(base, action.dir)
            : addDays(base, action.dir * 7)
      return { ...state, cursorISO: toDateISO(next) }
    }

    case 'OPEN_PANEL':
      return {
        ...state,
        panel: action.panel,
        selectedId: action.selectedId ?? state.selectedId,
        selectedInstance: action.selectedInstance ?? null,
      }
    case 'CLOSE_PANEL':
      return { ...state, panel: null, selectedId: null, selectedInstance: null }

    // ---- Evento CRUD --------------------------------------------------
    case 'ADD_EVENTO':
      return { ...state, eventos: [...state.eventos, action.evento] }
    case 'UPDATE_EVENTO':
      return {
        ...state,
        eventos: state.eventos.map((e) =>
          e.id === action.evento.id ? { ...e, ...action.evento } : e,
        ),
      }
    case 'REMOVE_EVENTO':
      return { ...state, eventos: state.eventos.filter((e) => e.id !== action.id) }

    // ---- Tarefa CRUD --------------------------------------------------
    case 'ADD_TAREFA':
      return { ...state, tarefas: [...state.tarefas, action.tarefa] }
    case 'UPDATE_TAREFA':
      return {
        ...state,
        tarefas: state.tarefas.map((t) =>
          t.id === action.tarefa.id ? { ...t, ...action.tarefa } : t,
        ),
      }
    case 'REMOVE_TAREFA':
      return { ...state, tarefas: state.tarefas.filter((t) => t.id !== action.id) }

    // ---- Classe CRUD --------------------------------------------------
    case 'ADD_CLASSE':
      return { ...state, classes: [...state.classes, action.classe] }
    case 'UPDATE_CLASSE':
      return {
        ...state,
        classes: state.classes.map((c) =>
          c.id === action.classe.id ? { ...c, ...action.classe } : c,
        ),
      }
    case 'REMOVE_CLASSE':
      return { ...state, classes: state.classes.filter((c) => c.id !== action.id) }

    // ---- Promoção Tarefa → Evento (drag → horário) --------------------
    case 'PROMOVER': {
      const tarefa = state.tarefas.find((t) => t.id === action.tarefaId)
      if (!tarefa) return state
      const classe = state.classes.find((c) => c.id === tarefa.classe) ?? state.classes[0]
      const rastrear = !!classe?.rastreia_conclusao
      const evento = {
        id: action.id,
        titulo: tarefa.titulo,
        inicio: action.inicioISO,
        fim: action.fimISO,
        classe: classe?.id,
        rastrear_conclusao: rastrear,
        status: rastrear ? 'AGENDADO' : undefined,
        origem_tarefa: tarefa.id,
      }
      return {
        ...state,
        eventos: [...state.eventos, evento],
        tarefas: state.tarefas.map((t) => (t.id === tarefa.id ? { ...t, status: 'PROMOVIDA' } : t)),
      }
    }

    // ---- Máquina de estados, por instância ----------------------------
    case 'CONCLUIR_INST': {
      const { instance } = action
      const eventos = state.eventos.map((e) => {
        if (e.id !== instance.eventoId) return e
        if (instance.recorrente) {
          const ocorrencias = { ...(e.ocorrencias ?? {}) }
          ocorrencias[instance.occDateISO] = {
            ...(ocorrencias[instance.occDateISO] ?? {}),
            status: 'CONCLUIDO',
          }
          return { ...e, ocorrencias }
        }
        return { ...e, status: 'CONCLUIDO' }
      })
      return { ...state, eventos, panel: null, selectedId: null, selectedInstance: null }
    }

    case 'REMARCAR_INST': {
      // Remarcar sempre devolve ao Inbox (handoff §6). Para ocorrências, marca a
      // ocorrência como REMARCADA (mantém a série); para eventos simples, remove.
      const { instance } = action
      const base = state.eventos.find((e) => e.id === instance.eventoId)
      if (!base) return state
      const tarefas = devolverAoInbox(state.tarefas, base)
      let eventos
      if (instance.recorrente) {
        eventos = state.eventos.map((e) => {
          if (e.id !== base.id) return e
          const ocorrencias = { ...(e.ocorrencias ?? {}) }
          ocorrencias[instance.occDateISO] = {
            ...(ocorrencias[instance.occDateISO] ?? {}),
            status: 'REMARCADO',
          }
          return { ...e, ocorrencias }
        })
      } else {
        eventos = state.eventos.filter((e) => e.id !== base.id)
      }
      return { ...state, eventos, tarefas, panel: null, selectedId: null, selectedInstance: null }
    }

    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  // Relógio: tica para a pendência derivada aparecer sozinha ao vencer.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(state)))
    } catch {
      /* sem persistência — segue em memória */
    }
    // Persistimos só quando uma fatia do DOMÍNIO muda — não em seleção/painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.classes, state.tarefas, state.eventos, state.feriados, state.view, state.cursorISO])

  const store = useMemo(() => {
    const feriadosSet = new Set((state.feriados ?? []).map((f) => f.data))
    const feriadoByDate = (dateISO) =>
      (state.feriados ?? []).find((f) => f.data === dateISO) ?? null

    /** Instâncias (expandindo recorrência) numa janela [start, end] de dias. */
    const instancesInRange = (start, end) =>
      expandInstances(state.eventos, { feriados: feriadosSet, start, end })

    /** Instâncias pendentes derivadas numa janela passada (para pílula/painel). */
    const pendingInstances = () => {
      const start = addDays(now, -21)
      return instancesInRange(start, now).filter((i) => statusEfetivo(i, now) === 'PENDENTE')
    }

    return {
      // estado
      classes: state.classes,
      tarefas: state.tarefas,
      eventos: state.eventos,
      feriados: state.feriados ?? [],
      view: state.view,
      cursorISO: state.cursorISO,
      selectedId: state.selectedId,
      selectedInstance: state.selectedInstance,
      panel: state.panel,
      now,

      // navegação / UI
      setView: (view) => dispatch({ type: 'SET_VIEW', view }),
      setCursor: (cursorISO) => dispatch({ type: 'SET_CURSOR', cursorISO }),
      goToday: () => dispatch({ type: 'TODAY' }),
      step: (dir) => dispatch({ type: 'STEP', dir }),
      openEventPanel: (eventId, instance = null) =>
        dispatch({
          type: 'OPEN_PANEL',
          panel: { type: 'evento', eventId },
          selectedId: instance ? instance.id : eventId,
          selectedInstance: instance,
        }),
      openPendingPanel: () => dispatch({ type: 'OPEN_PANEL', panel: { type: 'pendentes' } }),
      closePanel: () => dispatch({ type: 'CLOSE_PANEL' }),

      // CRUD
      addEvento: (evento) => dispatch({ type: 'ADD_EVENTO', evento }),
      updateEvento: (evento) => dispatch({ type: 'UPDATE_EVENTO', evento }),
      removeEvento: (id) => dispatch({ type: 'REMOVE_EVENTO', id }),
      addTarefa: (tarefa) => dispatch({ type: 'ADD_TAREFA', tarefa }),
      updateTarefa: (tarefa) => dispatch({ type: 'UPDATE_TAREFA', tarefa }),
      removeTarefa: (id) => dispatch({ type: 'REMOVE_TAREFA', id }),
      addClasse: (classe) => dispatch({ type: 'ADD_CLASSE', classe }),
      updateClasse: (classe) => dispatch({ type: 'UPDATE_CLASSE', classe }),
      removeClasse: (id) => dispatch({ type: 'REMOVE_CLASSE', id }),

      // drag → horário: cria evento a partir da tarefa e devolve o id criado
      promoverTarefa: (tarefaId, inicio, fim) => {
        const id = makeId('evento')
        dispatch({ type: 'PROMOVER', id, tarefaId, inicioISO: toISO(inicio), fimISO: toISO(fim) })
        return id
      },

      // máquina de estados por instância
      concluir: (instance) => dispatch({ type: 'CONCLUIR_INST', instance }),
      remarcar: (instance) => dispatch({ type: 'REMARCAR_INST', instance }),

      // leitura / expansão
      classeById: (id) => state.classes.find((c) => c.id === id) ?? null,
      eventoById: (id) => state.eventos.find((e) => e.id === id) ?? null,
      feriadoByDate,
      instancesInRange,
      instancesOfDay: (day, start, end) =>
        instancesOfDay(instancesInRange(start ?? day, end ?? day), day),
      pendingInstances,
    }
  }, [state, now])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

// Provider + hook moram juntos de propósito (módulo do store).
// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>')
  return ctx
}
