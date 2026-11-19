export const CARD_PREFIX = "BX"
export const MAX_CARDS_PER_PRINT = 300

// 123 -> "BX-000123"
export function formatCardId(n: number) {
  return `${CARD_PREFIX}-${String(n).padStart(6, "0")}`
}
