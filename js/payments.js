// ─── Note Fund — Payments Page ─────────────────────────────────

import { formatCurrency, formatDate, formatDateShort, escapeHtml, skeletonRows, openModal, closeModal, showToast } from './utils.js'
import * as api from './api.js'

let paymentFilters = { person: '', method: '', date: '' }

export async function renderPayments(container) {
  container.innerHTML = `
    <div class="payments-page">
      <div class="page-header">
        <div>
          <h1>💰 Payments</h1>
          <p class="page-subtitle">All money received back.</p>
        </div>
        <button class="btn btn-success" id="payments-add-btn">+ Add Payment</button>
      </div>
      <div class="filter-bar payment-filters">
        <select class="filter-select" id="payment-person-filter"><option value="">All people</option></select>
        <select class="filter-select" id="payment-method-filter">
          <option value="">All methods</option>
          <option value="Cash">Cash</option><option value="UPI">UPI</option>
          <option value="Bank Transfer">Bank Transfer</option><option value="Other">Other</option>
        </select>
        <input type="date" class="filter-date" id="payment-date-filter" />
        <button class="btn btn-ghost btn-sm" id="payment-clear-filters">Clear</button>
      </div>
      <div id="payments-content">${skeletonRows(5, 6)}</div>
    </div>
  `

  document.getElementById('payments-add-btn').addEventListener('click', () => openAddPaymentModal())
  document.getElementById('payment-person-filter').addEventListener('change', e => { paymentFilters.person = e.target.value; loadPayments() })
  document.getElementById('payment-method-filter').addEventListener('change', e => { paymentFilters.method = e.target.value; loadPayments() })
  document.getElementById('payment-date-filter').addEventListener('change', e => { paymentFilters.date = e.target.value; loadPayments() })
  document.getElementById('payment-clear-filters').addEventListener('click', () => {
    paymentFilters = { person: '', method: '', date: '' }
    document.getElementById('payment-person-filter').value = ''
    document.getElementById('payment-method-filter').value = ''
    document.getElementById('payment-date-filter').value = ''
    loadPayments()
  })

  const people = await api.getPeople()
  const personSelect = document.getElementById('payment-person-filter')
  people.forEach(p => {
    const option = document.createElement('option')
    option.value = p.id
    option.textContent = p.name
    personSelect.appendChild(option)
  })
  await loadPayments()
}

async function loadPayments() {
  let payments = await api.getPayments()
  if (paymentFilters.person) payments = payments.filter(p => p.personId === paymentFilters.person)
  if (paymentFilters.method) payments = payments.filter(p => p.paymentMethod === paymentFilters.method)
  if (paymentFilters.date) payments = payments.filter(p => p.paymentDate === paymentFilters.date)
  payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))

  const content = document.getElementById('payments-content')
  if (!payments.length) {
    content.innerHTML = `
      <div class="empty-state"><span class="empty-icon">💰</span><h2>No payments found</h2><p>Received payments will appear here.</p>
      <button class="btn btn-success" onclick="window._openAddPaymentModal()">+ Add Payment</button></div>`
    return
  }

  content.innerHTML = `
    <div class="table-wrapper desktop-table"><table class="data-table">
      <thead><tr><th>Person</th><th>Amount Received</th><th>Transaction</th><th>Date</th><th>Method</th><th>Note</th></tr></thead>
      <tbody>${payments.map(p => `<tr>
        <td><a href="#/person/${p.personId}" class="table-link">${escapeHtml(p.personName)}</a></td>
        <td class="cell-positive cell-bold">${formatCurrency(p.amountReceived)}</td>
        <td>${escapeHtml(p.transactionId)}</td><td>${formatDateShort(p.paymentDate)}</td>
        <td><span class="method-pill">${escapeHtml(p.paymentMethod)}</span></td><td>${escapeHtml(p.note || '—')}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="mobile-cards">${payments.map(p => `<div class="mobile-payment-card">
      <div class="mobile-card-top"><span class="mobile-card-name">${escapeHtml(p.personName)}</span><span class="cell-positive cell-bold">+${formatCurrency(p.amountReceived)}</span></div>
      <div class="mobile-card-meta"><span>${escapeHtml(p.transactionId)}</span><span>${formatDate(p.paymentDate)}</span><span>${escapeHtml(p.paymentMethod)}</span></div>
      ${p.note ? `<div class="mobile-card-note">${escapeHtml(p.note)}</div>` : ''}
    </div>`).join('')}</div>`
}

export async function openAddPaymentModal(preselectedPersonId = null, preselectedPersonName = null, preselectedTxnId = null) {
  const [people, transactions, payments] = await Promise.all([api.getPeople(), api.getTransactions(), api.getPayments()])
  const openTransactions = transactions.map(t => {
    const received = payments.filter(p => p.transactionId === t.id).reduce((s, p) => s + Number(p.amountReceived), 0)
    return { ...t, remaining: Number(t.amountGiven) - received }
  }).filter(t => t.remaining > 0)

  const personOptions = people.map(p => `<option value="${p.id}" ${p.id === preselectedPersonId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')
  const txnOptions = openTransactions.map(t => `<option value="${t.id}" data-person="${t.personId}" ${t.id === preselectedTxnId ? 'selected' : ''}>${escapeHtml(t.id)} — ${escapeHtml(t.personName)} (remaining ₹${t.remaining.toLocaleString('en-IN')})</option>`).join('')

  openModal(`<div class="modal-header"><h2>✓ Record Payment</h2><button class="modal-close" onclick="window._closeModal()">×</button></div>
    <form id="add-payment-form" class="modal-form">
      <div class="form-group"><label for="payment-person">Person *</label><select id="payment-person" required><option value="">Select person...</option>${personOptions}</select></div>
      <div class="form-group"><label for="payment-transaction">Transaction *</label><select id="payment-transaction" required><option value="">Select transaction...</option>${txnOptions}</select></div>
      <div class="payment-preview" id="payment-preview"><span>Select a transaction to see its balance.</span></div>
      <div class="form-group"><label for="payment-amount">Amount Received *</label><input type="number" id="payment-amount" min="1" required placeholder="e.g. 450" /><div class="field-error" id="payment-error"></div></div>
      <div class="form-row"><div class="form-group"><label for="payment-date">Payment Date</label><input type="date" id="payment-date" value="${new Date().toISOString().split('T')[0]}" /></div>
      <div class="form-group"><label for="payment-method">Payment Method</label><select id="payment-method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Other</option></select></div></div>
      <div class="form-group"><label for="payment-note">Note</label><textarea id="payment-note" rows="2" placeholder="Optional note"></textarea></div>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancel</button><button type="submit" class="btn btn-success">Save Payment</button></div>
    </form>`)

  const personSelect = document.getElementById('payment-person')
  const txnSelect = document.getElementById('payment-transaction')
  const amountInput = document.getElementById('payment-amount')
  const preview = document.getElementById('payment-preview')
  const errorEl = document.getElementById('payment-error')

  const updateTransactions = () => {
    const personId = personSelect.value
    Array.from(txnSelect.options).forEach(option => {
      if (!option.value) return
      option.hidden = personId && option.dataset.person !== personId
    })
    if (txnSelect.value && txnSelect.selectedOptions[0].hidden) txnSelect.value = ''
    updatePreview()
  }
  const updatePreview = () => {
    const txn = openTransactions.find(t => t.id === txnSelect.value)
    if (!txn) { preview.innerHTML = '<span>Select a transaction to see its balance.</span>'; return }
    const amount = Number(amountInput.value) || 0
    const remaining = txn.remaining - amount
    preview.innerHTML = `<div><span>Given</span><strong>${formatCurrency(txn.amountGiven)}</strong></div><div><span>Already Received</span><strong>${formatCurrency(txn.amountGiven - txn.remaining)}</strong></div><div><span>New Remaining</span><strong class="${remaining < 0 ? 'preview-error' : 'preview-good'}">${formatCurrency(Math.max(0, remaining))}</strong></div>`
    errorEl.textContent = amount > txn.remaining ? `Maximum receivable amount is ${formatCurrency(txn.remaining)}.` : ''
  }
  personSelect.addEventListener('change', updateTransactions)
  txnSelect.addEventListener('change', updatePreview)
  amountInput.addEventListener('input', updatePreview)
  if (preselectedPersonId) updateTransactions()

  document.getElementById('add-payment-form').addEventListener('submit', async e => {
    e.preventDefault()
    const txn = openTransactions.find(t => t.id === txnSelect.value)
    const amount = Number(amountInput.value)
    if (!txn || !amount || amount <= 0) { showToast('Complete the payment details', 'warning'); return }
    if (amount > txn.remaining) { errorEl.textContent = `Maximum receivable amount is ${formatCurrency(txn.remaining)}.`; return }
    try {
      await api.addPayment({ transactionId: txn.id, personId: txn.personId, personName: txn.personName, amountReceived: amount, paymentDate: document.getElementById('payment-date').value, paymentMethod: document.getElementById('payment-method').value, note: document.getElementById('payment-note').value.trim() })
      showToast(amount === txn.remaining ? `${txn.personName}'s balance is fully settled.` : `${formatCurrency(amount)} received from ${txn.personName}.`)
      closeModal(); window.location.reload()
    } catch (error) { showToast(error.message, 'error') }
  })
}

window._openAddPaymentModal = openAddPaymentModal
