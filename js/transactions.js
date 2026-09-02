// ─── Note Fund — Transactions Page ────────────────────────────

import { formatCurrency, formatDate, formatDateShort, escapeHtml, statusBadge, getTransactionTotals, daysUntil, skeletonRows, openModal, closeModal, confirmDialog, showToast, todayISO } from './utils.js'
import * as api from './api.js'

let currentFilter = 'all'
let currentSort = 'newest'

export async function renderTransactions(container, { navigate }) {
  container.innerHTML = `
    <div class="transactions-page">
      <div class="page-header">
        <div>
          <h1>💸 Transactions</h1>
          <p class="page-subtitle">All money you've given.</p>
        </div>
        <button class="btn btn-primary" id="txn-give-money-btn"><span>+</span> Give Money</button>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <button class="filter-chip active" data-filter="all">All</button>
          <button class="filter-chip" data-filter="PENDING">Pending</button>
          <button class="filter-chip" data-filter="PARTIAL">Partial</button>
          <button class="filter-chip" data-filter="OVERDUE">Overdue</button>
          <button class="filter-chip" data-filter="SETTLED">Settled</button>
        </div>
        <select class="sort-select" id="txn-sort">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest-given">Highest Given</option>
          <option value="highest-remaining">Highest Remaining</option>
          <option value="lowest-remaining">Lowest Remaining</option>
          <option value="due-date">Due Date</option>
        </select>
      </div>

      <div id="txn-content">${skeletonRows(5, 7)}</div>
    </div>
  `

  document.getElementById('txn-give-money-btn').addEventListener('click', () => openGiveMoneyModal())
  document.getElementById('txn-sort').addEventListener('change', (e) => {
    currentSort = e.target.value
    loadTransactions()
  })
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      currentFilter = chip.dataset.filter
      loadTransactions()
    })
  })

  await loadTransactions()
}

async function loadTransactions() {
  const [transactions, payments] = await Promise.all([
    api.getTransactions(),
    api.getPayments(),
  ])

  let txnsWithTotals = transactions.map(t => {
    const totals = getTransactionTotals(t, payments)
    return { ...t, ...totals }
  })

  if (currentFilter !== 'all') {
    txnsWithTotals = txnsWithTotals.filter(t => t.status === currentFilter)
  }

  switch (currentSort) {
    case 'newest': txnsWithTotals.sort((a, b) => new Date(b.dateGiven) - new Date(a.dateGiven)); break
    case 'oldest': txnsWithTotals.sort((a, b) => new Date(a.dateGiven) - new Date(b.dateGiven)); break
    case 'highest-given': txnsWithTotals.sort((a, b) => b.amountGiven - a.amountGiven); break
    case 'highest-remaining': txnsWithTotals.sort((a, b) => b.remaining - a.remaining); break
    case 'lowest-remaining': txnsWithTotals.sort((a, b) => a.remaining - b.remaining); break
    case 'due-date': txnsWithTotals.sort((a, b) => {
      if (!a.dueDate) return 1; if (!b.dueDate) return -1
      return new Date(a.dueDate) - new Date(b.dueDate)
    }); break
  }

  const contentEl = document.getElementById('txn-content')

  if (txnsWithTotals.length === 0) {
    contentEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">💸</span>
        <h2>No transactions yet</h2>
        <p>Start by recording money you've given.</p>
        <button class="btn btn-primary" onclick="window._openGiveMoneyModal()">+ Give Money</button>
      </div>
    `
    return
  }

  // Desktop table + mobile cards
  contentEl.innerHTML = `
    <div class="table-wrapper desktop-table">
      <table class="data-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Given</th>
            <th>Received</th>
            <th>Remaining</th>
            <th>Given Date</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${txnsWithTotals.map(t => `
            <tr>
              <td><a href="#/person/${t.personId}" class="table-link">${escapeHtml(t.personName)}</a></td>
              <td>${formatCurrency(t.amountGiven)}</td>
              <td>${formatCurrency(t.totalReceived)}</td>
              <td class="cell-bold">${formatCurrency(t.remaining)}</td>
              <td>${formatDateShort(t.dateGiven)}</td>
              <td>${t.dueDate ? formatDateShort(t.dueDate) : '—'}</td>
              <td>${statusBadge(t.status)}</td>
              <td>
                <div class="table-actions">
                  ${t.remaining > 0 ? `<button class="btn btn-success btn-sm" onclick="window._openAddPaymentModal('${t.personId}', '${escapeHtml(t.personName)}', '${t.id}')">✓</button>` : ''}
                  <button class="btn btn-ghost btn-sm" onclick="window._navigate('person', { id: '${t.personId}' })">→</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="mobile-cards">
      ${txnsWithTotals.map(t => `
        <div class="mobile-txn-card" onclick="window._navigate('person', { id: '${t.personId}' })">
          <div class="mobile-card-top">
            <span class="mobile-card-name">${escapeHtml(t.personName)}</span>
            ${statusBadge(t.status)}
          </div>
          <div class="mobile-card-stats">
            <span>💸 ${formatCurrency(t.amountGiven)}</span>
            <span>💰 ${formatCurrency(t.totalReceived)}</span>
            <span class="cell-bold">💵 ${formatCurrency(t.remaining)}</span>
          </div>
          <div class="mobile-card-meta">
            <span>${formatDateShort(t.dateGiven)}</span>
            ${t.dueDate ? `<span>Due: ${formatDateShort(t.dueDate)}</span>` : ''}
          </div>
          ${t.remaining > 0 ? `<button class="btn btn-success btn-sm mobile-card-btn" onclick="event.stopPropagation(); window._openAddPaymentModal('${t.personId}', '${escapeHtml(t.personName)}', '${t.id}')">✓ Add Payment</button>` : ''}
        </div>
      `).join('')}
    </div>
  `
}

// ─── Give Money Modal ──────────────────────────────────────────

export function openGiveMoneyModal(preselectedPersonId = null, preselectedPersonName = null) {
  openModal(`
    <div class="modal-header">
      <h2>💸 Give Money</h2>
      <button class="modal-close" onclick="window._closeModal()">×</button>
    </div>
    <form id="give-money-form" class="modal-form">
      <div class="form-group">
        <label>Person *</label>
        <div id="person-select-area">
          ${preselectedPersonId
            ? `<div class="selected-person"><span>${escapeHtml(preselectedPersonName)}</span></div>`
            : `<select id="give-money-person" required>
                <option value="">Select existing person...</option>
              </select>
              <button type="button" class="btn btn-ghost btn-sm" id="give-money-new-person">+ Create New</button>`
          }
        </div>
      </div>
      <div class="form-group" id="new-person-fields" style="display:none">
        <label for="give-money-new-name">New Person Name *</label>
        <input type="text" id="give-money-new-name" placeholder="e.g. Rahul" />
      </div>
      <div class="form-group">
        <label for="give-money-amount">Amount *</label>
        <input type="number" id="give-money-amount" required min="1" placeholder="e.g. 500" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="give-money-date">Date Given</label>
          <input type="date" id="give-money-date" value="${todayISO()}" />
        </div>
        <div class="form-group">
          <label for="give-money-due">Due Date</label>
          <input type="date" id="give-money-due" />
        </div>
      </div>
      <div class="form-group">
        <label for="give-money-category">Category</label>
        <select id="give-money-category">
          ${['Personal', 'Emergency', 'Education', 'Travel', 'Food', 'Other'].map(c =>
            `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="give-money-note">Note</label>
        <textarea id="give-money-note" rows="2" placeholder="e.g. Emergency help"></textarea>
      </div>
      <div class="form-group">
        <label for="give-money-reminder">Reminder</label>
        <select id="give-money-reminder">
          <option value="">No reminder</option>
          <option value="same-day">Same day</option>
          <option value="1-before">1 day before</option>
          <option value="2-before">2 days before</option>
          <option value="3-before">3 days before</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Give Money</button>
      </div>
    </form>
  `)

  // Populate person dropdown if not preselected
  if (!preselectedPersonId) {
    api.getPeople().then(people => {
      const select = document.getElementById('give-money-person')
      if (!select) return
      people.forEach(p => {
        const opt = document.createElement('option')
        opt.value = `${p.id}|${p.name}`
        opt.textContent = p.name
        select.appendChild(opt)
      })
    })

    document.getElementById('give-money-new-person').addEventListener('click', () => {
      document.getElementById('new-person-fields').style.display = 'block'
      document.getElementById('give-money-person').style.display = 'none'
      document.getElementById('give-money-new-person').style.display = 'none'
    })
  }

  document.getElementById('give-money-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const amount = Number(document.getElementById('give-money-amount').value)
    if (!amount || amount < 1) { showToast('Enter a valid amount', 'warning'); return }

    let personId, personName
    if (preselectedPersonId) {
      personId = preselectedPersonId
      personName = preselectedPersonName
    } else {
      const newPersonFields = document.getElementById('new-person-fields')
      if (newPersonFields.style.display === 'none' || newPersonFields.style.display === '') {
        const selectVal = document.getElementById('give-money-person').value
        if (!selectVal) { showToast('Select a person', 'warning'); return }
        ;[personId, personName] = selectVal.split('|')
      } else {
        const newName = document.getElementById('give-money-new-name').value.trim()
        if (!newName) { showToast('Enter person name', 'warning'); return }
        const existing = await api.findPersonByName(newName)
        if (existing) {
          personId = existing.id
          personName = existing.name
        } else {
          const person = await api.addPerson({ name: newName })
          personId = person.id
          personName = person.name
        }
      }
    }

    const dueDate = document.getElementById('give-money-due').value
    const reminderType = document.getElementById('give-money-reminder').value
    let reminderDate = ''
    if (reminderType && dueDate) {
      const due = new Date(dueDate)
      switch (reminderType) {
        case 'same-day': reminderDate = dueDate; break
        case '1-before': due.setDate(due.getDate() - 1); reminderDate = due.toISOString().split('T')[0]; break
        case '2-before': due.setDate(due.getDate() - 2); reminderDate = due.toISOString().split('T')[0]; break
        case '3-before': due.setDate(due.getDate() - 3); reminderDate = due.toISOString().split('T')[0]; break
      }
    }

    await api.addTransaction({
      personId,
      personName,
      amountGiven: amount,
      dateGiven: document.getElementById('give-money-date').value,
      dueDate,
      category: document.getElementById('give-money-category').value,
      note: document.getElementById('give-money-note').value.trim(),
      reminderDate,
    })

    showToast(`${formatCurrency(amount)} given to ${personName}.`)
    closeModal()
    window.location.reload()
  })
}

window._openGiveMoneyModal = openGiveMoneyModal
