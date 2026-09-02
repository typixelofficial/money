// ─── Note Fund — Utility Functions ───────────────────────────────

export function formatCurrency(amount) {
  const n = Number(amount) || 0
  return '₹' + n.toLocaleString('en-IN')
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function getRelativeDate(dateStr) {
  if (!dateStr) return '—'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1) return `In ${diff} days`
  return `${Math.abs(diff)} days ago`
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}

export function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function debounce(fn, delay = 300) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

// ─── Status Calculation ──────────────────────────────────────────

export function getTransactionStatus(transaction, payments) {
  const totalReceived = (payments || [])
    .filter(p => p.transactionId === transaction.id)
    .reduce((sum, p) => sum + Number(p.amountReceived), 0)
  const remaining = Number(transaction.amountGiven) - totalReceived
  const hasDueDate = !!transaction.dueDate
  const overdue = hasDueDate && remaining > 0 && daysUntil(transaction.dueDate) < 0

  if (remaining <= 0) return 'SETTLED'
  if (overdue) return 'OVERDUE'
  if (totalReceived > 0) return 'PARTIAL'
  return 'PENDING'
}

export function getPersonTotals(personId, transactions, payments) {
  const personTxns = transactions.filter(t => t.personId === personId)
  const totalGiven = personTxns.reduce((s, t) => s + Number(t.amountGiven), 0)
  const personPayments = payments.filter(p => p.personId === personId)
  const totalReceived = personPayments.reduce((s, p) => s + Number(p.amountReceived), 0)
  const remaining = totalGiven - totalReceived

  let status = 'SETTLED'
  if (remaining > 0) {
    const hasPartial = personTxns.some(t => {
      const tReceived = personPayments
        .filter(p => p.transactionId === t.id)
        .reduce((s, p) => s + Number(p.amountReceived), 0)
      return tReceived > 0 && tReceived < Number(t.amountGiven)
    })
    const hasOverdue = personTxns.some(t => {
      const tReceived = personPayments
        .filter(p => p.transactionId === t.id)
        .reduce((s, p) => s + Number(p.amountReceived), 0)
      const tRemaining = Number(t.amountGiven) - tReceived
      return tRemaining > 0 && t.dueDate && daysUntil(t.dueDate) < 0
    })
    if (hasOverdue) status = 'OVERDUE'
    else if (hasPartial) status = 'PARTIAL'
    else status = 'PENDING'
  }

  return { totalGiven, totalReceived, remaining, status }
}

export function getTransactionTotals(transaction, payments) {
  const txnPayments = payments.filter(p => p.transactionId === transaction.id)
  const totalReceived = txnPayments.reduce((s, p) => s + Number(p.amountReceived), 0)
  const remaining = Number(transaction.amountGiven) - totalReceived
  const status = getTransactionStatus(transaction, payments)
  return { totalReceived, remaining, status, payments: txnPayments }
}

// ─── Status Badges ───────────────────────────────────────────────

export function statusBadge(status) {
  const map = {
    PENDING:  { cls: 'badge-pending',   icon: '🟠', label: 'Pending' },
    PARTIAL:  { cls: 'badge-partial',   icon: '🟡', label: 'Partial' },
    OVERDUE:  { cls: 'badge-overdue',   icon: '🔴', label: 'Overdue' },
    SETTLED:  { cls: 'badge-settled',   icon: '🟢', label: 'Settled' },
  }
  const s = map[status] || map.PENDING
  return `<span class="badge ${s.cls}">${s.icon} ${s.label}</span>`
}

// ─── Toast Notifications ────────────────────────────────────────

let toastContainer = null

export function showToast(message, type = 'success') {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = escapeHtml(message)
  toastContainer.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

// ─── Skeleton Loader ─────────────────────────────────────────────

export function skeletonCard(count = 3) {
  return Array.from({ length: count }, () =>
    `<div class="skeleton-card">
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-line w-40"></div>
      <div class="skeleton-line w-80"></div>
    </div>`
  ).join('')
}

export function skeletonRows(count = 5, cols = 6) {
  return Array.from({ length: count }, () =>
    `<tr>${Array.from({ length: cols }, () =>
      '<td><div class="skeleton-line w-80"></div></td>'
    ).join('')}</tr>`
  ).join('')
}

// ─── Modal Helpers ───────────────────────────────────────────────

export function openModal(html) {
  closeModal()
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.id = 'modal-overlay'
  overlay.innerHTML = `<div class="modal">${html}</div>`
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal()
  })
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('show'))
  return overlay
}

export function closeModal() {
  const existing = document.getElementById('modal-overlay')
  if (existing) existing.remove()
}

export function confirmDialog(message, onConfirm) {
  openModal(`
    <div class="confirm-dialog">
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="window._closeModal()">Cancel</button>
        <button class="btn btn-danger" id="confirm-delete-btn">Delete</button>
      </div>
    </div>
  `)
  document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    closeModal()
    onConfirm()
  })
}

window._closeModal = closeModal

// ─── Browser Notifications ──────────────────────────────────────

export function sendBrowserNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    try { new Notification(title, { body }) } catch (e) { /* ignore */ }
  }
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve('unsupported')
  if (Notification.permission === 'granted') return Promise.resolve('granted')
  return Notification.requestPermission()
}
