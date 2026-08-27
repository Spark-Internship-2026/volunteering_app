import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "volunteering-39547";

let testEnv;

function authedDb(uid) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@example.com`,
  }).firestore();
}

function unauthedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      db.doc("users/alice").set({
        name: "Alice Student",
        email: "alice@example.com",
        role: "student",
        createdAt: "seed",
      }),
      db.doc("users/bob").set({
        name: "Bob Student",
        email: "bob@example.com",
        role: "student",
        createdAt: "seed",
      }),
      db.doc("users/staff").set({
        name: "Staff Member",
        email: "staff@example.com",
        role: "staff",
        createdAt: "seed",
      }),
      db.doc("opportunities/opp-1").set({
        title: "Food Bank Volunteer",
        description: "Help sort donations",
        location: "Seattle",
        hours: 2,
        date: "2026-09-15",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "staff",
        createdAt: "seed",
      }),
      db.doc("signups/alice-opp-1").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "opp-1",
        createdAt: "seed",
      }),
      db.doc("signups/bob-opp-1").set({
        studentId: "bob",
        studentName: "Bob Student",
        studentEmail: "bob@example.com",
        opportunityId: "opp-1",
        createdAt: "seed",
      }),
    ]);
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedData();
});

after(async () => {
  await testEnv.cleanup();
});

describe("users", () => {
  test("a new user can create their own student profile", async () => {
    const newStudent = authedDb("new-student");

    await assertSucceeds(
      newStudent.doc("users/new-student").set({
        name: "New Student",
        email: "new-student@example.com",
        role: "student",
        createdAt: "test",
      }),
    );
  });

  test("a new user cannot create themselves as staff", async () => {
    const newStudent = authedDb("new-student");

    await assertFails(
      newStudent.doc("users/new-student").set({
        name: "New Student",
        email: "new-student@example.com",
        role: "staff",
        createdAt: "test",
      }),
    );
  });

  test("a user can read their own user doc but not another user's doc", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(alice.doc("users/alice").get());
    await assertFails(alice.doc("users/bob").get());
  });

  test("a user cannot promote themselves to staff", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("users/alice").update({
        role: "staff",
      }),
    );
  });
});

describe("events", () => {
  test("authenticated users can read events", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(alice.doc("opportunities/opp-1").get());
  });

  test("unauthenticated users can open a direct event link", async () => {
    const guest = unauthedDb();

    await assertSucceeds(guest.doc("opportunities/opp-1").get());
  });

  test("unauthenticated users cannot list events", async () => {
    const guest = unauthedDb();

    await assertFails(guest.collection("opportunities").get());
  });

  test("a student cannot create an event", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("opportunities/student-created").set({
        title: "Student-created event",
        description: "This should be denied",
        location: "Library",
        hours: 1,
        date: "2026-09-20",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "alice",
        createdAt: "test",
      }),
    );
  });

  test("staff can create an event", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(
      staff.doc("opportunities/staff-created").set({
        title: "Staff-created event",
        description: "This should be allowed",
        location: "Community Center",
        hours: 3,
        date: "2026-09-21",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "staff",
        createdAt: "test",
      }),
    );
  });

  test("staff cannot create an event without hours", async () => {
    const staff = authedDb("staff");

    await assertFails(
      staff.doc("opportunities/no-hours").set({
        title: "Missing hours",
        description: "This should be denied",
        location: "Community Center",
        date: "2026-09-21",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "staff",
        createdAt: "test",
      }),
    );
  });

  test("staff can update notes fields", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(
      staff.doc("opportunities/opp-1").update({
        wrapUpSummary: "Students packed 120 pantry boxes.",
        videoUrl: "https://example.com/notes",
        updatedAt: "test",
      }),
    );
  });

  test("staff can update event details", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(
      staff.doc("opportunities/opp-1").update({
        title: "Updated Food Bank Volunteer",
        description: "Updated description",
        location: "Updated location",
        hours: 4,
        date: "2026-10-01",
        updatedAt: "test",
      }),
    );
  });
});

describe("signups", () => {
  test("a student can create their own signup", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(
      alice.doc("signups/alice-opp-2").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("a student cannot create a signup for another student", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("signups/bob-opp-2").set({
        studentId: "bob",
        studentName: "Bob Student",
        studentEmail: "bob@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("a guest can create an event signup with email only", async () => {
    const guest = unauthedDb();

    await assertSucceeds(
      guest.doc("signups/guest-opp-1").set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "guest@example.com",
        opportunityId: "opp-1",
        createdAt: "test",
      }),
    );
  });

  test("a guest cannot create a signup with a custom name", async () => {
    const guest = unauthedDb();

    await assertFails(
      guest.doc("signups/guest-opp-1").set({
        studentId: "guest",
        studentName: "Fake Name",
        studentEmail: "guest@example.com",
        opportunityId: "opp-1",
        createdAt: "test",
      }),
    );
  });

  test("a guest cannot read signups", async () => {
    const guest = unauthedDb();

    await assertFails(guest.doc("signups/alice-opp-1").get());
  });

  test("a student can read their own signup but not another student's signup", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(alice.doc("signups/alice-opp-1").get());
    await assertFails(alice.doc("signups/bob-opp-1").get());
  });

  test("a student can query only their own signups", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(
      alice.collection("signups").where("studentId", "==", "alice").get(),
    );
    await assertFails(alice.collection("signups").get());
  });

  test("a student can delete their own signup", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(alice.doc("signups/alice-opp-1").delete());
  });

  test("a student cannot delete another student's signup", async () => {
    const alice = authedDb("alice");

    await assertFails(alice.doc("signups/bob-opp-1").delete());
  });

  test("staff cannot delete a student's signup", async () => {
    const staff = authedDb("staff");

    await assertFails(staff.doc("signups/alice-opp-1").delete());
  });

  test("staff can read all signups", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(staff.doc("signups/alice-opp-1").get());
    await assertSucceeds(staff.doc("signups/bob-opp-1").get());
    await assertSucceeds(staff.collection("signups").get());
  });
});
