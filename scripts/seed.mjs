// Idempotent seed: test users (one staff per team + students) and sample events.
//   npm run seed:emulator   -> local emulators (start `npm run dev:local` first)
//   npm run seed            -> the cloud project in .env.local (needs dev rules deployed)
// Shared password for all seeded accounts: localdev123
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const useEmulator = process.argv.includes("--emulator");
const PASSWORD = "localdev123";

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !(match[1] in env)) env[match[1]] = match[2];
    }
  }
  return env;
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || "seed",
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "volunteering-39547",
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
} else {
  console.log(`Seeding CLOUD project ${app.options.projectId}`);
}

const users = [
  { key: "staff-auth", name: "Staff (Auth team)", role: "staff" },
  { key: "staff-student", name: "Staff (Student team)", role: "staff" },
  { key: "staff-events", name: "Staff (Events team)", role: "staff" },
  { key: "staff-staff", name: "Staff (Staff team)", role: "staff" },
  { key: "student1", name: "Student One", role: "student" },
  { key: "student2", name: "Student Two", role: "student" },
  { key: "student3", name: "Student Three", role: "student" },
].map((u) => ({ ...u, email: `${u.key}@example.com` }));

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
  await setDoc(doc(db, "users", credential.user.uid), {
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: Timestamp.now(),
  });
  return credential.user.uid;
}

const uids = {};
for (const user of users) {
  uids[user.key] = await ensureUser(user);
  console.log(`user ${user.email} (${user.role})`);
}

// Signed in as the last user; dev rules allow any signed-in user to write.
const events = [
  { id: "seed-food-bank", title: "Food Bank Sorting", days: 3, hours: 2, location: "Seattle" },
  { id: "seed-park-cleanup", title: "Park Cleanup", days: 7, hours: 3, location: "Green Lake" },
  { id: "seed-tutoring", title: "After-School Tutoring", days: 14, hours: 1.5, location: "Library" },
  { id: "seed-past-event", title: "Past Event (Winter Coat Drive)", days: -10, hours: 2, location: "Community Center" },
];

for (const event of events) {
  const date = dateFromToday(event.days);
  const [y, m, d] = date.split("-").map(Number);
  await setDoc(doc(db, "opportunities", event.id), {
    title: event.title,
    description: "Seeded sample event",
    location: event.location,
    hours: event.hours,
    date,
    wrapUpSummary: "",
    videoUrl: "",
    createdBy: uids["staff-events"],
    createdAt: Timestamp.now(),
    signupClosesAt: Timestamp.fromDate(new Date(y, m - 1, d + 1)),
  });
  console.log(`event ${event.title} (${date})`);
}

const student = users.find((u) => u.key === "student1");
for (const event of [events[0], events[3]]) {
  const email = student.email;
  await setDoc(doc(db, "signups", `${event.id}_${email}`), {
    studentId: uids.student1,
    studentName: student.name,
    studentEmail: email,
    opportunityId: event.id,
    createdAt: Timestamp.now(),
  });
  console.log(`signup ${email} -> ${event.title}`);
}

console.log(`\nDone. Log in as any seeded user with password ${PASSWORD}`);
process.exit(0);
