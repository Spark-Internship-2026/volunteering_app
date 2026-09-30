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
        date: "2099-09-15",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "staff",
        createdAt: "seed",
        signupClosesAt: new Date("2099-09-16T00:00:00.000Z"),
      }),
      db.doc("opportunities/opp-2").set({
        title: "Park Cleanup",
        description: "Pick up litter at the park",
        location: "Seattle",
        hours: 1.5,
        date: "2099-09-20",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "staff",
        createdAt: "seed",
        signupClosesAt: new Date("2099-09-21T00:00:00.000Z"),
      }),
      db.doc("opportunities/past-opp").set({
        title: "Past Food Drive",
        description: "Already happened",
        location: "Seattle",
        hours: 2,
        date: "2000-01-01",
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: "staff",
        createdAt: "seed",
        signupClosesAt: new Date("2000-01-02T00:00:00.000Z"),
      }),
      db.doc("signups/opp-1_alice@example.com").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "opp-1",
        createdAt: "seed",
      }),
      db.doc("signups/opp-1_bob@example.com").set({
        studentId: "bob",
        studentName: "Bob Student",
        studentEmail: "bob@example.com",
        opportunityId: "opp-1",
        createdAt: "seed",
      }),
      db.doc("signups/opp-1_staff@example.com").set({
        studentId: "staff",
        studentName: "Staff Member",
        studentEmail: "staff@example.com",
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
        signupClosesAt: new Date("2099-09-21T00:00:00.000Z"),
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
        signupClosesAt: new Date("2099-09-22T00:00:00.000Z"),
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
        signupClosesAt: new Date("2099-09-22T00:00:00.000Z"),
      }),
    );
  });

  test("staff cannot create an event without a signup close date", async () => {
    const staff = authedDb("staff");

    await assertFails(
      staff.doc("opportunities/no-signup-close-date").set({
        title: "Missing signup close date",
        description: "This should be denied",
        location: "Community Center",
        hours: 3,
        date: "2099-09-21",
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
      alice.doc("signups/opp-2_alice@example.com").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("a signup must use the event and email as its document id", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("signups/random-duplicate-id").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("a repeated signup with the same email updates the existing signup", async () => {
    const alice = authedDb("alice");
    const signup = alice.doc("signups/opp-2_alice@example.com");

    await assertSucceeds(
      signup.set({
        studentId: "alice",
        studentName: "Alice First",
        studentEmail: "alice@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );

    await assertSucceeds(
      signup.set({
        studentId: "alice",
        studentName: "Alice Latest",
        studentEmail: "alice@example.com",
        opportunityId: "opp-2",
        createdAt: "test-again",
      }),
    );
  });

  test("a student cannot create a signup after the event signup deadline", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("signups/past-opp_alice@example.com").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "past-opp",
        createdAt: "test",
      }),
    );
  });

  test("a student cannot create a signup for another student", async () => {
    const alice = authedDb("alice");

    await assertFails(
      alice.doc("signups/opp-2_bob@example.com").set({
        studentId: "bob",
        studentName: "Bob Student",
        studentEmail: "bob@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("staff can create their own signup", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(
      staff.doc("signups/opp-2_staff@example.com").set({
        studentId: "staff",
        studentName: "Staff Member",
        studentEmail: "staff@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("staff cannot create a signup for another user", async () => {
    const staff = authedDb("staff");

    await assertFails(
      staff.doc("signups/opp-2_alice@example.com").set({
        studentId: "alice",
        studentName: "Alice Student",
        studentEmail: "alice@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );
  });

  test("a guest can create an event signup with email only", async () => {
    const guest = unauthedDb();

    await assertSucceeds(
      guest.doc("signups/opp-1_guest@example.com").set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "guest@example.com",
        opportunityId: "opp-1",
        createdAt: "test",
      }),
    );
  });

  test("a guest repeated signup with the same email updates the existing signup", async () => {
    const guest = unauthedDb();
    const signup = guest.doc("signups/opp-2_guest@example.com");

    await assertSucceeds(
      signup.set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "guest@example.com",
        opportunityId: "opp-2",
        createdAt: "test",
      }),
    );

    await assertSucceeds(
      signup.set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "guest@example.com",
        opportunityId: "opp-2",
        createdAt: "test-again",
      }),
    );
  });

  test("a guest cannot create a signup after the event signup deadline", async () => {
    const guest = unauthedDb();

    await assertFails(
      guest.doc("signups/past-opp_guest@example.com").set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "guest@example.com",
        opportunityId: "past-opp",
        createdAt: "test",
      }),
    );
  });

  test("a guest cannot create a signup with a custom name", async () => {
    const guest = unauthedDb();

    await assertFails(
      guest.doc("signups/opp-1_guest@example.com").set({
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

    await assertFails(guest.doc("signups/opp-1_alice@example.com").get());
  });

  test("a student can read their own signup but not another student's signup", async () => {
    const alice = authedDb("alice");

    await assertSucceeds(alice.doc("signups/opp-1_alice@example.com").get());
    await assertFails(alice.doc("signups/opp-1_bob@example.com").get());
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

    await assertSucceeds(alice.doc("signups/opp-1_alice@example.com").delete());
  });

  test("a student cannot delete another student's signup", async () => {
    const alice = authedDb("alice");

    await assertFails(alice.doc("signups/opp-1_bob@example.com").delete());
  });

  test("staff can delete their own signup", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(staff.doc("signups/opp-1_staff@example.com").delete());
  });

  test("staff can delete a student's signup (needed when deleting an event)", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(staff.doc("signups/opp-1_alice@example.com").delete());
  });

  test("staff can read all signups", async () => {
    const staff = authedDb("staff");

    await assertSucceeds(staff.doc("signups/opp-1_alice@example.com").get());
    await assertSucceeds(staff.doc("signups/opp-1_bob@example.com").get());
    await assertSucceeds(staff.collection("signups").get());
  });
});
