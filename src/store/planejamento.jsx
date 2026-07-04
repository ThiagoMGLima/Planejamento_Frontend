import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useStore } from './store.jsx'
import { elegibilidadeTarefa, tarefasDoInbox } from '../lib/elegibilidade.js'
import { fromDateISO, toDateISO, weekDays } from '../lib/dates.js'
import {
  USA_API,
  aplicarReplanejamento,
  consultarJob,
  consultarRefino,
  criarJobCenarios,
  descartarJob,
  diffVazio,
  escolherCenario,
  montarCorpoCenarios,
  refinarCenario,
  simularReplanejamento,
} from '../lib/planejamentoClient.js'

/**
 * Estado do montador de rotina — feature "Rotina Inteligente". Vive num provider
 * próprio, independente da fonte de dados: lê tarefas/classes do `useStore()` e
 * fala com o backend de cenários por `lib/planejamentoClient.js`, que escolhe
 * entre o mock local e o HTTP real conforme `VITE_DATA_SOURCE` (`USA_API`).
 *
 * Fluxo: Planejar liga o modo seleção → toggla tarefas elegíveis → escolhe
 * horizonte → "Gerar cenários" faz o POST + polling (W2) → PRONTO abre a
 * comparação (W3) → aplicar cria os eventos. "Replanejar" (W4) simula um diff.
 *
 * As chamadas são `await`-adas: no mock resolvem na hora; no HTTP são de rede.
 * Ao aplicar em modo API os eventos já persistem no servidor, então recarregamos
 * o store (`store.recarregar`) em vez de inserir localmente.
 */
const PlanejamentoContext = createContext(null)

const GERACAO_IDLE = { status: 'idle' }
const REPLAN_IDLE = { status: 'idle' }
const SEM_CENARIOS = [] // referência estável p/ o caso "ainda não gerou"
// Chat do lote (W3+): conversa sobre os cenários ("gostei do B, mas sem
// academia essa semana"). A conversa pertence ao LOTE (job); `cenarioFocoId`
// só diz por qual card ela foi aberta.
const CHAT_IDLE = { aberto: false, cenarioFocoId: null, mensagens: [], enviando: false }

// Teto do horizonte "Personalizado" (meses). O usuário pode escolher até aqui.
const HORIZONTE_MAX_MESES = 6
const DIAS_POR_MES = 30 // aproximação p/ derivar a janela em dias do backend

export function PlanejamentoProvider({ children }) {
  const store = useStore()
  const [modoPlanejar, setModoPlanejar] = useState(false)
  const [selecaoIds, setSelecaoIds] = useState(() => new Set())
  const [horizonte, setHorizonte] = useState('AUTOMATICO')
  // Horizonte "Personalizado": duração em meses, limitada a 1–6 (HORIZONTE_MAX_MESES).
  const [horizonteMeses, setHorizonteMesesState] = useState(3)
  const [geracao, setGeracao] = useState(GERACAO_IDLE)
  // W3: id do cenário em foco (preview no calendário); default = "Sugerido".
  const [cenarioSelecionadoId, setCenarioSelecionadoId] = useState(null)
  const [aplicando, setAplicando] = useState(false)
  // W4: simulação de replanejamento (diff antes de aplicar).
  const [replan, setReplan] = useState(REPLAN_IDLE)
  // Chat sobre o lote de cenários (refino conversacional, marco C5).
  const [chat, setChat] = useState(CHAT_IDLE)
  const pollRef = useRef(null)
  const chatPollRef = useRef(null)
  const chatSeqRef = useRef(0) // invalida um refino em voo quando o chat reseta
  const cancelRef = useRef(false) // corta o loop async já em voo (após um await)

  const pararPoll = useCallback(() => {
    cancelRef.current = true
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
    if (chatPollRef.current) {
      clearTimeout(chatPollRef.current)
      chatPollRef.current = null
    }
  }, [])

  const resetarChat = useCallback(() => {
    chatSeqRef.current += 1
    setChat(CHAT_IDLE)
  }, [])

  // Tarefas do Inbox com elegibilidade pré-calculada (para o Inbox e a contagem).
  const inbox = useMemo(() => {
    return tarefasDoInbox(store.tarefas).map((t) => ({
      tarefa: t,
      ...elegibilidadeTarefa(t),
    }))
  }, [store.tarefas])

  const elegiveis = useMemo(() => inbox.filter((i) => i.elegivel), [inbox])

  // Só ids elegíveis contam — se uma tarefa deixou de ser elegível, some da soma.
  const selecionadas = useMemo(
    () => elegiveis.filter((i) => selecaoIds.has(i.tarefa.id)).map((i) => i.tarefa),
    [elegiveis, selecaoIds],
  )
  const selCount = selecionadas.length
  const selMin = selecionadas.reduce((acc, t) => acc + (t.esforco_estimado ?? 0), 0)
  const gerarHabilitado = selCount >= 1

  const togglePlanejar = useCallback(() => {
    pararPoll()
    resetarChat()
    setGeracao(GERACAO_IDLE)
    setCenarioSelecionadoId(null)
    setModoPlanejar((v) => !v)
  }, [pararPoll, resetarChat])

  const toggleTarefa = useCallback(
    (id) => {
      const alvo = elegiveis.find((i) => i.tarefa.id === id)
      if (!alvo) return // ignora inelegíveis
      setSelecaoIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [elegiveis],
  )

  // "Selecionar todas" — marca todas as tarefas elegíveis de uma vez.
  const selecionarTodas = useCallback(() => {
    setSelecaoIds(new Set(elegiveis.map((i) => i.tarefa.id)))
  }, [elegiveis])

  const limparSelecao = useCallback(() => setSelecaoIds(new Set()), [])

  const todasSelecionadas = elegiveis.length > 0 && selCount === elegiveis.length

  // Setter do horizonte personalizado, sempre clampado a 1–HORIZONTE_MAX_MESES.
  const setHorizonteMeses = useCallback((n) => {
    const v = Math.max(1, Math.min(HORIZONTE_MAX_MESES, Math.round(Number(n) || 1)))
    setHorizonteMesesState(v)
  }, [])

  const cancelarGeracao = useCallback(() => {
    pararPoll()
    resetarChat()
    setCenarioSelecionadoId(null)
    setGeracao((g) => {
      if (g.jobId) descartarJob(g.jobId)
      return GERACAO_IDLE
    })
  }, [pararPoll, resetarChat])

  const encerrarPlanejamento = useCallback(() => {
    pararPoll()
    resetarChat()
    setGeracao((g) => {
      if (g.jobId) descartarJob(g.jobId)
      return GERACAO_IDLE
    })
    setCenarioSelecionadoId(null)
    setModoPlanejar(false)
    setSelecaoIds(new Set())
  }, [pararPoll, resetarChat])

  const gerar = useCallback(async () => {
    if (selCount < 1) return
    pararPoll()
    resetarChat()
    cancelRef.current = false

    const janelaDias = horizonte === 'CUSTOMIZADO' ? horizonteMeses * DIAS_POR_MES : undefined
    const body = montarCorpoCenarios({ tarefaIds: [...selecaoIds], horizonte, janelaDias })
    // ctx é andaime só do mock (o backend real deriva isto dos tarefa_ids).
    const inicioSemana = weekDays(fromDateISO(store.cursorISO))[0]
    let resp
    try {
      resp = await criarJobCenarios(body, { tarefas: selecionadas, inicioSemana })
    } catch (err) {
      if (!cancelRef.current) setGeracao({ status: 'erro', erro: err })
      return
    }
    if (cancelRef.current) return

    const { jobId, tempoEstimadoS } = resp
    const inicio = Date.now()
    setGeracao({
      status: 'processando',
      jobId,
      tempoEstimadoS,
      progresso: 0,
      restanteS: tempoEstimadoS,
      iaIndisponivel: false,
    })

    // Poll assíncrono: no HTTP é um GET a cada ~1,5s; no mock resolve na hora. A
    // barra interpola pelo `tempo_estimado_s` (estimativa honesta da 202).
    const intervaloMs = USA_API ? 1500 : 150
    const tick = async () => {
      if (cancelRef.current) return
      const decorridoS = (Date.now() - inicio) / 1000
      const progresso = tempoEstimadoS > 0 ? Math.min(99, (decorridoS / tempoEstimadoS) * 100) : 50
      const restanteS = Math.max(0, Math.ceil(tempoEstimadoS - decorridoS))

      let status
      try {
        status = await consultarJob(jobId)
      } catch (err) {
        if (!cancelRef.current) setGeracao({ status: 'erro', erro: err })
        return
      }
      if (cancelRef.current) return

      if (status.status === 'PRONTO') {
        const cenarios = status.cenarios ?? []
        const sugerido = cenarios.find((c) => c.sugerido) ?? cenarios.find((c) => c.id !== 'base')
        setCenarioSelecionadoId(sugerido?.id ?? null)
        setGeracao({
          status: 'pronto',
          jobId,
          tempoEstimadoS,
          progresso: 100,
          restanteS: 0,
          cenarios,
          iaIndisponivel: !!status.ia_indisponivel,
        })
      } else {
        setGeracao((g) => ({ ...g, progresso, restanteS }))
        pollRef.current = setTimeout(tick, intervaloMs)
      }
    }
    tick()
  }, [selCount, selecaoIds, horizonte, horizonteMeses, selecionadas, store, pararPoll, resetarChat])

  // W3 — cenários prontos e o que está em foco para preview.
  const cenarios = geracao.status === 'pronto' ? (geracao.cenarios ?? SEM_CENARIOS) : SEM_CENARIOS
  const cenarioSelecionado = cenarios.find((c) => c.id === cenarioSelecionadoId) ?? null

  // Sessões do cenário em foco, como Dates, para o "ghost" no calendário.
  const previewSessoes = useMemo(() => {
    const sessoes = cenarioSelecionado?.plano?.sessoes ?? []
    return sessoes.map((s, i) => ({
      key: `${cenarioSelecionadoId}-${i}`,
      inicio: new Date(s.inicio),
      fim: new Date(s.fim),
      classe: s.classe_id,
      titulo: s.tarefa_titulo,
    }))
  }, [cenarioSelecionado, cenarioSelecionadoId])

  const selecionarCenario = useCallback((id) => setCenarioSelecionadoId(id), [])

  const aplicarCenario = useCallback(
    async (id) => {
      const alvo = id ?? cenarioSelecionadoId
      if (!alvo || !geracao.jobId) return
      setAplicando(true)
      let resp
      try {
        resp = await escolherCenario({ jobId: geracao.jobId, cenarioId: alvo, aplicar: true })
      } catch (err) {
        setAplicando(false)
        setGeracao({ status: 'erro', erro: err })
        return
      }
      // Modo API: o backend já persistiu — recarrega o store. Modo mock: as
      // sessões devolvidas viram eventos locais (HANDOFF §4).
      if (USA_API) await store.recarregar?.()
      else for (const evento of resp.eventos_criados ?? []) store.addEvento(evento)
      setAplicando(false)
      encerrarPlanejamento()
    },
    [cenarioSelecionadoId, geracao.jobId, store, encerrarPlanejamento],
  )

  // --- Chat do lote (refino conversacional, marco C5) -----------------------
  const abrirChat = useCallback((cenarioId = null) => {
    setChat((c) => ({ ...c, aberto: true, cenarioFocoId: cenarioId }))
  }, [])

  const fecharChat = useCallback(() => {
    // Só esconde; a conversa continua (é do lote, não do painel).
    setChat((c) => ({ ...c, aberto: false }))
  }, [])

  const enviarMensagemChat = useCallback(
    async (texto) => {
      const msg = String(texto ?? '').trim()
      if (!msg || !geracao.jobId || chat.enviando) return
      const seq = ++chatSeqRef.current
      const vivo = () => chatSeqRef.current === seq && !cancelRef.current
      const responder = (m) => {
        if (chatSeqRef.current !== seq) return
        setChat((c) => ({ ...c, mensagens: [...c.mensagens, m], enviando: false }))
      }
      setChat((c) => ({
        ...c,
        mensagens: [...c.mensagens, { de: 'user', texto: msg }],
        enviando: true,
      }))

      let resp
      try {
        resp = await refinarCenario({
          jobId: geracao.jobId,
          cenarioId: chat.cenarioFocoId,
          mensagem: msg,
        })
      } catch (err) {
        responder({
          de: 'agente',
          erro: true,
          texto: err?.message || 'Não consegui enviar o pedido. Tente de novo.',
        })
        return
      }

      // Mesmo padrão de polling do gerar: 1 chamada de IA + solver no backend.
      const intervaloMs = USA_API ? 1500 : 150
      const tick = async () => {
        if (!vivo()) return
        let refino
        try {
          refino = await consultarRefino(resp.refinoId)
        } catch (err) {
          responder({
            de: 'agente',
            erro: true,
            texto: err?.message || 'Falha ao ajustar o cenário. Tente de novo.',
          })
          return
        }
        if (!vivo()) return
        if (refino.status !== 'PRONTO') {
          chatPollRef.current = setTimeout(tick, intervaloMs)
          return
        }
        if (refino.ia_indisponivel) {
          responder({
            de: 'agente',
            erro: true,
            texto: 'A IA está indisponível agora — nada foi alterado. Tente em instantes.',
          })
          return
        }
        // Lote atualizado (cenário novo anexado) + foco/preview no recém-criado.
        if (refino.cenarios) {
          setGeracao((g) => (g.status === 'pronto' ? { ...g, cenarios: refino.cenarios } : g))
        }
        if (refino.cenario) setCenarioSelecionadoId(refino.cenario.id)
        if (chatSeqRef.current !== seq) return
        setChat((c) => ({
          ...c,
          cenarioFocoId: refino.cenario?.id ?? c.cenarioFocoId,
          mensagens: [
            ...c.mensagens,
            { de: 'agente', texto: refino.resposta || 'Pronto — cenário ajustado.' },
          ],
          enviando: false,
        }))
      }
      tick()
    },
    [geracao.jobId, chat.enviando, chat.cenarioFocoId],
  )

  // --- W4: Replanejar / "Hoje não" ----------------------------------------
  const hojeISO = toDateISO(store.now ?? new Date())

  const replanejar = useCallback(
    async (diasBloqueados = []) => {
      setReplan({ status: 'carregando', diasBloqueados })
      try {
        const { diff } = await simularReplanejamento({
          eventos: store.eventos,
          diasBloqueados,
          agora: (store.now ?? new Date()).getTime(),
        })
        setReplan({ status: 'pronto', diasBloqueados, diff })
      } catch (err) {
        setReplan({ status: 'erro', diasBloqueados, erro: err })
      }
    },
    [store],
  )

  const fecharReplan = useCallback(() => setReplan(REPLAN_IDLE), [])

  const aplicarReplan = useCallback(async () => {
    const diff = replan.diff
    if (!diff || diffVazio(diff)) return fecharReplan()
    if (USA_API) {
      // O backend recalcula E persiste; depois recarregamos o store.
      try {
        await aplicarReplanejamento({ diasBloqueados: replan.diasBloqueados })
        await store.recarregar?.()
      } catch (err) {
        setReplan({ status: 'erro', diasBloqueados: replan.diasBloqueados, erro: err })
        return
      }
    } else {
      // Mock: as sessões movidas são reagendadas localmente a partir do diff.
      for (const m of diff.movidas ?? []) {
        store.updateEvento({ id: m.eventoId, inicio: m.novoInicio, fim: m.novoFim })
      }
    }
    setReplan(REPLAN_IDLE)
  }, [replan, store, fecharReplan])

  const value = useMemo(
    () => ({
      modoPlanejar,
      horizonte,
      horizonteMeses,
      horizonteMaxMeses: HORIZONTE_MAX_MESES,
      geracao,
      // seleção de tarefas
      selecaoIds,
      selecionadas,
      selCount,
      selMin,
      elegiveisCount: elegiveis.length,
      todasSelecionadas,
      gerarHabilitado,
      estaSelecionada: (id) => selecaoIds.has(id),
      inbox,
      // W3 — comparação de cenários
      cenarios,
      cenarioSelecionadoId,
      cenarioSelecionado,
      previewSessoes,
      aplicando,
      // chat do lote (refino conversacional)
      chat,
      // W4 — replanejar
      replan,
      hojeISO,
      // ações
      togglePlanejar,
      toggleTarefa,
      selecionarTodas,
      limparSelecao,
      setHorizonte,
      setHorizonteMeses,
      gerar,
      cancelarGeracao,
      encerrarPlanejamento,
      selecionarCenario,
      aplicarCenario,
      abrirChat,
      fecharChat,
      enviarMensagemChat,
      replanejar,
      aplicarReplan,
      fecharReplan,
    }),
    [
      modoPlanejar,
      horizonte,
      horizonteMeses,
      geracao,
      selecaoIds,
      selecionadas,
      selCount,
      selMin,
      elegiveis,
      todasSelecionadas,
      gerarHabilitado,
      inbox,
      cenarios,
      cenarioSelecionadoId,
      cenarioSelecionado,
      previewSessoes,
      aplicando,
      chat,
      replan,
      hojeISO,
      togglePlanejar,
      toggleTarefa,
      selecionarTodas,
      limparSelecao,
      setHorizonteMeses,
      gerar,
      cancelarGeracao,
      encerrarPlanejamento,
      selecionarCenario,
      aplicarCenario,
      abrirChat,
      fecharChat,
      enviarMensagemChat,
      replanejar,
      aplicarReplan,
      fecharReplan,
    ],
  )

  return <PlanejamentoContext.Provider value={value}>{children}</PlanejamentoContext.Provider>
}

// Provider + hook no mesmo módulo, de propósito (padrão do store).
// eslint-disable-next-line react-refresh/only-export-components
export function usePlanejamento() {
  const ctx = useContext(PlanejamentoContext)
  if (!ctx) throw new Error('usePlanejamento deve ser usado dentro de <PlanejamentoProvider>')
  return ctx
}
