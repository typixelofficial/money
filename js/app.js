// ─── Note Fund — Main App: Router, Layout, Navigation ──────────

import { showToast, getGreeting, isApiConfigured, isOnline, requestNotificationPermission, sendBrowserNotification } from './utils.js'
import * as api from './api.js'
import { renderDashboard } from './dashboard.js'
import { renderPeople } from './people.js'
import { renderPerson } from './person.js'
import { renderTransactions } from './transactions.js'
import { renderPayments } from './payments.js'
import { renderReminders } from './reminders.js'
import { renderNotifications } from './notifications.js'
import { renderReports } from './reports.js'
import { renderSettings } from './settings.js'

// ─── Routes ─────────────────────────────────────────────────────

const routes = {
  dashboard:     { title: 'Dashboard',      render: renderDashboard,     icon: '🏠' },
  people:        { title: 'People I Give To', render: renderPeople,        icon: '👥' },
  person:        { title: 'Person Profile',   render: renderPerson,        icon: '👤', hidden: true },
  transactions:  { title: 'Transactions',     render: renderTransactions,  icon: '💸' },
  payments:      { title: 'Payments',         render: renderPayments,       icon: '💰' },
  reminders:     { title: 'Reminders',         render: renderReminders,     icon: '⏰' },
  notifications: { title: 'Notifications',     render: renderNotifications, icon: '🔔', hidden: true },
  reports:       { title: 'Reports',           render: renderReports,       icon: '📊' },
  settings:      { title: 'Settings',          render: renderSettings,      icon: '⚙️' },
}

// ─── Navigation Items ──────────────────────────────────────────

const sidebarNav = [
  { route: 'dashboard',     label: 'Dashboard',      icon: '🏠' },
  { route: 'people',        label: 'People I Give To', icon: '👥' },
  { route: 'transactions',  label: 'Transactions',   icon: '💸' },
  { route: 'payments',      label: 'Payments',       icon: '💰' },
  { route: 'reminders',     label: 'Reminders',       icon: '⏰' },
  { route: 'notifications', label: 'Notifications',  icon: '🔔' },
  { route: 'reports',       label: 'Reports',         icon: '📊' },
  { route: 'settings',      label: 'Settings',        icon: '⚙️' },
]

const bottomNav = [
  { route: 'dashboard',    label: 'Home',         icon: '🏠' },
  { route: 'people',       label: 'People',       icon: '👥' },
  { route: 'transactions', label: 'Transactions', icon: '💸' },
  { route: 'reminders',    label: 'Reminders',    icon: '⏰' },
  { route: 'settings',     label: 'More',          icon: '⚙️' },
]

// ─── Layout ─────────────────────────────────────────────────────

function buildLayout() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <span class="logo-icon">📒</span>
        <div>
          <div class="logo-text">NOTE FUND</div>
          <div class="logo-subtitle">Track Every Rupee</div>
        </div>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav">
        ${sidebarNav.map(item => `
          <a href="#/${item.route}" class="nav-item" data-route="${item.route}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
            ${item.route === 'notifications' ? '<span class="nav-badge" id="nav-notif-count" style="display:none">0</span>' : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="connection-status" id="connection-status">
          <span class="status-dot status-connected"></span>
          <span>Connected</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar">
        <button class="menu-toggle" id="menu-toggle" aria-label="Toggle menu">☰</button>
        <div class="topbar-search" id="topbar-search">
          <input type="text" id="global-search" placeholder="Search people, transactions, payments..." />
        </div>
        <div class="topbar-actions">
          <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme">
            <span id="theme-icon">☀️</span>
          </button>
          <a href="#/notifications" class="icon-btn notif-btn" aria-label="Notifications">
            🔔<span class="notif-count" id="notif-count" style="display:none">0</span>
          </a>
        </div>
      </header>

      <div class="page-container" id="page-container">
        <div class="loading-screen">
          <div class="spinner"></div>
          <p>Loading Note Fund...</p>
        </div>
      </div>
    </main>

    <nav class="bottom-nav" id="bottom-nav">
      ${bottomNav.map(item => `
        <a href="#/${item.route}" class="bottom-nav-item" data-route="${item.route}">
          <span class="bottom-nav-icon">${item.icon}</span>
          <span class="bottom-nav-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <button class="fab" id="fab" aria-label="Quick actions">
      <span class="fab-icon">+</span>
    </button>

    <div class="fab-menu" id="fab-menu" style="display:none">
      <button class="fab-menu-item" data-action="give-money">
        <span>💸</span> Give Money
      </button>
      <button class="fab-menu-item" data-action="add-payment">
        <span>✓</span> Add Payment
      </button>
      <button class="fab-menu-item" data-action="add-person">
        <span>👥</span> Add Person
      </button>
      <button class="fab-menu-item" data-action="add-reminder">
        <span>⏰</span> Add Reminder
      </button>
    </div>
  ``
  `
}

// ─── Router ─────────────────────────────────────────────────────

let currentRoute = 'dashboard'
let currentParams = {}

export function navigate(route, params = {}) {
  const hash = params.id ? `#/${route}/${params.id}` : `#/${route}`
  window.location.hash = hash
}

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const parts = hash.split('/')
  const route = parts[0] || 'dashboard'
  const id = parts[1] || null
  return { route, id }
}

async function router() {
  const { route, id } = parseHash()
  const routeConfig = routes[route] || routes.dashboard
  currentRoute = route
  currentParams = { id }

  // Update active nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route)
  })
  document.querySelectorAll('.bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route)
  })

  // Update page title
  document.title = `${routeConfig.title} — Note Fund`

  // Render page
  const container = document.getElementById('page-container')
  if (routeConfig.render) {
    try {
      await routeConfig.render(container, { id, navigate })
    } catch (err) {
      container.innerHTML = `
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <h2>Unable to load this page</h2>
          <p>${err.message || 'An unexpected error occurred.'}</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
        </div>
      `
    }
  }

  // Scroll to top
  container.scrollTop = 0
  window.scrollTo(0, 0)

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open')
  document.getElementById('fab-menu').style.display = 'none'
}

// ─── Theme Management ──────────────────────────────────────────

async function initTheme() {
  const settings = await api.getSettings()
  applyTheme(settings.theme)
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const icon = document.getElementById('theme-icon')
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️'
}

async function toggleTheme() {
  const settings = await api.getSettings()
  const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
  await api.updateSettings({ theme: newTheme })
  applyTheme(newTheme)
  showToast(`Switched to ${newTheme} mode`)
}

// ─── Notification Count ─────────────────────────────────────────

async function updateNotifCount() {
  const notifications = await api.getNotifications()
  const unread = notifications.filter(n => !n.isRead).length
  const countEl = document.getElementById('notif-count')
  const navCountEl = document.getElementById('nav-notif-count')
  if (countEl) {
    if (unread > 0) {
      countEl.textContent = unread > 99 ? '99+' : unread
      countEl.style.display = 'inline-flex'
    } else {
      countEl.style.display = 'none'
    }
  }
  if (navCountEl) {
    if (unread > 0) {
      navCountEl.textContent = unread > 99 ? '99+' : unread
      navCountEl.style.display = 'inline-flex'
    } else {
      navCountEl.style.display = 'none'
    }
  }
}

// ─── Connection Status ──────────────────────────────────────────

function updateConnectionStatus() {
  const el = document.getElementById('connection-status')
  if (!el) return
  const online = isOnline()
  const apiConfigured = isApiConfigured()
  if (online && apiConfigured) {
    el.innerHTML = '<span class="status-dot status-connected"></span><span>Connected</span>'
  } else if (online && !apiConfigured) {
    el.innerHTML = '<span class="status-dot status-connected"></span><span>Local Mode</span>'
  } else {
    el.innerHTML = '<span class="status-dot status-disconnected"></span><span>Offline</span>'
  }
}

// ─── Global Search ──────────────────────────────────────────────

async function handleSearch(query) {
  if (!query.trim()) return
  const [people, transactions, payments] = await Promise.all([
    api.getPeople(),
    api.getTransactions(),
    api.getPayments(),
  ])
  const q = query.toLowerCase()
  const results = []

  people.forEach(p => {
    if (p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)) {
      results.push({ type: 'person', label: p.name, sub: p.phone || 'No phone', route: `#/person/${p.id}` })
    }
  })
  transactions.forEach(t => {
    if (t.id.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q) || t.personName.toLowerCase().includes(q)) {
      results.push({ type: 'transaction', label: `${t.id} — ${t.personName}`, sub: `₹${t.amountGiven}`, route: `#/transactions` })
    }
  })
  payments.forEach(p => {
    if (p.id.toLowerCase().includes(q) || p.personName.toLowerCase().includes(q)) {
      results.push({ type: 'payment', label: `${p.id} — ${p.personName}`, sub: `₹${p.amountReceived}`, route: `#/payments` })
    }
  })

  return results
}

function showSearchResults(results) {
  const existing = document.getElementById('search-results')
  if (existing) existing.remove()
  if (!results.length) return

  const dropdown = document.createElement('div')
  dropdown.className = 'search-results'
  dropdown.id = 'search-results'
  dropdown.innerHTML = results.slice(0, 8).map(r => `
    <a href="${r.route}" class="search-result-item">
      <span class="search-result-type">${r.type === 'person' ? '👤' : r.type === 'transaction' ? '💸' : '💰'}</span>
      <div>
        <div class="search-result-label">${r.label}</div>
        <div class="search-result-sub">${r.sub}</div>
      </div>
    </a>
  `).join('')

  const searchContainer = document.getElementById('topbar-search')
  searchContainer.appendChild(dropdown)
}

// ─── FAB Menu ───────────────────────────────────────────────────

function toggleFabMenu() {
  const menu = document.getElementById('fab-menu')
  menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'
}

// ─── Init ───────────────────────────────────────────────────────

export async function initApp() {
  buildLayout()

  // Theme
  await initTheme()

  // Event listeners
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme)
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open')
  })
  document.getElementById('fab').addEventListener('click', toggleFabMenu)

  // FAB menu actions
  document.getElementById('fab-menu').addEventListener('click', (e) => {
    const btn = e.target.closest('.fab-menu-item')
    if (!btn) return
    const action = btn.dataset.action
    document.getElementById('fab-menu').style.display = 'none'
    handleFabAction(action)
  })

  // Close FAB menu on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#fab') && !e.target.closest('#fab-menu')) {
      document.getElementById('fab-menu').style.display = 'none'
    }
  })

  // Global search
  const searchInput = document.getElementById('global-search')
  let searchTimeout
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    const query = e.target.value
    if (!query.trim()) {
      const existing = document.getElementById('search-results')
      if (existing) existing.remove()
      return
    }
    searchTimeout = setTimeout(async () => {
      const results = await handleSearch(query)
      showSearchResults(results)
    }, 200)
  })
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      handleSearch(searchInput.value).then(showSearchResults)
    }
  })
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#topbar-search')) {
      const existing = document.getElementById('search-results')
      if (existing) existing.remove()
    }
  })

  // Online/offline
  window.addEventListener('online', () => {
    updateConnectionStatus()
    showToast('Back online', 'success')
  })
  window.addEventListener('offline', () => {
    updateConnectionStatus()
    showToast("You're offline. Changes are saved locally.", 'warning')
  })
  updateConnectionStatus()

  // Router
  window.addEventListener('hashchange', router)
  await router()

  // Update notification count periodically
  updateNotifCount()
  setInterval(updateNotifCount, 5000)

  // Request notification permission
  const settings = await api.getSettings()
  if (settings.notificationsEnabled) {
    requestNotificationPermission()
  }
}

async function handleFabAction(action) {
  switch (action) {
    case 'give-money':
      const { openGiveMoneyModal } = await import('./transactions.js')
      openGiveMoneyModal()
      break
    case 'add-payment':
      const { openAddPaymentModal } = await import('./payments.js')
      openAddPaymentModal()
      break
    case 'add-person':
      const { openAddPersonModal } = await import('./people.js')
      openAddPersonModal()
      break
    case 'add-reminder':
      navigate('reminders')
      showToast('Set reminders from the Reminders page')
      break
  }
}

// Expose navigate globally for inline handlers
window._navigate = navigate
