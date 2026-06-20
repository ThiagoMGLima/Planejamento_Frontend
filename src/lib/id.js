/**
 * Geração de ids no cliente. No Marco 4 o backend passa a emitir os ids; até lá
 * geramos localmente. Usa crypto.randomUUID quando disponível.
 * @returns {string}
 */
export function makeId(prefix = 'id') {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rnd}`
}
