import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App pessoal, execução 100% local (npm run dev). Sem deploy em nuvem.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
