import { useState } from 'react'
import { useStore } from '../store/store.jsx'
import SidePanel from './SidePanel.jsx'

/**
 * Painel do Agente (Rotina Inteligente, W6 — direção). Chat lateral onde o
 * usuário pediria coisas em linguagem natural ("adiciona o trabalho de Física 2
 * pra sexta"). O backend expõe o MCP (marco C4, em :8765) como camada de
 * ferramentas, MAS não há um endpoint HTTP de chat: o "cérebro" precisa de um
 * runtime de agente (LLM) falando MCP. Enquanto ele não existe, este painel é um
 * PREVIEW honesto — a casca de UI pronta, com respostas de andaime que explicam o
 * que falta ligar. Zero chamada de rede.
 */
const SUGESTOES = [
  'Adiciona o trabalho de Física 2 pra sexta',
  'Como está minha semana?',
  'Livra meu sábado',
]

const SAUDACAO = {
  de: 'agente',
  texto:
    'Oi! Sou o assistente de rotina (preview). Aqui você vai poder pedir mudanças em linguagem natural. Ainda estou desconectado do "cérebro" — falta ligar um runtime de agente ao MCP (:8765).',
}

export default function AgentePanel() {
  const store = useStore()
  const [mensagens, setMensagens] = useState([SAUDACAO])
  const [texto, setTexto] = useState('')

  function enviar(conteudo) {
    const msg = (conteudo ?? texto).trim()
    if (!msg) return
    setTexto('')
    setMensagens((m) => [
      ...m,
      { de: 'user', texto: msg },
      {
        de: 'agente',
        texto:
          'Recebi: “' +
          msg +
          '”. No preview eu ainda não executo — quando o agente estiver ligado ao MCP, isso viraria uma ação real no seu calendário (criar/mover sessão, replanejar).',
      },
    ])
  }

  return (
    <SidePanel title="Assistente" accent="var(--ui)" onClose={store.closePanel}>
      <div className="agente">
        <div className="agente__preview mono">preview · MCP em :8765 (não ligado)</div>

        <div className="agente__log">
          {mensagens.map((m, i) => (
            <div key={i} className={`agente__msg agente__msg--${m.de}`}>
              {m.texto}
            </div>
          ))}
        </div>

        <div className="agente__sugestoes">
          {SUGESTOES.map((s) => (
            <button key={s} type="button" className="agente__chip" onClick={() => enviar(s)}>
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
            aria-label="Mensagem para o assistente"
          />
          <button type="submit" className="btn btn--ui btn--sm" disabled={!texto.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </SidePanel>
  )
}
