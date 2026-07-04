import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { StoreProvider } from './store/store.jsx'
import { ApiStoreProvider } from './store/apiStore.jsx'
import { PlanejamentoProvider } from './store/planejamento.jsx'
import { EditarProvider } from './store/editar.jsx'
import { ThemeProvider, applyTheme, getInitialTheme } from './lib/theme.jsx'
import './styles/global.css'

// Aplica o tema salvo antes do 1º paint (sem flash de tema errado).
applyTheme(getInitialTheme())

// Origem dos dados (Marco 4): VITE_DATA_SOURCE=api usa o backend HTTP; qualquer
// outro valor (padrão) usa o store local em localStorage. A interface do store é
// a mesma — só troca o provider.
const useApi = import.meta.env.VITE_DATA_SOURCE === 'api'
const Provider = useApi ? ApiStoreProvider : StoreProvider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Provider>
        <PlanejamentoProvider>
          <EditarProvider>
            <App />
          </EditarProvider>
        </PlanejamentoProvider>
      </Provider>
    </ThemeProvider>
  </StrictMode>,
)
