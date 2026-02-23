type TypeScript = typeof import('typescript')

let cached: TypeScript | undefined

export async function getTs(): Promise<TypeScript> {
  if (!cached) {
    cached = await import('typescript')
  }
  return cached
}
