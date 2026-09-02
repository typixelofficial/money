// ─── Note Fund — Person Profile Page ──────────────────────────

import { formatCurrency, formatDate, formatDateShort, escapeHtml, statusBadge, getTransactionTotals, getPersonTotals, daysUntil, getRelativeDate, skeletonCard, openModal, closeModal, confirmDialog, showToast } from './utils.js'
import * as api from './api.js'
import { openGiveMoneyModal } from './transactions.js'
import { openAddPaymentModal } from './payments.js'

export async function renderPerson(container, { id, navigate }) {
  if (!id) { navigate('people'); return }

  container.innerHTML = `
    <div class="person-page">
      <button class="back-btn" onclick="window._navigate('people')">← Back to People</button>
      <div id="person-content">${skeletonCard(3)}</div>
    </div>
  `

  const [people, transactions, payments] = await Promise.all([
    api.getPeople(),
    api.getTransactions(),
    api.getPayments(),
  ])

  const person = people.find(p => p.id === id)
  if (!person) {
    document.getElementById('person-content').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h2>Person not found</h2>
        <button class="btn btn-primary" onclick="window._navigate('people')">Back to People</button>
      </div>
    `
    return
  }

  const totals = getPersonTotals(person.id, transactions, payments)
  const personTxns = transactions.filter(t => t.personId === person.id).sort((a, b) => new Date(b.dateGiven) - new Date(a.dateGiven))

  document.getElementById('person-content').innerHTML = `
    <div class="person-profile">
      <div class="person-profile-header">
        <div class="person-avatar-lg">${escapeHtml(person.name.charAt(0).toUpperCase())}</div>
        <div class="person-profile-info">
          <h1>${escapeHtml(person.name)}</h1>
          ${person.phone ? `<div class="person-profile-phone">📞 ${escapeHtml(person.phone)}</div>` : ''}
          ${person.notes ? `<div class="person-profile-notes">📝 ${escapeHtml(person.notes)}</div>` : ''}
        </div>
        ${statusBadge(totals.status)}
      </div>

      <div class="person-summary-cards">
        <div class="summary-card">
          <div class="summary-label">Total Given</div>
          <div class="summary-value">${formatCurrency(totals.totalGiven)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Received</div>
          <div class="summary-value">${formatCurrency(totals.totalReceived)}</div>
        </div>
        <div class="summary-card summary-remaining">
          <div class="summary-label">Remaining</div>
          <div class="summary-value">${formatCurrency(totals.remaining)}</div>
        </div>
      </div>

      <div class="person-actions">
        <button class="btn btn-primary" id="person-give-money"><span>💸</span> Give Money</button>
        <button class="btn btn-success" id="person-add-payment"><span>✓</span> Add Payment</button>
        <button class="btn btn-ghost" id="person-edit"><span>✏️</span> Edit</button>
        <button class="btn btn-danger-ghost" id="person-delete"><span>🗑️</span> Delete</button>
      </div>

      <div class="person-transactions">
        <h2 class="section-title">Transaction History</h2>
        <div id="person-txn-list">
          ${personTxns.length === 0
            ? `<div class="empty-state-mini"><span>💸</span><p>No transactions yet. Click "Give Money" to start.</p></div>`
            : personTxns.map(t => renderTransactionCard(t, payments)).join('')
          }
        </div>
      </div>
    </div>
  `

  document.getElementById('person-give-money').addEventListener('click', () => openGiveMoneyModal(person.id, person.name))
  document.getElementById('person-add-payment').addEventListener('click', () => openAddPaymentModal(person.id, person.name))
  document.getElementById('person-edit').addEventListener('click', () => openEditPersonModal(person))
  document.getElementById('person-delete').addEventListener('click', () => {
    confirmDialog(`Are you sure you want to delete ${person.name}? This will also delete all their transactions and payments.`, async () => {
      await api.deletePerson(person.id)
      showToast(`${person.name} deleted.`)
      navigate('people')
    })
  })

  // Wire transaction card buttons
  wireTransactionButtons(personTxns, payments)
}

function renderTransactionCard(t, payments) {
  const totals = getTransactionTotals(t, payments)
  const txnPayments = totals.payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))

  return `
    <div class="txn-card" data-txn-id="${t.id}">
      <div class="txn-card-header">
        <div class="txn-id">${t.id}</div>
        ${statusBadge(totals.status)}
      </div>
      <div class="txn-card-stats">
        <div class="txn-stat">
          <span class="txn-stat-label">Given</span>
          <span class="txn-stat-value">${formatCurrency(t.amountGiven)}</span>
        </div>
        <div class="txn-stat">
          <span class="txn-stat-label">Received</span>
          <span class="txn-stat-value">${formatCurrency(totals.totalReceived)}</span>
        </div>
        <div class="txn-stat txn-stat-remaining">
          <span class="txn-stat-label">Remaining</span>
          <span class="txn-stat-value">${formatCurrency(totals.remaining)}</span>
        </div>
      </div>
      <div class="txn-card-meta">
        <span>📅 Given: ${formatDateShort(t.dateGiven)}</span>
        ${t.dueDate ? `<span>⏰ Due: ${formatDateShort(t.dueDate)}</span>` : ''}
        ${t.category ? `<span>🏷️ ${escapeHtml(t.category)}</span>` : ''}
      </div>
      ${t.note ? `<div class="txn-card-note">📝 ${escapeHtml(t.note)}</div>` : ''}

      ${txnPayments.length > 0 ? `
        <div class="payment-timeline">
          ${renderPaymentTimeline(t, txnPayments)}
        </div>
      ` : ''}

      <div class="txn-card-actions">
        ${totals.remaining > 0
          ? `<button class="btn btn-success btn-sm" data-action="add-payment" data-txn-id="${t.id}" data-person-id="${t.personId}" data-person-name="${escapeHtml(t.personName)}">✓ Add Payment</button>`
          : `<span class="settled-badge">🎉 Fully Settled</span>`
        }
        <button class="btn btn-ghost btn-sm" data-action="edit-txn" data-txn-id="${t.id}">✏️ Edit</button>
        <button class="btn btn-danger-ghost btn-sm" data-action="delete-txn" data-txn-id="${t.id}">🗑️ Delete</button>
      </div>
    </div>
  `
}

function renderPaymentTimeline(t, txnPayments) {
  let runningBalance = Number(t.amountGiven)
  const items = []

  items.push(`
    <div class="timeline-item">
      <div class="timeline-date">${formatDateShort(t.dateGiven)}</div>
      <div class="timeline-content">
        <span class="timeline-icon">💸</span>
        <span>Given ${formatCurrency(t.amountGiven)}</span>
      </div>
    </div>
  `)

  txnPayments.reverse().forEach(p => {
    runningBalance -= Number(p.amountReceived)
    items.push(`
      <div class="timeline-item">
        <div class="timeline-date">${formatDateShort(p.paymentDate)}</div>
        <div class="timeline-content">
          <span class="timeline-icon">💰</span>
          <span>Received ${formatCurrency(p.amountReceived)}</span>
        </div>
        <div class="timeline-balance">Balance: ${formatCurrency(runningBalance)}</div>
      </div>
    `)
  })

  if (runningBalance <= 0) {
    items.push(`
      <div class="timeline-item timeline-settled">
        <div class="timeline-content">
          <span>🎉 FULLY SETTLED</span>
        </div>
      </div>
    `)
  }

  return `<div class="timeline">${items.join('<div class="timeline-arrow">↓</div>')}</div>`
}

function wireTransactionButtons(txns, payments) {
  document.querySelectorAll('[data-action="add-payment"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const txnId = btn.dataset.txnId
      const txn = txns.find(t => t.id === txnId)
      if (txn) openAddPaymentModal(txn.personId, txn.personName, txnId)
    })
  })
  document.querySelectorAll('[data-action="edit-txn"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const txn = txns.find(t => t.id === btn.dataset.txnId)
      if (txn) openEditTransactionModal(txn)
    })
  })
  document.querySelectorAll('[data-action="delete-txn"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const txn = txns.find(t => t.id === btn.dataset.txnId)
      if (txn) {
        confirmDialog(`Are you sure you want to delete transaction ${txn.id}?`, async () => {
          await api.deleteTransaction(txn.id)
          showToast('Transaction deleted.')
          window.location.reload()
        })
      }
    })
  })
}

// ─── Edit Person Modal ─────────────────────────────────────────

function openEditPersonModal(person) {
  openModal(`
    <div class="modal-header">
      <h2>Edit Person</h2>
      <button class="modal-close" onclick="window._closeModal()">×</button>
    </div>
    <form id="edit-person-form" class="modal-form">
      <div class="form-group">
        <label for="edit-person-name">Name *</label>
        <input type="text" id="edit-person-name" required value="${escapeHtml(person.name)}" />
      </div>
      <div class="form-group">
        <label for="edit-person-phone">Phone Number</label>
        <input type="tel" id="edit-person-phone" value="${escapeHtml(person.phone || '')}" />
      </div>
      <div class="form-group">
        <label for="edit-person-notes">Notes</label>
        <textarea id="edit-person-notes" rows="2">${escapeHtml(person.notes || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `)

  document.getElementById('edit-person-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    await api.updatePerson(person.id, {
      name: document.getElementById('edit-person-name').value.trim(),
      phone: document.getElementById('edit-person-phone').value.trim(),
      notes: document.getElementById('edit-person-notes').value.trim(),
    })
    showToast(`${person.name} updated.`)
    closeModal()
    window.location.reload()
  })
}

// ─── Edit Transaction Modal ────────────────────────────────────

function openEditTransactionModal(txn) {
  const reminderOptions = [
    { value: '', label: 'No reminder' },
    { value: 'same-day', label: 'Same day' },
    { value: '1-before', label: '1 day before' },
    { value: '2-before', label: '2 days before' },
    { value: '3-before', label: '3 days before' },
  ]

  openModal(`
    <div class="modal-header">
      <h2>Edit Transaction</h2>
      <button class="modal-close" onclick="window._closeModal()">×</button>
    </div>
    <form id="edit-txn-form" class="modal-form">
      <div class="form-group">
        <label for="edit-txn-amount">Amount Given *</label>
        <input type="number" id="edit-txn-amount" required min="1" value="${txn.amountGiven}" />
      </div>
      <div class="form-group">
        <label for="edit-txn-date-given">Date Given</label>
        <input type="date" id="edit-txn-date-given" value="${txn.dateGiven}" />
      </div>
      <div class="form-group">
        <label for="edit-txn-due-date">Due Date</label>
        <input type="date" id="edit-txn-due-date" value="${txn.dueDate || ''}" />
      </div>
      <div class="form-group">
        <label for="edit-txn-category">Category</label>
        <select id="edit-txn-category">
          ${['Personal', 'Emergency', 'Education', 'Travel', 'Food', 'Other'].map(c =>
            `<option value="${c}" ${c === txn.category ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="edit-txn-note">Note</label>
        <textarea id="edit-txn-note" rows="2">${escapeHtml(txn.note || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `)

  document.getElementById('edit-txn-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    await api.updateTransaction(txn.id, {
      amountGiven: Number(document.getElementById('edit-txn-amount').value),
      dateGiven: document.getElementById('edit-txn-date-given').value,
      dueDate: document.getElementById('edit-txn-due-date').value,
      category: document.getElementById('edit-txn-category').value,
      note: document.getElementById('edit-txn-note').value.trim(),
    })
    showToast('Transaction updated.')
    closeModal()
    window.location.reload()
  })
}
