import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { STORAGE_KEY, buildInitialState } from './seed.js'
import { makeId } from '../lib/id.js'
import { addDays, addMonths, toDateISO } from '../lib/dates.js'

/**
 * Store local — a fonte única de estado/CRUD do app (Marcos 1–3). A interface
 * exposta (classes/tarefas/eventos + ações) é a MESMA que o Marco 4 vai
 * reimplementar sobre HTTP: trocar a implementação não muda os componentes.
 *
 * Persistência: localStorage sob a chave "planejador:v2". Só o domínio + view +
 * cursor são persistidos; seleção e painel são transientes de UI.
 */

const StoreContext = createContext(null)

/** Campos que vão para o localStorage. */
function persistable(state) {
  const { classes, tarefas, eventos, view, cursorISO } = state
  return { classes, tarefas, eventos, view, cursorISO }
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return { ...buildEmptyUi(), ...data }
    }
  } catch {
    /* localStorage indisponível ou corrompido — cai para o seed */
  }
  return { ...buildEmptyUi(), ...buildInitialState() }
}

function buildEmptyUi() {
  return { selectedId: null, panel: null }
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

    case 'SELECT':
      return { ...state, selectedId: action.id }

    case 'OPEN_PANEL':
      return { ...state, panel: action.panel, selectedId: action.panel?.eventId ?? state.selectedId }

    case 'CLOSE_PANEL':
      return { ...state, panel: null, selectedId: null }

    // ---- Evento CRUD --------------------------------------------------
    case 'ADD_EVENTO':
      return { ...state, eventos: [...state.eventos, action.evento] }

    case 'UPDATE_EVENTO':
      return {
        ...state,
        eventos: state.eventos.map((e) => (e.id === action.evento.id ? { ...e, ...action.evento } : e)),
      }

    case 'REMOVE_EVENTO':
      return { ...state, eventos: state.eventos.filter((e) => e.id !== action.id) }

    // ---- Tarefa CRUD --------------------------------------------------
    case 'ADD_TAREFA':
      return { ...state, tarefas: [...state.tarefas, action.tarefa] }

    case 'UPDATE_TAREFA':
      return {
        ...state,
        tarefas: state.tarefas.map((t) => (t.id === action.tarefa.id ? { ...t, ...action.tarefa } : t)),
      }

    case 'REMOVE_TAREFA':
      return { ...state, tarefas: state.tarefas.filter((t) => t.id !== action.id) }

    // ---- Classe CRUD --------------------------------------------------
    case 'ADD_CLASSE':
      return { ...state, classes: [...state.classes, action.classe] }

    case 'UPDATE_CLASSE':
      return {
        ...state,
        classes: state.classes.map((c) => (c.id === action.classe.id ? { ...c, ...action.classe } : c)),
      }

    case 'REMOVE_CLASSE':
      return { ...state, classes: state.classes.filter((c) => c.id !== action.id) }

    // ---- Máquina de estados (Concluir / Remarcar) ---------------------
    case 'CONCLUIR':
      return {
        ...state,
        eventos: state.eventos.map((e) =>
          e.id === action.id ? { ...e, status: 'CONCLUIDO' } : e,
        ),
        panel: null,
        selectedId: null,
      }

    case 'REMARCAR': {
      // Remove o evento e devolve a tarefa ao Inbox (handoff §6: Remarcar sempre
      // volta ao Inbox, preservando o fluxo Inbox → calendário).
      const evento = state.eventos.find((e) => e.id === action.id)
      if (!evento) return state
      let tarefas = state.tarefas
      if (evento.origem_tarefa) {
        tarefas = tarefas.map((t) => (t.id === evento.origem_tarefa ? { ...t, status: 'INBOX' } : t))
      } else {
        tarefas = [
          ...tarefas,
          {
            id: makeId('tarefa'),
            titulo: evento.titulo,
            classe: evento.classe,
            esforco_estimado: undefined,
            status: 'INBOX',
          },
        ]
      }
      return {
        ...state,
        eventos: state.eventos.filter((e) => e.id !== action.id),
        tarefas,
        panel: null,
        selectedId: null,
      }
    }

    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)

  // Persiste o domínio sempre que ele muda.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(state)))
    } catch {
      /* sem persistência — segue em memória */
    }
  }, [state.classes, state.tarefas, state.eventos, state.view, state.cursorISO])

  // Interface estável de ações (o Marco 4 reimplementa o corpo sobre HTTP).
  const store = useMemo(
    () => ({
      // estado
      classes: state.classes,
      tarefas: state.tarefas,
      eventos: state.eventos,
      view: state.view,
      cursorISO: state.cursorISO,
      selectedId: state.selectedId,
      panel: state.panel,

      // navegação / UI
      setView: (view) => dispatch({ type: 'SET_VIEW', view }),
      setCursor: (cursorISO) => dispatch({ type: 'SET_CURSOR', cursorISO }),
      goToday: () => dispatch({ type: 'TODAY' }),
      step: (dir) => dispatch({ type: 'STEP', dir }),
      select: (id) => dispatch({ type: 'SELECT', id }),
      openEventPanel: (eventId) => dispatch({ type: 'OPEN_PANEL', panel: { type: 'evento', eventId } }),
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

      // máquina de estados
      concluir: (id) => dispatch({ type: 'CONCLUIR', id }),
      remarcar: (id) => dispatch({ type: 'REMARCAR', id }),

      // utilidades de leitura
      classeById: (id) => state.classes.find((c) => c.id === id) ?? null,
      eventoById: (id) => state.eventos.find((e) => e.id === id) ?? null,
    }),
    [state],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

/** Hook de acesso ao store. */
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>')
  return ctx
}
