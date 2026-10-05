/* Campus Digital Issue & Maintenance Tracker - frontend (vanilla JS, no build step) */
'use strict';

const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
const LOCATIONS = ['Lab 302', 'Lab 203', 'Room 204', 'Room 101', 'Library', 'Seminar Hall', 'Canteen', 'Hostel Block A', 'Admin Office', 'Ground Floor Washroom'];

const state = {
  token: localStorage.getItem('token'),
  user: null,
  meta: null,
  tab: null,
  refresh: () => {},
};

/* ---------- helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);

// Safe DOM builder: text is always inserted as text nodes, never as HTML.
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' err' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ''), 3200);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && state.token) logout(true);
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

const fmt = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const cls = (s) => s.toLowerCase().replace(/\s+/g, '-');
const prioPill = (p) => h('span', { class: `pill p-${cls(p)}` }, p + ' priority');
const statusPill = (s) => h('span', { class: `pill s-${cls(s)}` }, s);
const roleLabel = (u) => (u.role === 'staff' ? `${u.department_name} Dept. Staff` : u.role[0].toUpperCase() + u.role.slice(1));

function logout(silent) {
  if (!silent && state.token) api('/logout', { method: 'POST' }).catch(() => {});
  localStorage.removeItem('token');
  Object.assign(state, { token: null, user: null, tab: null });
  render();
}

/* ---------- auth ---------- */
function AuthView() {
  let mode = 'student';
  const card = h('div', { class: 'auth-card' });

  function draw() {
    const err = h('div', { class: 'error' });
    const email = h('input', { type: 'email', id: 'email', placeholder: 'you@campus.edu', required: true });
    const password = h('input', { type: 'password', id: 'password', placeholder: 'Password', required: true });
    const name = h('input', { id: 'name', placeholder: 'Full name' });
    const role = h('select', { id: 'role' }, h('option', { value: 'student' }, 'Student'), h('option', { value: 'faculty' }, 'Faculty'));

    if (mode === 'admin') {
      email.value = 'admin@campus.edu';
      password.value = 'admin123';
    }

    async function submit() {
      err.textContent = '';
      try {
        if (mode === 'register') {
          if (!name.value.trim()) { err.textContent = 'Please enter your full name'; return; }
          await api('/register', { method: 'POST', body: { name: name.value.trim(), email: email.value.trim(), password: password.value, role: role.value } });
          toast('Account created - logging you in');
        }
        const r = await api('/login', { method: 'POST', body: { email: email.value.trim(), password: password.value } });
        state.token = r.token;
        localStorage.setItem('token', r.token);
        state.user = r.user;
        state.tab = null;
        render();
      } catch (e) { err.textContent = e.message; }
    }

    function quickFill(userEmail, userPassword) {
      email.value = userEmail;
      password.value = userPassword;
      submit();
    }

    const demoSection = h('div', { class: 'demo' },
      h('div', {}, h('strong', {}, 'Quick Demo Sign-In:')),
      h('div', { class: 'demo-chips' },
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('aarav@student.edu', 'demo123') }, '🎓 Student (Aarav)'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('priya@faculty.edu', 'demo123') }, '👩‍🏫 Faculty (Priya)'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('admin@campus.edu', 'admin123') }, '🛡️ System Admin')
      )
    );

    const staffSection = h('div', { class: 'demo' },
      h('div', {}, h('strong', {}, 'Select Department Staff:')),
      h('div', { class: 'demo-chips' },
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('it@campus.edu', 'staff123') }, '💻 IT Dept'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('electrical@campus.edu', 'staff123') }, '⚡ Electrical Dept'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('maintenance@campus.edu', 'staff123') }, '🔧 Maintenance Dept'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('plumbing@campus.edu', 'staff123') }, '🚰 Plumbing Dept'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('housekeeping@campus.edu', 'staff123') }, '🧹 Housekeeping Dept'),
        h('button', { type: 'button', class: 'demo-chip', onclick: () => quickFill('administration@campus.edu', 'staff123') }, '🏛️ Administration')
      )
    );

    const titleText = mode === 'admin'
      ? 'Administrator Portal'
      : (mode === 'staff' ? 'Department Staff Portal' : (mode === 'register' ? 'Create Campus Account' : 'Campus Issue Tracker'));

    const subText = mode === 'admin'
      ? 'System administration, campus-wide routing, user management and maintenance analytics.'
      : (mode === 'staff' ? 'Manage assigned department tickets, update progress and log resolutions.' : 'Report campus infrastructure problems and track them until resolved.');

    const formChildren = [
      h('div', { class: 'logo' }, mode === 'admin' ? '🛡️' : (mode === 'staff' ? '👨‍🔧' : '🏫')),
      mode === 'admin' ? h('div', { class: 'admin-badge' }, 'System Administrator') : null,
      h('h1', {}, titleText),
      h('p', { class: 'sub' }, subText),
      h('div', { class: 'tabs-inline' },
        h('button', { type: 'button', class: mode === 'student' ? 'active' : '', onclick: () => { mode = 'student'; draw(); } }, 'Student / Faculty'),
        h('button', { type: 'button', class: mode === 'admin' ? 'active' : '', onclick: () => { mode = 'admin'; draw(); } }, '🛡️ Admin'),
        h('button', { type: 'button', class: mode === 'staff' ? 'active' : '', onclick: () => { mode = 'staff'; draw(); } }, 'Staff'),
        h('button', { type: 'button', class: mode === 'register' ? 'active' : '', onclick: () => { mode = 'register'; draw(); } }, 'Register')),
      mode === 'register' ? [h('label', { for: 'name' }, 'Full name'), name] : null,
      h('label', { for: 'email' }, 'Email address'), email,
      h('label', { for: 'password' }, 'Password'), password,
      mode === 'register' ? [h('label', { for: 'role' }, 'Role'), role] : null,
      err,
      h('button', { type: 'button', class: 'btn block', onclick: submit },
        mode === 'register' ? 'Create Account' : (mode === 'admin' ? 'Sign In as Administrator' : 'Sign In')),
      mode === 'admin' ? h('button', { type: 'button', class: 'btn secondary block', style: 'margin-top:.5rem', onclick: () => quickFill('admin@campus.edu', 'admin123') }, '⚡ One-Click Admin Demo Login') : null,
      mode === 'student' ? demoSection : null,
      mode === 'staff' ? staffSection : null
    ].flat().filter(Boolean);

    card.replaceChildren(...formChildren);

    [email, password, name].forEach((inp) => {
      inp.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
    });
  }
  draw();
  return h('div', { class: 'auth-wrap' }, card);
}

function exportIssuesToCsv(issues, filename = 'campus-issues-report.csv') {
  if (!issues || !issues.length) { toast('No issues to export', true); return; }
  const headers = ['Issue ID', 'Category', 'Department', 'Location', 'Priority', 'Status', 'Reporter', 'Created At', 'Resolved At', 'Description'];
  const rows = issues.map((i) => [
    i.issue_id,
    `"${(i.category || '').replace(/"/g, '""')}"`,
    `"${(i.department_name || '').replace(/"/g, '""')}"`,
    `"${(i.location || '').replace(/"/g, '""')}"`,
    i.priority,
    i.status,
    `"${(i.reporter_name || '').replace(/"/g, '""')}"`,
    i.created_at,
    i.resolved_at || '',
    `"${(i.description || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast('📥 CSV report downloaded!');
}

/* ---------- shell ---------- */
function tabsFor(role) {
  if (role === 'admin') return [['dash', 'Dashboard'], ['issues', 'All Issues'], ['users', 'User Management']];
  if (role === 'staff') return [['dash', 'Department Dashboard']];
  return [['report', 'Report Issue'], ['mine', 'My Issues']];
}

function AnnouncementBar() {
  const bar = h('div', { class: 'announcement-bar' });
  async function refresh() {
    try {
      const data = await api('/announcement');
      if (!data || !data.message) { bar.style.display = 'none'; return; }
      bar.style.display = 'flex';
      const msg = h('span', { class: 'msg' }, data.message);
      const editBtn = state.user && state.user.role === 'admin'
        ? h('button', { type: 'button', class: 'edit-btn', onclick: editNotice }, '✏️ Edit Notice')
        : null;
      bar.replaceChildren(msg, editBtn);
    } catch { bar.style.display = 'none'; }
  }
  async function editNotice() {
    const cur = bar.querySelector('.msg')?.textContent || '';
    const updated = prompt('Edit Campus Maintenance Announcement:', cur);
    if (updated !== null && updated.trim()) {
      try {
        await api('/announcement', { method: 'POST', body: { message: updated.trim(), active: true } });
        toast('Announcement updated');
        refresh();
      } catch (e) { toast(e.message, true); }
    }
  }
  refresh();
  return bar;
}

function Shell() {
  const tabs = tabsFor(state.user.role);
  if (!state.tab || !tabs.find((t) => t[0] === state.tab)) state.tab = tabs[0][0];
  const main = h('main');
  const views = { report: ReportView, mine: MineView, dash: DashView, issues: AllIssuesView, users: UsersView };

  const nav = h('div', { class: 'nav' }, tabs.map(([key, label]) =>
    h('button', { class: key === state.tab ? 'active' : '', onclick: () => { state.tab = key; render(); } }, label)));

  main.append(views[state.tab]());
  return h('div', {},
    AnnouncementBar(),
    h('div', { class: 'topbar' },
      h('div', { class: 'topbar-in' },
        h('div', { class: 'brand' }, '\u{1F3EB} Campus Issue Tracker'),
        h('div', { class: 'who' }, h('strong', {}, state.user.name), h('br'), h('small', {}, roleLabel(state.user))),
        h('button', { class: 'btn ghost', onclick: () => logout() }, 'Logout')),
      nav),
    main);
}

/* ---------- reusable pieces ---------- */
function IssueCard(issue, showReporter) {
  return h('div', { class: `issue p-${cls(issue.priority)}`, onclick: () => openIssue(issue.issue_id), tabindex: 0 },
    h('div', { class: 'issue-head' },
      h('div', { class: 'issue-title' }, h('span', {}, '#' + issue.issue_id), issue.category),
      h('div', { class: 'pills' }, prioPill(issue.priority), statusPill(issue.status))),
    h('div', { class: 'issue-meta' },
      h('span', {}, '\u{1F4CD} ' + issue.location),
      h('span', {}, '\u{1F3E2} ' + issue.department_name),
      showReporter && h('span', {}, '\u{1F464} ' + issue.reporter_name),
      h('span', {}, '\u{1F552} ' + fmt(issue.created_at))),
    h('p', { class: 'issue-desc' }, issue.description.length > 140 ? issue.description.slice(0, 140) + '\u2026' : issue.description));
}

function IssueList(issues, showReporter, emptyText) {
  if (!issues.length) return h('div', { class: 'card empty' }, emptyText || 'No issues to show.');
  return h('div', {}, issues.map((i) => IssueCard(i, showReporter)));
}

function Stepper(status) {
  const idx = STEPS.indexOf(status);
  return h('div', { class: 'stepper' }, STEPS.map((s, i) =>
    h('div', { class: `step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''} ${i === STEPS.length - 1 ? 'final' : ''} ${status === 'Resolved' && i === idx ? 'done' : ''}` },
      h('div', { class: 'dot' }, i <= idx ? '\u2713' : i + 1), s)));
}

function Stat(n, label, kind = '') { return h('div', { class: `stat ${kind}` }, h('div', { class: 'n' }, n), h('div', { class: 'l' }, label)); }

function Loading() { return h('div', { class: 'empty' }, 'Loading\u2026'); }

/* ---------- student / faculty views ---------- */
function downscale(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ReportView() {
  let imageData = null;
  const category = h('select', { id: 'category' }, h('option', { value: '' }, 'Select a category\u2026'),
    state.meta.categories.map((c) => h('option', { value: c.name }, c.name)));
  const routeHint = h('div', { class: 'hint' });
  category.addEventListener('change', () => {
    const c = state.meta.categories.find((x) => x.name === category.value);
    routeHint.textContent = c ? `\u27A1 This will be routed to the ${c.department} department automatically.` : '';
  });

  const location = h('input', { id: 'location', list: 'locs', placeholder: 'e.g. Lab 302' });
  const qrBadge = h('span');
  const qrBtn = h('button', { type: 'button', class: 'btn secondary btn-sm', style: 'margin-left:.6rem' }, '📷 Scan Classroom QR');

  qrBtn.onclick = () => {
    const qrModal = h('div', { class: 'overlay' });
    const rooms = [
      { name: 'Lab 302', desc: 'Computer Science Lab (3rd Floor)', cat: 'Projector' },
      { name: 'Lab 203', desc: 'Hardware & Network Lab (2nd Floor)', cat: 'Computer / Lab Equipment' },
      { name: 'Room 204', desc: 'Mechanical Block Lecture Hall', cat: 'AC / Fan' },
      { name: 'Room 101', desc: 'Physics / Electronics Wing', cat: 'Electrical (Light / Socket)' },
      { name: 'Library', desc: 'Central Library (2nd Floor)', cat: 'Wi-Fi / Network' },
      { name: 'Seminar Hall', desc: 'Auditorium & Presentation Hall', cat: 'Door / Window' },
      { name: 'Hostel Block A', desc: 'Student Residence Corridor', cat: 'Water Leakage' },
      { name: 'Ground Floor Washroom', desc: 'Near Admin Reception', cat: 'Washroom' },
    ];
    qrModal.replaceChildren(
      h('div', { class: 'modal' },
        h('div', { class: 'modal-head' },
          h('h3', {}, '📷 Classroom QR Code Simulator'),
          h('button', { class: 'close', onclick: () => qrModal.remove() }, '✕')),
        h('p', { class: 'sub' }, 'Simulates scanning the QR code mounted at the door of any campus room:'),
        h('div', { class: 'qr-grid' }, rooms.map((r) =>
          h('div', { class: 'qr-card', onclick: () => {
            location.value = r.name;
            qrBadge.replaceChildren(h('span', { class: 'qr-badge' }, '✓ QR Verified: ' + r.name));
            if (!category.value && r.cat) {
              category.value = r.cat;
              category.dispatchEvent(new Event('change'));
            }
            toast(`📷 QR code scanned: ${r.name}`);
            qrModal.remove();
          } },
          h('strong', {}, r.name),
          h('small', {}, r.desc))
        ))
      )
    );
    document.body.append(qrModal);
  };

  const description = h('textarea', { id: 'description', placeholder: 'Describe the problem so the department can fix it quickly\u2026' });
  const priority = h('select', { id: 'priority' }, state.meta.priorities.map((p) => h('option', { value: p, selected: p === 'Medium' }, p)));
  const preview = h('div');
  const err = h('div', { class: 'error' });
  const aiAssistBox = h('div');

  let debounceTimer = null;
  description.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const text = description.value.trim();
      if (text.length < 5) { aiAssistBox.replaceChildren(); return; }
      try {
        const res = await api('/classify', { method: 'POST', body: { text } });
        if (res.category || res.hazardDetected) {
          const badgeText = res.category ? `Category: "${res.category}" (${res.department} Dept)` : 'Hazard Check';
          const hazardText = res.hazardDetected ? ' · ⚠️ Safety hazard detected (High Priority)' : '';
          aiAssistBox.replaceChildren(
            h('div', { class: 'ai-box' },
              h('div', { class: 'ai-text' }, '✨ AI Smart Assist: ', h('strong', {}, badgeText + hazardText)),
              h('button', { type: 'button', class: 'ai-btn', onclick: () => {
                if (res.category) {
                  category.value = res.category;
                  category.dispatchEvent(new Event('change'));
                }
                if (res.priority) priority.value = res.priority;
                toast('⚡ AI suggestion applied!');
                aiAssistBox.replaceChildren();
              } }, '⚡ Apply Suggestion'))
          );
        } else { aiAssistBox.replaceChildren(); }
      } catch {}
    }, 350);
  });

  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', id: 'image' });
  file.addEventListener('change', async () => {
    preview.replaceChildren();
    imageData = null;
    if (!file.files[0]) return;
    try {
      imageData = await downscale(file.files[0]);
      preview.append(h('img', { class: 'img-preview', src: imageData, alt: 'Preview' }));
    } catch (e) { err.textContent = e.message; }
  });

  const submit = h('button', { class: 'btn block' }, 'Submit issue');
  submit.addEventListener('click', async () => {
    err.textContent = '';
    submit.disabled = true;
    try {
      const issue = await api('/issues', { method: 'POST', body: {
        category: category.value, location: location.value, description: description.value, priority: priority.value, image: imageData } });
      toast(`Issue #${issue.issue_id} submitted and routed to ${issue.department_name}`);
      state.tab = 'mine';
      render();
    } catch (e) { err.textContent = e.message; submit.disabled = false; }
  });

  return h('div', {},
    h('div', { class: 'page-title' }, h('div', {}, h('h2', {}, 'Report a campus issue'), h('p', {}, 'It is sent to the right department automatically and you can track progress.'))),
    h('div', { class: 'card' },
      h('label', { for: 'category' }, 'Category'), category, routeHint,
      h('div', { class: 'row' },
        h('div', {}, h('label', { for: 'location' }, 'Location ', qrBtn, qrBadge), location),
        h('div', {}, h('label', { for: 'priority' }, 'Priority'), priority)),
      h('datalist', { id: 'locs' }, LOCATIONS.map((l) => h('option', { value: l }))),
      h('label', { for: 'description' }, 'Description'), description, aiAssistBox,
      h('label', { for: 'image' }, 'Photo (optional)'), file, preview,
      err, submit));
}

function MineView() {
  const box = h('div', {}, Loading());
  state.refresh = async () => {
    try {
      const issues = await api('/issues');
      box.replaceChildren(IssueList(issues, false, 'You have not reported any issues yet.'));
    } catch (e) { box.replaceChildren(h('div', { class: 'error' }, e.message)); }
  };
  state.refresh();
  return h('div', {}, h('div', { class: 'page-title' }, h('div', {}, h('h2', {}, 'My issues'), h('p', {}, 'Click an issue to see its full history and resolution.'))), box);
}

/* ---------- staff / admin views ---------- */
function Bars(rows) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return h('div', { class: 'bars' },
    rows.map((r) => {
      const done = h('div', { class: 'bar-fill done' });
      const open = h('div', { class: 'bar-fill' });
      done.style.width = (r.resolved / max) * 100 + '%';
      open.style.width = (r.pending / max) * 100 + '%';
      return h('div', { class: 'bar-row' }, h('span', {}, r.name), h('div', { class: 'bar-track' }, done, open), h('strong', {}, r.total));
    }),
    h('div', { class: 'legend' }, h('span', {}, h('i'), 'Pending'), h('span', {}, h('i', { class: 'done' }), 'Resolved')));
}

function DashView() {
  const isAdmin = state.user.role === 'admin';
  const wrap = h('div', {}, Loading());
  let statusFilter = '';
  let searchQuery = '';

  state.refresh = async () => {
    try {
      const [stats, rawIssues] = await Promise.all([
        api('/stats'),
        api('/issues' + (statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''))
      ]);
      const avg = stats.avg_resolution_hours === null ? '\u2013' : stats.avg_resolution_hours + ' h';
      const cards = isAdmin
        ? [Stat(stats.total, 'Total issues'), Stat(stats.pending, 'Pending issues', 'warn'), Stat(stats.resolved, 'Resolved issues', 'ok'), Stat(avg, 'Avg. resolution time', 'info')]
        : [Stat(stats.submitted, 'New issues', 'info'), Stat(stats.assigned, 'Assigned'), Stat(stats.in_progress, 'In progress', 'warn'), Stat(stats.resolved, 'Resolved', 'ok')];

      const filter = h('select', { onchange: (e) => { statusFilter = e.target.value; state.refresh(); } },
        h('option', { value: '' }, 'All statuses'), STEPS.map((s) => h('option', { value: s, selected: s === statusFilter }, s)));

      const searchInput = h('input', { type: 'search', placeholder: '🔍 Search by issue #, room, or problem...', value: searchQuery });
      searchInput.oninput = (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFiltered();
      };

      const exportBtn = h('button', { type: 'button', class: 'btn btn-export btn-sm', onclick: () => exportIssuesToCsv(rawIssues, `campus-issues-${isAdmin ? 'admin' : state.user.department_name}.csv`) }, '📥 Export CSV');

      const issuesContainer = h('div');
      function renderFiltered() {
        let filtered = rawIssues;
        if (searchQuery) {
          filtered = filtered.filter((i) =>
            String(i.issue_id).includes(searchQuery) ||
            (i.category && i.category.toLowerCase().includes(searchQuery)) ||
            (i.location && i.location.toLowerCase().includes(searchQuery)) ||
            (i.description && i.description.toLowerCase().includes(searchQuery)) ||
            (i.reporter_name && i.reporter_name.toLowerCase().includes(searchQuery))
          );
        }
        if (isAdmin && !statusFilter && !searchQuery) {
          filtered = filtered.filter((i) => i.status !== 'Resolved').slice(0, 10);
        }
        issuesContainer.replaceChildren(IssueList(filtered, true, searchQuery ? 'No issues match your search.' : 'Nothing here - great job!'));
      }
      renderFiltered();

      const prio = Object.fromEntries(stats.by_priority.map((p) => [p.priority, p.count]));
      wrap.replaceChildren(...[
        h('div', { class: 'page-title' },
          h('div', {},
            h('h2', {}, isAdmin ? 'Campus Maintenance Dashboard' : `${state.user.department_name} Department Dashboard`),
            h('p', {}, isAdmin ? 'Campus-wide overview of all reported issues and resolution status.' : 'Issues assigned to your department queue.')),
          exportBtn),
        h('div', { class: 'stats' }, cards),
        isAdmin && h('div', { class: 'grid2' },
          h('div', { class: 'card' }, h('h3', {}, 'Issues by department'), Bars(stats.by_department)),
          h('div', { class: 'card' },
            h('h3', {}, 'By priority'),
            h('div', { class: 'pills' }, ['High', 'Medium', 'Low'].map((p) => h('span', { class: `pill p-${cls(p)}` }, `${p}: ${prio[p] || 0}`))),
            h('h3', { class: 'spaced' }, 'Top categories'),
            stats.by_category.length
              ? h('table', {}, h('tbody', {}, stats.by_category.map((c) => h('tr', {}, h('td', {}, c.category), h('td', {}, h('strong', {}, c.count))))))
              : h('p', { class: 'empty' }, 'No data yet'))),
        h('div', { class: 'toolbar' },
          h('h3', { style: 'margin:0' }, isAdmin ? 'Issues needing attention' : 'Issue queue'),
          h('div', { class: 'filters', style: 'margin:0; align-items:center' },
            h('div', { class: 'search-bar' }, h('span', { class: 'icon' }, '🔍'), searchInput),
            filter)),
        issuesContainer,
      ].filter(Boolean));
    } catch (e) { wrap.replaceChildren(h('div', { class: 'error' }, e.message)); }
  };
  state.refresh();
  return wrap;
}

function AllIssuesView() {
  const wrap = h('div', {}, Loading());
  const f = { status: '', priority: '', department_id: '' };
  let searchQuery = '';

  state.refresh = async () => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    try {
      const rawIssues = await api('/issues' + (qs ? '?' + qs : ''));
      const issuesContainer = h('div');

      const searchInput = h('input', { type: 'search', placeholder: '🔍 Search issues by #, room, keyword...', value: searchQuery });
      searchInput.oninput = (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFiltered();
      };

      function renderFiltered() {
        let filtered = rawIssues;
        if (searchQuery) {
          filtered = filtered.filter((i) =>
            String(i.issue_id).includes(searchQuery) ||
            (i.category && i.category.toLowerCase().includes(searchQuery)) ||
            (i.location && i.location.toLowerCase().includes(searchQuery)) ||
            (i.description && i.description.toLowerCase().includes(searchQuery)) ||
            (i.reporter_name && i.reporter_name.toLowerCase().includes(searchQuery))
          );
        }
        issuesContainer.replaceChildren(IssueList(filtered, true, 'No issues match these filters.'));
      }
      renderFiltered();

      const sel = (key, label, options) => h('select', { onchange: (e) => { f[key] = e.target.value; state.refresh(); } },
        h('option', { value: '' }, label), options.map(([v, t]) => h('option', { value: v, selected: f[key] == v }, t)));

      const exportBtn = h('button', { type: 'button', class: 'btn btn-export btn-sm', onclick: () => exportIssuesToCsv(rawIssues, 'all-campus-issues.csv') }, '📥 Export CSV');

      wrap.replaceChildren(
        h('div', { class: 'page-title' },
          h('div', {}, h('h2', {}, 'All issues'), h('p', {}, 'Open an issue to reassign it, change priority or update status.')),
          exportBtn),
        h('div', { class: 'toolbar' },
          h('div', { class: 'search-bar' }, h('span', { class: 'icon' }, '🔍'), searchInput),
          h('div', { class: 'filters', style: 'margin:0' },
            sel('status', 'All statuses', STEPS.map((s) => [s, s])),
            sel('priority', 'All priorities', state.meta.priorities.map((p) => [p, p])),
            sel('department_id', 'All departments', state.meta.departments.map((d) => [d.department_id, d.department_name])))),
        issuesContainer);
    } catch (e) { wrap.replaceChildren(h('div', { class: 'error' }, e.message)); }
  };
  state.refresh();
  return wrap;
}

function UsersView() {
  const box = h('div', { class: 'card' }, Loading());

  function openCreateUserModal() {
    const modalWrap = h('div', { class: 'overlay' });
    const uName = h('input', { id: 'u_name', placeholder: 'e.g. Rahul Sharma', required: true });
    const uEmail = h('input', { type: 'email', id: 'u_email', placeholder: 'e.g. rahul@campus.edu', required: true });
    const uPass = h('input', { type: 'password', id: 'u_pass', placeholder: 'Temporary password', required: true });
    const uRole = h('select', { id: 'u_role' },
      h('option', { value: 'student' }, 'Student'),
      h('option', { value: 'faculty' }, 'Faculty'),
      h('option', { value: 'staff' }, 'Department Staff'),
      h('option', { value: 'admin' }, 'Administrator')
    );
    const uDept = h('select', { id: 'u_dept' },
      state.meta.departments.map((d) => h('option', { value: d.department_id }, d.department_name))
    );
    const deptRow = h('div', { style: 'display:none' }, h('label', { for: 'u_dept' }, 'Assigned Department'), uDept);

    uRole.onchange = () => {
      deptRow.style.display = uRole.value === 'staff' ? 'block' : 'none';
    };

    const err = h('div', { class: 'error' });
    const createBtn = h('button', { type: 'button', class: 'btn block' }, 'Create Account');

    createBtn.onclick = async () => {
      err.textContent = '';
      createBtn.disabled = true;
      try {
        const body = {
          name: uName.value.trim(),
          email: uEmail.value.trim(),
          password: uPass.value,
          role: uRole.value,
          department_id: uRole.value === 'staff' ? Number(uDept.value) : null
        };
        await api('/users', { method: 'POST', body });
        toast(`User ${body.email} created successfully`);
        modalWrap.remove();
        loadUsers();
      } catch (e) {
        err.textContent = e.message;
        createBtn.disabled = false;
      }
    };

    modalWrap.replaceChildren(
      h('div', { class: 'modal' },
        h('div', { class: 'modal-head' },
          h('h3', {}, '➕ Add New User or Staff Member'),
          h('button', { class: 'close', onclick: () => modalWrap.remove() }, '✕')),
        h('label', { for: 'u_name' }, 'Full Name'), uName,
        h('label', { for: 'u_email' }, 'Email Address'), uEmail,
        h('label', { for: 'u_pass' }, 'Initial Password'), uPass,
        h('label', { for: 'u_role' }, 'Role'), uRole,
        deptRow,
        err,
        createBtn
      )
    );
    document.body.append(modalWrap);
  }

  async function deleteUser(u) {
    if (!confirm(`Are you sure you want to remove user "${u.name}" (${u.email})?`)) return;
    try {
      await api(`/users/${u.user_id}`, { method: 'DELETE' });
      toast(`User ${u.email} deleted`);
      loadUsers();
    } catch (e) { toast(e.message, true); }
  }

  function loadUsers() {
    box.replaceChildren(Loading());
    api('/users').then((users) => {
      box.replaceChildren(h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, ['Name', 'Email', 'Role', 'Department', 'Actions'].map((t) => h('th', {}, t)))),
        h('tbody', {}, users.map((u) => {
          const isSelf = u.user_id === state.user.user_id;
          const delBtn = isSelf
            ? h('small', { style: 'color:var(--muted)' }, '(You)')
            : h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => deleteUser(u) }, '🗑️ Remove');
          return h('tr', {},
            h('td', {}, h('strong', {}, u.name)),
            h('td', {}, u.email),
            h('td', {}, h('span', { class: `pill ${u.role === 'admin' ? 'p-high' : (u.role === 'staff' ? 's-assigned' : 's-resolved')}` }, u.role.toUpperCase())),
            h('td', {}, u.department_name || '\u2013'),
            h('td', {}, delBtn)
          );
        }))
      )));
    }).catch((e) => box.replaceChildren(h('div', { class: 'error' }, e.message)));
  }

  loadUsers();

  const addBtn = h('button', { type: 'button', class: 'btn btn-sm', onclick: openCreateUserModal }, '➕ Add New User / Staff');

  return h('div', {},
    h('div', { class: 'page-title' },
      h('div', {}, h('h2', {}, 'User Management'), h('p', {}, 'Manage registered students, faculty, department staff and system administrators.')),
      addBtn),
    box);
}

/* ---------- issue detail modal ---------- */
async function openIssue(id) {
  const overlay = h('div', { class: 'overlay' });
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);

  async function draw() {
    let issue;
    try { issue = await api('/issues/' + id); }
    catch (e) { overlay.replaceChildren(h('div', { class: 'modal' }, h('p', { class: 'error' }, e.message))); return; }

    const canAct = (state.user.role === 'staff' || state.user.role === 'admin') && issue.status !== 'Resolved';
    const remarks = h('textarea', { placeholder: 'Remarks / resolution notes (required when resolving)' });
    const err = h('div', { class: 'error' });

    async function patch(body, okMsg) {
      err.textContent = '';
      try {
        await api('/issues/' + id, { method: 'PATCH', body });
        toast(okMsg);
        await draw();
        state.refresh();
      } catch (e) { err.textContent = e.message; }
    }

    const nextLabels = { Assigned: 'Accept issue', 'In Progress': 'Start work', Resolved: 'Mark as resolved' };
    const forward = STEPS.slice(STEPS.indexOf(issue.status) + 1);
    const prioSel = h('select', {}, state.meta.priorities.map((p) => h('option', { value: p, selected: p === issue.priority }, p)));
    const deptSel = h('select', {}, state.meta.departments.map((d) => h('option', { value: d.department_id, selected: d.department_id === issue.department_id }, d.department_name)));

    overlay.replaceChildren(h('div', { class: 'modal' },
      h('div', { class: 'modal-head' },
        h('div', {}, h('h2', {}, `#${issue.issue_id} \u00b7 ${issue.category}`), h('div', { class: 'pills' }, prioPill(issue.priority), statusPill(issue.status))),
        h('button', { class: 'close', onclick: close, 'aria-label': 'Close' }, '\u2715')),
      Stepper(issue.status),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Location'), h('dd', {}, issue.location),
        h('dt', {}, 'Department'), h('dd', {}, issue.department_name),
        h('dt', {}, 'Reported by'), h('dd', {}, `${issue.reporter_name} (${issue.reporter_email})`),
        h('dt', {}, 'Reported on'), h('dd', {}, fmt(issue.created_at)),
        issue.resolved_at && [h('dt', {}, 'Resolved on'), h('dd', {}, fmt(issue.resolved_at))],
        h('dt', {}, 'Description'), h('dd', {}, issue.description)),
      issue.image && h('img', { class: 'photo', src: '/uploads/' + issue.image, alt: 'Issue photo' }),
      h('h3', {}, 'History'),
      h('ul', { class: 'timeline' }, issue.updates.map((u) =>
        h('li', {}, h('strong', {}, u.status), ' \u2013 ', u.remarks || 'Status updated',
          h('div', { class: 'when' }, `${u.updated_by_name} \u00b7 ${fmt(u.updated_at)}`)))),
      canAct && h('div', { class: 'actions' },
        h('h3', {}, 'Update this issue'),
        remarks,
        h('div', { class: 'btn-row' }, forward.map((s) =>
          h('button', { class: `btn ${s === 'Resolved' ? 'success' : ''}`, onclick: () => patch({ status: s, remarks: remarks.value }, `Status changed to ${s}`) }, nextLabels[s]))),
        h('div', { class: 'row' },
          h('div', {}, h('label', {}, 'Priority'), prioSel, h('div', { class: 'btn-row' }, h('button', { class: 'btn secondary', onclick: () => patch({ priority: prioSel.value }, 'Priority updated') }, 'Update priority'))),
          state.user.role === 'admin' && h('div', {}, h('label', {}, 'Assigned department'), deptSel,
            h('div', { class: 'btn-row' }, h('button', { class: 'btn secondary', onclick: () => patch({ department_id: Number(deptSel.value) }, 'Issue reassigned') }, 'Reassign')))),
        err)));
  }
  await draw();
}

/* ---------- boot ---------- */
function render() {
  const app = $('#app');
  app.replaceChildren(state.user ? Shell() : AuthView());
}

(async function init() {
  try {
    state.meta = await api('/meta');
    if (state.token) state.user = await api('/me');
  } catch { /* not logged in or session expired */ }
  render();
})();
