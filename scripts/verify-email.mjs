// Mark an account's email as verified, so it gets past the verify-email page.
//
//   npm run verify-email -- dev@example.com            -> LOCAL Auth emulator
//   npm run verify-email -- dev@example.com --cloud    -> MAINTAINER ONLY. The project in
//       .env.local (staging by default). Needs a Google access token for an account
//       that can manage the project:
//         ACCESS_TOKEN=$(gcloud auth print-access-token) npm run verify-email -- <email> --cloud
//       Used for shared test accounts that can't receive email (staff-*@example.com).
import { existsSync, readFileSync } from "node:fs";

const email = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const cloud = process.argv.includes("--cloud");
if (!email) {
  console.error("Usage: npm run verify-email -- <email> [--cloud]");
  process.exit(1);
}

function envProjectId() {
  if (!existsSync(".env.local")) return undefined;
  const match = readFileSync(".env.local", "utf8").match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m);
  return match?.[1].trim() || undefined;
}

const project = process.env.GCLOUD_PROJECT ?? (cloud ? envProjectId() : undefined) ?? "volunteering-39547";
let base;
let headers;

if (cloud) {
  if (!process.env.ACCESS_TOKEN) {
    console.error("Set ACCESS_TOKEN, for example: ACCESS_TOKEN=$(gcloud auth print-access-token)");
    process.exit(1);
  }
  base = `https://identitytoolkit.googleapis.com/v1/projects/${project}`;
  headers = {
    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "x-goog-user-project": project,
  };
  console.log(`Using CLOUD project ${project}`);
} else {
  base = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${project}`;
  headers = { Authorization: "Bearer owner", "Content-Type": "application/json" };
}

const lookup = await fetch(`${base}/accounts:lookup`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email: [email] }),
});
if (!lookup.ok) {
  console.error(`Lookup failed: ${await lookup.text()}`);
  process.exit(1);
}
const account = (await lookup.json()).users?.[0];
if (!account) {
  console.error(`No account found for ${email}.`);
  process.exit(1);
}

const update = await fetch(`${base}/accounts:update`, {
  method: "POST",
  headers,
  body: JSON.stringify({ localId: account.localId, emailVerified: true }),
});
console.log(update.ok ? `${email} is now verified` : `Failed: ${await update.text()}`);
if (!update.ok) process.exit(1);
