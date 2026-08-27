export async function register() {
  const ls = globalThis.localStorage as unknown
  if (
    !ls ||
    typeof (ls as { getItem?: unknown }).getItem !== 'function'
  ) {
    // Node.js >= 25 exposes a global `localStorage` stub that is non-functional
    // unless --localstorage-file is provided. Next.js feature-detects it and
    // crashes during SSR. Replace the broken stub with a safe in-memory shim.
    const store = new Map<string, string>()
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    } as Storage
  }
}
