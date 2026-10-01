# Spark Volunteering App

A website where students sign up for volunteering events and staff create and manage those events.

New here? Start with [Day 1](#day-1-your-first-pull-request). The three guides below are for after that.

## Day 1: your first pull request

This is the only thing you need to do on day 1. You will run the app, then add one file about yourself to the `roster/` folder (one file per person, so PRs never conflict), open a pull request, and watch it deploy to staging. You don't change the app.

You don't need a Firebase or Cloudflare account. Everything runs on fake data on your laptop.

### 1. Install the tools

You need **Git**, **Node.js** (22 or newer), **Java** (21 or newer, for the Firebase emulator) and a code editor like VS Code.

**Mac** (install [Homebrew](https://brew.sh) first):

```bash
brew install git node openjdk
```

Follow these extra instructions to connect Git to your GitHub account: https://docs.github.com/en/get-started/git-basics/set-up-git. Basic steps:
- Download `gh` ([instructions link](https://github.com/cli/cli#installation))
- Set your git name and email
- `gh auth login` (stick to http downloads)

**Ubuntu / WSL:**

```bash
sudo apt update && sudo apt install -y git openjdk-21-jdk
curl -fsSL https://fnm.vercel.app/install | bash   # then open a new terminal
fnm install 24
```

**Windows (PowerShell):**

Unless you cannot get WSL to work, we recommend running on WSL instead for your Windows device. Otherwise, run the following:

```powershell
winget install Git.Git OpenJS.NodeJS.LTS Microsoft.OpenJDK.21
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # lets PowerShell run npm; no admin needed
```

Then close PowerShell and open a new one. No `winget`? See [SETUP](docs/SETUP.md#install-these-tools) for download links. WSL also works: follow the Ubuntu steps inside it.

Check that each command prints a version number:

```bash
git --version
node --version
java -version
```

### 2. Get the code

Ask the maintainer to add your GitHub account to the repo first. You need write access to push a branch.

```bash
git clone https://github.com/Spark-PNW/volunteering_app
cd volunteering_app
npm install
```

### 3. Get the latest code and make a branch

```bash
git checkout main
git pull origin main
git checkout -b roster/<your-github-username>
```

### 4. Add your file

```bash
cp roster/TEMPLATE.md roster/<your-github-username>.md
```

Open `roster/<your-github-username>.md` and fill in your name, your GitHub username and a fun fact about yourself. Only add your own file.

### 5. Check your work and run the app

```bash
npm run lint
npm run build
npm run dev:local
```

In a second terminal, add the sample accounts:

```bash
npm run seed:emulator
```

Run `seed:emulator` once. The emulator starts empty, so the sample accounts don't exist until you do, and they come back on later runs because your data is saved.

Open http://localhost:3000. The staff account's password is `localdev123`.

1. **Staff creates an event.** Log in as `staff-events@example.com`, click **Events**, then create a new event. Use your GitHub username in the title (for example `[yourname] Test event`) and pick a date in the future, since signups close once an event has passed.
2. **Student signs up.** Log out, click **Sign up** to make your own student account (use your own name, any email like `you@example.com`, and any password), find your event and click **Sign up** on it. Take **screenshot 1**: the student view showing you are signed up.
3. **Staff sees the signup.** Log out, log back in as `staff-events@example.com`, and open your event from **Events**. Take **screenshot 2**: the event page showing your student account's name in the roster.

Take screenshots with Mac `Cmd + Shift + 4` or Windows `Win + Shift + S`. Each one must show the app at localhost:3000. Press `Ctrl+C` once to stop the app.

### 6. Save and upload

```bash
git add roster/<your-github-username>.md
git commit -m "Add <your-github-username> to the roster"
git push -u origin roster/<your-github-username>
```

### 7. Open a pull request

Click **Compare & pull request**. Fill in the template:

- **What this PR does:** "Adds my roster file."
- **Proof it works:** both screenshots from step 3. Drag the images into the box.
- **Firestore changes:** write "none" in each field.

### 8. Watch the checks

**check**, **proof** and **preview** should go green. If one is red, see [What the checks mean](docs/MAKING_A_PULL_REQUEST.md#what-the-checks-mean).

### 9. Review and merge

1. Ask a teammate to approve your PR.
2. If it says "This branch is out-of-date", click **Update branch** and wait for the checks again. This will happen when others merge first. It's normal.
3. Click **Squash and merge**.

### 10. See it deploy

Go to the **Actions** tab and find the **Deploy staging** run for your merge. Wait for the green check. The roster file doesn't change how the site looks, so the proof that it deployed is the green run and your file appearing in `main` under `roster/`.

Only the maintainer deploys to production.

---

## The guides

| # | Guide | Read it when |
|---|---|---|
| 1 | **[SETUP](docs/SETUP.md)** | You are installing tools and running the app on your laptop for the first time. Also the place to look when something breaks. |
| 2 | **[MAKING A PULL REQUEST](docs/MAKING_A_PULL_REQUEST.md)** | You are about to change the code. Covers branches, proof that it works, review, security rules and using AI tools. |
| 3 | **[DEPLOYMENTS](docs/DEPLOYMENTS.md)** | You want to know where the app runs, how changes go live, or you are the maintainer. |

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
| **Component** | A reusable piece of a page, like a form or a list. Lives in a team's folder under `features/`. |
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
app/                 The pages. Each folder is a web address. These files are tiny:
                       they just pick a feature to show.
  login/, signup/      /login, /signup
  dashboard/           /dashboard (the home screen after login)
  staff/               /staff/... pages that only staff can use
features/            The real code, one folder per team (see features/README.md)
  accounts/            Account & Authentication
  student-experience/  Student Volunteer Experience
  event-management/    Event Management
  staff-experience/    Staff Experience
shared/              Small pieces used by several teams (navigation links, types)
lib/
  firebase.ts          Connects the app to Firebase (and to the emulators locally)
  opportunities.ts     Helpers for event data (dates, hours, sorting)
  signups.ts           Helpers for signup ids
docs/                The three guides
firestore.rules            Strict security rules (the launch target)
firestore.restricted.rules Rules for production, staging and PR previews: blocks the dangerous things
firestore.dev.rules        Open security rules (your local emulator only)
tests/               Tests for the security rules and the PR proof check
scripts/             Helper scripts: seed.mjs (sample data), make-staff.mjs
.github/             PR template, code owners, and the robots (workflows)
wrangler.jsonc       Cloudflare settings
next.config.ts       Next.js settings
```

An **"opportunity"** in the code is a volunteering **event**. A **"signup"** is one student signing up for one event.

**Where each team works.** Each team owns one folder under `features/`. Read [`features/README.md`](features/README.md) for the file-by-file map.

| Team | Branch prefix | Folder |
|---|---|---|
| Account & Authentication | `auth/` | `features/accounts/` |
| Student Volunteer Experience | `student/` | `features/student-experience/` |
| Event Management | `events/` | `features/event-management/` |
| Staff Experience | `staff/` | `features/staff-experience/` |

The big pages (the staff event page and the public signup page) are **built from sections**, and each section is its own file owned by one team. **Add new UI as a new file in your own folder** and add one line to the page, instead of growing a file other teams also edit. That prevents most merge conflicts.
