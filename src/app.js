import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { openDb, hashPassword, verifyPassword } from './db.js';
import { HttpError } from './errors.js';
import { CATEGORIES, PRIORITIES, STATUSES, aiClassify } from './routing.js';
import { createIssue, listIssues, getIssue, updateIssue, getStats } from './issues.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 3.5 * 1024 * 1024;
const SESSION_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

export function createApp({ dbPath = ':memory:', uploadDir = path.join(process.cwd(), 'data', 'uploads') } = {}) {
  const db = openDb(dbPath);
  mkdirSync(uploadDir, { recursive: true });

  const routes = [];
  const route = (method, pattern, opts, handler) => {
    const keys = [];
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    routes.push({ method, regex, keys, handler, auth: opts.auth !== false, roles: opts.roles });
  };

  // ---------- public routes ----------
  route('GET', '/health', { auth: false }, () => ({ status: 'ok', time: new Date().toISOString() }));

  route('GET', '/api/meta', { auth: false }, () => ({
    categories: Object.entries(CATEGORIES).map(([name, department]) => ({ name, department })),
    priorities: PRIORITIES,
    statuses: STATUSES,
    departments: db.prepare('SELECT department_id, department_name FROM departments ORDER BY department_id').all(),
  }));

  route('POST', '/api/register', { auth: false }, ({ body }) => {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const validRoles = ['student', 'faculty', 'staff', 'admin'];
    const role = validRoles.includes(body.role) ? body.role : 'student';
    let department_id = null;
    if (role === 'staff') {
      if (body.department_id) {
        department_id = Number(body.department_id);
      } else if (body.department_name) {
        const d = db.prepare('SELECT department_id FROM departments WHERE department_name = ? COLLATE NOCASE').get(body.department_name);
        if (d) department_id = d.department_id;
      }
      if (!department_id) {
        // default to first department if not found
        const first = db.prepare('SELECT department_id FROM departments ORDER BY department_id LIMIT 1').get();
        if (first) department_id = first.department_id;
      }
    }
    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Name must be 2-80 characters');
    if (!EMAIL_RE.test(email) || !email.endsWith('@gmail.com')) throw new HttpError(400, 'Email must be a valid @gmail.com address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (!/[A-Z]/.test(password)) throw new HttpError(400, 'Password must contain at least 1 uppercase letter');
    if (!/[a-z]/.test(password)) throw new HttpError(400, 'Password must contain at least 1 lowercase letter');
    if (!/[0-9]/.test(password)) throw new HttpError(400, 'Password must contain at least 1 number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) throw new HttpError(400, 'Password must contain at least 1 special character');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'An account with this email already exists');
    const r = db.prepare('INSERT INTO users (name, email, password, role, department_id, created_at) VALUES (?,?,?,?,?,?)')
      .run(name, email, hashPassword(password), role, department_id, new Date().toISOString());
    return [201, { user_id: Number(r.lastInsertRowid), name, email, role, department_id }];
  });

  route('POST', '/api/login', { auth: false }, ({ body }) => {
    const email = String(body.email ?? '').trim().toLowerCase();
    const u = db.prepare(
      `SELECT u.*, d.department_name FROM users u LEFT JOIN departments d ON d.department_id = u.department_id WHERE u.email = ?`
    ).get(email);
    if (!u || !verifyPassword(String(body.password ?? ''), u.password)) throw new HttpError(401, 'Invalid email or password');
    const token = randomBytes(32).toString('hex');
    const created = new Date();
    const expires = new Date(created.getTime() + SESSION_DAYS * 86400000);
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)')
      .run(token, u.user_id, created.toISOString(), expires.toISOString());
    return { token, user: publicUser(u) };
  });

  // ---------- authenticated routes ----------
  route('POST', '/api/logout', {}, ({ token }) => {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return { ok: true };
  });

  route('GET', '/api/me', {}, ({ user }) => publicUser(user));

  route('POST', '/api/issues', { roles: ['student', 'faculty'] }, ({ user, body }) =>
    [201, createIssue(db, user, body, uploadDir)]);

  route('GET', '/api/issues', {}, ({ user, query }) => listIssues(db, user, query));
  route('GET', '/api/issues/:id', {}, ({ user, params }) => getIssue(db, user, params.id));
  route('PATCH', '/api/issues/:id', { roles: ['staff', 'admin'] }, ({ user, params, body }) =>
    updateIssue(db, user, params.id, body));

  route('GET', '/api/stats', { roles: ['staff', 'admin'] }, ({ user }) => getStats(db, user));

  route('POST', '/api/classify', { auth: false }, ({ body }) => {
    return aiClassify(String(body.text ?? ''));
  });

  route('GET', '/api/announcement', { auth: false }, () => {
    const row = db.prepare('SELECT message, active, updated_at FROM announcements ORDER BY id DESC LIMIT 1').get();
    return row || { message: '', active: 0 };
  });

  route('POST', '/api/announcement', { roles: ['admin'] }, ({ body }) => {
    const message = String(body.message ?? '').trim();
    const active = body.active !== false ? 1 : 0;
    if (!message) throw new HttpError(400, 'Announcement message is required');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO announcements (message, active, updated_at) VALUES (?,?,?)').run(message, active, now);
    return { message, active, updated_at: now };
  });

  route('GET', '/api/users', { roles: ['admin'] }, () =>
    db.prepare(
      `SELECT u.user_id, u.name, u.email, u.role, u.department_id, d.department_name, u.created_at
       FROM users u LEFT JOIN departments d ON d.department_id = u.department_id ORDER BY u.user_id`
    ).all());

  route('POST', '/api/users', { roles: ['admin'] }, ({ body }) => {
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const role = ['student', 'faculty', 'staff', 'admin'].includes(body.role) ? body.role : 'student';
    let deptId = null;

    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Name must be 2-80 characters');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'An account with this email already exists');

    if (role === 'staff') {
      deptId = Number(body.department_id);
      if (!deptId || !db.prepare('SELECT 1 FROM departments WHERE department_id = ?').get(deptId)) {
        throw new HttpError(400, 'Please select a valid department for staff');
      }
    }

    const now = new Date().toISOString();
    const r = db.prepare('INSERT INTO users (name, email, password, role, department_id, created_at) VALUES (?,?,?,?,?,?)')
      .run(name, email, hashPassword(password), role, deptId, now);
    const u = db.prepare(
      'SELECT u.*, d.department_name FROM users u LEFT JOIN departments d ON d.department_id = u.department_id WHERE u.user_id = ?'
    ).get(Number(r.lastInsertRowid));
    return [201, publicUser(u)];
  });

  route('DELETE', '/api/users/:id', { roles: ['admin'] }, ({ user, params }) => {
    const targetId = Number(params.id);
    if (targetId === user.user_id) throw new HttpError(400, 'You cannot delete your own admin account');
    const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(targetId);
    if (!existing) throw new HttpError(404, 'User not found');
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM users WHERE user_id = ?').run(targetId);
    return { ok: true, deleted: targetId };
  });

  // ---------- helpers ----------
  function publicUser(u) {
    return { user_id: u.user_id, name: u.name, email: u.email, role: u.role,
             department_id: u.department_id ?? null, department_name: u.department_name ?? null };
  }

  function authenticate(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return {};
    const user = db.prepare(
      `SELECT u.user_id, u.name, u.email, u.role, u.department_id, d.department_name
       FROM sessions s JOIN users u ON u.user_id = s.user_id
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE s.token = ? AND s.expires_at > ?`
    ).get(token, new Date().toISOString());
    return { token, user };
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) { reject(new HttpError(413, 'Request body too large')); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new HttpError(400, 'Invalid JSON body')); }
      });
      req.on('error', reject);
    });
  }

  function send(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  }

  async function serveFile(res, baseDir, relPath) {
    const full = path.normalize(path.join(baseDir, relPath));
    if (!full.startsWith(baseDir + path.sep) && full !== baseDir) return send(res, 403, { error: 'Forbidden' });
    try {
      const data = await readFile(full);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch {
      send(res, 404, { error: 'Not found' });
    }
  }

  // ---------- server ----------
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const { pathname } = url;

      if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
        return await serveFile(res, path.resolve(uploadDir), decodeURIComponent(pathname.slice('/uploads/'.length)));
      }

      const match = routes
        .map((r) => ({ r, m: r.method === req.method ? r.regex.exec(pathname) : null }))
        .find((x) => x.m);

      if (!match) {
        if (req.method === 'GET' && !pathname.startsWith('/api/')) {
          return await serveFile(res, PUBLIC_DIR, pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
        }
        throw new HttpError(404, 'Not found');
      }

      const { r, m } = match;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const ctx = { params, query: Object.fromEntries(url.searchParams), body: {} };

      if (r.auth) {
        const { token, user } = authenticate(req);
        if (!user) throw new HttpError(401, 'Please log in to continue');
        if (r.roles && !r.roles.includes(user.role)) throw new HttpError(403, 'You are not allowed to do this');
        Object.assign(ctx, { token, user });
      }
      if (['POST', 'PATCH', 'PUT'].includes(req.method)) ctx.body = await readBody(req);

      const result = await r.handler(ctx);
      if (Array.isArray(result) && typeof result[0] === 'number') send(res, result[0], result[1]);
      else send(res, 200, result);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: 'Internal server error' });
    }
  });

  return { server, db };
}
