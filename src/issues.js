import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { tx } from './db.js';
import { HttpError } from './errors.js';
import { CATEGORIES, PRIORITIES, STATUSES, departmentFor, resolvePriority, isForwardMove } from './routing.js';

const now = () => new Date().toISOString();

const SELECT = `
  SELECT i.*, d.department_name, u.name AS reporter_name, u.email AS reporter_email
  FROM issues i
  JOIN departments d ON d.department_id = i.department_id
  JOIN users u ON u.user_id = i.user_id`;

const DEFAULT_REMARKS = {
  Assigned: 'Issue accepted by the department',
  'In Progress': 'Work on the issue has started',
  Resolved: 'Issue resolved',
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function canAccess(user, issue) {
  if (user.role === 'admin') return true;
  if (user.role === 'staff') return issue.department_id === user.department_id;
  return issue.user_id === user.user_id;
}

function saveImage(dataUrl, uploadDir) {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'Image must be a PNG, JPEG or WebP file');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(400, 'Image is larger than 2 MB');
  const okMagic =
    (m[1] === 'png' && buf.subarray(0, 4).toString('hex') === '89504e47') ||
    (m[1] === 'jpeg' && buf.subarray(0, 3).toString('hex') === 'ffd8ff') ||
    (m[1] === 'webp' && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP');
  if (!okMagic) throw new HttpError(400, 'File content does not match its image type');
  const name = `${randomBytes(12).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  writeFileSync(path.join(uploadDir, name), buf);
  return name;
}

function logUpdate(db, issueId, status, remarks, userId) {
  db.prepare('INSERT INTO issue_updates (issue_id, status, remarks, updated_by, updated_at) VALUES (?,?,?,?,?)')
    .run(issueId, status, remarks, userId, now());
}

export function createIssue(db, user, input, uploadDir) {
  const category = String(input.category ?? '');
  const location = String(input.location ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (!CATEGORIES[category]) throw new HttpError(400, 'Please choose a valid category');
  if (location.length < 2 || location.length > 100) throw new HttpError(400, 'Location must be 2-100 characters');
  if (description.length < 5 || description.length > 1000) throw new HttpError(400, 'Description must be 5-1000 characters');

  let dept = null;
  if (input.department_id) {
    dept = db.prepare('SELECT department_id, department_name FROM departments WHERE department_id = ?').get(Number(input.department_id));
  }
  if (!dept) {
    const deptName = departmentFor(category);
    dept = db.prepare('SELECT department_id, department_name FROM departments WHERE department_name = ?').get(deptName);
  }
  if (!dept) throw new HttpError(400, 'Please select a valid department');

  const deptName = dept.department_name;
  const priority = resolvePriority(input.priority, description);
  const image = input.image ? saveImage(input.image, uploadDir) : null;
  const ts = now();

  const id = tx(db, () => {
    const r = db.prepare(
      `INSERT INTO issues (user_id, category, description, location, priority, department_id, status, image, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(user.user_id, category, description, location, priority, dept.department_id, 'Submitted', image, ts, ts);
    const issueId = Number(r.lastInsertRowid);
    logUpdate(db, issueId, 'Submitted', `Issue reported and assigned to the ${deptName} department`, user.user_id);
    return issueId;
  });
  return getIssue(db, user, id);
}

export function listIssues(db, user, filters = {}) {
  const where = [];
  const params = [];
  if (user.role === 'student' || user.role === 'faculty') { where.push('i.user_id = ?'); params.push(user.user_id); }
  if (user.role === 'staff') { where.push('i.department_id = ?'); params.push(user.department_id); }
  if (filters.status && STATUSES.includes(filters.status)) { where.push('i.status = ?'); params.push(filters.status); }
  if (filters.priority && PRIORITIES.includes(filters.priority)) { where.push('i.priority = ?'); params.push(filters.priority); }
  if (filters.department_id && user.role === 'admin') { where.push('i.department_id = ?'); params.push(Number(filters.department_id)); }
  const sql = `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY (i.status = 'Resolved'),
             CASE i.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
             i.created_at DESC`;
  return db.prepare(sql).all(...params);
}

export function getIssue(db, user, id) {
  const issue = db.prepare(`${SELECT} WHERE i.issue_id = ?`).get(Number(id));
  if (!issue) throw new HttpError(404, 'Issue not found');
  if (!canAccess(user, issue)) throw new HttpError(403, 'You do not have access to this issue');
  const updates = db.prepare(
    `SELECT up.update_id, up.status, up.remarks, up.updated_at, u.name AS updated_by_name, u.role AS updated_by_role
     FROM issue_updates up JOIN users u ON u.user_id = up.updated_by
     WHERE up.issue_id = ? ORDER BY up.update_id`
  ).all(issue.issue_id);
  return { ...issue, updates };
}

export function updateIssue(db, user, id, patch) {
  if (user.role !== 'staff' && user.role !== 'admin') throw new HttpError(403, 'Only department staff or admins can update issues');
  const issue = getIssue(db, user, id); // also enforces department access
  const { status, priority, department_id } = patch;
  const remarks = typeof patch.remarks === 'string' ? patch.remarks.trim().slice(0, 500) : '';
  let changed = false;

  tx(db, () => {
    let current = issue.status;

    if (department_id !== undefined && Number(department_id) !== issue.department_id) {
      if (user.role !== 'admin') throw new HttpError(403, 'Only admins can reassign issues');
      const dept = db.prepare('SELECT department_name FROM departments WHERE department_id = ?').get(Number(department_id));
      if (!dept) throw new HttpError(400, 'Unknown department');
      db.prepare('UPDATE issues SET department_id = ? WHERE issue_id = ?').run(Number(department_id), issue.issue_id);
      logUpdate(db, issue.issue_id, current, `Reassigned from ${issue.department_name} to ${dept.department_name}`, user.user_id);
      changed = true;
    }

    if (priority !== undefined && priority !== issue.priority) {
      if (!PRIORITIES.includes(priority)) throw new HttpError(400, 'Invalid priority');
      db.prepare('UPDATE issues SET priority = ? WHERE issue_id = ?').run(priority, issue.issue_id);
      logUpdate(db, issue.issue_id, current, `Priority changed from ${issue.priority} to ${priority}`, user.user_id);
      changed = true;
    }

    if (status !== undefined && status !== issue.status) {
      if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');
      if (!isForwardMove(issue.status, status)) throw new HttpError(400, `Cannot move an issue from ${issue.status} back to ${status}`);
      if (status === 'Resolved' && !remarks) throw new HttpError(400, 'Resolution remarks are required to resolve an issue');
      const ts = now();
      db.prepare('UPDATE issues SET status = ?, resolved_at = ? WHERE issue_id = ?')
        .run(status, status === 'Resolved' ? ts : null, issue.issue_id);
      logUpdate(db, issue.issue_id, status, remarks || DEFAULT_REMARKS[status], user.user_id);
      current = status;
      changed = true;
    } else if (remarks && (status === undefined || status === issue.status)) {
      logUpdate(db, issue.issue_id, current, remarks, user.user_id);
      changed = true;
    }

    if (!changed) throw new HttpError(400, 'No changes were supplied');
    db.prepare('UPDATE issues SET updated_at = ? WHERE issue_id = ?').run(now(), issue.issue_id);
  });

  return getIssue(db, user, id);
}

export function getStats(db, user) {
  const scoped = user.role === 'staff';
  const where = scoped ? 'WHERE department_id = ?' : '';
  const params = scoped ? [user.department_id] : [];

  const t = db.prepare(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status != 'Resolved'), 0) AS pending,
            COALESCE(SUM(status = 'Resolved'), 0) AS resolved,
            COALESCE(SUM(status = 'Submitted'), 0) AS submitted,
            COALESCE(SUM(status = 'Assigned'), 0) AS assigned,
            COALESCE(SUM(status = 'In Progress'), 0) AS in_progress,
            AVG(CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at) - julianday(created_at)) * 24 END) AS avg_hours
     FROM issues ${where}`
  ).get(...params);

  const by_priority = db.prepare(`SELECT priority, COUNT(*) AS count FROM issues ${where} GROUP BY priority`).all(...params);
  const by_department = scoped ? [] : db.prepare(
    `SELECT d.department_name AS name, COUNT(i.issue_id) AS total,
            COALESCE(SUM(i.status != 'Resolved'), 0) AS pending,
            COALESCE(SUM(i.status = 'Resolved'), 0) AS resolved
     FROM departments d LEFT JOIN issues i ON i.department_id = d.department_id
     GROUP BY d.department_id ORDER BY total DESC, d.department_name`
  ).all();
  const by_category = db.prepare(
    `SELECT category, COUNT(*) AS count FROM issues ${where} GROUP BY category ORDER BY count DESC LIMIT 5`
  ).all(...params);

  return {
    total: t.total, pending: t.pending, resolved: t.resolved,
    submitted: t.submitted, assigned: t.assigned, in_progress: t.in_progress,
    avg_resolution_hours: t.avg_hours === null ? null : Math.round(t.avg_hours * 10) / 10,
    by_priority, by_department, by_category,
  };
}
