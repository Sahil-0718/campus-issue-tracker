
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

let server, base, uploadDir;
const tokens = {};

// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function api(method, url, { token, body } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null), res };
}

async function login(email, password) {
  const r = await api('POST', '/api/login', { body: { email, password } });
  assert.equal(r.status, 200, `login ${email}`);
  return r.data.token;
}

before(async () => {
  uploadDir = mkdtempSync(path.join(tmpdir(), 'tracker-uploads-'));
  const app = createApp({ dbPath: ':memory:', uploadDir });
  server = app.server;
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;

  await api('POST', '/api/register', { body: { name: 'Asha Student', email: 'asha@student.edu', password: 'pass1234', role: 'student' } });
  await api('POST', '/api/register', { body: { name: 'Ravi Student', email: 'ravi@student.edu', password: 'pass1234', role: 'student' } });
  tokens.asha = await login('asha@student.edu', 'pass1234');
  tokens.ravi = await login('ravi@student.edu', 'pass1234');
  tokens.admin = await login('admin@campus.edu', 'admin123');
  tokens.electrical = await login('electrical@campus.edu', 'staff123');
  tokens.it = await login('it@campus.edu', 'staff123');
});

after(() => {
  server.close();
  rmSync(uploadDir, { recursive: true, force: true });
});

test('health check responds ok', async () => {
  const r = await api('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'ok');
});

test('registration validates input and rejects duplicates', async () => {
  assert.equal((await api('POST', '/api/register', { body: { name: 'A', email: 'bad', password: '1' } })).status, 400);
  const dup = await api('POST', '/api/register', { body: { name: 'Asha Student', email: 'asha@student.edu', password: 'pass1234' } });
  assert.equal(dup.status, 409);
});

test('login fails with a wrong password; protected routes need a token', async () => {
  assert.equal((await api('POST', '/api/login', { body: { email: 'asha@student.edu', password: 'nope' } })).status, 401);
  assert.equal((await api('GET', '/api/issues')).status, 401);
  assert.equal((await api('GET', '/api/issues', { token: 'garbage' })).status, 401);
});

let issueId;

test('student submits an issue and it is auto-routed to the right department', async () => {
  const r = await api('POST', '/api/issues', {
    token: tokens.asha,
    body: { category: 'AC / Fan', location: 'Room 204', description: 'Fan in Room 204 is not working.', priority: 'Medium' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.department_name, 'Electrical');
  assert.equal(r.data.status, 'Submitted');
  assert.equal(r.data.priority, 'Medium');
  assert.equal(r.data.updates.length, 1);
  issueId = r.data.issue_id;
});

test('invalid issue submissions are rejected', async () => {
  const bad = (body) => api('POST', '/api/issues', { token: tokens.asha, body });
  assert.equal((await bad({ category: 'Nope', location: 'Lab', description: 'something broken' })).status, 400);
  assert.equal((await bad({ category: 'Projector', location: '', description: 'something broken' })).status, 400);
  assert.equal((await bad({ category: 'Projector', location: 'Lab 1', description: 'x' })).status, 400);
});

test('hazard descriptions are escalated to High priority', async () => {
  const r = await api('POST', '/api/issues', {
    token: tokens.asha,
    body: { category: 'Electrical (Light / Socket)', location: 'Lab 101', description: 'Socket is sparking near the bench', priority: 'Low' },
  });
  assert.equal(r.data.priority, 'High');
});

test('image upload is stored and served; fake images are rejected', async () => {
  const ok = await api('POST', '/api/issues', {
    token: tokens.asha,
    body: { category: 'Projector', location: 'Lab 302', description: 'Projector is not displaying output.', image: PNG },
  });
  assert.equal(ok.status, 201);
  assert.match(ok.data.image, /^[a-f0-9]+\.png$/);
  assert.ok(readdirSync(uploadDir).includes(ok.data.image));
  const file = await fetch(`${base}/uploads/${ok.data.image}`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/png');

  const fake = await api('POST', '/api/issues', {
    token: tokens.asha,
    body: {
      category: 'Projector', location: 'Lab 302', description: 'Projector is not displaying output.',
      image: 'data:image/png;base64,' + Buffer.from('not really a png').toString('base64')
    },
  });
  assert.equal(fake.status, 400);
});

test('students only see their own issues', async () => {
  const mine = await api('GET', '/api/issues', { token: tokens.asha });
  assert.ok(mine.data.length >= 1);
  const ravi = await api('GET', '/api/issues', { token: tokens.ravi });
  assert.equal(ravi.data.length, 0);
  assert.equal((await api('GET', `/api/issues/${issueId}`, { token: tokens.ravi })).status, 403);
});

test('department staff only see their own department queue', async () => {
  const elec = await api('GET', '/api/issues', { token: tokens.electrical });
  assert.ok(elec.data.every((i) => i.department_name === 'Electrical'));
  assert.ok(elec.data.some((i) => i.issue_id === issueId));
  const it = await api('GET', '/api/issues', { token: tokens.it });
  assert.ok(it.data.every((i) => i.department_name === 'IT'));
  assert.equal((await api('GET', `/api/issues/${issueId}`, { token: tokens.it })).status, 403);
});

test('students cannot update issues; other departments cannot either', async () => {
  assert.equal((await api('PATCH', `/api/issues/${issueId}`, { token: tokens.asha, body: { status: 'Assigned' } })).status, 403);
  assert.equal((await api('PATCH', `/api/issues/${issueId}`, { token: tokens.it, body: { status: 'Assigned' } })).status, 403);
});

test('staff move an issue through the workflow to Resolved', async () => {
  const t = tokens.electrical;
  let r = await api('PATCH', `/api/issues/${issueId}`, { token: t, body: { status: 'Assigned' } });
  assert.equal(r.data.status, 'Assigned');
  assert.equal(r.data.updates.at(-1).remarks, 'Issue accepted by the department');

  r = await api('PATCH', `/api/issues/${issueId}`, { token: t, body: { status: 'In Progress', remarks: 'Technician on the way' } });
  assert.equal(r.data.status, 'In Progress');

  // resolving needs remarks
  assert.equal((await api('PATCH', `/api/issues/${issueId}`, { token: t, body: { status: 'Resolved' } })).status, 400);

  r = await api('PATCH', `/api/issues/${issueId}`, { token: t, body: { status: 'Resolved', remarks: 'Replaced the fan capacitor' } });
  assert.equal(r.data.status, 'Resolved');
  assert.ok(r.data.resolved_at);
  assert.deepEqual(r.data.updates.map((u) => u.status), ['Submitted', 'Assigned', 'In Progress', 'Resolved']);

  // cannot go backwards
  assert.equal((await api('PATCH', `/api/issues/${issueId}`, { token: t, body: { status: 'Assigned' } })).status, 400);
});

test('the student can see the resolution', async () => {
  const r = await api('GET', `/api/issues/${issueId}`, { token: tokens.asha });
  assert.equal(r.data.status, 'Resolved');
  assert.equal(r.data.updates.at(-1).remarks, 'Replaced the fan capacitor');
});

test('only admins can reassign; reassignment is logged', async () => {
  const created = await api('POST', '/api/issues', {
    token: tokens.asha,
    body: { category: 'Furniture', location: 'Room 12', description: 'Broken chair in the back row' },
  });
  const id = created.data.issue_id;
  const meta = await api('GET', '/api/meta');
  const plumbing = meta.data.departments.find((d) => d.department_name === 'Plumbing').department_id;

  const mt = await login('maintenance@campus.edu', 'staff123');
  assert.equal((await api('PATCH', `/api/issues/${id}`, { token: mt, body: { department_id: plumbing } })).status, 403);

  const r = await api('PATCH', `/api/issues/${id}`, { token: tokens.admin, body: { department_id: plumbing } });
  assert.equal(r.status, 200);
  assert.equal(r.data.department_name, 'Plumbing');
  assert.match(r.data.updates.at(-1).remarks, /Reassigned from Maintenance to Plumbing/);
});

test('priority can be changed by staff and an empty update is rejected', async () => {
  const created = await api('POST', '/api/issues', {
    token: tokens.asha,
    body: { category: 'Wi-Fi / Network', location: 'Library', description: 'Wi-Fi is very slow today', priority: 'Low' },
  });
  const id = created.data.issue_id;
  const r = await api('PATCH', `/api/issues/${id}`, { token: tokens.it, body: { priority: 'High' } });
  assert.equal(r.data.priority, 'High');
  assert.equal((await api('PATCH', `/api/issues/${id}`, { token: tokens.it, body: {} })).status, 400);
});

test('statistics reflect issue counts', async () => {
  const admin = await api('GET', '/api/stats', { token: tokens.admin });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.total, admin.data.pending + admin.data.resolved);
  assert.ok(admin.data.resolved >= 1);
  assert.ok(admin.data.avg_resolution_hours !== null);
  assert.ok(admin.data.by_department.find((d) => d.name === 'Electrical').total >= 2);

  const staff = await api('GET', '/api/stats', { token: tokens.electrical });
  assert.equal(staff.data.by_department.length, 0);
  assert.ok(staff.data.total <= admin.data.total);

  assert.equal((await api('GET', '/api/stats', { token: tokens.asha })).status, 403);
});

test('only admins can list users, and passwords are never exposed', async () => {
  assert.equal((await api('GET', '/api/users', { token: tokens.asha })).status, 403);
  const r = await api('GET', '/api/users', { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.ok(r.data.every((u) => !('password' in u)));
});

test('logout invalidates the session', async () => {
  const t = await login('ravi@student.edu', 'pass1234');
  assert.equal((await api('GET', '/api/me', { token: t })).status, 200);
  await api('POST', '/api/logout', { token: t });
  assert.equal((await api('GET', '/api/me', { token: t })).status, 401);
});

test('static frontend is served and path traversal is blocked', async () => {
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  const trav = await fetch(base + '/..%2fpackage.json');
  assert.notEqual(trav.status, 200);
});

test('smart classifier suggests category and detects hazard', async () => {
  const c1 = await api('POST', '/api/classify', { body: { text: 'The projector in room 101 has a flickering bulb and no display' } });
  assert.equal(c1.status, 200);
  assert.equal(c1.data.category, 'Projector');
  assert.equal(c1.data.department, 'IT');

  const c2 = await api('POST', '/api/classify', { body: { text: 'Sparks and smoke coming from the power socket in the lab' } });
  assert.equal(c2.status, 200);
  assert.equal(c2.data.hazardDetected, true);
  assert.equal(c2.data.priority, 'High');
});

test('announcements can be fetched and updated by admin', async () => {
  const getAnc = await api('GET', '/api/announcement');
  assert.equal(getAnc.status, 200);

  const nonAdmin = await api('POST', '/api/announcement', { token: tokens.asha, body: { message: 'Hack attempt' } });
  assert.equal(nonAdmin.status, 403);

  const upd = await api('POST', '/api/announcement', { token: tokens.admin, body: { message: 'Campus power maintenance on Sunday', active: true } });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.message, 'Campus power maintenance on Sunday');
});

test('admin can create and delete users', async () => {
  const newUser = await api('POST', '/api/users', {
    token: tokens.admin,
    body: { name: 'Karan Tech', email: 'karan@tech.edu', password: 'securePass123', role: 'staff', department_id: 1 }
  });
  assert.equal(newUser.status, 201);
  assert.equal(newUser.data.email, 'karan@tech.edu');
  assert.equal(newUser.data.department_name, 'IT');

  const del = await api('DELETE', `/api/users/${newUser.data.user_id}`, { token: tokens.admin });
  assert.equal(del.status, 200);
  assert.equal(del.data.ok, true);

  // admin cannot delete self
  const me = await api('GET', '/api/me', { token: tokens.admin });
  const selfDel = await api('DELETE', `/api/users/${me.data.user_id}`, { token: tokens.admin });
  assert.equal(selfDel.status, 400);
});
