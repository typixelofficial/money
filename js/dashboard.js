// ─── Note Fund — Dashboard Page ────────────────────────────────

import { formatCurrency, formatDate, getGreeting, getRelativeDate, escapeHtml, statusBadge, getPersonTotals, getTransactionTotals, daysUntil, skeletonCard } from './utils.js'
import * as api from './api.js'
import { openGiveMoneyModal } from './transactions.js'
import { openAddPaymentModal } from './payments.js'
import { openAddPersonModal } from './people.js'

export async function renderDashboard(container, { navigate }) {
  container.innerHTML = `
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1>${getGreeting()} 👋</h1>
          <p class="page-subtitle">Here's your money overview.</p>
        </div>
      </div>

      <div class="stat-cards" id="stat-cards">
        ${skeletonCard(4)}
      </div>

      <div class="quick-actions">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-action-grid">
          <button class="quick-action-btn primary" id="qa-give-money">
            <span class="qa-icon">💸</span>
            <span>Give Money</span>
          </button>
          <button class="quick-action-btn" id="qa-add-payment">
            <span class="qa-icon">✓</span>
            <span>Add Payment</span>
          </button>
          <button class="quick-action-btn" id="qa-add-person">
            <span class="qa-icon">👥</span>
            <span>Add Person</span>
          </button>
          <button class="quick-action-btn" id="qa-add-reminder" onclick="window._navigate('reminders')">
            <span class="qa-icon">⏰</span>
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">👥 People I Give To</h2>
            <a href="#/people" class="see-all">See All</a>
          </div>
          <div id="dashboard-people" class="dashboard-people-list">
            ${skeletonCard(3)}
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">⏰ Reminders</h2>
            <a href="#/reminders" class="see-all">See All</a>
          </div>
          <div id="dashboard-reminders" class="dashboard-reminders-list">
            ${skeletonCard(3)}
          </div>
        </div>
      </div>

      <div class="recent-activity">
        <div class="section-header">
          <h2 class="section-title">📈 Recent Activity</h2>
        </div>
        <div id="recent-activity" class="activity-list">
          ${skeletonCard(4)}
        </div>
      </div>
    </div>
  `

  // Wire quick actions
  document.getElementById('qa-give-money').addEventListener('click', () => openGiveMoneyModal())
  document.getElementById('qa-add-payment').addEventListener('click', () => openAddPaymentModal())
  document.getElementById('qa-add-person').addEventListener('click', () => openAddPersonModal())

  // Load data
  const [dashboardData, people, transactions, payments] = await Promise.all([
    api.getDashboardData(),
    api.getPeople(),
    api.getTransactions(),
    api.getPayments(),
  ])

  // Render stat cards
  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card stat-given">
      <div class="stat-icon">💸</div>
      <div class="stat-value">${formatCurrency(dashboardData.totalGiven)}</div>
      <div class="stat-label">Total Given</div>
    </div>
    <div class="stat-card stat-received">
      <div class="stat-icon">💰</div>
      <div class="stat-value">${formatCurrency(dashboardData.totalReceived)}</div>
      <div class="stat-label">Total Received</div>
    </div>
    <div class="stat-card stat-remaining">
      <div class="stat-icon">💵</div>
      <div class="stat-value">${formatCurrency(dashboardData.totalRemaining)}</div>
      <div class="stat-label">Total Remaining</div>
    </div>
    <div class="stat-card stat-overdue">
      <div class="stat-icon">🔴</div>
      <div class="stat-value">${formatCurrency(dashboardData.totalOverdue)}</div>
      <div class="stat-label">Overdue</div>
    </div>
  `

  // Render people with balances
  const peopleWithBalances = people.map(p => {
    const totals = getPersonTotals(p.id, transactions, payments)
    return { ...p, ...totals }
  }).filter(p => p.totalGiven > 0).sort((a, b) => b.remaining - a.remaining).slice(0, 5)

  const peopleEl = document.getElementById('dashboard-people')
  if (peopleWithBalances.length === 0) {
    peopleEl.innerHTML = `
      <div class="empty-state-mini">
        <span>👥</span>
        <p>No people yet. Add someone you've given money to.</p>
      </div>
    `
  } else {
    peopleEl.innerHTML = peopleWithBalances.map(p => `
      <div class="person-row" onclick="window._navigate('person', { id: '${p.id}' })">
        <div class="person-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</div>
        <div class="person-row-info">
          <div class="person-row-name">${escapeHtml(p.name)}</div>
          <div class="person-row-sub">${formatCurrency(p.remaining)} remaining</div>
        </div>
        <div class="person-row-status">${statusBadge(p.status)}</div>
      </div>
    `).join('')
  }

  // Render reminders
  const reminders = buildReminders(transactions, payments)
  const remindersEl = document.getElementById('dashboard-reminders')
  if (reminders.length === 0) {
    remindersEl.innerHTML = `
      <div class="empty-state-mini">
        <span>✓</span>
        <p>You're all caught up!</p>
      </div>
    `
  } else {
    remindersEl.innerHTML = reminders.slice(0, 4).map(r => `
      <div class="reminder-row" onclick="window._navigate('person', { id: '${r.personId}' })">
        <span class="reminder-dot ${r.cls}"></span>
        <div class="reminder-info">
          <div class="reminder-name">${escapeHtml(r.personName)}</div>
          <div class="reminder-sub">${formatCurrency(r.remaining)} · ${r.label}</div>
        </div>
      </div>
    `).join('')
  }

  // Recent activity
  const activity = buildRecentActivity(transactions, payments)
  const activityEl = document.getElementById('recent-activity')
  if (activity.length === 0) {
    activityEl.innerHTML = `
      <div class="empty-state-mini">
        <span>📋</span>
        <p>No recent activity yet.</p>
      </div>
    `
  } else {
    activityEl.innerHTML = activity.slice(0, 6).map(a => `
      <div class="activity-row">
        <span class="activity-icon">${a.icon}</span>
        <div class="activity-info">
          <div class="activity-text">${escapeHtml(a.text)}</div>
          <div class="activity-time">${a.timeLabel}</div>
        </div>
      </div>
    `).join('')
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function buildReminders(transactions, payments) {
  const reminders = []
  transactions.forEach(t => {
    const totals = getTransactionTotals(t, payments)
    if (totals.remaining <= 0) return
    if (!t.dueDate) return
    const days = daysUntil(t.dueDate)
    let cls, label
    if (days < 0) { cls = 'dot-overdue'; label = `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago` }
    else if (days === 0) { cls = 'dot-today'; label = 'Due today' }
    else if (days === 1) { cls = 'dot-soon'; label = 'Due tomorrow' }
    else { cls = 'dot-upcoming'; label = `Due in ${days} days` }
    reminders.push({ personId: t.personId, personName: t.personName, remaining: totals.remaining, cls, label, days })
  })
  return reminders.sort((a, b) => a.days - b.days)
}

function buildRecentActivity(transactions, payments) {
  const items = []
  transactions.forEach(t => {
    items.push({
      icon: '💸',
      text: `Gave ${formatCurrency(t.amountGiven)} to ${t.personName}`,
      time: t.createdAt,
      timeLabel: getRelativeDate(t.dateGiven),
    })
  })
  payments.forEach(p => {
    items.push({
      icon: '💰',
      text: `Received ${formatCurrency(p.amountReceived)} from ${p.personName}`,
      time: p.createdAt,
      timeLabel: getRelativeDate(p.paymentDate),
    })
  })
  return items.sort((a, b) => new Date(b.time) - new Date(a.time))
}
