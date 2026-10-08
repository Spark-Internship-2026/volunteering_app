# Setup

Get the app running on your own laptop. Everything here uses **fake data on your machine**, so you cannot break anything real.

[Back to the README](../README.md) · Next: [Making a pull request](MAKING_A_PULL_REQUEST.md)

## Install these tools

You need **Git**, **Node.js** (22 or newer), **Java** (21 or newer, for the Firebase emulator) and a code editor like VS Code.

**Mac** (install [Homebrew](https://brew.sh) first):

```bash
brew install git node openjdk
```

**Ubuntu / WSL (Windows):**

Note: for WSL, we recommend running the `wsl` command from your terminal/PowerShell, which will open up a new instance of WSL to run on.

```bash
sudo apt update && sudo apt install -y git openjdk-21-jdk
curl -fsSL https://fnm.vercel.app/install | bash   # then open a new terminal
fnm install 24
```

**PowerShell (Windows):**

Unless you cannot get WSL to work, we recommend running on WSL instead for your Windows device. Otherwise, run the following:

```powershell
winget install Git.Git OpenJS.NodeJS.LTS Microsoft.OpenJDK.21
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # lets PowerShell run npm; no admin needed
```

Then close PowerShell and open a new one so it finds the new tools. If you can't use `winget`, download the installers instead: [Git](https://git-scm.com/download/win), [Node.js LTS](https://nodejs.org) (22 or newer) and [Java 21](https://learn.microsoft.com/java/openjdk/download). If the Java installer asks, tick **Add to PATH**. Use the `npm run ...` commands below as written. If you'd rather use **WSL** (Linux inside Windows), run `wsl --install` in an administrator PowerShell, restart, and follow the Ubuntu steps.

Next, check that each command prints a version number:

```bash
git --version
node --version
java -version
```

Finally, follow these instructions to connect **Git** to your GitHub account: https://docs.github.com/en/get-started/git-basics/set-up-git. Basic steps:
- Download `gh` ([instructions link](https://github.com/cli/cli#installation))
- Set your git name and email
- `gh auth login` (stick to http downloads)

## Get the code

Ask the maintainer to add your GitHub account to the repo first. You need write access to push a branch.

*Note for WSL users: before running the commands below, ensure that your directory is in `/mnt/c/Users/<user>/`. If you are in another directory that doesn't start with this prefix, please run `cd /mnt/c/Users/<user>/` to navigate there. You may run into permission issues otherwise in a different directory.*

```bash
git clone https://github.com/Spark-PNW/volunteering_app
cd volunteering_app
npm install
```

## Run the app on your laptop

```bash
npm run dev:local
```

This starts two things together: a fake copy of Firebase (the emulators) and the website. Wait until you see lines saying the emulators are ready and `Ready` from Next.js (about 20 seconds).

Open **http://localhost:3000**. That is the app.

In a **second terminal window** (same folder), add sample data:

```bash
npm run seed:emulator
```

Log in with these sample accounts. The password for all of them is `localdev123`.

| Account | Role |
|---|---|
| `staff-auth@example.com`, `staff-student@example.com`, `staff-events@example.com`, `staff-staff@example.com` | staff (one per team) |
| `student1@example.com`, `student2@example.com`, `student3@example.com` | student |

You can also click **Sign up** to make your own account. Every new sign-up is a **student**. To make an account **staff** on your laptop:

```bash
npm run make-staff -- you@example.com
```

| Address | What it is |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:4000 | Emulator dashboard: look at the fake users and database, and read emulator logs |

To stop everything, press `Ctrl+C` **once** and wait a few seconds. Your fake data is saved in `.emulator-data/` and comes back next time. Delete that folder for a clean start.

## Config: you usually need none

Firebase needs six "web config" values to know which project to talk to. They are **not secret**, but they differ per environment.

- **On your laptop** you do not need them: `dev:local` uses the emulators.
- **To run against the real staging project** (rare), copy `.env.example` to `.env.local`, ask the maintainer for the values, then run `npm run dev`. `.env.local` is never uploaded to GitHub. Be careful: that is real, shared data.
- **On GitHub** they live in Settings > Environments (see [Deployments](DEPLOYMENTS.md)).

The values are baked into the site **when it is built**, so changing one means building again. Never paste tokens or passwords into code, commits, PR comments or chat.

## Command cheat sheet

Run these from the project folder.

| Command | What it does |
|---|---|
| `npm install` | Installs the libraries. Run after cloning and whenever `package.json` changes on `main`. |
| `npm run dev:local` | **Main command.** Emulators + app at http://localhost:3000 |
| `npm run dev:restricted` | Same as `dev:local`, but the emulators enforce the **restricted** rules that staging and production use. Use it to check that your change is allowed. |
| `npm run seed:emulator` | Adds sample users and events to the emulators (run while they are running; works with either rules) |
| `npm run make-staff -- you@example.com` | Makes an existing emulator user staff |
| `npm run verify-email -- you@example.com` | Marks an existing emulator user's email as verified (instead of opening the link) |
| `npm run emulators:strict` | Emulators with the strict rules (see the PR guide) |
| `npm run lint` | Checks for code mistakes |
| `npm run build` | Compiles the app (also checks types) |
| `npm run rules:test` | Tests the security rules |
| `npm run preview:cf` | Runs the Cloudflare version locally at http://localhost:8787 |
| `npm run dev` | App only, using `.env.local` (real Firebase, be careful) |
| `npm run rules:deploy:staging` | **Maintainer.** Publishes the restricted rules to staging |
| `npm run rules:deploy:restricted` | **Maintainer.** Publishes the restricted rules to production |
| `npm run rules:deploy` | **Maintainer.** Publishes the strict (launch) rules to production |
| `npm run rules:deploy:dev` | **Maintainer.** Publishes the open rules to staging (only if you need them, for example to seed) |
| `npm run seed:staff` | **Maintainer.** Creates the four staff accounts on staging. Only works while staging runs the open rules. |
| `npm run reset:cloud` | **Maintainer.** Deletes the events, signups and templates on staging (keeps users). Careful! |

## When something breaks

| What you see | What to try |
|---|---|
| `Missing or insufficient permissions` | It's the security rules. See the rules section of the [PR guide](MAKING_A_PULL_REQUEST.md#firebase-and-the-security-rules). Check the emulator log at http://localhost:4000 or the terminal running `dev:local`: it names the rule that said no. |
| "Confirm this account has role: staff" | Your account is a student. Locally run `npm run make-staff -- your@email`. On staging use a seeded staff account. |
| `Unable to locate a Java Runtime` or the emulators won't start | Install Java 21+ (above). Open a new terminal afterwards. |
| `Port 8080 is not open` or `port taken` | An old emulator is still running. Close other terminals running `dev:local`, or run `lsof -ti tcp:8080 tcp:9099 tcp:3000 \| xargs kill` (Mac/Linux) or `Get-NetTCPConnection -State Listen -LocalPort 8080,9099,3000 \| % { Stop-Process -Id $_.OwningProcess -Force }` (PowerShell). |
| PowerShell: `running scripts is disabled on this system` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then open a new PowerShell. |
| Windows: `Terminate batch job (Y/N)?` after `Ctrl+C` | Type `Y`. If your sample data is gone next time, run `npm run seed:emulator` again. |
| Page is blank or stuck loading | Look at the terminal running the app for red errors, and open the browser console (right-click > Inspect > Console). |
| Stuck on "Verify your email" | New accounts must click a verification link. The emulator doesn't send email: copy the link from the `npm run dev:local` terminal (the line starting "To verify the email address"), open it, then click **I've verified it**. Or run `npm run verify-email -- your@email`. Seeded accounts are verified by `npm run seed:emulator`; run it again if they are not. |
| Login says the user doesn't exist | The emulator was reset or is empty. Run `npm run seed:emulator` again, or sign up. |
| `npm run lint` fails | Read the file and line it names. Ask an AI assistant to explain it. |
| PR check is red | Click the red mark on the PR, then **Details**, and read the last lines of the log. |
| PR says "branch is out-of-date" | Click **Update branch**, or `git pull origin main` and push. |
| Merge conflict | Two people changed the same lines. Open the file, look for `<<<<<<<` markers, keep the right parts, delete the markers, commit. Ask for help if unsure. |
| Preview link says 404 right after it appears | Wait about 20 seconds and reload. |
| Something feels off after a big change | Delete the `.next/` folder and restart. |

Next: [Making a pull request](MAKING_A_PULL_REQUEST.md)
