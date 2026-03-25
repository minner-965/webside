import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const appMode = document.documentElement.dataset.appMode === 'admin' ? 'admin' : 'storefront'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App appMode={appMode} />
  </StrictMode>,
)
