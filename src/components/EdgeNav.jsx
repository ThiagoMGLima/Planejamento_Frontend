import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store.jsx'
import { IconChevronLeft, IconChevronRight } from './Icons.jsx'

/**
 * Navegação por borda durante o arrasto — enquanto uma tarefa/evento está sendo
 * arrastado, segurar o ponteiro numa borda lateral avança o período: repete a
 * cada ~1s, então segurar mais tempo pula vários. Respeita a view atual (semana
 * / mês / dia) porque delega a `store.step`, que já sabe o passo de cada uma.
 *
 * As zonas só existem no DOM (e só capturam ponteiro) durante um arrasto — fora
 * disso não bloqueiam cliques. O drag ativo é detectado por listeners globais.
 */
const HOLD_MS = 1000

export default function EdgeNav() {
  const store = useStore()
  const [arrastando, setArrastando] = useState(false)
  const [ativa, setAtiva] = useState(0) // -1 esquerda · 1 direita · 0 nenhuma
  const timerRef = useRef(null)

  const parar = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setAtiva(0)
  }

  useEffect(() => {
    const inicio = () => setArrastando(true)
    const fim = () => {
      setArrastando(false)
      parar()
    }
    document.addEventListener('dragstart', inicio)
    document.addEventListener('dragend', fim)
    document.addEventListener('drop', fim)
    return () => {
      document.removeEventListener('dragstart', inicio)
      document.removeEventListener('dragend', fim)
      document.removeEventListener('drop', fim)
      parar()
    }
  }, [])

  if (!arrastando) return null

  const armar = (dir) => {
    if (timerRef.current) return
    setAtiva(dir)
    timerRef.current = setInterval(() => store.step(dir), HOLD_MS)
  }

  const zona = (dir, lado) => (
    <div
      className={`edgenav edgenav--${lado} ${ativa === dir ? 'edgenav--on' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        armar(dir)
      }}
      onDragLeave={parar}
      aria-hidden="true"
    >
      <span className="edgenav__hint">
        {dir < 0 ? <IconChevronLeft size={20} /> : <IconChevronRight size={20} />}
      </span>
    </div>
  )

  return (
    <>
      {zona(-1, 'left')}
      {zona(1, 'right')}
    </>
  )
}
