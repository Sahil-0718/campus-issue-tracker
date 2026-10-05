# Campus Digital Issue & Maintenance Tracker

*A DevOps-based web application using GitHub Actions and Docker* — ASDD Mini Project (Experiment 11)

Students and faculty report campus problems (Wi-Fi, projector, fan, leakage, furniture, washroom…).
Each issue is **automatically routed to the responsible department**, given a **priority**, and tracked
through `Submitted → Assigned → In Progress → Resolved`. Department staff work from their own dashboard and
the admin sees campus-wide analytics.

## Features

| Role | Capabilities |
| --- | --- |
| Student / Faculty | Register, login, report an issue (category, location, description, priority, photo), track status, view history and resolution |
| Department staff | Own dashboard (New / Assigned / In progress / Resolved), accept issue, change priority, update status, add remarks, resolve |
| Admin | Campus dashboard (totals, pending/resolved, issues by department, top categories, average resolution time), all issues with filters, reassign issues, view users |

**Rule-based department routing** (`src/routing.js`)

| Category | Department |
| --- | --- |
| Wi-Fi / Network, Computer / Lab Equipment, Projector | IT |
| Electrical (Light / Socket), AC / Fan | Electrical |
| Furniture, Door / Window, Classroom Infrastructure | Maintenance |
| Water Leakage | Plumbing |
| Washroom, Cleanliness | Housekeeping |
| Other | Administration |

**Priority system** — Low / Medium / High chosen by the reporter. Descriptions that mention a hazard
(sparking, short circuit, smoke, fire, flooding, exposed wire, outage …) are automatically escalated to **High**.

## Technology

* **Backend:** Node.js 22 (built-in `http` server) + REST API
* **Database:** SQLite through Node's built-in `node:sqlite` (tables: `users`, `departments`, `issues`, `issue_updates`, `sessions`)
* **Frontend:** HTML + CSS + vanilla JavaScript (no build step)
* **Security:** scrypt password hashing, random session tokens, role-based access control, parameterised SQL, upload validation (type, size, file signature), CSP and security headers
* **Testing:** Node's built-in test runner (`node:test`) — 24 tests
* **DevOps:** Git · GitHub · GitHub Actions (CI/CD) · Docker · Docker Hub

> The project has **zero npm dependencies**, so `npm ci`, the tests and the Docker image all work without downloading anything extra.

## Run locally

Requires **Node.js 22.13 or newer**.

```bash
npm start                 # http://localhost:3000
npm run seed:demo         # (optional) load demo users and issues - run once, before or after start
npm test                  # run the automated tests
```

Default accounts (created on first start):

| Account | Email | Password |
| --- | --- | --- |
| Admin | `admin@campus.edu` | `admin123` (override with `ADMIN_PASSWORD`) |
| Department staff | `it@campus.edu`, `electrical@campus.edu`, `maintenance@campus.edu`, `plumbing@campus.edu`, `housekeeping@campus.edu`, `administration@campus.edu` | `staff123` |
| Demo students (after `seed:demo`) | `aarav@student.edu`, `rohan@student.edu`, `sneha@student.edu` / faculty `priya@faculty.edu` | `demo123` |

Students and faculty can also register themselves from the login page.

Environment variables: `PORT` (3000), `DB_PATH` (`data/tracker.db`), `UPLOAD_DIR` (`data/uploads`), `ADMIN_PASSWORD`.

## Run with Docker

```bash
docker build -t campus-issue-tracker .
docker run -d -p 3000:3000 -v tracker-data:/data --name tracker campus-issue-tracker
# or
docker compose up -d
```

Open http://localhost:3000. Data (database + photos) lives in the `tracker-data` volume.

## CI/CD pipeline (`.github/workflows/ci-cd.yml`)

```
git push → GitHub → GitHub Actions
                      ├─ test          : npm ci, npm test
                      ├─ docker-build  : build image, run container, curl /health
                      └─ publish       : push image to Docker Hub (main branch only)
```

One-time setup on GitHub → *Settings → Secrets and variables → Actions*:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | a Docker Hub access token (Account settings → Security → New access token) |

Pull requests run `test` and `docker-build` only; the image is published only when code lands on `main`.
To deploy anywhere that has Docker: `DOCKERHUB_USERNAME=<you> docker compose pull && docker compose up -d`.

## Git workflow for the team

```bash
git init && git add . && git commit -m "Initial commit: campus issue tracker"
git branch -M main
git remote add origin https://github.com/<user>/campus-issue-tracker.git
git push -u origin main

# each member works on a branch and opens a pull request
git checkout -b feature/<name>
```

## REST API

| Method & path | Who | Purpose |
| --- | --- | --- |
| `GET /health` | public | health check (used by Docker and CI) |
| `GET /api/meta` | public | categories, priorities, statuses, departments |
| `POST /api/register` · `POST /api/login` · `POST /api/logout` · `GET /api/me` | — | accounts and sessions |
| `POST /api/issues` | student, faculty | report an issue (auto-routed) |
| `GET /api/issues?status=&priority=&department_id=` | all | role-scoped list |
| `GET /api/issues/:id` | owner, dept staff, admin | issue with full history |
| `PATCH /api/issues/:id` | staff, admin | update `status`, `priority`, `remarks` (admin: `department_id`) |
| `GET /api/stats` | staff, admin | dashboard statistics |
| `GET /api/users` | admin | list users |

## Project structure

```
server.js                 entry point
src/app.js                HTTP server, routing, auth, static files
src/issues.js             issue business logic and statistics
src/routing.js            department routing + priority rules
src/db.js                 schema, seed data, password hashing
public/                   frontend (index.html, style.css, app.js)
tests/                    automated tests
scripts/seed-demo.js      demo data
Dockerfile · docker-compose.yml · .github/workflows/ci-cd.yml
```

## Future scope

AI-based issue classification from free text · predictive maintenance for frequently failing equipment ·
QR codes in every classroom that pre-fill the location · e-mail / SMS notifications.
