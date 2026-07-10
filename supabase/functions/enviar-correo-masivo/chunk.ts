// Pure helper — splits an array into groups of at most `size` items each.
// Plain TypeScript (no Deno-only APIs) so it can run directly under Vitest;
// the Deno entrypoint (./index.ts) imports this to cap Resend concurrency
// per batch of admin bulk-email recipients.

export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return items.length === 0 ? [] : [items]

  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}
