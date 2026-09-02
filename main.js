import { initApp } from './js/app.js'

initApp()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}))
}
