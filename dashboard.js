'use strict';

// --- login / logout ---

function handleLogin() {
  const name  = el('login-name').value.trim();
  const email = el('login-email').value.trim();
  const dept  = el('login-dept').value;
  const role  = appState.selectedRole;

  if (!name || !email) {
    showToast('⚠️', 'Missing Info', 'Please enter your name and email.');
    return;
  }
  if (role === 'staff' && !dept) {
    showToast('⚠️', 'Select Department', 'Please select your department.');
    return;
  }

  appState.currentUser = { name, email, role, dept };

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'staff' ? dept + ' Staff' : 'Citizen';
  showToast('👋', 'Welcome, ' + name.split(' ')[0] + '!', 'Signed in as ' + roleLabel);

  if (role === 'citizen') {
    el('citizen-welcome').textContent = 'Welcome, ' + name.split(' ')[0] + ' 👋';
    renderCitizenDashboard();
    showPage('page-citizen');
  } else if (role === 'staff') {
    el('staff-dept-title').textContent = '🏢 ' + dept;
    el('staff-name-sub').textContent = 'Department Dashboard — ' + name;
    renderStaffDashboard();
    showPage('page-staff');
  } else {
    el('admin-name-sub').textContent = 'System-wide overview — ' + name;
    renderAdminDashboard();
    showPage('page-admin');
  }
}

function handleLogout() {
  appState.currentUser = null;
  el('login-name').value = '';
  el('login-email').value = '';
  el('login-dept').value = '';
  showPage('page-login');
}

// --- citizen dashboard ---

function renderCitizenDashboard() {
  const user = appState.currentUser;
  const mine = appState.complaints.filter(c =>
    c.citizenEmail === user.email || c.citizenName === user.name
  );

  const active  = mine.filter(c => c.status !== 'Resolved');
  const updates = mine.filter(c => c.updates.length > 0);
  const history = mine.filter(c => c.status === 'Resolved');

  const tabs = document.querySelectorAll('#page-citizen .tab');
  tabs[0].textContent = `Active (${active.length})`;
  tabs[1].textContent = `Updates (${updates.length})`;
  tabs[2].textContent = `History (${history.length})`;
  // tabs[3] is "All Complaints", label stays static

  const filterBar = el('citizen-filter-bar');
  if (filterBar) filterBar.style.display = appState.citizenTab === 'all' ? 'flex' : 'none';

  if (appState.citizenTab === 'all') {
    applyCitizenFilters();
    return;
  }

  let shown = active;
  if (appState.citizenTab === 'updates') shown = updates;
  if (appState.citizenTab === 'history') shown = history;

  const list = el('citizen-list');
  list.innerHTML = '';

  if (shown.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = appState.citizenTab === 'active'
      ? 'No active complaints. Click above to file one.'
      : 'Nothing here yet.';
    list.appendChild(empty);
    return;
  }

  shown.forEach(c => list.appendChild(buildComplaintCard(c)));
}

function applyCitizenFilters() {
  const search = (el('citizen-search') && el('citizen-search').value.toLowerCase()) || '';
  const cat    = (el('citizen-filter-cat') && el('citizen-filter-cat').value) || 'All';
  const dept   = (el('citizen-filter-dept') && el('citizen-filter-dept').value) || 'All';
  const status = (el('citizen-filter-status') && el('citizen-filter-status').value) || 'All';
  const urg    = (el('citizen-filter-urg') && el('citizen-filter-urg').value) || 'All';

  appState.citizenFilters = { cat, dept, status, urg, search };

  const filtered = appState.complaints.filter(c => {
    const matchCat    = cat === 'All'    || c.category === cat;
    const matchDept   = dept === 'All'   || c.dept === dept;
    const matchStatus = status === 'All' || c.status === status;
    const matchUrg    = urg === 'All'    || c.urgency === urg;
    const matchSearch = !search
      || c.title.toLowerCase().includes(search)
      || c.description.toLowerCase().includes(search)
      || c.address.toLowerCase().includes(search)
      || (c.citizenName && c.citizenName.toLowerCase().includes(search));
    return matchCat && matchDept && matchStatus && matchUrg && matchSearch;
  }).sort((a, b) => {
    if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
    const o = { High: 0, Medium: 1, Low: 2 };
    return (o[a.urgency] - o[b.urgency]) || (b.timestamp - a.timestamp);
  });

  const countEl = el('citizen-filter-count');
  if (countEl) countEl.textContent = `${filtered.length} complaint${filtered.length !== 1 ? 's' : ''}`;

  const list = el('citizen-list');
  list.innerHTML = '';

  const notice = document.createElement('div');
  notice.style.cssText = 'background:#edf3fb;border:1px solid #c5d8f0;border-radius:4px;padding:9px 12px;margin-bottom:12px;font-size:13px;color:#1e4a8a;display:flex;align-items:center;gap:7px';
  notice.innerHTML = '<span>👁️</span><span>Viewing all community complaints — <strong>read-only</strong>. Only admins can update or resolve.</span>';
  list.appendChild(notice);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No complaints match your filters.';
    list.appendChild(empty);
    return;
  }

  filtered.forEach(c => list.appendChild(buildComplaintCard(c)));
}

// --- staff dashboard ---

function renderStaffDashboard() {
  const user  = appState.currentUser;
  const mine  = appState.complaints.filter(c => c.dept === user.dept);
  const other = appState.complaints.filter(c => c.dept !== user.dept);

  el('staff-stats').innerHTML = [
    ['Total', mine.length, 'var(--ink)'],
    ['High Priority', mine.filter(c => c.urgency === 'High').length, '#ef4444'],
    ['Pending', mine.filter(c => c.status !== 'Resolved').length, '#f59e0b'],
    ['Resolved', mine.filter(c => c.status === 'Resolved').length, '#10b981']
  ].map(([label, val, color]) =>
    `<div class="stat-card">
      <div class="stat-num" style="color:${color}">${val}</div>
      <div class="stat-label">${label}</div>
    </div>`
  ).join('');

  el('tab-mydept').textContent  = `⚠️ My Department (${mine.length})`;
  el('tab-otherdept').textContent = `👁️ Other Departments (${other.length})`;

  const shown = (appState.staffView === 'mine' ? mine : other)
    .slice()
    .sort((a, b) => {
      const o = { High: 0, Medium: 1, Low: 2 };
      return (o[a.urgency] - o[b.urgency]) || (b.timestamp - a.timestamp);
    });

  const list = el('staff-list');
  list.innerHTML = '';

  if (shown.length === 0) {
    list.innerHTML = '<div class="empty-state">No complaints in this view.</div>';
    return;
  }

  shown.forEach(c => list.appendChild(buildComplaintCard(c)));
}

// --- admin dashboard ---

function renderAdminDashboard() {
  const catEl = el('admin-cat-stats');
  catEl.innerHTML = '';

  for (const cat in DEPT_MAP) {
    const info  = DEPT_MAP[cat];
    const count = appState.complaints.filter(c => c.category === cat).length;
    const high  = appState.complaints.filter(c => c.category === cat && c.urgency === 'High').length;
    const isActive = appState.adminFilters.cat === cat;

    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.cursor = 'pointer';
    card.style.borderColor = isActive ? info.color : '';
    card.dataset.adminCat = cat;
    card.innerHTML = `
      <div style="font-size:22px;margin-bottom:3px">${info.emoji}</div>
      <div class="stat-num" style="font-size:22px;color:${info.color}">${count}</div>
      <div class="stat-label">${cat}</div>
      ${high > 0 ? `<div style="font-size:11px;color:#ef4444;margin-top:3px">${high} high priority</div>` : ''}
    `;
    catEl.appendChild(card);
  }

  applyAdminFilters();
}

function applyAdminFilters() {
  const search = (el('admin-search') && el('admin-search').value.toLowerCase()) || '';
  const cat    = (el('admin-filter-cat') && el('admin-filter-cat').value) || 'All';
  const urg    = (el('admin-filter-urg') && el('admin-filter-urg').value) || 'All';

  appState.adminFilters = { cat, urg, search };

  const filtered = appState.complaints.filter(c => {
    const matchCat    = cat === 'All' || c.category === cat;
    const matchUrg    = urg === 'All' || c.urgency === urg;
    const matchSearch = !search
      || c.title.toLowerCase().includes(search)
      || c.description.toLowerCase().includes(search)
      || c.address.toLowerCase().includes(search);
    return matchCat && matchUrg && matchSearch;
  }).sort((a, b) => {
    if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
    const o = { High: 0, Medium: 1, Low: 2 };
    return (o[a.urgency] - o[b.urgency]) || (b.timestamp - a.timestamp);
  });

  el('admin-count').textContent = `${filtered.length} complaint${filtered.length !== 1 ? 's' : ''}`;

  const list = el('admin-list');
  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">No complaints match the filters.</div>';
    return;
  }

  filtered.forEach(c => list.appendChild(buildComplaintCard(c)));
}

function refreshCurrentDashboard() {
  const role = appState.currentUser && appState.currentUser.role;
  if (role === 'citizen') renderCitizenDashboard();
  if (role === 'staff')   renderStaffDashboard();
  if (role === 'admin')   renderAdminDashboard();
}

// --- event delegation for dashboards ---

document.addEventListener('DOMContentLoaded', () => {

  // login form
  el('btn-login').addEventListener('click', handleLogin);
  el('login-name').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

  // role card selection
  document.getElementById('page-login').addEventListener('click', e => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    appState.selectedRole = card.dataset.role;
    el('dept-group').style.display = appState.selectedRole === 'staff' ? 'block' : 'none';
  });

  // logout buttons
  document.addEventListener('click', e => {
    if (e.target.closest('[data-action="logout"]')) handleLogout();
  });

  // citizen tabs
  document.getElementById('page-citizen').addEventListener('click', e => {
    const tab = e.target.closest('#page-citizen .tabs .tab');
    if (!tab) return;
    document.querySelectorAll('#page-citizen .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    appState.citizenTab = tab.dataset.tab;
    renderCitizenDashboard();
  });

  // citizen filter bar inputs
  const citizenFilterBar = el('citizen-filter-bar');
  if (citizenFilterBar) {
    citizenFilterBar.addEventListener('input', applyCitizenFilters);
    citizenFilterBar.addEventListener('change', applyCitizenFilters);
  }

  // "file new complaint" button
  el('btn-new-complaint').addEventListener('click', openComplaintForm);

  // staff tabs
  document.getElementById('page-staff').addEventListener('click', e => {
    const tab = e.target.closest('#page-staff .tabs .tab');
    if (!tab) return;
    document.querySelectorAll('#page-staff .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    appState.staffView = tab.dataset.view;
    renderStaffDashboard();
  });

  // admin category stat card click (filter toggle)
  el('admin-cat-stats').addEventListener('click', e => {
    const card = e.target.closest('[data-admin-cat]');
    if (!card) return;
    const cat = card.dataset.adminCat;
    appState.adminFilters.cat = appState.adminFilters.cat === cat ? 'All' : cat;
    el('admin-filter-cat').value = appState.adminFilters.cat;
    renderAdminDashboard();
  });

  // admin filter bar
  const adminFilterBar = document.querySelector('#page-admin .filter-bar');
  if (adminFilterBar) {
    adminFilterBar.addEventListener('input', applyAdminFilters);
    adminFilterBar.addEventListener('change', applyAdminFilters);
  }

  // complaint card clicks → open detail modal (delegated on body)
  document.addEventListener('click', e => {
    const card = e.target.closest('.complaint-card[data-id]');
    if (card) openDetailModal(card.dataset.id);
  });

  showPage('page-login');
});
