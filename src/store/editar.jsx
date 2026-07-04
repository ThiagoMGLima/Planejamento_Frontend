import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Modo Editar — estado de UI (não domínio) que liga o arrasto/reorganização
 * direto no calendário: tarefas do Inbox agendam ao soltar (como sempre) e
 * eventos já agendados podem ser movidos para outro horário/dia. Enquanto se
 * arrasta, segurar numa borda da tela avança o período (semana/mês/dia).
 *
 * Vive num provider próprio (como o tema) porque é ortogonal à fonte de dados
 * (store local ou API) e é lido em vários pontos (Topbar, EventBlock, EdgeNav).
 * `useEditar` degrada para um fallback fora do provider — assim componentes
 * como o EventBlock seguem renderizáveis isoladamente (testes).
 */
const EditarContext = createContext(null)
const FALLBACK = { editando: false, setEditando: () => {}, toggleEditar: () => {} }

export function EditarProvider({ children }) {
  const [editando, setEditando] = useState(false)
  const toggleEditar = useCallback(() => setEditando((v) => !v), [])
  const value = useMemo(
    () => ({ editando, setEditando, toggleEditar }),
    [editando, toggleEditar],
  )
  return <EditarContext.Provider value={value}>{children}</EditarContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditar() {
  return useContext(EditarContext) ?? FALLBACK
}
