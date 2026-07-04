import { useEffect, useRef, useState } from 'react'
import { usePlanejamento } from '../store/planejamento.jsx'

/**
 * Chat do lote de cenários (refino conversacional, backend marco C5). Painel
 * lateral do comparador (W3): o usuário pede em linguagem natural ("gostei do
 * B, mas sem academia essa semana"), a IA traduz em diretrizes, o solver
 * recalcula e o cenário novo entra no lote — o card aparece ao lado e já fica
 * em foco (preview no calendário). Cada turno custa ~1 chamada de IA local
 * (dezenas de segundos); o estado "ajustando…" deixa a espera explícita.
 */
export default function ChatCenarios() {
  const plan = usePlanejamento()
  const { chat, cenarios } = plan
  const [texto, setTexto] = useState('')
  const logRef = useRef(null)

  // Log sempre rolado para a última mensagem.
  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight)
  }, [chat.mensagens, chat.enviando])

  if (!chat.aberto) return null

  const foco = cenarios.find((c) => c.id === chat.cenarioFocoId)

  const enviar = (e) => {
    e.preventDefault()
    const msg = texto.trim()
    if (!msg || chat.enviando) return
    setTexto('')
    plan.enviarMensagemChat(msg)
  }

  return (
    <aside className="chatcen" aria-label="Conversar sobre os cenários">
      <header className="chatcen__head">
        <span className="chatcen__badge" aria-hidden="true">
          ✦
        </span>
        <div className="chatcen__headtxt">
          <span className="chatcen__titulo">
            Ajustar {foco ? `“${foco.nome}”` : 'os cenários'}
          </span>
          <span className="chatcen__sub">Peça mudanças em linguagem natural</span>
        </div>
        <button
          type="button"
          className="chatcen__fechar"
          onClick={plan.fecharChat}
          aria-label="Fechar chat"
        >
          ×
        </button>
      </header>

      <div className="chatcen__log" ref={logRef}>
        {chat.mensagens.length === 0 && (
          <p className="chatcen__vazio">
            Diga o que mudar neste lote — ex.: “gostei desse cenário, mas sem academia essa semana”
            ou “livra as minhas noites de quarta”. Eu recalculo e crio uma variação ao lado.
          </p>
        )}
        {chat.mensagens.map((m, i) => (
          <div
            key={i}
            className={`chatcen__msg chatcen__msg--${m.de}${m.erro ? ' chatcen__msg--erro' : ''}`}
          >
            {m.texto}
          </div>
        ))}
        {chat.enviando && (
          <div className="chatcen__msg chatcen__msg--agente chatcen__msg--espera">
            Ajustando o cenário… a IA local leva em torno de um minuto.
          </div>
        )}
      </div>

      <form className="chatcen__entrada" onSubmit={enviar}>
        <input
          className="chatcen__input"
          type="text"
          placeholder="O que você quer mudar?"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={chat.enviando}
          aria-label="Pedido de ajuste dos cenários"
        />
        <button
          type="submit"
          className="btn btn--ui btn--sm"
          disabled={chat.enviando || !texto.trim()}
        >
          Enviar
        </button>
      </form>
    </aside>
  )
}
