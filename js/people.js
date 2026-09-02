// ─── Note Fund — People Page ───────────────────────────────────

import { formatCurrency, formatDate, escapeHtml, statusBadge, getPersonTotals, debounce, skeletonCard, openModal, closeModal, showToast } from './utils.js'
import * as api from './api.js'

let currentFilter = 'all'
let currentSort = 'newest'

export async function renderPeople(container, { navigate }) {
  container.innerHTML = `
    <div class="people-page">
      <div class="page-header">
        <div>
          <h1>👥 People I Give To</h1>
          <p class="page-subtitle">Everyone you've lent money to.</p>
        </div>
        <button class="btn btn-primary" id="add-person-btn">
          <span>+</span> Add Person
        </button>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <button class="filter-chip active" data-filter="all">All</button>
          <button class="filter-chip" data-filter="has-balance">Has Balance</button>
          <button class="filter-chip" data-filter="settled">Settled</button>
          <button class="filter-chip" data-filter="overdue">Overdue</button>
        </div>
        <select class="sort-select" id="people-sort">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest-remaining">Highest Remaining</option>
          <option value="lowest-remaining">Lowest Remaining</option>
          <option value="name-az">Name A-Z</option>
          <option value="name-za">Name Z-A</option>
        </select>
      </div>

      <div id="people-list" class="people-grid">
        ${skeletonCard(4)}
      </div>
    </div>
  `

  document.getElementById('add-person-btn').addEventListener('click', () => openAddPersonModal())
  document.getElementById('people-sort').addEventListener('change', (e) => {
    currentSort = e.target.value
    loadPeople()
  })

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'))
      chip.classList.add('active')
      currentFilter = chip.dataset.filter
      loadPeople()
    })
  })

  await loadPeople()
}

async function loadPeople() {
  const [people, transactions, payments] = await Promise.all([
    api.getPeople(),
    api.getTransactions(),
    api.getPayments(),
  ])

  let peopleWithBalances = people.map(p => {
    const totals = getPersonTotals(p.id, transactions, payments)
    return { ...p, ...totals }
  })

  // Filter to only people who have been given money
  peopleWithBalances = peopleWithBalances.filter(p => p.totalGiven > 0)

  // Apply filter
  if (currentFilter === 'has-balance') {
    peopleWithBalances = peopleWithBalances.filter(p => p.remaining > 0)
  } else if (currentFilter === 'settled') {
    peopleWithBalances = peopleWithBalances.filter(p => p.remaining <= 0 && p.totalGiven > 0)
  } else if (currentFilter === 'overdue') {
    peopleWithBalances = peopleWithBalances.filter(p => p.status === 'OVERDUE')
  }

  // Apply sort
  switch (currentSort) {
    case 'newest': peopleWithBalances.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break
    case 'oldest': peopleWithBalances.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break
    case 'highest-remaining': peopleWithBalances.sort((a, b) => b.remaining - a.remaining); break
    case 'lowest-remaining': peopleWithBalances.sort((a, b) => a.remaining - b.remaining); break
    case 'name-az': peopleWithBalances.sort((a, b) => a.name.localeCompare(b.name)); break
    case 'name-za': peopleWithBalances.sort((a, b) => b.name.localeCompare(a.name)); break
  }

  const listEl = document.getElementById('people-list')

  if (peopleWithBalances.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">👥</span>
        <h2>No people yet</h2>
        <p>Add someone you have given money to.</p>
        <button class="btn btn-primary" onclick="window._openAddPersonModal()">+ Add Person</button>
      </div>
    `
    return
  }

  listEl.innerHTML = peopleWithBalances.map(p => `
    <div class="person-card" onclick="window._navigate('person', { id: '${p.id}' })">
      <div class="person-card-header">
        <div class="person-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</div>
        <div>
          <div class="person-card-name">${escapeHtml(p.name)}</div>
          ${p.phone ? `<div class="person-card-phone">${escapeHtml(p.phone)}</div>` : ''}
        </div>
        ${statusBadge(p.status)}
      </div>
      <div class="person-card-stats">
        <div class="person-stat">
          <div class="person-stat-label">Given</div>
          <div class="person-stat-value">${formatCurrency(p.totalGiven)}</div>
        </div>
        <div class="person-stat">
          <div class="person-stat-label">Received</div>
          <div class="person-stat-value">${formatCurrency(p.totalReceived)}</div>
        </div>
        <div class="person-stat person-stat-remaining">
          <div class="person-stat-label">Remaining</div>
          <div class="person-stat-value">${formatCurrency(p.remaining)}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm person-card-action">View Details →</button>
    </div>
  `).join('')
}

// ─── Add Person Modal ───────────────────────────────────────────

export function openAddPersonModal() {
  openModal(`
    <div class="modal-header">
      <h2>Add Person</h2>
      <button class="modal-close" onclick="window._closeModal()">×</button>
    </div>
    <form id="add-person-form" class="modal-form">
      <div class="form-group">
        <label for="person-name">Name *</label>
        <input type="text" id="person-name" required placeholder="e.g. Rahul" autocomplete="name" />
      </div>
      <div class="form-group">
        <label for="person-phone">Phone Number</label>
        <input type="tel" id="person-phone" placeholder="e.g. 9876543210" autocomplete="tel" />
      </div>
      <div class="form-group">
        <label for="person-notes">Notes</label>
        <textarea id="person-notes" rows="2" placeholder="e.g. Friend from college"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="window._closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Person</button>
      </div>
    </form>
  `)

  document.getElementById('add-person-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.getElementById('person-name').value.trim()
    const phone = document.getElementById('person-phone').value.trim()
    const notes = document.getElementById('person-notes').value.trim()
    if (!name) return

    const existing = await api.findPersonByName(name)
    if (existing) {
      showToast(`${name} already exists`, 'warning')
      return
    }

    await api.addPerson({ name, phone, notes })
    showToast(`${name} added successfully.`)
    closeModal()
    loadPeople()
  })
}

window._openAddPersonModal = openAddPersonModal
