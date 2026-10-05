// Populates the database with demo users and issues (used for demos / screenshots).
// Usage: DB_PATH=data/tracker.db npm run seed:demo
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { openDb, hashPassword } from '../src/db.js';
import { createIssue, updateIssue } from '../src/issues.js';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'tracker.db');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
mkdirSync(path.dirname(DB_PATH), { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });
const db = openDb(DB_PATH);

const add = (name, email, role) => {
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return existing;
  db.prepare('INSERT INTO users (name, email, password, role, created_at) VALUES (?,?,?,?,?)')
    .run(name, email, hashPassword('demo123'), role, new Date().toISOString());
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
};
const user = (email) => db.prepare('SELECT u.*, d.department_name FROM users u LEFT JOIN departments d USING(department_id) WHERE email = ?').get(email);

add('Aarav Sharma', 'aarav@student.edu', 'student');
add('Priya Nair', 'priya@faculty.edu', 'faculty');
add('Rohan Mehta', 'rohan@student.edu', 'student');
add('Sneha Kulkarni', 'sneha@student.edu', 'student');

const people = ['aarav@student.edu', 'priya@faculty.edu', 'rohan@student.edu', 'sneha@student.edu'].map(user);
const staff = (d) => user(`${d.toLowerCase()}@campus.edu`);
const admin = user('admin@campus.edu');

const demo = [
  ['Projector', 'Lab 302', 'Projector is not displaying output.', 'Medium', 'Resolved', 'Replaced the HDMI cable and re-calibrated the projector.'],
  ['AC / Fan', 'Room 204', 'Fan in Room 204 is not working.', 'Medium', 'In Progress', 'Technician has been assigned and is checking the capacitor.'],
  ['Electrical (Light / Socket)', 'Lab 101', 'Power socket near bench 4 is sparking when plugged in.', 'Low', 'Assigned', null],
  ['Wi-Fi / Network', 'Library', 'Wi-Fi keeps disconnecting on the second floor.', 'High', 'In Progress', 'Access point firmware is being upgraded.'],
  ['Water Leakage', 'Hostel Block A', 'Water leaking from the ceiling of the corridor.', 'High', 'Submitted', null],
  ['Furniture', 'Room 12', 'Two broken chairs in the back row.', 'Low', 'Resolved', 'Chairs replaced from the store room.'],
  ['Washroom', 'Ground Floor Washroom', 'Tap is broken and the floor is wet.', 'Medium', 'Assigned', null],
  ['Cleanliness', 'Canteen', 'Tables are not cleaned after lunch hours.', 'Low', 'Submitted', null],
  ['Computer / Lab Equipment', 'Lab 203', 'Three computers are not booting.', 'Medium', 'Resolved', 'Reinstalled the OS and replaced a faulty RAM module.'],
  ['Door / Window', 'Seminar Hall', 'Window latch is broken and the glass is loose.', 'Medium', 'Submitted', null],
  ['Projector', 'Room 101', 'Projector image is blurry and keeps flickering.', 'Medium', 'Submitted', null],
  ['Classroom Infrastructure', 'Room 305', 'Whiteboard is cracked and the marker tray is missing.', 'Low', 'Resolved', 'Whiteboard replaced.'],
  ['AC / Fan', 'Admin Office', 'AC is not cooling properly.', 'Medium', 'Assigned', null],
  ['Other', 'Admin Office', 'Notice board near the entrance has fallen off the wall.', 'Low', 'In Progress', 'Carpenter has been requested.'],
  ['Wi-Fi / Network', 'Lab 203', 'Complete network outage in Lab 203.', 'Medium', 'Resolved', 'Replaced the faulty switch.'],
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
demo.forEach(([category, location, description, priority, target, remarks], i) => {
  const reporter = people[i % people.length];
  const issue = createIssue(db, reporter, { category, location, description, priority }, UPLOAD_DIR);
  const dept = staff(issue.department_name);
  const flow = ['Assigned', 'In Progress', 'Resolved'];
  for (const s of flow.slice(0, flow.indexOf(target) + 1)) {
    updateIssue(db, dept, issue.issue_id, { status: s, remarks: s === target ? remarks ?? undefined : undefined });
  }
  // spread timestamps over the last few days so the dashboard looks realistic
  const created = hoursAgo(120 - i * 7);
  db.prepare('UPDATE issues SET created_at = ?, updated_at = ? WHERE issue_id = ?').run(created, created, issue.issue_id);
  db.prepare('UPDATE issue_updates SET updated_at = ? WHERE issue_id = ?').run(created, issue.issue_id);
  if (target === 'Resolved') {
    const resolved = new Date(new Date(created).getTime() + (3 + (i % 5) * 4) * 3600000).toISOString();
    db.prepare('UPDATE issues SET resolved_at = ?, updated_at = ? WHERE issue_id = ?').run(resolved, resolved, issue.issue_id);
  }
});
void admin;
console.log(`Seeded demo data into ${DB_PATH}`);
