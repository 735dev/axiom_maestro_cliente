import axios, { AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/shared/config/env'
import { getStoreRef } from '@/shared/store'
import { logout } from '@/shared/store/slices/authSlice'
import { showNotice } from '@/shared/store/slices/uiSlice'

export const httpClient: AxiosInstance = axios.create({
  baseURL: `${env.apiUrl}${env.apiVersion}`,
  timeout: env.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const state = getStoreRef()?.getState()
  const token = state?.auth.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['Accept-Language'] = state?.lang.current === 'en' ? 'en-US' : 'es-ES'
  return config
})

httpClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const status = error.response?.status ?? 0
    const store = getStoreRef()
    if (status === 401 && store) {
      store.dispatch(logout())
      window.location.replace('/login')
      return Promise.reject(error)
    }
    if (status >= 500 && store) {
      store.dispatch(showNotice({ tipo: 'error', code: status, text: 'errors.server' }))
    }
    return Promise.reject(error)
  },
)
