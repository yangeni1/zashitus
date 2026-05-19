import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const basename = import.meta.env.VITE_BASE_PATH || '/'

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={basename === '/' ? undefined : basename}>
    <App />
  </BrowserRouter>
)
