import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store.jsx'
import { USA_API } from '../lib/planejamentoClient.js'
import { api } from '../lib/api.js'
import { makeId } from '../lib/id.js'
import SidePanel from './SidePanel.jsx'

/**
 * Painel do Agente (Rotina Inteligente, Marco C4 — o cérebro). Chat lateral onde
 * o usuário pede coisas em linguagem natural ("adiciona o trabalho de Física 2
 * pra sexta"). Fala com o endpoint `POST /planejamento/agente/chat` (202 +
 * polling, como os cenários): o backend roda um loop de tool-use (LLM ligado às
 * ferramentas da API) e devolve a resposta + se mudou o estado — quando muda,
 * recarregamos o calendário.
 *
 * Sem backend (VITE_DATA_SOURCE≠api) não há para quem falar: cai no PREVIEW
 * honesto — casca pronta, respostas de andaime, zero rede.
 */
const SUGESTOES = [
  'Adiciona o trabalho de Física 2 pra sexta',
  'Como está minha semana?',
  'Livra meu sábado',
]

const SAUDACAO = {
  de: 'agente',
  texto: USA_API
    ? 'Oi! Sou o assistente de rotina. Peça mudanças em linguagem natural — eu crio/movo sessões, replanejo e consulto sua agenda.'
    : 'Oi! Sou o assistente de rotina (preview). Aqui você vai poder pedir mudanças em linguagem natural. Sem backend ligado (VITE_DATA_SOURCE≠api) eu ainda não executo.',
}

const INTERVALO_POLL_MS = 1500
const TIMEOUT_POLL_MS = 360000 // acompanha o teto do modelo (OLLAMA_TIMEOUT) com folga

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

export default function AgentePanel() {
  const store = useStore()
  const [mensagens, setMensagens] = useState([SAUDACAO])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const logRef = useRef(null)
  const conversaId = useRef(makeId('conv'))
  const vivo = useRef(true)

  // Cancela o polling se o painel fechar no meio da espera.
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])

  // Log sempre rolado para a última mensagem.
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight)
  }, [mensagens, enviando])

  function push(msg) {
    setMensagens((m) => [...m, msg])
  }

  // Contexto (FATOS) para o agente resolver "sexta"/"minha semana": data de hoje,
  // view e cursor atuais, evento selecionado.
  function contextoAtual() {
    return {
      hoje: (store.now ?? new Date()).toISOString(),
      view: store.view,
      cursor: store.cursorISO,
      evento_selecionado: store.selectedId ?? null,
    }
  }

  async function conversarBackend(mensagem) {
    const { job_id } = await api.planejamento.agenteChat({
      conversa_id: conversaId.current,
      mensagem,
      contexto: contextoAtual(),
    })
    const inicio = Date.now()
    while (Date.now() - inicio < TIMEOUT_POLL_MS) {
      await espera(INTERVALO_POLL_MS)
      if (!vivo.current) return null
      const { status, resultado, detalhe } = await api.planejamento.agenteChatStatus(job_id)
      if (status === 'pronto') return resultado
      if (status === 'erro') throw new Error(detalhe || 'falha no processamento')
    }
    throw new Error('tempo esgotado esperando o assistente')
  }

  async function enviar(conteudo) {
    const msg = (conteudo ?? texto).trim()
    if (!msg || enviando) return
    setTexto('')
    push({ de: 'user', texto: msg })

    if (!USA_API) {
      push({
        de: 'agente',
        texto:
          'Recebi: “' +
          msg +
          '”. No preview eu não executo — ligue o backend (VITE_DATA_SOURCE=api) para virar ação real no calendário.',
      })
      return
    }

    setEnviando(true)
    try {
      const r = await conversarBackend(msg)
      if (!r) return // painel fechou durante a espera
      if (r.ia_indisponivel) {
        push({
          de: 'agente',
          erro: true,
          texto:
            'O cérebro do assistente está fora do ar (provider desligado ou sem credencial). Nada foi alterado.',
        })
        return
      }
      push({
        de: 'agente',
        texto: r.resposta || '(sem resposta)',
      })
      // Ações que mudam o plano (criar/mover sessão, replanejar aplicado) →
      // recarrega o calendário para refletir o que o agente fez.
      if (r.mudou_estado) await store.recarregar?.()
    } catch (e) {
      push({
        de: 'agente',
        erro: true,
        texto: 'Não consegui falar com o assistente: ' + (e?.message || 'erro de rede') + '.',
      })
    } finally {
      if (vivo.current) setEnviando(false)
    }
  }

  return (
    <SidePanel title="Assistente" accent="var(--ui)" onClose={store.closePanel}>
      <div className="agente">
        <div className="agente__preview mono">
          {USA_API ? 'conectado · loop de tool-use' : 'preview · backend não ligado'}
        </div>

        <div className="agente__log" ref={logRef}>
          {mensagens.map((m, i) => (
            <div
              key={i}
              className={`agente__msg agente__msg--${m.de}${m.erro ? ' agente__msg--erro' : ''}`}
            >
              {m.texto}
            </div>
          ))}
          {enviando && (
            <div className="agente__msg agente__msg--agente agente__msg--espera">
              Pensando… o assistente pode levar alguns segundos.
            </div>
          )}
        </div>

        <div className="agente__sugestoes">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              type="button"
              className="agente__chip"
              onClick={() => enviar(s)}
              disabled={enviando}
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="agente__entrada"
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          <input
            className="agente__input"
            type="text"
            placeholder="Peça algo ao assistente…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={enviando}
            aria-label="Mensagem para o assistente"
          />
          <button type="submit" className="btn btn--ui btn--sm" disabled={enviando || !texto.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </SidePanel>
  )
}
