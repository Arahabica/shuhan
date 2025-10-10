import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root container not found')
}

const app = <App />

if (container.hasChildNodes()) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
