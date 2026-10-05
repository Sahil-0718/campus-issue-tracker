import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const DEPARTMENTS = ['IT', 'Electrical', 'Maintenance', 'Plumbing', 'Housekeeping', 'Administration'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS departments (
  department_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  department_name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','faculty','staff','admin')),
  department_id INTEGER REFERENCES departments(department_id),
  created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS issues (
  issue_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(user_id),
  category      TEXT NOT NULL,
  description   TEXT NOT NULL,
  location      TEXT NOT NULL,
  priority      TEXT NOT NULL CHECK (priority IN ('Low','Medium','High')),
  department_id INTEGER NOT NULL REFERENCES departments(department_id),
  status        TEXT NOT NULL DEFAULT 'Submitted',
  image         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  resolved_at   TEXT
);
CREATE TABLE IF NOT EXISTS issue_updates (
  update_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id   INTEGER NOT NULL REFERENCES issues(issue_id),
  status     TEXT NOT NULL,
  remarks    TEXT,
  updated_by INTEGER NOT NULL REFERENCES users(user_id),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  message    TEXT NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_issues_user ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_dept ON issues(department_id);
CREATE INDEX IF NOT EXISTS idx_updates_issue ON issue_updates(issue_id);
`;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seed(db) {
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (department_name) VALUES (?)');
  DEPARTMENTS.forEach((d) => insertDept.run(d));

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;

  const now = new Date().toISOString();
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role, department_id, created_at) VALUES (?,?,?,?,?,?)'
  );
  insertUser.run('System Admin', 'admin@campus.edu', hashPassword(process.env.ADMIN_PASSWORD || 'admin123'), 'admin', null, now);
  for (const d of DEPARTMENTS) {
    const { department_id } = db.prepare('SELECT department_id FROM departments WHERE department_name=?').get(d);
    insertUser.run(`${d} Staff`, `${d.toLowerCase()}@campus.edu`, hashPassword('staff123'), 'staff', department_id, now);
  }
  insertUser.run('Aarav Sharma', 'aarav@student.edu', hashPassword('demo123'), 'student', null, now);
  insertUser.run('Rohan Mehta', 'rohan@student.edu', hashPassword('demo123'), 'student', null, now);
  insertUser.run('Priya Nair', 'priya@faculty.edu', hashPassword('demo123'), 'faculty', null, now);

  const { anc } = db.prepare('SELECT COUNT(*) AS anc FROM announcements').get();
  if (anc === 0) {
    db.prepare('INSERT INTO announcements (message, active, updated_at) VALUES (?,1,?)')
      .run('📢 Notice: Scheduled electrical inspection in Engineering Block on Friday. Non-urgent issues will be processed within 24h.', now);
  }
}

export function openDb(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  seed(db);
  return db;
}
