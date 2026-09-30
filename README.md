# Spark Volunteering App

A website where students sign up for volunteering events and staff create and manage those events.

New to coding? Start here, then read the three guides in order.

## The guides

| # | Guide | Read it when |
|---|---|---|
| 1 | **[SETUP](docs/SETUP.md)** | You are installing tools and running the app on your laptop for the first time. Also the place to look when something breaks. |
| 2 | **[MAKING A PULL REQUEST](docs/MAKING_A_PULL_REQUEST.md)** | You are about to change the code. Covers branches, proof that it works, review, security rules and using AI tools. |
| 3 | **[DEPLOYMENTS](docs/DEPLOYMENTS.md)** | You want to know where the app runs, how changes go live, or you are the maintainer. |

**Fastest start** (after installing Git, Node and Java, see SETUP):

```bash
git clone https://github.com/Spark-PNW/volunteering_app
cd volunteering_app
npm install
npm run dev:local        # then open http://localhost:3000
npm run seed:emulator    # in a second terminal: adds sample accounts and events
```

## The big picture

Three services work together. You only ever edit the code in this repository.

```
   Your browser
        |
        |  1. asks for the website (pages, buttons, styling)
        v
  +-------------+
  | Cloudflare  |   hosts the website's code and sends it to browsers
  +-------------+

   Your browser
        |
        |  2. logs users in, saves and loads events and signups
        v
  +-------------+
  |  Firebase   |   keeps user accounts (login) and all the data (database)
  +-------------+

   GitHub keeps the code, runs automatic checks on every change,
   and tells Cloudflare when to publish a new version.
```

- **The app** is written with **Next.js**, which is built on **React**. Both are ways of writing web pages in TypeScript (JavaScript with extra safety checks).
- **Firebase** is Google's "backend in a box". This app has no server of its own. The browser talks straight to Firebase, and a file of **rules** decides who is allowed to read or change what.
- **Cloudflare** is the company that serves our website to visitors. We use its **Workers** product, which runs the app on their computers around the world.
- **GitHub** stores the code, lets us review each other's changes, and runs **GitHub Actions** (robots) that test and publish the site.

## Words you will see

| Word | What it means |
|---|---|
| **Git** | A tool that saves the history of every change to the code. |
| **Repository (repo)** | The project folder that Git tracks. |
| **Branch** | Your own copy of the code to work on without breaking anyone else. |
| **Commit** | A saved checkpoint of your changes, with a short message. |
| **Pull request (PR)** | "Please review my branch and add it to the main code." |
| **Merge** | Adding an approved branch into `main`. |
| **`main`** | The branch that holds the shared, working code. |
| **Node.js / npm** | Node runs JavaScript on your computer. npm installs libraries and runs the project's commands (`npm run ...`). |
| **Component** | A reusable piece of a page, like a form or a list. Lives in `components/`. |
| **Authentication (Auth)** | Logging in: proving who you are. |
| **Firestore** | Firebase's database. Data is stored as **documents** (like a form with named fields) inside **collections** (like folders). |
| **Security rules** | A file (`firestore.rules`) that says who may read or write which documents. |
| **Emulator** | A pretend copy of Firebase running on your own laptop, so you can test without touching real data. |
| **Environment** | A separate copy of the app: your laptop, staging or production. |
| **Preview URL** | A temporary website address made for one PR so you can try your change online. |
| **CI** | Automatic checks (lint, build, tests) that run on every PR. A green check means they passed. |
| **Deploy** | Publishing a version of the site so people can use it. |
| **Lint** | A tool that spots common mistakes and style problems in code. |

## A tour of the code

```
app/                 The pages. Each folder is a web address.
  login/, signup/      /login, /signup
  dashboard/           /dashboard (the home screen after login)
  staff/               /staff/... pages that only staff can use
components/          The building blocks used by pages (forms, lists, buttons)
lib/
  firebase.ts          Connects the app to Firebase (and to the emulators locally)
  opportunities.ts     Helpers for event data (dates, hours)
  signups.ts           Helpers for signup ids
docs/                The three guides
firestore.rules      Strict security rules
firestore.dev.rules  Open security rules (staging, emulator, and production for now)
tests/               Tests for the security rules and the PR proof check
scripts/             Helper scripts: seed.mjs (sample data), make-staff.mjs
.github/             PR template, code owners, and the robots (workflows)
wrangler.jsonc       Cloudflare settings
next.config.ts       Next.js settings
```

An **"opportunity"** in the code is a volunteering **event**. A **"signup"** is one student signing up for one event.

**Where each team mostly works** (to avoid stepping on each other):

| Team | Branch prefix | Mostly edits |
|---|---|---|
| Account & Authentication | `auth/` | `components/auth-form.tsx`, `app/login`, `app/signup`, guest-linking inside `components/opportunity-signup.tsx` |
| Student Volunteer Experience | `student/` | `components/dashboard.tsx`, `components/student-opportunities-list.tsx` |
| Event Management | `events/` | `components/create-opportunity-form.tsx`, new template and recurrence files, capacity in `components/opportunity-signup.tsx` |
| Staff Experience | `staff/` | `components/staff-opportunities-list.tsx`, `components/navigation-links.tsx`, `components/staff-gate.tsx` |

`components/opportunity-detail.tsx` is big and shared by several teams. **Put new UI in a new component file** and import it there, so you only make a small edit to the shared file. That prevents most merge conflicts.
