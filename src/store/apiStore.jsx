import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StoreContext } from './store.jsx'
import { api } from '../lib/api.js'
import * as M from './mappers.js'
import { statusEfetivo } from '../lib/status.js'
import { addDays, addMonths, startOfDay, sameDay, toDateISO, viewWindow } from '../lib/dates.js'

/**
 * ApiStoreProvider (Marco 4) — implementa A MESMA interface do `useStore`, mas
 * sobre o backend HTTP (`src/lib/api.js`). A expansão de recorrência, o
 * `status_efetivo` e os feriados passam a vir do servidor. Views e componentes
 * não mudam: só a origem dos dados.
 *
 * Estratégia: classes/tarefas/pendentes carregam no mount; a janela de eventos
 * (+ feriados do(s) ano(s)) recarrega quando view/cursor mudam; mutações chamam
 * a API e refazem o fetch das fatias afetadas.
 */
export function ApiStoreProvider({ children }) {
  const [ui, setUi] = useState(() => ({
    view: 'semana',
    cursorISO: toDateISO(new Date()),
    selectedId: null,
    selectedInstance: null,
    panel: null,
  }))
  const uiRef = useRef(ui)
  uiRef.current = ui

  const [now, setNow] = useState(() => new Date())
  const [classes, setClasses] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [feriados, setFeriados] = useState([])
  const [windowItems, setWindowItems] = useState([])
  const [pendentesRaw, setPendentesRaw] = useState([])
  const [rawEventos, setRawEventos] = useState({})
  const [error, setError] = useState(null)

  // Relógio (mantém a derivação visual de PENDENTE fresca entre fetches).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const guard = useCallback(async (fn) => {
    try {
      return await fn()
    } catch (e) {
      setError(e)
      console.error('[apiStore]', e)
      return null
    }
  }, [])

  const loadClasses = useCallback(
    () => guard(async () => setClasses((await api.classes.list()).map(M.classeFromApi))),
    [guard],
  )
  const loadTarefas = useCallback(
    () => guard(async () => setTarefas((await api.tarefas.list()).map(M.tarefaFromApi))),
    [guard],
  )
  const loadPendentes = useCallback(
    () => guard(async () => setPendentesRaw((await api.pendentes()).map(M.instanceFromApiItem))),
    [guard],
  )

  const loadWindow = useCallback(
    (view, cursorISO) =>
      guard(async () => {
        const { start, end } = viewWindow(view, cursorISO)
        const items = await api.eventos.list({
          inicio: start.toISOString(),
          fim: end.toISOString(),
        })
        setWindowItems(items.map(M.instanceFromApiItem))

        const anos = new Set()
        for (let y = start.getFullYear(); y <= end.getFullYear(); y++) anos.add(y)
        const listas = await Promise.all([...anos].map((ano) => api.feriados({ ano })))
        setFeriados(
          listas.flatMap((r) => (r?.feriados ?? []).map((data) => ({ data, nome: 'Feriado' }))),
        )
      }),
    [guard],
  )
  const reloadWindow = useCallback(
    () => loadWindow(uiRef.current.view, uiRef.current.cursorISO),
    [loadWindow],
  )

  // Carga inicial.
  useEffect(() => {
    loadClasses()
    loadTarefas()
    loadPendentes()
  }, [loadClasses, loadTarefas, loadPendentes])

  // Recarrega a janela quando view/cursor mudam.
  useEffect(() => {
    loadWindow(ui.view, ui.cursorISO)
  }, [ui.view, ui.cursorISO, loadWindow])

  const store = useMemo(() => {
    const setPanel = (panel, selectedId = null, selectedInstance = null) =>
      setUi((u) => ({ ...u, panel, selectedId, selectedInstance }))

    return {
      // estado
      classes,
      tarefas,
      eventos: Object.values(rawEventos),
      feriados,
      view: ui.view,
      cursorISO: ui.cursorISO,
      selectedId: ui.selectedId,
      selectedInstance: ui.selectedInstance,
      panel: ui.panel,
      now,
      error,

      // navegação / UI
      setView: (view) => setUi((u) => ({ ...u, view })),
      setCursor: (cursorISO) => setUi((u) => ({ ...u, cursorISO })),
      goToday: () => setUi((u) => ({ ...u, cursorISO: toDateISO(new Date()) })),
      step: (dir) =>
        setUi((u) => {
          const base = new Date(u.cursorISO)
          const next =
            u.view === 'dia'
              ? addDays(base, dir)
              : u.view === 'mes'
                ? addMonths(base, dir)
                : addDays(base, dir * 7)
          return { ...u, cursorISO: toDateISO(next) }
        }),
      openEventPanel: async (eventId, instance = null) => {
        const dto = await guard(() => api.eventos.get(eventId))
        if (dto) setRawEventos((prev) => ({ ...prev, [eventId]: M.eventoFromApi(dto) }))
        setPanel({ type: 'evento', eventId }, instance ? instance.id : eventId, instance)
      },
      openPendingPanel: () => setPanel({ type: 'pendentes' }),
      closePanel: () => setPanel(null),

      // CRUD — Classe
      addClasse: async (c) => {
        await guard(() => api.classes.create(M.classeToApi(c)))
        await loadClasses()
        reloadWindow()
      },
      updateClasse: async (c) => {
        await guard(() => api.classes.update(c.id, M.classeToApi(c)))
        await loadClasses()
        reloadWindow()
      },
      removeClasse: async (id) => {
        await guard(() => api.classes.remove(id))
        loadClasses()
      },

      // CRUD — Tarefa
      addTarefa: async (t) => {
        await guard(() => api.tarefas.create(M.tarefaToApi(t)))
        loadTarefas()
      },
      updateTarefa: async (t) => {
        await guard(() => api.tarefas.patch(t.id, M.tarefaToApi(t)))
        loadTarefas()
      },
      removeTarefa: async (id) => {
        await guard(() => api.tarefas.remove(id))
        loadTarefas()
      },

      // CRUD — Evento
      addEvento: async (e) => {
        await guard(() => api.eventos.create(M.eventoToApi(e)))
        await reloadWindow()
        loadPendentes()
      },
      updateEvento: async (e) => {
        const dto = await guard(() => api.eventos.update(e.id, M.eventoToApi(e)))
        if (dto) setRawEventos((prev) => ({ ...prev, [e.id]: M.eventoFromApi(dto) }))
        await reloadWindow()
        loadPendentes()
      },
      removeEvento: async (id) => {
        await guard(() => api.eventos.remove(id))
        await reloadWindow()
        loadPendentes()
      },

      // Drag → horário (devolve o id do evento criado, para abrir o painel).
      promoverTarefa: async (tarefaId, inicio, fim) => {
        const dto = await guard(() =>
          api.tarefas.promover(tarefaId, {
            inicio: new Date(inicio).toISOString(),
            fim: fim ? new Date(fim).toISOString() : undefined,
          }),
        )
        await loadTarefas()
        await reloadWindow()
        loadPendentes()
        if (dto) setRawEventos((prev) => ({ ...prev, [dto.id]: M.eventoFromApi(dto) }))
        return dto?.id ?? null
      },

      // Máquina de estados por instância (escopo conforme recorrência).
      concluir: async (instance) => {
        const params = instance.recorrente
          ? { escopo: 'ocorrencia', data: instance.occDateISO }
          : { escopo: 'serie' }
        await guard(() => api.eventos.concluir(instance.eventoId, params))
        setPanel(null)
        await reloadWindow()
        loadPendentes()
      },
      remarcar: async (instance) => {
        const params = instance.recorrente
          ? { escopo: 'ocorrencia', data: instance.occDateISO }
          : { escopo: 'serie' }
        await guard(() => api.eventos.remarcar(instance.eventoId, params))
        setPanel(null)
        await Promise.all([loadTarefas(), reloadWindow()])
        loadPendentes()
      },

      // leitura / expansão (a partir do cache da janela já buscada)
      classeById: (id) => classes.find((c) => c.id === id) ?? null,
      eventoById: (id) => rawEventos[id] ?? null,
      feriadoByDate: (dateISO) => feriados.find((f) => f.data === dateISO) ?? null,
      instancesInRange: (start, end) => {
        const s = startOfDay(start)
        const e = startOfDay(end)
        return windowItems.filter((i) => {
          const d = startOfDay(i.inicio)
          return d >= s && d <= e
        })
      },
      instancesOfDay: (day) => windowItems.filter((i) => sameDay(i.inicio, day)),
      pendingInstances: () => {
        const byId = new Map()
        for (const i of pendentesRaw) byId.set(i.id, i)
        for (const i of windowItems) {
          if (i.recorrente && statusEfetivo(i, now) === 'PENDENTE') byId.set(i.id, i)
        }
        return [...byId.values()]
      },
    }
  }, [
    ui,
    now,
    classes,
    tarefas,
    feriados,
    windowItems,
    pendentesRaw,
    rawEventos,
    error,
    guard,
    loadClasses,
    loadTarefas,
    loadPendentes,
    reloadWindow,
  ])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
