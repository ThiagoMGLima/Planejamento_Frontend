/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// App pessoal, execução 100% local (npm run dev). Sem deploy em nuvem.
// defineConfig vem de 'vitest/config' (reexporta o do Vite) para aceitar a
// seção `test` no mesmo arquivo de config.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
