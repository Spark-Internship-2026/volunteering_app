# Practice PR: join the roster

A practice run of the full process: branch, PR, checks, review, merge, deploy. You add one file about yourself to the `roster/` folder, one file per person, so PRs never conflict. You don't change the app.

Before you start, finish [SETUP](SETUP.md) and make sure the maintainer has added your GitHub account to the repo.

## 1. Get the latest code and make a branch

```bash
git checkout main
git pull origin main
git checkout -b roster/<your-github-username>
```

## 2. Add your file

```bash
cp roster/TEMPLATE.md roster/<your-github-username>.md
```

Open `roster/<your-github-username>.md` and fill in your name, your GitHub username and a fun fact about yourself. Only add your own file.

## 3. Check your work and run the app

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

Open http://localhost:3000. The password for every account below is `localdev123`.

1. **Staff creates an event.** Log in as `staff-events@example.com`, click **Events**, then create a new event. Use your GitHub username in the title (for example `[yourname] Test event`) and pick a date in the future, since signups close once an event has passed.
2. **Student signs up.** Log out, log in as `student1@example.com`, find your event and click **Sign up**. Take **screenshot 1**: the student view showing you are signed up.
3. **Staff sees the signup.** Log out, log back in as `staff-events@example.com`, and open your event from **Events**. Take **screenshot 2**: the event page showing `Student One` in the roster.

Take screenshots with Mac `Cmd + Shift + 4` or Windows `Win + Shift + S`. Each one must show the app at localhost:3000. Press `Ctrl+C` once to stop the app.

## 4. Save and upload

```bash
git add roster/<your-github-username>.md
git commit -m "Add <your-github-username> to the roster"
git push -u origin roster/<your-github-username>
```

## 5. Open a pull request

Click **Compare & pull request**. Fill in the template:

- **What this PR does:** "Adds my roster file."
- **Proof it works:** both screenshots from step 3. Drag the images into the box.
- **Firestore changes:** write "none" in each field.

## 6. Watch the checks

**check**, **proof** and **preview** should go green. If one is red, see [What the checks mean](MAKING_A_PULL_REQUEST.md#what-the-checks-mean).

## 7. Review and merge

1. Ask a teammate to approve your PR.
2. If it says "This branch is out-of-date", click **Update branch** and wait for the checks again. This will happen when others merge first. It's normal.
3. Click **Squash and merge**.

## 8. See it deploy

Go to the **Actions** tab and find the **Deploy staging** run for your merge. Wait for the green check. The roster file doesn't change how the site looks, so the proof that it deployed is the green run and your file appearing in `main` under `roster/`.

Only the maintainer deploys to production.
