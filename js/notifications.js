// ─── Note Fund — Notifications Page ────────────────────────────

import { formatDate, escapeHtml, showToast } from './utils.js'
import * as api from './api.js'

export async function renderNotifications(container) {
  container.innerHTML = `<div class="notifications-page"><div class="page-header"><div><h1>🔔 Notifications</h1><p class="page-subtitle">Updates about your money.</p></div><div class="header-actions"><button class="btn btn-ghost btn-sm" id="mark-all-read">Mark all as read</button><button class="btn btn-danger-ghost btn-sm" id="clear-notifications">Clear all</button></div></div><div id="notifications-content" class="notification-list"></div></div>`
  document.getElementById('mark-all-read').addEventListener('click', async () => { await api.markAllNotificationsRead(); showToast('All notifications marked as read.'); loadNotifications() })
  document.getElementById('clear-notifications').addEventListener('click', async () => { if (confirm('Clear all notifications?')) { await api.clearNotifications(); showToast('Notifications cleared.'); loadNotifications() } })
  await loadNotifications()
}

async function loadNotifications() {
  const notifications = await api.getNotifications()
  const content = document.getElementById('notifications-content')
  if (!notifications.length) { content.innerHTML = `<div class="empty-state"><span class="empty-icon">🔔</span><h2>No notifications</h2><p>You're all caught up.</p></div>`; return }
  content.innerHTML = notifications.map(n => `<div class="notification-card ${n.isRead ? '' : 'unread'}"><div class="notification-icon">${n.type === 'settled' ? '🎉' : n.type === 'payment' ? '💰' : n.type === 'reminder' ? '⏰' : '🔔'}</div><div class="notification-info"><div class="notification-title">${escapeHtml(n.title)}</div><div class="notification-message">${escapeHtml(n.message)}</div><div class="notification-time">${formatDate(n.createdAt)}</div></div>${!n.isRead ? `<button class="btn btn-ghost btn-sm notification-read" data-id="${n.id}">Mark read</button>` : '<span class="read-label">Read</span>'}</div>`).join('')
  content.querySelectorAll('.notification-read').forEach(button => button.addEventListener('click', async () => { await api.markNotificationRead(button.dataset.id); loadNotifications() }))
}
