// ─── Note Fund — Reports Page ──────────────────────────────────

import { formatCurrency, getTransactionTotals, getPersonTotals, statusBadge } from './utils.js'
import * as api from './api.js'

export async function renderReports(container) {
  container.innerHTML = `<div class="reports-page"><div class="page-header"><div><h1>📊 Reports</h1><p class="page-subtitle">A clear view of your money activity.</p></div></div><div id="reports-content" class="reports-content"><div class="spinner"></div></div></div>`
  const [people, transactions, payments] = await Promise.all([api.getPeople(), api.getTransactions(), api.getPayments()])
  const enriched = transactions.map(t => ({ ...t, ...getTransactionTotals(t, payments) }))
  const totalGiven = transactions.reduce((s, t) => s + Number(t.amountGiven), 0)
  const totalReceived = payments.reduce((s, p) => s + Number(p.amountReceived), 0)
  const totalRemaining = totalGiven - totalReceived
  const totalOverdue = enriched.filter(t => t.status === 'OVERDUE').reduce((s, t) => s + t.remaining, 0)
  const totalSettled = enriched.filter(t => t.status === 'SETTLED').reduce((s, t) => s + Number(t.amountGiven), 0)
  const topPeople = people.map(p => ({ ...p, ...getPersonTotals(p.id, transactions, payments) })).filter(p => p.remaining > 0).sort((a, b) => b.remaining - a.remaining).slice(0, 6)
  const maxBalance = Math.max(...topPeople.map(p => p.remaining), 1)

  document.getElementById('reports-content').innerHTML = `<div class="report-stat-grid"><div class="report-stat"><span>💸</span><strong>${formatCurrency(totalGiven)}</strong><label>Total Given</label></div><div class="report-stat"><span>💰</span><strong>${formatCurrency(totalReceived)}</strong><label>Total Received</label></div><div class="report-stat"><span>💵</span><strong>${formatCurrency(totalRemaining)}</strong><label>Total Remaining</label></div><div class="report-stat report-danger"><span>🔴</span><strong>${formatCurrency(totalOverdue)}</strong><label>Total Overdue</label></div><div class="report-stat report-success"><span>🎉</span><strong>${formatCurrency(totalSettled)}</strong><label>Total Settled</label></div><div class="report-stat"><span>👥</span><strong>${people.length}</strong><label>People</label></div><div class="report-stat"><span>📋</span><strong>${transactions.length}</strong><label>Transactions</label></div></div>
    <div class="reports-grid"><section class="report-panel"><h2 class="section-title">Outstanding Balances</h2>${topPeople.length ? topPeople.map(p => `<div class="balance-bar-row"><div class="balance-bar-label"><span>${p.name}</span><strong>${formatCurrency(p.remaining)}</strong></div><div class="balance-bar"><span style="width:${Math.max((p.remaining / maxBalance) * 100, 4)}%"></span></div></div>`).join('') : '<div class="empty-state-mini"><span>✓</span><p>All balances are settled.</p></div>'}</section><section class="report-panel"><h2 class="section-title">Transaction Breakdown</h2>${['PENDING', 'PARTIAL', 'OVERDUE', 'SETTLED'].map(status => { const count = enriched.filter(t => t.status === status).length; return `<div class="breakdown-row"><span>${statusBadge(status)}</span><strong>${count}</strong><span>transaction${count === 1 ? '' : 's'}</span></div>` }).join('')}</section></div>
    <section class="report-panel monthly-panel"><h2 class="section-title">Money Flow</h2><div class="flow-chart"><div class="flow-column"><div class="flow-bar given" style="height:${Math.max(totalGiven ? 100 : 8, 8)}%"></div><span>Given<br>${formatCurrency(totalGiven)}</span></div><div class="flow-column"><div class="flow-bar received" style="height:${Math.max(totalGiven ? (totalReceived / totalGiven) * 100 : 8, 8)}%"></div><span>Received<br>${formatCurrency(totalReceived)}</span></div><div class="flow-column"><div class="flow-bar remaining" style="height:${Math.max(totalGiven ? (totalRemaining / totalGiven) * 100 : 8, 8)}%"></div><span>Remaining<br>${formatCurrency(totalRemaining)}</span></div></div></section>`
}
