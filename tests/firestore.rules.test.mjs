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
        email: "alice@example.com",
        role: "student",
        createdAt: "seed",
      }),
      db.doc("users/bob").set({
        email: "bob@example.com",
        role: "student",
        createdAt: "seed",
      }),
      db.doc("users/staff").set({
        email: "staff@example.com",
        role: "staff",
        createdAt: "seed",
      }),
      db.doc("opportunities/opp-1").set({
        title: "Food Bank Volunteer",
        description: "Help sort donations",
        location: "Seattle",
        createdBy: "staff",
        createdAt: "seed",
      }),
      db.doc("signups/alice-opp-1").set({
        studentId: "alice",
        opportunityId: "opp-1",
        createdAt: "seed",
      }),
      db.doc("signups/bob-opp-1").set({
        studentId: "bob",
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

describe("opportunities", () => {
  test("authenticated users can read opportunities", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(alice.doc("opportunities/opp-1").get());
  });

  test("unauthenticated users cannot read opportunities", async () => {
    const guest = unauthedDb();

    await assertFails(guest.doc("opportunities/opp-1").get());
  });

  test("a student cannot create an opportunity", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("opportunities/student-created").set({
        title: "Student-created event",
        description: "This should be denied",
        location: "Library",
        createdBy: "alice",
        createdAt: "test",
      }),
    );
  });

  test("staff can create an opportunity", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(
      staff.doc("opportunities/staff-created").set({
        title: "Staff-created event",
        description: "This should be allowed",
        location: "Community Center",
        createdBy: "staff",
        createdAt: "test",
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
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
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

  test("staff can read all signups", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(staff.doc("signups/alice-opp-1").get());
    await assertSucceeds(staff.doc("signups/bob-opp-1").get());
    await assertSucceeds(staff.collection("signups").get());
  });
});
