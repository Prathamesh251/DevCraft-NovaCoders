'use strict';

// --- complaint form modal ---

function openComplaintForm() {
  appState.isEmergency = false;
  appState.isRecording = false;
  appState.selectedCat = null;
  appState.selectedUrg = null;
  appState.aiDetected  = false;

  el('f-title').value   = '';
  el('f-desc').value    = '';
  el('f-address').value = '';
  el('f-phone').value   = '';

  if (appState.currentUser) {
    el('f-cname').value = appState.currentUser.name  || '';
    el('f-email').value = appState.currentUser.email || '';
  }

  el('ai-badge').style.display      = 'none';
  el('gps-status').style.display    = 'none';
  el('photo-info').style.display    = 'none';
  el('record-status').style.display = 'none';

  el('emergency-toggle').classList.remove('active');
  el('emergency-switch').classList.remove('on');
  el('emergency-label').style.color = '';

  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('active'));

  el('modal-form').style.display = 'flex';
}

function closeModal(id) {
  el(id).style.display = 'none';
}

function toggleEmergency() {
  appState.isEmergency = !appState.isEmergency;
  el('emergency-toggle').classList.toggle('active', appState.isEmergency);
  el('emergency-switch').classList.toggle('on', appState.isEmergency);
  el('emergency-label').style.color = appState.isEmergency ? 'var(--red)' : '';
}

async function onDescriptionInput() {
  const text = el('f-desc').value;
  if (text.length < 10) return;

  const detectedCat = await detectAI(text);
  const detectedUrg = detectUrgency(text);
  let changed = false;

  if (detectedCat && !appState.selectedCat) {
    document.querySelectorAll('.cat-chip').forEach(chip => {
      if (chip.dataset.cat === detectedCat) {
        chip.classList.add('active');
        appState.selectedCat = detectedCat;
        changed = true;
      }
    });
  }

  if (detectedUrg && !appState.selectedUrg) {
    document.querySelectorAll('.urgency-btn').forEach(btn => {
      if (btn.dataset.urg === detectedUrg) {
        btn.classList.add('active');
        appState.selectedUrg = detectedUrg;
        changed = true;
      }
    });
    if (detectedUrg === 'High' && !appState.isEmergency) toggleEmergency();
  }

  if (changed) {
    appState.aiDetected = true;
    el('ai-badge').style.display = 'inline-flex';
  }
}

function submitComplaint() {
  const title   = el('f-title').value.trim();
  const desc    = el('f-desc').value.trim();
  const address = el('f-address').value.trim();

  if (!title)              { showToast('⚠️', 'Missing Title', 'Please enter a complaint title.'); return; }
  if (!desc)               { showToast('⚠️', 'Missing Description', 'Please describe the issue.'); return; }
  if (!appState.selectedCat) { showToast('⚠️', 'Select Category', 'Please select a complaint category.'); return; }
  if (!appState.selectedUrg) { showToast('⚠️', 'Select Urgency', 'Please select urgency level.'); return; }
  if (!address)            { showToast('⚠️', 'Missing Address', 'Please enter the location.'); return; }

  const complaint = {
    id:           generateId(),
    title,
    description:  desc,
    category:     appState.selectedCat,
    urgency:      appState.selectedUrg,
    status:       'Received',
    address,
    citizenName:  el('f-cname').value.trim() || (appState.currentUser && appState.currentUser.name) || 'Anonymous',
    citizenEmail: el('f-email').value.trim() || (appState.currentUser && appState.currentUser.email) || '',
    phone:        el('f-phone').value.trim(),
    timestamp:    Date.now(),
    updates:      [],
    notes:        [],
    reports:      1,
    isEmergency:  appState.isEmergency,
    dept:         (DEPT_MAP[appState.selectedCat] || { name: 'General' }).name
  };

  appState.complaints.unshift(complaint);
  closeModal('modal-form');
  showToast('✅', 'Complaint Submitted!', 'ID: ' + complaint.id + ' — Track it in your dashboard.');
  refreshCurrentDashboard();
}

// --- detail modal ---

function openDetailModal(id) {
  const complaint = appState.complaints.find(c => c.id === id);
  if (!complaint) return;

  appState.openComplaintId  = id;
  appState.currentDetailTab = 'details';

  const emergBadge = complaint.isEmergency ? '<span class="badge badge-emergency">🚨 EMERGENCY</span>' : '';
  el('detail-badges').innerHTML =
    categoryBadge(complaint.category) +
    urgencyBadge(complaint.urgency) +
    statusBadge(complaint.status) +
    emergBadge;

  el('detail-title').textContent = complaint.title;
  el('detail-meta').innerHTML =
    `ID: <span style="font-family:'JetBrains Mono';color:var(--blue)">${complaint.id}</span>` +
    ` &nbsp;•&nbsp; ${timeAgo(complaint.timestamp)} &nbsp;•&nbsp; ${complaint.dept}`;

  el('detail-desc').textContent = complaint.description;
  el('detail-address').innerHTML = '📍 ' + complaint.address;
  el('detail-reporter').innerHTML =
    `<strong>${complaint.citizenName || 'Anonymous'}</strong>` +
    (complaint.phone ? `<br><span style="color:var(--grey);font-size:12px">${complaint.phone}</span>` : '') +
    (complaint.citizenEmail ? `<br><span style="color:var(--grey);font-size:12px">${complaint.citizenEmail}</span>` : '');

  el('detail-reports').textContent = `📋 ${complaint.reports} citizen(s) reported this issue`;

  const role    = appState.currentUser && appState.currentUser.role;
  const canEdit = role === 'staff' || role === 'admin';

  el('detail-status-section').style.display = canEdit ? 'block' : 'none';
  if (canEdit) {
    document.querySelectorAll('.status-step').forEach(step => {
      step.classList.toggle('active', step.dataset.status === complaint.status);
    });
  }

  renderUpdatesTimeline(complaint, canEdit);
  renderNotesList(complaint, canEdit);

  const count = complaint.updates.length;
  el('updates-tab-btn').innerHTML = 'Updates' + (count > 0
    ? ` <span style="margin-left:4px;background:var(--blue);color:#fff;border-radius:3px;padding:1px 6px;font-size:10px">${count}</span>`
    : '');

  // reset to details tab
  const firstTab = document.querySelector('#modal-detail .tabs .tab');
  switchDetailTab(firstTab);

  el('modal-detail').style.display = 'flex';
}

function renderUpdatesTimeline(complaint, canEdit) {
  const timeline = el('updates-timeline');
  timeline.innerHTML = '';

  const first = document.createElement('div');
  first.className = 'timeline-item';
  first.innerHTML = `
    <div class="timeline-dot">📋</div>
    <div>
      <div class="timeline-text">Complaint Received</div>
      <div class="timeline-author">${timeAgo(complaint.timestamp)}</div>
    </div>
  `;
  timeline.appendChild(first);

  complaint.updates.forEach(u => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-dot accent">💬</div>
      <div>
        <div class="timeline-text">${u.text}</div>
        <div class="timeline-author">${u.author} • ${timeAgo(u.ts)}</div>
      </div>
    `;
    timeline.appendChild(item);
  });

  el('update-form').style.display = canEdit ? 'block' : 'none';
  if (canEdit) el('update-text').value = '';
}

function renderNotesList(complaint, canEdit) {
  const notesList = el('notes-list');
  notesList.innerHTML = '';

  if (!complaint.notes || complaint.notes.length === 0) {
    notesList.innerHTML = '<div style="color:var(--grey);font-size:14px;margin-bottom:12px">No internal notes yet.</div>';
  } else {
    complaint.notes.forEach(note => {
      const div = document.createElement('div');
      div.className = 'note-item';
      div.textContent = '📝 ' + note;
      notesList.appendChild(div);
    });
  }

  el('note-form').style.display = canEdit ? 'block' : 'none';
  if (canEdit) el('note-text').value = '';
}

function switchDetailTab(btn) {
  document.querySelectorAll('#modal-detail .tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const tab = btn.dataset.tab;
  appState.currentDetailTab = tab;

  el('detail-tab-details').style.display = tab === 'details' ? 'block' : 'none';
  el('detail-tab-updates').style.display = tab === 'updates' ? 'block' : 'none';
  el('detail-tab-notes').style.display   = tab === 'notes'   ? 'block' : 'none';
}

function updateStatus(newStatus) {
  const id = appState.openComplaintId;
  if (!id) return;

  const complaint = appState.complaints.find(c => c.id === id);
  if (complaint) complaint.status = newStatus;

  document.querySelectorAll('.status-step').forEach(step => {
    step.classList.toggle('active', step.dataset.status === newStatus);
  });

  const emergBadge = complaint.isEmergency ? '<span class="badge badge-emergency">🚨 EMERGENCY</span>' : '';
  el('detail-badges').innerHTML =
    categoryBadge(complaint.category) +
    urgencyBadge(complaint.urgency) +
    statusBadge(newStatus) +
    emergBadge;

  showToast('🔄', 'Status Updated', 'Changed to: ' + newStatus);
  refreshCurrentDashboard();
}

function postUpdate() {
  const text = el('update-text').value.trim();
  if (!text) { showToast('⚠️', 'Empty Update', 'Please type something first.'); return; }

  const id     = appState.openComplaintId;
  const author = (appState.currentUser && appState.currentUser.dept) || 'Staff';
  const complaint = appState.complaints.find(c => c.id === id);
  if (complaint) complaint.updates.push({ text, author, ts: Date.now() });

  renderUpdatesTimeline(complaint, true);

  const count = complaint.updates.length;
  el('updates-tab-btn').innerHTML = `Updates <span style="margin-left:4px;background:var(--blue);color:#fff;border-radius:3px;padding:1px 6px;font-size:10px">${count}</span>`;

  showToast('💬', 'Update Posted', 'Citizens will see this update.');
  refreshCurrentDashboard();
}

function postNote() {
  const text = el('note-text').value.trim();
  if (!text) { showToast('⚠️', 'Empty Note', 'Please write your note.'); return; }

  const id = appState.openComplaintId;
  const complaint = appState.complaints.find(c => c.id === id);
  if (complaint) {
    if (!complaint.notes) complaint.notes = [];
    complaint.notes.push(text);
  }

  renderNotesList(complaint, true);
}

// --- event delegation for modals ---

document.addEventListener('DOMContentLoaded', () => {

  // overlay click → close
  document.addEventListener('click', e => {
    if (e.target.id === 'modal-form')   closeModal('modal-form');
    if (e.target.id === 'modal-detail') closeModal('modal-detail');
  });

  // close buttons
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-close-modal]');
    if (btn) closeModal(btn.dataset.closeModal);
  });

  // toast close
  el('toast-close').addEventListener('click', closeToast);

  // emergency toggle
  el('emergency-toggle').addEventListener('click', toggleEmergency);

  // description textarea → AI detect
  el('f-desc').addEventListener('input', onDescriptionInput);

  // category chips
  document.getElementById('cat-chips').addEventListener('click', e => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    appState.selectedCat = chip.dataset.cat;
  });

  // urgency buttons
  document.querySelector('.urgency-row').addEventListener('click', e => {
    const btn = e.target.closest('.urgency-btn');
    if (!btn) return;
    document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    appState.selectedUrg = btn.dataset.urg;
  });

  // voice record
  el('record-btn').addEventListener('click', () => {
    appState.isRecording = !appState.isRecording;
    const btn = el('record-btn');
    btn.classList.toggle('recording', appState.isRecording);
    btn.textContent = appState.isRecording ? '⏹' : '🎙';
    el('record-status').style.display = appState.isRecording ? 'block' : 'none';
  });

  // GPS button
  el('btn-gps').addEventListener('click', () => {
    el('f-address').value = 'Baramati, Maharashtra (GPS Located)';
    el('gps-status').style.display = 'block';
  });

  // photo upload
  el('btn-photo-upload').addEventListener('click', () => el('photo-input').click());
  el('photo-input').addEventListener('change', e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    el('photo-info').textContent = `✓ ${files.length} photo(s) attached: ${files.map(f => f.name).join(', ')}`;
    el('photo-info').style.display = 'block';
  });

  // submit complaint
  el('btn-submit-complaint').addEventListener('click', submitComplaint);

  // cancel form
  el('btn-cancel-form').addEventListener('click', () => closeModal('modal-form'));

  // detail modal tabs
  document.querySelector('#modal-detail .tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) switchDetailTab(tab);
  });

  // status steps
  document.querySelector('.status-steps').addEventListener('click', e => {
    const step = e.target.closest('.status-step');
    if (step) updateStatus(step.dataset.status);
  });

  // post update
  el('btn-post-update').addEventListener('click', postUpdate);

  // add note
  el('btn-post-note').addEventListener('click', postNote);
});
