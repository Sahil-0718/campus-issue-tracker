/* Campus Digital Issue & Maintenance Tracker - frontend (vanilla JS, no build step) */
'use strict';

const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];
const LOCATIONS = ['Lab 302', 'Lab 203', 'Room 204', 'Room 101', 'Library', 'Seminar Hall', 'Canteen', 'Hostel Block A', 'Admin Office', 'Ground Floor Washroom'];
const DEFAULT_DEPTS = [
  { department_id: 1, department_name: 'AIML' },
  { department_id: 2, department_name: 'IT' },
  { department_id: 3, department_name: 'CSE' }
];

const state = {
  runIcons: () => setTimeout(() => window.lucide && window.lucide.createIcons(), 0),
  token: localStorage.getItem('token'),
  user: null,
  meta: null,
  tab: null,
  refresh: () => { },
};

/* ---------- helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);

const ICONS = {
  'school': '<path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'user-cog': '<circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/><path d="m16.6 18.7.3-.9"/><path d="m19.1 12.2.3-.9"/><path d="m19.6 18.7-.4-.8"/><path d="m16.8 12.3-.4-.8"/><path d="m14.3 16.6.8-.4"/><path d="m20.7 13.8.8-.4"/>',
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  'building': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  'bar-chart': '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  'clipboard': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  'qr-code': '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'edit-2': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'
};

function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', `lucide lucide-${name} ${cls}`.trim());
  svg.setAttribute('data-lucide', name);
  if (ICONS[name]) {
    svg.innerHTML = ICONS[name];
  }
  return svg;
}

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

/**
 * Custom in-page replacement for window.prompt().
 * Returns a Promise that resolves with the entered string, or null if cancelled.
 */
function showPrompt(title, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = h('div', { class: 'overlay custom-dialog-overlay' });
    const input = h('textarea', { class: 'custom-dialog-input', rows: 3 }, defaultValue);
    const cancelBtn = h('button', { type: 'button', class: 'btn ghost' }, 'Cancel');
    const okBtn = h('button', { type: 'button', class: 'btn' }, 'Save');

    function close(val) {
      overlay.remove();
      resolve(val);
    }

    cancelBtn.onclick = () => close(null);
    okBtn.onclick = () => close(input.value);
    overlay.addEventListener('click', (e) => e.target === overlay && close(null));
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(null); }
    });

    overlay.replaceChildren(
      h('div', { class: 'modal custom-dialog' },
        h('div', { class: 'modal-head' },
          h('h3', {}, title),
          h('button', { class: 'close', onclick: () => close(null) }, icon('x'))
        ),
        input,
        h('div', { class: 'btn-row', style: 'margin-top:1rem;justify-content:flex-end' }, cancelBtn, okBtn)
      )
    );
    document.body.append(overlay);
    setTimeout(() => input.focus(), 50);
  });
}

/**
 * Custom in-page replacement for window.confirm().
 * Returns a Promise that resolves with true (OK) or false (Cancel).
 */
function showConfirm(title, message, confirmLabel = 'Confirm', isDanger = false) {
  return new Promise((resolve) => {
    const overlay = h('div', { class: 'overlay custom-dialog-overlay' });
    const cancelBtn = h('button', { type: 'button', class: 'btn ghost' }, 'Cancel');
    const okBtn = h('button', { type: 'button', class: `btn ${isDanger ? 'btn-danger' : ''}` }, confirmLabel);

    function close(val) {
      overlay.remove();
      resolve(val);
    }

    cancelBtn.onclick = () => close(false);
    okBtn.onclick = () => close(true);
    overlay.addEventListener('click', (e) => e.target === overlay && close(false));
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
    });

    overlay.replaceChildren(
      h('div', { class: 'modal custom-dialog' },
        h('div', { class: 'modal-head' },
          h('h3', {}, title),
          h('button', { class: 'close', onclick: () => close(false) }, icon('x'))
        ),
        h('p', { class: 'custom-dialog-msg' }, message),
        h('div', { class: 'btn-row', style: 'margin-top:1.5rem;justify-content:flex-end' }, cancelBtn, okBtn)
      )
    );
    document.body.append(overlay);
    setTimeout(() => okBtn.focus(), 50);
  });
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
  if (!silent && state.token) api('/logout', { method: 'POST' }).catch(() => { });
  localStorage.removeItem('token');
  Object.assign(state, { token: null, user: null, tab: null });
  render();
}

/* ---------- auth ---------- */
function AuthView() {
  let activeTab = 'student'; // 'student', 'admin', 'staff'
  let isRegister = false;
  let logoIcon = 'school';
  const card = h('div', { class: 'auth-card' });
  const brandLogo = h('div', { class: 'auth-brand-logo' }, icon('school'));

  function draw() {
    const err = h('div', { class: 'error' });
    const email = h('input', {
      type: 'email',
      id: 'email',
      placeholder: activeTab === 'admin' ? 'admin@gmail.com' : (activeTab === 'staff' ? 'staff@gmail.com' : 'you@gmail.com'),
      required: true
    });
    const password = h('input', {
      type: 'password',
      id: 'password',
      placeholder: isRegister ? 'Pass@123' : 'Password',
      required: true
    });
    const name = h('input', { id: 'name', placeholder: 'Full name' });

    // Determine initial role value based on activeTab
    let defaultRole = activeTab === 'admin' ? 'admin' : (activeTab === 'staff' ? 'staff' : 'student');
    const role = h('select', {
      id: 'role', onchange: (e) => {
        const selected = e.target.value;
        if (selected === 'admin') activeTab = 'admin';
        else if (selected === 'staff') activeTab = 'staff';
        else activeTab = 'student';
        draw();
      }
    },
      h('option', { value: 'student', selected: defaultRole === 'student' ? 'selected' : undefined }, 'Student'),
      h('option', { value: 'faculty', selected: defaultRole === 'faculty' ? 'selected' : undefined }, 'Faculty'),
      h('option', { value: 'staff', selected: defaultRole === 'staff' ? 'selected' : undefined }, 'Department Staff'),
      h('option', { value: 'admin', selected: defaultRole === 'admin' ? 'selected' : undefined }, 'System Administrator')
    );

    const depts = (state.meta && state.meta.departments && state.meta.departments.length)
      ? state.meta.departments
      : DEFAULT_DEPTS;

    const deptSelect = h('select', { id: 'dept' },
      depts.map((d) => h('option', { value: d.department_id }, d.department_name + ' Department'))
    );

    async function submit() {
      err.textContent = '';
      try {
        const emailVal = email.value.trim().toLowerCase();
        const passVal = password.value;

        if (isRegister) {
          if (!name.value.trim()) { err.textContent = 'Please enter your full name'; return; }
          if (!emailVal.endsWith('@gmail.com') || !/^[^\s@]+@gmail\.com$/.test(emailVal)) {
            err.textContent = 'Email must be a valid @gmail.com address';
            return;
          }
          if (passVal.length < 6) {
            err.textContent = 'Password must be at least 6 characters';
            return;
          }
          if (!/[A-Z]/.test(passVal)) {
            err.textContent = 'Password must contain at least 1 uppercase letter (A-Z)';
            return;
          }
          if (!/[a-z]/.test(passVal)) {
            err.textContent = 'Password must contain at least 1 lowercase letter (a-z)';
            return;
          }
          if (!/[0-9]/.test(passVal)) {
            err.textContent = 'Password must contain at least 1 number (0-9)';
            return;
          }
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(passVal)) {
            err.textContent = 'Password must contain at least 1 special character (e.g. !@#$%^&*)';
            return;
          }

          const regRole = role.value;
          const regBody = {
            name: name.value.trim(),
            email: emailVal,
            password: passVal,
            role: regRole,
            department_id: regRole === 'staff' ? Number(deptSelect.value) : undefined
          };
          await api('/register', { method: 'POST', body: regBody });
          toast(`Account created for ${regRole} - logging in`);
        }
        const r = await api('/login', { method: 'POST', body: { email: emailVal, password: passVal } });
        state.token = r.token;
        localStorage.setItem('token', r.token);
        state.user = r.user;
        state.tab = null;
        render();
      } catch (e) { err.textContent = e.message; }
    }

    let titleText = 'Campus Issue Tracker';
    let subText = 'Report campus infrastructure problems and track them until resolved.';
    logoIcon = 'school';

    if (isRegister) {
      if (activeTab === 'admin') {
        titleText = 'Create Admin Account';
        subText = 'Set up a system administrator account with full routing and management privileges.';
        logoIcon = 'shield';
      } else if (activeTab === 'staff') {
        titleText = 'Create Staff Account';
        subText = 'Register as department staff to resolve assigned campus issues.';
        logoIcon = 'user-cog';
      } else {
        titleText = 'Create Campus Account';
        subText = 'Join the campus community to report and track issues.';
        logoIcon = 'graduation-cap';
      }
    } else {
      if (activeTab === 'admin') {
        titleText = 'Administrator Portal';
        subText = 'System administration, campus-wide routing, user management and maintenance analytics.';
        logoIcon = 'shield';
      } else if (activeTab === 'staff') {
        titleText = 'Department Staff Portal';
        subText = 'Manage assigned department tickets, update progress and log resolutions.';
        logoIcon = 'user-cog';
      }
    }

    brandLogo.replaceChildren(icon(logoIcon));
    state.runIcons();

    const toggleAuth = isRegister
      ? h('div', { class: 'auth-toggle' },
        'Already have an account? ',
        h('button', { type: 'button', class: 'link-btn', onclick: () => { isRegister = false; draw(); } }, 'Sign In'))
      : h('div', { class: 'auth-toggle' },
        "Don't have an account? ",
        h('button', { type: 'button', class: 'link-btn', onclick: () => { isRegister = true; draw(); } }, 'Sign Up'));

    const formChildren = [
      (activeTab === 'admin') ? h('div', { class: 'admin-badge' }, 'System Administrator') : null,
      (activeTab === 'staff') ? h('div', { class: 'admin-badge', style: 'background:rgba(34,211,238,0.15);color:var(--teal);border-color:rgba(34,211,238,0.3)' }, 'Staff Member') : null,
      h('h1', {}, titleText),
      h('p', { class: 'sub' }, subText),
      h('div', { class: 'tabs-inline' },
        h('button', { type: 'button', class: activeTab === 'student' ? 'active' : '', onclick: () => { activeTab = 'student'; draw(); } }, 'Student / Faculty'),
        h('button', { type: 'button', class: activeTab === 'staff' ? 'active' : '', onclick: () => { activeTab = 'staff'; draw(); } }, 'Staff'),
        h('button', { type: 'button', class: activeTab === 'admin' ? 'active' : '', onclick: () => { activeTab = 'admin'; draw(); } }, 'Admin')),
      isRegister ? [h('label', { for: 'name' }, 'Full name'), name] : null,
      h('label', { for: 'email' }, isRegister ? 'Email address (@gmail.com)' : 'Email address'), email,
      h('label', { for: 'password' }, 'Password'), password,
      isRegister ? h('div', { class: 'pwd-hint' }, 'Must contain: 1 uppercase, 1 lowercase, 1 number, and 1 special character.') : null,
      isRegister ? [
        h('label', { for: 'role' }, 'Account Role'),
        role,
        role.value === 'staff' ? h('label', { for: 'dept' }, 'Assigned Department') : null,
        role.value === 'staff' ? deptSelect : null,
        role.value === 'admin' ? h('div', { class: 'admin-hint' }, 'Admin accounts receive full routing and user management access.') : null
      ] : null,
      err,
      h('button', { type: 'button', class: 'btn block', onclick: submit },
        isRegister
          ? (activeTab === 'admin' ? 'Create Admin Account' : (activeTab === 'staff' ? 'Create Staff Account' : 'Sign Up'))
          : (activeTab === 'admin' ? 'Sign In as Administrator' : (activeTab === 'staff' ? 'Sign In as Staff' : 'Sign In'))),
      toggleAuth
    ].flat(Infinity).filter(Boolean);

    card.replaceChildren(...formChildren);

    [email, password, name].forEach((inp) => {
      inp.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
    });
  }
  draw();

  // Dot grid decorative layer
  const dots = h('div', { class: 'auth-dots' });

  // Brand panel above the card
  const brandPanel = h('div', { class: 'auth-brand-panel' },
    brandLogo,
    h('div', { class: 'auth-brand-name' }, 'Campus Issue Tracker'),
    h('div', { class: 'auth-brand-tagline' }, 'Report · Track · Resolve')
  );

  return h('div', { class: 'auth-wrap' }, dots, brandPanel, card);
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
  toast('CSV report downloaded!');
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
      const msg = h('span', { class: 'msg' }, icon('megaphone', 'icon-sm'), data.message);
      const editBtn = state.user && state.user.role === 'admin'
        ? h('button', { type: 'button', class: 'edit-btn', onclick: editNotice }, [icon('edit-2', 'icon-sm'), 'Edit Notice'])
        : null;
      bar.replaceChildren(msg, editBtn);
    } catch { bar.style.display = 'none'; }
  }
  async function editNotice() {
    const cur = bar.querySelector('.msg')?.textContent || '';
    const updated = await showPrompt('Edit Campus Maintenance Announcement', cur);
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
        h('div', { class: 'brand' }, h('div', { class: 'brand-icon' }, icon('school')), 'Campus Issue Tracker'),
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
      h('span', {}, [icon('map-pin', 'icon-sm'), issue.location]),
      h('span', {}, [icon('building', 'icon-sm'), issue.department_name]),
      showReporter && h('span', {}, [icon('user', 'icon-sm'), issue.reporter_name]),
      h('span', {}, [icon('clock', 'icon-sm'), fmt(issue.created_at)])),
    h('p', { class: 'issue-desc' }, issue.description.length > 140 ? issue.description.slice(0, 140) + '\u2026' : issue.description));
}

function IssueList(issues, showReporter, emptyText) {
  if (!issues.length) return h('div', { class: 'card empty' }, icon('inbox', 'icon-empty'), h('div', {}, emptyText || 'No issues to show.'));
  return h('div', {}, issues.map((i) => IssueCard(i, showReporter)));
}

function Stepper(status) {
  const idx = STEPS.indexOf(status);
  return h('div', { class: 'stepper' }, STEPS.map((s, i) =>
    h('div', { class: `step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''} ${i === STEPS.length - 1 ? 'final' : ''} ${status === 'Resolved' && i === idx ? 'done' : ''}` },
      h('div', { class: 'dot' }, i <= idx ? icon('check', 'icon-sm') : i + 1), s)));
}

const STAT_ICONS = { warn: 'alert-triangle', ok: 'check-circle', info: 'bar-chart', '': 'clipboard' };
function Stat(n, label, kind = '') {
  return h('div', { class: `stat ${kind}` },
    h('div', { class: 'n' }, n),
    h('div', { class: 'l' }, label),
    h('div', { class: 'stat-icon' }, icon(STAT_ICONS[kind] || 'clipboard'))
  );
}

function Loading() {
  return h('div', {},
    h('div', { class: 'loading-shimmer' }),
    h('div', { class: 'loading-shimmer', style: 'height:60px;opacity:.7' }),
    h('div', { class: 'loading-shimmer', style: 'height:60px;opacity:.5' })
  );
}

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
  const depts = (state.meta && state.meta.departments && state.meta.departments.length) ? state.meta.departments : DEFAULT_DEPTS;

  const category = h('select', { id: 'category' }, h('option', { value: '' }, 'Select a category…'),
    (state.meta ? state.meta.categories : []).map((c) => h('option', { value: c.name }, c.name)));

  const department = h('select', { id: 'department' },
    h('option', { value: '' }, 'Auto-detect from category (or choose)'),
    depts.map((d) => h('option', { value: d.department_id }, d.department_name)));

  const routeHint = h('div', { class: 'hint' });

  function updateRouteHint() {
    const selectedDeptId = department.value;
    const d = depts.find((x) => String(x.department_id) === String(selectedDeptId));
    if (d) {
      routeHint.textContent = `Department selected: ${d.department_name}`;
    } else {
      routeHint.textContent = '';
    }
  }

  category.addEventListener('change', () => {
    const c = state.meta && state.meta.categories.find((x) => x.name === category.value);
    if (c) {
      const matchedDept = depts.find((d) => d.department_name === c.department);
      if (matchedDept && !department.value) {
        department.value = matchedDept.department_id;
      }
    }
    updateRouteHint();
  });

  department.addEventListener('change', () => {
    updateRouteHint();
  });

  const location = h('input', { id: 'location', list: 'locs', placeholder: 'e.g. Lab 302' });
  const qrBadge = h('span');
  const qrBtn = h('button', { type: 'button', class: 'btn secondary btn-sm', style: 'margin-left:.6rem' }, [icon('qr-code', 'icon-sm'), 'Scan Classroom QR']);

  qrBtn.onclick = () => {
    const qrModal = h('div', { class: 'overlay' });
    const rooms = [
      { name: 'Lab 302', desc: 'Computer Science & AI Lab (3rd Floor)', cat: 'AI / ML Models & Datasets' },
      { name: 'Lab 203', desc: 'Hardware & Systems Lab (2nd Floor)', cat: 'Computer / Lab Equipment' },
      { name: 'Room 204', desc: 'CSE Lecture Hall', cat: 'AC / Fan' },
      { name: 'Room 101', desc: 'Engineering Wing', cat: 'Electrical (Light / Socket)' },
      { name: 'Library', desc: 'Central Library (2nd Floor)', cat: 'Wi-Fi / Network' },
      { name: 'Seminar Hall', desc: 'Auditorium & Presentation Hall', cat: 'Projector / Smart Board' },
      { name: 'AI Server Room', desc: 'High Performance Computing Cluster', cat: 'GPU / Model Training Servers' },
      { name: 'Classroom 305', desc: 'Main Academic Block', cat: 'Classroom & Lab Infrastructure' },
    ];
    qrModal.replaceChildren(
      h('div', { class: 'modal' },
        h('div', { class: 'modal-head' },
          h('h3', {}, 'Classroom QR Code Simulator'),
          h('button', { class: 'close', onclick: () => qrModal.remove() }, icon('x'))),
        h('p', { class: 'sub' }, 'Simulates scanning the QR code mounted at the door of any campus room:'),
        h('div', { class: 'qr-grid' }, rooms.map((r) =>
          h('div', {
            class: 'qr-card', onclick: () => {
              location.value = r.name;
              qrBadge.replaceChildren(h('span', { class: 'qr-badge' }, 'QR Verified: ' + r.name));
              if (!category.value && r.cat) {
                category.value = r.cat;
                category.dispatchEvent(new Event('change'));
              }
              toast(`QR code scanned: ${r.name}`);
              qrModal.remove();
            }
          },
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
          const hazardText = res.hazardDetected ? ' · Safety hazard detected (High Priority)' : '';
          aiAssistBox.replaceChildren(
            h('div', { class: 'ai-box' },
              h('div', { class: 'ai-text' }, [icon('sparkles', 'icon-sm'), 'AI Smart Assist: '], h('strong', {}, badgeText + hazardText)),
              h('button', {
                type: 'button', class: 'ai-btn', onclick: () => {
                  if (res.category) {
                    category.value = res.category;
                    category.dispatchEvent(new Event('change'));
                  }
                  if (res.department) {
                    const matchedDept = depts.find((d) => d.department_name === res.department);
                    if (matchedDept) {
                      department.value = matchedDept.department_id;
                      updateRouteHint();
                    }
                  }
                  if (res.priority) priority.value = res.priority;
                  toast('AI suggestion applied!');
                  aiAssistBox.replaceChildren();
                }
              }, [icon('zap', 'icon-sm'), 'Apply Suggestion']))
          );
        } else { aiAssistBox.replaceChildren(); }
      } catch { }
    }, 350);
  });

  const fileInput = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', capture: 'environment', id: 'image', style: 'display:none' });
  const cameraModal = h('div', { class: 'overlay' });

  function renderPhotoPreview() {
    preview.replaceChildren();
    if (imageData) {
      preview.append(
        h('div', { class: 'photo-preview-wrap' },
          h('img', { class: 'img-preview', src: imageData, alt: 'Issue preview' }),
          h('button', {
            type: 'button', class: 'btn-remove-photo', onclick: () => {
              imageData = null;
              fileInput.value = '';
              renderPhotoPreview();
            }
          }, [icon('trash-2', 'icon-sm'), ' Remove Photo'])
        )
      );
    }
  }

  fileInput.addEventListener('change', async () => {
    if (!fileInput.files[0]) return;
    try {
      imageData = await downscale(fileInput.files[0]);
      renderPhotoPreview();
      toast('Photo selected!');
    } catch (e) { err.textContent = e.message; }
  });

  function openCamera() {
    let stream = null;
    const video = h('video', { autoplay: true, playsinline: true, class: 'camera-video' });
    const snapCanvas = h('canvas', { class: 'camera-canvas', style: 'display:none' });
    const snapBtn = h('button', { type: 'button', class: 'btn', style: 'flex:1' }, [icon('camera', 'icon-sm'), 'Snap Photo']);
    const retakeBtn = h('button', { type: 'button', class: 'btn secondary', style: 'display:none;flex:1' }, [icon('refresh-cw', 'icon-sm'), 'Retake']);
    const useBtn = h('button', { type: 'button', class: 'btn success', style: 'display:none;flex:1' }, [icon('check', 'icon-sm'), 'Use Photo']);
    const camError = h('div', { class: 'error' });
    let snappedData = null;

    function cleanup() {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      cameraModal.remove();
    }

    const modal = h('div', { class: 'modal camera-modal' },
      h('div', { class: 'modal-head' },
        h('h3', {}, 'Live Camera Capture'),
        h('button', { class: 'close', onclick: cleanup }, icon('x'))
      ),
      h('p', { class: 'sub' }, 'Point your camera at the infrastructure problem and take a photo:'),
      h('div', { class: 'camera-viewfinder' }, video, snapCanvas),
      camError,
      h('div', { class: 'btn-row', style: 'margin-top:1rem' }, snapBtn, retakeBtn, useBtn)
    );

    cameraModal.replaceChildren(modal);
    document.body.append(cameraModal);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      }).then((s) => {
        stream = s;
        video.srcObject = s;
      }).catch((e) => {
        camError.textContent = 'Camera access error: ' + (e.message || 'Permission denied or camera unavailable.');
        snapBtn.disabled = true;
      });
    } else {
      camError.textContent = 'Camera API is not supported in this browser environment.';
      snapBtn.disabled = true;
    }

    snapBtn.onclick = () => {
      if (!video.videoWidth) return;
      snapCanvas.width = video.videoWidth;
      snapCanvas.height = video.videoHeight;
      const ctx = snapCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      snappedData = snapCanvas.toDataURL('image/jpeg', 0.85);
      video.style.display = 'none';
      snapCanvas.style.display = 'block';
      snapBtn.style.display = 'none';
      retakeBtn.style.display = 'inline-flex';
      useBtn.style.display = 'inline-flex';
    };

    retakeBtn.onclick = () => {
      snappedData = null;
      snapCanvas.style.display = 'none';
      video.style.display = 'block';
      snapBtn.style.display = 'inline-flex';
      retakeBtn.style.display = 'none';
      useBtn.style.display = 'none';
    };

    useBtn.onclick = () => {
      if (snappedData) {
        imageData = snappedData;
        renderPhotoPreview();
        toast('Photo captured successfully!');
      }
      cleanup();
    };
  }

  const cameraBtn = h('button', { type: 'button', class: 'btn secondary', onclick: openCamera }, [icon('camera', 'icon-sm'), 'Take Photo (Camera)']);
  const uploadBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => fileInput.click() }, [icon('upload', 'icon-sm'), 'Upload File']);
  const photoControls = h('div', { class: 'photo-controls' }, cameraBtn, uploadBtn, fileInput);

  const submit = h('button', { class: 'btn block' }, 'Submit issue');
  submit.addEventListener('click', async () => {
    err.textContent = '';
    submit.disabled = true;
    try {
      const issue = await api('/issues', {
        method: 'POST', body: {
          category: category.value,
          department_id: department.value ? Number(department.value) : undefined,
          location: location.value,
          description: description.value,
          priority: priority.value,
          image: imageData
        }
      });
      toast(`Issue #${issue.issue_id} submitted and routed to ${issue.department_name}`);
      state.tab = 'mine';
      render();
    } catch (e) { err.textContent = e.message; submit.disabled = false; }
  });

  return h('div', {},
    h('div', { class: 'page-title' }, h('div', {}, h('h2', {}, 'Report a campus issue'), h('p', {}, 'Select category & department to ensure quick resolution.'))),
    h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('div', {}, h('label', { for: 'category' }, 'Category'), category),
        h('div', {}, h('label', { for: 'department' }, 'Department'), department)),
      routeHint,
      h('div', { class: 'row' },
        h('div', {}, h('label', { for: 'location' }, 'Location ', qrBtn, qrBadge), location),
        h('div', {}, h('label', { for: 'priority' }, 'Priority'), priority)),
      h('datalist', { id: 'locs' }, LOCATIONS.map((l) => h('option', { value: l }))),
      h('label', { for: 'description' }, 'Description'), description, aiAssistBox,
      h('label', {}, 'Attach Photo (Optional)'), photoControls, preview,
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
  let deptFilter = '';
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

      const deptFilter_sel = isAdmin
        ? h('select', { onchange: (e) => { deptFilter = e.target.value; renderFiltered(); } },
            h('option', { value: '' }, 'All departments'),
            ...state.meta.departments.map((d) => h('option', { value: String(d.department_id), selected: String(d.department_id) === deptFilter }, d.department_name)))
        : null;

      const searchInput = h('input', { type: 'search', placeholder: 'Search by issue #, room, or problem...', value: searchQuery });
      searchInput.oninput = (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFiltered();
      };

      const exportBtn = h('button', { type: 'button', class: 'btn btn-export btn-sm', onclick: () => exportIssuesToCsv(rawIssues, `campus-issues-${isAdmin ? 'admin' : state.user.department_name}.csv`) }, [icon('download', 'icon-sm'), 'Export CSV']);

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
        if (deptFilter) {
          filtered = filtered.filter((i) => String(i.department_id) === deptFilter);
        }
        if (isAdmin && !statusFilter && !deptFilter && !searchQuery) {
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
            h('div', { class: 'search-bar' }, h('span', { class: 'icon' }, icon('search')), searchInput),
            filter,
            deptFilter_sel)),
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

      const searchInput = h('input', { type: 'search', placeholder: 'Search issues by #, room, keyword...', value: searchQuery });
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

      const exportBtn = h('button', { type: 'button', class: 'btn btn-export btn-sm', onclick: () => exportIssuesToCsv(rawIssues, 'all-campus-issues.csv') }, [icon('download', 'icon-sm'), 'Export CSV']);

      wrap.replaceChildren(
        h('div', { class: 'page-title' },
          h('div', {}, h('h2', {}, 'All issues'), h('p', {}, 'Open an issue to reassign it, change priority or update status.')),
          exportBtn),
        h('div', { class: 'toolbar' },
          h('div', { class: 'search-bar' }, h('span', { class: 'icon' }, icon('search')), searchInput),
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
          h('h3', {}, 'Add New User or Staff Member'),
          h('button', { class: 'close', onclick: () => modalWrap.remove() }, icon('x'))),
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
    const confirmed = await showConfirm(
      'Remove User',
      `Are you sure you want to permanently remove "${u.name}" (${u.email})? This action cannot be undone.`,
      'Yes, Remove',
      true
    );
    if (!confirmed) return;
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
            : h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => deleteUser(u) }, [icon('trash-2', 'icon-sm'), 'Remove']);
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

  const addBtn = h('button', { type: 'button', class: 'btn btn-sm', onclick: openCreateUserModal }, [icon('user-plus', 'icon-sm'), 'Add New User / Staff']);

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
        h('button', { class: 'close', onclick: close, 'aria-label': 'Close' }, icon('x'))),
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
  state.runIcons();
}

(async function init() {
  try {
    state.meta = await api('/meta');
    if (state.token) state.user = await api('/me');
  } catch { /* not logged in or session expired */ }
  render();
})();
