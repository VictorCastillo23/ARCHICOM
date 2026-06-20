// Fisher-Yates: unbiased uniform shuffle. Returns a new array (does not mutate input).
// Avoid `array.sort(() => Math.random() - 0.5)` — that produces a biased distribution.
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
