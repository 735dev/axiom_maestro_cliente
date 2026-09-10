export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8013',
  apiVersion: import.meta.env.VITE_API_VERSION ?? '/api/v1',
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'false') === 'true',
  timeoutMs: 20000,
}
