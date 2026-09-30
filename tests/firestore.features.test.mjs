// Rules for the planned features: check-in status, guest-signup linking,
// live capacity, templates, staff cleanup. Uses the STRICT firestore.rules.
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv;

const authed = (uid, extra = {}) =>
  testEnv.authenticatedContext(uid, { email: `${uid}@example.com`, ...extra }).firestore();
const guestDb = () => testEnv.unauthenticatedContext().firestore();

const signupData = (uid, opp = "opp-1", extra = {}) => ({
  studentId: uid,
  studentName: `${uid} name`,
  studentEmail: `${uid}@example.com`,
  opportunityId: opp,
  createdAt: "test",
  ...extra,
});

async function seed({ capacity, signupCount } = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/alice").set({ name: "Alice", email: "alice@example.com", role: "student", createdAt: "s" });
    await db.doc("users/bob").set({ name: "Bob", email: "bob@example.com", role: "student", createdAt: "s" });
    await db.doc("users/staff").set({ name: "Staff", email: "staff@example.com", role: "staff", createdAt: "s" });
    const opp = {
      title: "Event",
      description: "",
      location: "",
      hours: 2,
      date: "2099-01-01",
      wrapUpSummary: "",
      videoUrl: "",
      createdBy: "staff",
      createdAt: "s",
      signupClosesAt: new Date("2099-01-02T00:00:00Z"),
    };
    if (capacity !== undefined) opp.capacity = capacity;
    if (signupCount !== undefined) opp.signupCount = signupCount;
    await db.doc("opportunities/opp-1").set(opp);
    await db.doc("signups/opp-1_bob@example.com").set(signupData("bob"));
    await db.doc("signups/opp-1_guestperson@example.com").set({
      studentId: "guest",
      studentName: "GUEST",
      studentEmail: "guestperson@example.com",
      opportunityId: "opp-1",
      createdAt: "s",
    });
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "volunteering-features-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});
after(async () => {
  await testEnv.cleanup();
});

describe("signup status (check-in / completion)", () => {
  test("staff can check a student in", async () => {
    await assertSucceeds(
      authed("staff").doc("signups/opp-1_bob@example.com").update({ status: "checked_in", checkedInAt: "now" }),
    );
  });
  test("staff cannot use an unknown status", async () => {
    await assertFails(authed("staff").doc("signups/opp-1_bob@example.com").update({ status: "banana" }));
  });
  test("staff cannot change other signup fields through the status rule", async () => {
    await assertFails(authed("staff").doc("signups/opp-1_bob@example.com").update({ studentName: "Hacked" }));
  });
  test("a student cannot set their own status", async () => {
    await assertFails(authed("bob").doc("signups/opp-1_bob@example.com").update({ status: "completed" }));
  });
  test("a student can create a signup with status signed_up but not completed", async () => {
    await assertSucceeds(authed("alice").doc("signups/opp-1_alice@example.com").set(signupData("alice", "opp-1", { status: "signed_up" })));
    await assertFails(authed("alice").doc("signups/opp-1_alice@example.com").set(signupData("alice", "opp-1", { status: "completed" })));
  });
  test("a student cannot create a signup with checkedInAt", async () => {
    await assertFails(authed("alice").doc("signups/opp-1_alice@example.com").set(signupData("alice", "opp-1", { checkedInAt: "now" })));
  });
});

describe("linking a guest signup to an account", () => {
  const guestSignup = "signups/opp-1_guestperson@example.com";
  const verified = () => authed("guestperson", { email_verified: true });

  test("a verified account with the same email can claim the guest signup", async () => {
    await assertSucceeds(verified().doc(guestSignup).update({ studentId: "guestperson", studentName: "Guest Person" }));
  });
  test("an unverified account cannot claim it", async () => {
    await assertFails(authed("guestperson").doc(guestSignup).update({ studentId: "guestperson", studentName: "Guest Person" }));
  });
  test("a verified account with a different email cannot claim it", async () => {
    await assertFails(authed("alice", { email_verified: true }).doc(guestSignup).update({ studentId: "alice", studentName: "Alice" }));
  });
  test("claiming cannot change other fields", async () => {
    await assertFails(verified().doc(guestSignup).update({ studentId: "guestperson", studentName: "G", opportunityId: "other" }));
  });
  test("claiming cannot assign the signup to someone else's uid", async () => {
    await assertFails(verified().doc(guestSignup).update({ studentId: "alice", studentName: "G" }));
  });
  test("a verified account can read guest signups made with its email", async () => {
    await assertSucceeds(verified().doc(guestSignup).get());
    await assertSucceeds(
      verified().collection("signups").where("studentEmail", "==", "guestperson@example.com").get(),
    );
  });
  test("an unverified account cannot read them", async () => {
    await assertFails(authed("guestperson").doc(guestSignup).get());
  });
});

describe("staff cleanup and templates", () => {
  test("staff can delete any signup", async () => {
    await assertSucceeds(authed("staff").doc("signups/opp-1_bob@example.com").delete());
    await assertSucceeds(authed("staff").doc("signups/opp-1_guestperson@example.com").delete());
  });
  test("a student still cannot delete another student's signup", async () => {
    await assertFails(authed("alice").doc("signups/opp-1_bob@example.com").delete());
  });
  test("staff can manage templates; students cannot", async () => {
    await assertSucceeds(authed("staff").doc("eventTemplates/t1").set({ title: "Template", hours: 2 }));
    await assertSucceeds(authed("staff").doc("eventTemplates/t1").get());
    await assertFails(authed("alice").doc("eventTemplates/t1").get());
    await assertFails(authed("alice").doc("eventTemplates/t2").set({ title: "x" }));
  });
});

describe("event fields: capacity, templates, recurrence", () => {
  const base = () => ({
    title: "New",
    hours: 1,
    date: "2099-02-02",
    createdBy: "staff",
    createdAt: "s",
    signupClosesAt: new Date("2099-02-03T00:00:00Z"),
  });
  test("staff can create an event with capacity, template and recurrence fields", async () => {
    await assertSucceeds(
      authed("staff").doc("opportunities/new").set({ ...base(), capacity: 10, signupCount: 0, templateId: "t1", seriesId: "s1", recurrence: { every: "week" } }),
    );
  });
  test("capacity must be a positive integer", async () => {
    await assertFails(authed("staff").doc("opportunities/new").set({ ...base(), capacity: 0 }));
    await assertFails(authed("staff").doc("opportunities/new").set({ ...base(), capacity: "ten" }));
  });
  test("a student cannot create an event with these fields", async () => {
    await assertFails(authed("alice").doc("opportunities/new").set({ ...base(), capacity: 5 }));
  });
});

describe("live capacity counter", () => {
  const join = (db, uid, count) => {
    const batch = db.batch();
    batch.update(db.doc("opportunities/opp-1"), { signupCount: count });
    batch.set(db.doc(`signups/opp-1_${uid}@example.com`), signupData(uid));
    return batch.commit();
  };

  test("a student joining bumps the counter by 1 in the same write as their signup", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertSucceeds(join(authed("alice"), "alice", 2));
  });
  test("the counter cannot jump by 2", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertFails(join(authed("alice"), "alice", 3));
  });
  test("the counter cannot exceed capacity", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 2, signupCount: 2 });
    await assertFails(join(authed("alice"), "alice", 3));
  });
  test("a signed-in user cannot bump the counter without creating a signup", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ signupCount: 2 }));
  });
  test("a student cannot change other event fields", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ capacity: 500 }));
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ title: "hacked" }));
  });
  test("cancelling lowers the counter by 1 in the same write as deleting the signup", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    const db = authed("bob");
    const batch = db.batch();
    batch.update(db.doc("opportunities/opp-1"), { signupCount: 0 });
    batch.delete(db.doc("signups/opp-1_bob@example.com"));
    await assertSucceeds(batch.commit());
  });
  test("the counter cannot be lowered without deleting a signup", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertFails(authed("bob").doc("opportunities/opp-1").update({ signupCount: 0 }));
  });
  test("a signed-out guest can add exactly one to the counter but not lower it", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertSucceeds(guestDb().doc("opportunities/opp-1").update({ signupCount: 2 }));
    await assertFails(guestDb().doc("opportunities/opp-1").update({ signupCount: 0 }));
    await assertFails(guestDb().doc("opportunities/opp-1").update({ signupCount: 9 }));
  });
  test("staff can still edit the event normally", async () => {
    await testEnv.clearFirestore();
    await seed({ capacity: 5, signupCount: 1 });
    await assertSucceeds(authed("staff").doc("opportunities/opp-1").update({ capacity: 8, title: "Renamed" }));
  });
});

describe("guest cannot take over a real signup", () => {
  test("a signed-out guest cannot overwrite a student's signup by reusing its id", async () => {
    await assertFails(
      guestDb().doc("signups/opp-1_bob@example.com").set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "bob@example.com",
        opportunityId: "opp-1",
        createdAt: "attack",
      }),
    );
  });
  test("a guest can still update their own guest signup", async () => {
    await assertSucceeds(
      guestDb().doc("signups/opp-1_guestperson@example.com").set({
        studentId: "guest",
        studentName: "GUEST",
        studentEmail: "guestperson@example.com",
        opportunityId: "opp-1",
        createdAt: "again",
      }),
    );
  });
});
