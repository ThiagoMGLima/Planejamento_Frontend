import * as mock from './planejamentoApi.js'
import * as http from './planejamentoHttp.js'

/**
 * Seletor do cliente do montador de rotina. Espelha a decisão do `main.jsx`:
 * `VITE_DATA_SOURCE=api` usa o backend HTTP real; qualquer outro valor usa o
 * mock local. Ambos expõem a MESMA interface, então o provider não muda.
 */
export const USA_API = import.meta.env?.VITE_DATA_SOURCE === 'api'

const impl = USA_API ? http : mock

export const criarJobCenarios = impl.criarJobCenarios
export const consultarJob = impl.consultarJob
export const escolherCenario = impl.escolherCenario
export const refinarCenario = impl.refinarCenario
export const consultarRefino = impl.consultarRefino
export const simularReplanejamento = impl.simularReplanejamento

// Só o fluxo HTTP tem "aplicar replanejamento" (o mock aplica mutando o store
// local a partir do diff já simulado).
export const aplicarReplanejamento = http.aplicarReplanejamento

// Puros/compartilhados — sempre do mock.
export { diffVazio, montarCorpoCenarios, descartarJob } from './planejamentoApi.js'
