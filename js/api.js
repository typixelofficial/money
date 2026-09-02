// ─── Note Fund — API / Data Layer ──────────────────────────────
// Uses localStorage for persistence (works offline, no backend required).
// Designed to swap in Google Apps Script URL later — set API_URL below.

const API_URL = '' // ← Paste your Google Apps Script Web App URL here
const STORAGE_KEY = 'note_fund_data'

// ─── Default Data ────────────────────────────────────────────────

function defaultData() {
  return {
    people: [],
    transactions: [],
    payments: [],
    notifications: [],
    counters: { person: 0, transaction: 0, payment: 0, notification: 0 },
    settings: {
      theme: 'light',
      currency: '₹',
      notificationsEnabled: true,
      remindersEnabled: true,
    },
  }
}

// ─── LocalStorage Persistence ───────────────────────────────────

let cache = null

function load() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? JSON.parse(raw) : defaultData()
  } catch {
    cache = defaultData()
  }
  if (!cache.settings) cache.settings = defaultData().settings
  if (!cache.counters) cache.counters = { person: 0, transaction: 0, payment: 0, notification: 0 }
  return cache
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('Failed to save:', e)
  }
}

// ─── ID Generation ──────────────────────────────────────────────

function nextId(type) {
  const data = load()
  data.counters[type] = (data.counters[type] || 0) + 1
  const prefix = { person: 'NF-P', transaction: 'NF-T', payment: 'NF-PAY', notification: 'NF-N' }[type]
  const num = String(data.counters[type]).padStart(4, '0')
  return `${prefix}-${num}`
}

// ─── Online Check ───────────────────────────────────────────────

export function isOnline() {
  return navigator.onLine
}

export function getApiUrl() {
  return API_URL
}

export function isApiConfigured() {
  return API_URL !== ''
}

// ─── People ─────────────────────────────────────────────────────

export async function getPeople() {
  return load().people.slice()
}

export async function addPerson({ name, phone, notes }) {
  const data = load()
  const person = {
    id: nextId('person'),
    name: name.trim(),
    phone: (phone || '').trim(),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  data.people.push(person)
  save()
  return person
}

export async function updatePerson(id, updates) {
  const data = load()
  const p = data.people.find(x => x.id === id)
  if (!p) throw new Error('Person not found')
  Object.assign(p, updates, { updatedAt: new Date().toISOString() })
  save()
  return p
}

export async function deletePerson(id) {
  const data = load()
  data.people = data.people.filter(p => p.id !== id)
  data.transactions = data.transactions.filter(t => t.personId !== id)
  data.payments = data.payments.filter(p => p.personId !== id)
  data.notifications = data.notifications.filter(n => n.personId !== id)
  save()
}

export async function findPersonByName(name) {
  return load().people.find(p => p.name.toLowerCase() === name.toLowerCase())
}

// ─── Transactions ───────────────────────────────────────────────

export async function getTransactions() {
  return load().transactions.slice()
}

export async function addTransaction({ personId, personName, amountGiven, dateGiven, dueDate, category, note, reminderDate }) {
  const data = load()
  const txn = {
    id: nextId('transaction'),
    personId,
    personName,
    amountGiven: Number(amountGiven),
    dateGiven: dateGiven || todayISO(),
    dueDate: dueDate || '',
    category: category || 'Personal',
    note: note || '',
    reminderDate: reminderDate || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  data.transactions.push(txn)

  // Auto-create notification if reminder set
  if (reminderDate) {
    addNotificationInternal(data, {
      transactionId: txn.id,
      personId,
      title: 'Reminder Set',
      message: `${personName} owes you ${formatCurrencyInternal(txn.amountGiven)}.`,
      type: 'reminder',
      reminderDate,
    })
  }

  save()
  return txn
}

export async function updateTransaction(id, updates) {
  const data = load()
  const t = data.transactions.find(x => x.id === id)
  if (!t) throw new Error('Transaction not found')
  Object.assign(t, updates, { updatedAt: new Date().toISOString() })
  save()
  return t
}

export async function deleteTransaction(id) {
  const data = load()
  data.transactions = data.transactions.filter(t => t.id !== id)
  data.payments = data.payments.filter(p => p.transactionId !== id)
  data.notifications = data.notifications.filter(n => n.transactionId !== id)
  save()
}

// ─── Payments ───────────────────────────────────────────────────

export async function getPayments() {
  return load().payments.slice()
}

export async function addPayment({ transactionId, personId, personName, amountReceived, paymentDate, paymentMethod, note }) {
  const data = load()
  const txn = data.transactions.find(t => t.id === transactionId)
  if (!txn) throw new Error('Transaction not found')

  const txnPayments = data.payments.filter(p => p.transactionId === transactionId)
  const totalReceived = txnPayments.reduce((s, p) => s + Number(p.amountReceived), 0)
  const remaining = Number(txn.amountGiven) - totalReceived

  if (Number(amountReceived) > remaining) {
    throw new Error(`Maximum receivable amount is ${formatCurrencyInternal(remaining)}.`)
  }

  const payment = {
    id: nextId('payment'),
    transactionId,
    personId,
    personName,
    amountReceived: Number(amountReceived),
    paymentDate: paymentDate || todayISO(),
    paymentMethod: paymentMethod || 'Cash',
    note: note || '',
    createdAt: new Date().toISOString(),
  }
  data.payments.push(payment)

  // Check if settled
  const newTotal = totalReceived + Number(amountReceived)
  const newRemaining = Number(txn.amountGiven) - newTotal

  if (newRemaining <= 0) {
    addNotificationInternal(data, {
      transactionId,
      personId,
      title: 'Balance Settled',
      message: `${personName}'s balance is fully settled.`,
      type: 'settled',
      reminderDate: todayISO(),
    })
  } else {
    addNotificationInternal(data, {
      transactionId,
      personId,
      title: 'Payment Received',
      message: `You received ${formatCurrencyInternal(amountReceived)} from ${personName}. ${formatCurrencyInternal(newRemaining)} remaining.`,
      type: 'payment',
      reminderDate: todayISO(),
    })
  }

  save()
  return payment
}

// ─── Notifications ───────────────────────────────────────────────

function addNotificationInternal(data, { transactionId, personId, title, message, type, reminderDate }) {
  const n = {
    id: nextId('notification'),
    transactionId: transactionId || '',
    personId: personId || '',
    title,
    message,
    type,
    reminderDate: reminderDate || '',
    isRead: false,
    createdAt: new Date().toISOString(),
  }
  data.notifications.unshift(n)
  return n
}

export async function getNotifications() {
  return load().notifications.slice()
}

export async function markNotificationRead(id) {
  const data = load()
  const n = data.notifications.find(x => x.id === id)
  if (n) { n.isRead = true; save() }
}

export async function markAllNotificationsRead() {
  const data = load()
  data.notifications.forEach(n => { n.isRead = true })
  save()
}

export async function clearNotifications() {
  const data = load()
  data.notifications = []
  save()
}

// ─── Settings ────────────────────────────────────────────────────

export async function getSettings() {
  return load().settings
}

export async function updateSettings(updates) {
  const data = load()
  Object.assign(data.settings, updates)
  save()
  return data.settings
}

// ─── Export / Import / Backup ───────────────────────────────────

export async function exportData() {
  return JSON.stringify(load(), null, 2)
}

export async function exportCSV() {
  const data = load()
  const lines = []

  lines.push('PEOPLE')
  lines.push('ID,Name,Phone,Notes,CreatedAt,UpdatedAt')
  data.people.forEach(p => {
    lines.push([p.id, p.name, p.phone, p.notes, p.createdAt, p.updatedAt].map(csvField).join(','))
  })
  lines.push('')

  lines.push('TRANSACTIONS')
  lines.push('TransactionID,PersonID,PersonName,AmountGiven,DateGiven,DueDate,Category,Note,ReminderDate,CreatedAt,UpdatedAt')
  data.transactions.forEach(t => {
    lines.push([t.id, t.personId, t.personName, t.amountGiven, t.dateGiven, t.dueDate, t.category, t.note, t.reminderDate, t.createdAt, t.updatedAt].map(csvField).join(','))
  })
  lines.push('')

  lines.push('PAYMENTS')
  lines.push('PaymentID,TransactionID,PersonID,PersonName,AmountReceived,PaymentDate,PaymentMethod,Note,CreatedAt')
  data.payments.forEach(p => {
    lines.push([p.id, p.transactionId, p.personId, p.personName, p.amountReceived, p.paymentDate, p.paymentMethod, p.note, p.createdAt].map(csvField).join(','))
  })

  return lines.join('\n')
}

function csvField(val) {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function importData(jsonStr) {
  const parsed = JSON.parse(jsonStr)
  cache = { ...defaultData(), ...parsed }
  save()
}

// ─── Dashboard Aggregate ────────────────────────────────────────

export async function getDashboardData() {
  const data = load()
  const { people, transactions, payments, notifications } = data

  let totalGiven = 0, totalReceived = 0, totalOverdue = 0

  transactions.forEach(t => {
    totalGiven += Number(t.amountGiven)
    const tReceived = payments
      .filter(p => p.transactionId === t.id)
      .reduce((s, p) => s + Number(p.amountReceived), 0)
    const remaining = Number(t.amountGiven) - tReceived
    if (remaining > 0 && t.dueDate && daysUntilInternal(t.dueDate) < 0) {
      totalOverdue += remaining
    }
  })

  totalReceived = payments.reduce((s, p) => s + Number(p.amountReceived), 0)
  const totalRemaining = totalGiven - totalReceived

  return { totalGiven, totalReceived, totalRemaining, totalOverdue, peopleCount: people.length, transactionCount: transactions.length, notifications }
}

// ─── Internal Helpers (avoid circular imports) ─────────────────

function formatCurrencyInternal(amount) {
  return '₹' + (Number(amount) || 0).toLocaleString('en-IN')
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysUntilInternal(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}
