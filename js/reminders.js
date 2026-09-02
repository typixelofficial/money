// ─── Note Fund — Reminders Page ─────────────────────────────────

import { formatCurrency, formatDate, escapeHtml, getTransactionTotals, daysUntil, statusBadge, showToast } from './utils.js'
import * as api from './api.js'

let currentFilter = 'all'

export async function renderReminders(container) {
  container.innerHTML = `<div class="reminders-page"><div class="page-header"><div><h1>⏰ Reminders</h1><p class="page-subtitle">Stay on top of outstanding balances.</p></div></div>
    <div class="filter-bar"><div class="filter-group"><button class="filter-chip active" data-filter="all">All</button><button class="filter-chip" data-filter="overdue">Overdue</button><button class="filter-chip" data-filter="today">Today</button><button class="filter-chip" data-filter="soon">Soon</button><button class="filter-chip" data-filter="upcoming">Upcoming</button></div></div>
    <div id="reminders-content" class="reminders-grid"></div></div>`
  document.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active')); button.classList.add('active'); currentFilter = button.dataset.filter; loadReminders() }))
  await loadReminders()
}

async function loadReminders() {
  const [transactions, payments] = await Promise.all([api.getTransactions(), api.getPayments()])
  let reminders = transactions.map(t => ({ ...t, ...getTransactionTotals(t, payments), days: daysUntil(t.dueDate) })).filter(t => t.remaining > 0 && t.dueDate)
  reminders = reminders.filter(t => currentFilter === 'all' || currentFilter === getReminderBucket(t.days))
  reminders.sort((a, b) => a.days - b.days)
  const content = document.getElementById('reminders-content')
  if (!reminders.length) { content.innerHTML = `<div class="empty-state"><span class="empty-icon">✓</span><h2>You're all caught up!</h2><p>No outstanding reminders in this category.</p></div>`; return }
  content.innerHTML = reminders.map(t => {
    const bucket = getReminderBucket(t.days), info = getReminderInfo(t.days)
    return `<div class="reminder-card reminder-${bucket}"><div class="reminder-card-top"><span class="reminder-large-icon">${info.icon}</span><div><h3>${escapeHtml(t.personName)}</h3><div class="reminder-due">${info.label} · ${formatDate(t.dueDate)}</div></div>${statusBadge(t.status)}</div><div class="reminder-card-balance"><span>Current remaining</span><strong>${formatCurrency(t.remaining)}</strong></div><div class="reminder-card-message">🔔 ${escapeHtml(t.personName)} still owes you ${formatCurrency(t.remaining)}.</div><div class="reminder-card-actions"><a href="#/person/${t.personId}" class="btn btn-primary btn-sm">View Details</a><button class="btn btn-success btn-sm" onclick="window._openAddPaymentModal('${t.personId}', '${escapeHtml(t.personName)}', '${t.id}')">✓ Add Payment</button></div></div>`
  }).join('')
}

function getReminderBucket(days) { if (days < 0) return 'overdue'; if (days === 0) return 'today'; if (days <= 2) return 'soon'; return 'upcoming' }
function getReminderInfo(days) { if (days < 0) return { icon: '🔴', label: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` }; if (days === 0) return { icon: '🟠', label: 'Due today' }; if (days === 1) return { icon: '🟡', label: 'Due tomorrow' }; return { icon: '🟢', label: `Due in ${days} days` } }
