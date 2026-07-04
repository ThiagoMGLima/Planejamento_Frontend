import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store.jsx'
import { IconLogo } from './Icons.jsx'

/**
 * Tela de abertura do app. No modo API acompanha o boot real do `apiStore`
 * (health + cargas iniciais) e vira tela de erro amigável se o backend estiver
 * fora; no modo mock (dados síncronos, `store.boot` indefinido) mostra só a
 * entrada da marca. Sempre exibe por ≥ MIN_MS para a transição não "piscar",
 * e sai com fade — a app já está montada por baixo.
 */
const MIN_MS = 900
const FADE_MS = 500

export default function BootScreen() {
  const store = useStore()
  const boot = store.boot ?? 'pronto' // mock: sem boot assíncrono
  const inicioRef = useRef(Date.now())
  const [fase, setFase] = useState('mostrando') // mostrando | saindo | fechado

  useEffect(() => {
    if (boot !== 'pronto' || fase !== 'mostrando') return
    const espera = Math.max(0, MIN_MS - (Date.now() - inicioRef.current))
    const t = setTimeout(() => setFase('saindo'), espera)
    return () => clearTimeout(t)
  }, [boot, fase])

  useEffect(() => {
    if (fase !== 'saindo') return
    const t = setTimeout(() => setFase('fechado'), FADE_MS)
    return () => clearTimeout(t)
  }, [fase])

  if (fase === 'fechado') return null

  return (
    <div
      className={fase === 'saindo' ? 'boot boot--saindo' : 'boot'}
      role="status"
      aria-live="polite"
      aria-label="Carregando o Planejador"
    >
      <div className="boot__miolo">
        <span className="boot__logo" aria-hidden="true">
          <IconLogo size={30} />
        </span>
        <div className="boot__marca">
          Planejador<span className="boot__dot">.</span>
        </div>

        {boot === 'erro' ? (
          <div className="boot__erro">
            <p className="boot__problema">Não consegui falar com o servidor local.</p>
            <p className="boot__hint mono">suba o backend (docker compose up) e tente de novo</p>
            <button className="btn btn--ui" type="button" onClick={() => window.location.reload()}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            <div className="boot__trilho" aria-hidden="true">
              <div className="boot__preenche" />
            </div>
            <p className="boot__hint">preparando a sua semana…</p>
          </>
        )}
      </div>
    </div>
  )
}
