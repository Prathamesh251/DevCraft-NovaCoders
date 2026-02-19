'use strict';

// shorthand - used everywhere
function el(id) {
  return document.getElementById(id);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = el(pageId);
  if (page) page.classList.add('active');
}

function generateId() {
  return 'CP-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
  if (diff < 86400000) {
    const h = Math.floor(diff / 3600000);
    return h + ' hour' + (h > 1 ? 's' : '') + ' ago';
  }
  const d = Math.floor(diff / 86400000);
  return d + ' day' + (d > 1 ? 's' : '') + ' ago';
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const cat in CATEGORY_WORDS) {
    for (const word of CATEGORY_WORDS[cat]) {
      if (lower.includes(word)) return cat;
    }
  }
  return null;
}

function detectUrgency(text) {
  const lower = text.toLowerCase();
  for (const word of HIGH_URGENCY_WORDS) {
    if (lower.includes(word)) return 'High';
  }
  for (const word of MEDIUM_URGENCY_WORDS) {
    if (lower.includes(word)) return 'Medium';
  }
  return null;
}

// badge html

function urgencyBadge(urgency) {
  const classes = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  const icons = { High: '🔴', Medium: '🟡', Low: '🟢' };
  return `<span class="badge ${classes[urgency]}">${icons[urgency]} ${urgency}</span>`;
}

function statusBadge(status) {
  const classes = { 'Received': 'badge-received', 'In Progress': 'badge-inprogress', 'Resolved': 'badge-resolved' };
  return `<span class="badge ${classes[status] || 'badge-received'}">${status}</span>`;
}

function categoryBadge(cat) {
  const info = DEPT_MAP[cat] || { color: '#6b7280', emoji: '📋' };
  const style = `background:${info.color}22;color:${info.color};border:1px solid ${info.color}44`;
  return `<span class="badge" style="${style}">${info.emoji} ${cat}</span>`;
}

// toast

let toastTimer = null;

function showToast(icon, title, message) {
  el('toast-icon').textContent = icon;
  el('toast-title').textContent = title;
  el('toast-msg').textContent = message;
  el('toast').style.display = 'flex';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(closeToast, 4000);
}

function closeToast() {
  el('toast').style.display = 'none';
}

// complaint card - used by all three dashboards

function buildComplaintCard(complaint) {
  const div = document.createElement('div');
  div.className = 'complaint-card';
  div.dataset.id = complaint.id;

  div.style.borderLeft = complaint.isEmergency
    ? '3px solid #ef4444'
    : complaint.urgency === 'High'
    ? '3px solid rgba(239,68,68,0.4)'
    : '3px solid transparent';

  const emergBadge = complaint.isEmergency
    ? '<span class="badge badge-emergency">🚨 EMERGENCY</span>'
    : '';

  const latestUpdate = complaint.updates.length > 0
    ? `<div class="card-latest-update">💬 ${complaint.updates[complaint.updates.length - 1].text}</div>`
    : '';

  div.innerHTML = `
    <div class="badge-row">
      ${categoryBadge(complaint.category)}
      ${urgencyBadge(complaint.urgency)}
      ${statusBadge(complaint.status)}
      ${emergBadge}
    </div>
    <div class="card-title">${complaint.title}</div>
    <div class="card-desc">${complaint.description.slice(0, 110)}…</div>
    <div class="card-meta">
      <span><span class="card-id">${complaint.id}</span></span>
      <span>📍 ${complaint.address}</span>
      <span>🕐 ${timeAgo(complaint.timestamp)}</span>
      ${complaint.reports > 1 ? `<span style="color:#9a6b00">📋 ${complaint.reports} reports</span>` : ''}
    </div>
    ${latestUpdate}
  `;

  return div;
}
