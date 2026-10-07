// Idempotent seed: test users (one staff per team + students) and sample events.
//
//   npm run seed:emulator   -> local emulators (start `npm run dev:local` or
//                              `npm run dev:restricted` first). Works under ANY rules:
//                              documents are written with the emulator's admin access.
//   npm run seed            -> the cloud project in .env.local. This signs in as each
//                              user and writes normally, so it only works while that
//                              project runs the OPEN rules. Under the restricted rules a
//                              client cannot create staff, so promote staff in the Firebase
//                              console instead.
//   add --staff-only        -> only the four staff accounts (no students, events or signups)
//
// Shared password for all seeded accounts: localdev123
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getFirestore, setDoc, Timestamp } from "firebase/firestore";

const useEmulator = process.argv.includes("--emulator");
const staffOnly = process.argv.includes("--staff-only");
const PASSWORD = "localdev123";

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !(match[1] in env)) env[match[1]] = match[2];
    }
  }
  return env;
}

const env = loadEnv();
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "volunteering-39547";
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || "seed",
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
} else {
  console.log(`Seeding CLOUD project ${projectId} (needs the open rules)`);
}

// A value that must be stored as a Firestore timestamp.
const ts = (date) => ({ __timestamp: date.toISOString() });

function toRestValue(value) {
  if (value && typeof value === "object" && "__timestamp" in value) {
    return { timestampValue: value.__timestamp };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  throw new Error(`Unsupported seed value: ${value}`);
}

function toSdkValue(value) {
  if (value && typeof value === "object" && "__timestamp" in value) {
    return Timestamp.fromDate(new Date(value.__timestamp));
  }
  return value;
}

// Write one document. Emulator: admin REST call (ignores the rules). Cloud: normal write.
async function writeDoc(path, data) {
  if (useEmulator) {
    const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toRestValue(v)]));
    const response = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/${path}`,
      {
        method: "PATCH",
        headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      },
    );
    if (!response.ok) throw new Error(`Seed write failed for ${path}: ${await response.text()}`);
    return;
  }

  await setDoc(
    doc(db, path),
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toSdkValue(v)])),
  );
}

const users = [
  { key: "staff-auth", name: "Staff (Auth team)", role: "staff" },
  { key: "staff-student", name: "Staff (Student team)", role: "staff" },
  { key: "staff-events", name: "Staff (Events team)", role: "staff" },
  { key: "staff-staff", name: "Staff (Staff team)", role: "staff" },
  { key: "student1", name: "Student One", role: "student" },
  { key: "student2", name: "Student Two", role: "student" },
  { key: "student3", name: "Student Three", role: "student" },
]
  .filter((u) => !staffOnly || u.role === "staff")
  .map((u) => ({ ...u, email: `${u.key}@example.com` }));

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function ensureUser(user) {
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, user.email, PASSWORD);
  } catch (error) {
    if (error.code !== "auth/email-already-in-use") throw error;
    credential = await signInWithEmailAndPassword(auth, user.email, PASSWORD);
  }
  await writeDoc(`users/${credential.user.uid}`, {
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: ts(new Date()),
  });
  return credential.user.uid;
}

const uids = {};
for (const user of users) {
  uids[user.key] = await ensureUser(user);
  console.log(`user ${user.email} (${user.role})`);
}

if (staffOnly) {
  console.log(`\nDone (staff only). Password ${PASSWORD}`);
  process.exit(0);
}

const events = [
  { id: "seed-food-bank", title: "Cozy for a Cause", days: 3, hours: 2, location: "Seattle" },
  { id: "seed-park-cleanup", title: "Crafts for a Cause", days: 7, hours: 3, location: "Green Lake" },
  { id: "seed-tutoring", title: "Elderly Care Home", days: 14, hours: 1.5, location: "Library" },
  { id: "seed-past-event", title: "Serving the Unhoused", days: 21, hours: 2, location: "Community Center" },
];

for (const event of events) {
  const date = dateFromToday(event.days);
  const [y, m, d] = date.split("-").map(Number);
  await writeDoc(`opportunities/${event.id}`, {
    title: event.title,
    description: "Seeded sample event",
    location: event.location,
    hours: event.hours,
    date,
    wrapUpSummary: "",
    videoUrl: "",
    createdBy: uids["staff-events"],
    createdAt: ts(new Date()),
    signupClosesAt: ts(new Date(y, m - 1, d + 1)),
  });
  console.log(`event ${event.title} (${date})`);
}

const student = users.find((u) => u.key === "student1");
for (const event of [events[0], events[3]]) {
  const email = student.email;
  await writeDoc(`signups/${event.id}_${email}`, {
    studentId: uids.student1,
    studentName: student.name,
    studentEmail: email,
    opportunityId: event.id,
    createdAt: ts(new Date()),
  });
  console.log(`signup ${email} -> ${event.title}`);
}

console.log(`\nDone. Log in as any seeded user with password ${PASSWORD}`);
process.exit(0);
