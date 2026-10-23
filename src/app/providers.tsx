import React from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { BrowserRouter } from 'react-router-dom'
import { store, persistor } from '@/shared/store'
import { GlobalNotice } from '@/shared/ui/GlobalNotice'

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}<GlobalNotice /></BrowserRouter>
    </PersistGate>
  </Provider>
)
