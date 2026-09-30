// Tests for firestore.restricted.rules: what production runs while the app is built.
// Each protection is tested in both directions: the attack must fail, the normal
// use must still work. See the header of the rules file for the list.
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
const signedOut = () => testEnv.unauthenticatedContext().firestore();

const signup = (uid, opp = "opp-1", extra = {}) => ({
  studentId: uid,
  studentName: `${uid} name`,
  studentEmail: `${uid}@example.com`,
  opportunityId: opp,
  createdAt: "test",
  ...extra,
});
const guestSignup = (email, opp = "opp-1") => ({
  studentId: "guest",
  studentName: "GUEST",
  studentEmail: email,
  opportunityId: opp,
  createdAt: "test",
});

async function seed({ capacity, signupCount } = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("users/alice").set({ name: "Alice", email: "alice@example.com", role: "student" });
    await db.doc("users/bob").set({ name: "Bob", email: "bob@example.com", role: "student" });
    await db.doc("users/staff").set({ name: "Staff", email: "staff@example.com", role: "staff" });
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
    await db.doc("opportunities/opp-closed").set({
      ...opp,
      title: "Closed",
      date: "2000-01-01",
      signupClosesAt: new Date("2000-01-02T00:00:00Z"),
    });
    await db.doc("signups/opp-1_bob@example.com").set(signup("bob"));
    await db.doc("signups/opp-1_guestperson@example.com").set(guestSignup("guestperson@example.com"));
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "volunteering-restricted-test",
    firestore: { rules: readFileSync(process.env.RULES_FILE ?? "firestore.restricted.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});
after(async () => {
  await testEnv.cleanup();
});

describe("1. nobody can make themselves staff", () => {
  test("a new user can create their own student profile, with extra fields", async () => {
    await assertSucceeds(authed("newbie").doc("users/newbie").set({ name: "N", email: "n@example.com", role: "student", favouriteColour: "blue" }));
  });
  test("a new user cannot create themselves as staff", async () => {
    await assertFails(authed("newbie").doc("users/newbie").set({ name: "N", role: "staff" }));
  });
  test("a new user cannot create a profile without a role", async () => {
    await assertFails(authed("newbie").doc("users/newbie").set({ name: "N" }));
  });
  test("a user cannot create a profile for someone else", async () => {
    await assertFails(authed("alice").doc("users/newbie").set({ name: "N", role: "student" }));
  });
  test("a student cannot promote themselves", async () => {
    await assertFails(authed("alice").doc("users/alice").update({ role: "staff" }));
    await assertFails(authed("alice").doc("users/alice").set({ name: "Alice", role: "staff" }));
  });
  test("a student cannot remove their role by replacing the document", async () => {
    await assertFails(authed("alice").doc("users/alice").set({ name: "Alice" }));
  });
  test("a student cannot promote someone else, and neither can staff", async () => {
    await assertFails(authed("alice").doc("users/bob").update({ role: "staff" }));
    await assertFails(authed("staff").doc("users/bob").update({ role: "staff" }));
  });
  test("staff cannot demote themselves through the app either", async () => {
    await assertFails(authed("staff").doc("users/staff").update({ role: "student" }));
  });
  test("a user can still edit their own other fields and add new ones", async () => {
    await assertSucceeds(authed("alice").doc("users/alice").update({ name: "Alice B", phone: "555" }));
  });
  test("a user cannot delete their profile", async () => {
    await assertFails(authed("alice").doc("users/alice").delete());
  });
});

describe("2. nobody reads other people's personal data", () => {
  test("a user reads their own profile but not anyone else's", async () => {
    await assertSucceeds(authed("alice").doc("users/alice").get());
    await assertFails(authed("alice").doc("users/bob").get());
  });
  test("nobody can list all users, not even staff", async () => {
    await assertFails(authed("alice").collection("users").get());
    await assertFails(authed("staff").collection("users").get());
  });
  test("signed-out visitors read no users or signups", async () => {
    await assertFails(signedOut().doc("users/alice").get());
    await assertFails(signedOut().doc("signups/opp-1_bob@example.com").get());
  });
  test("a student reads their own signup but not another student's", async () => {
    await assertSucceeds(authed("bob").doc("signups/opp-1_bob@example.com").get());
    await assertFails(authed("alice").doc("signups/opp-1_bob@example.com").get());
  });
  test("a student can query their own signups but not list everyone's", async () => {
    await assertSucceeds(authed("bob").collection("signups").where("studentId", "==", "bob").get());
    await assertFails(authed("alice").collection("signups").get());
  });
  test("staff can read every signup", async () => {
    await assertSucceeds(authed("staff").collection("signups").get());
  });
  test("a verified account reads guest signups made with its own email only", async () => {
    await assertSucceeds(authed("guestperson", { email_verified: true }).doc("signups/opp-1_guestperson@example.com").get());
    await assertFails(authed("guestperson").doc("signups/opp-1_guestperson@example.com").get());
    await assertFails(authed("alice", { email_verified: true }).doc("signups/opp-1_guestperson@example.com").get());
  });
});

describe("3. only staff change events", () => {
  const newEvent = () => ({
    title: "New",
    hours: 1,
    date: "2099-02-02",
    createdBy: "staff",
    createdAt: "s",
    signupClosesAt: new Date("2099-02-03T00:00:00Z"),
  });
  test("signed-in users read and list events; signed-out visitors open one by link only", async () => {
    await assertSucceeds(authed("alice").collection("opportunities").get());
    await assertSucceeds(signedOut().doc("opportunities/opp-1").get());
    await assertFails(signedOut().collection("opportunities").get());
  });
  test("staff create, edit and delete events, with any new fields", async () => {
    await assertSucceeds(authed("staff").doc("opportunities/new").set({ ...newEvent(), anyNewField: { nested: true }, capacity: 10 }));
    await assertSucceeds(authed("staff").doc("opportunities/opp-1").update({ title: "Renamed", hours: 5, brandNew: 1 }));
    await assertSucceeds(authed("staff").doc("opportunities/opp-1").delete());
  });
  test("a student cannot create, edit or delete an event", async () => {
    await assertFails(authed("alice").doc("opportunities/new").set(newEvent()));
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ title: "hacked" }));
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ hours: 999 }));
    await assertFails(authed("alice").doc("opportunities/opp-1").delete());
  });
  test("signed-out visitors cannot change events", async () => {
    await assertFails(signedOut().doc("opportunities/opp-1").update({ title: "hacked" }));
    await assertFails(signedOut().doc("opportunities/opp-1").delete());
  });
  test("templates are staff only", async () => {
    await assertSucceeds(authed("staff").doc("eventTemplates/t1").set({ title: "T" }));
    await assertFails(authed("alice").doc("eventTemplates/t1").get());
    await assertFails(authed("alice").doc("eventTemplates/t2").set({ title: "x" }));
  });
});

describe("4. nobody tampers with someone else's signup", () => {
  test("a student creates their own signup", async () => {
    await assertSucceeds(authed("alice").doc("signups/opp-1_alice@example.com").set(signup("alice")));
  });
  test("a student cannot create a signup as another student", async () => {
    await assertFails(authed("alice").doc("signups/opp-1_carol@example.com").set(signup("carol")));
    await assertFails(authed("alice").doc("signups/opp-1_alice@example.com").set(signup("alice", "opp-1", { studentId: "bob" })));
  });
  test("a student cannot overwrite another student's signup", async () => {
    await assertFails(authed("alice").doc("signups/opp-1_bob@example.com").set(signup("alice")));
    await assertFails(authed("alice").doc("signups/opp-1_bob@example.com").set({ ...signup("bob"), studentName: "hijacked" }));
  });
  test("the signup id must match the event and email", async () => {
    await assertFails(authed("alice").doc("signups/whatever").set(signup("alice")));
  });
  test("no signups after the deadline", async () => {
    await assertFails(authed("alice").doc("signups/opp-closed_alice@example.com").set(signup("alice", "opp-closed")));
    await assertFails(signedOut().doc("signups/opp-closed_g@example.com").set(guestSignup("g@example.com", "opp-closed")));
  });
  test("a student can re-save their own signup but not change who it belongs to", async () => {
    await assertSucceeds(authed("bob").doc("signups/opp-1_bob@example.com").set(signup("bob", "opp-1", { studentName: "Bobby" })));
    await assertFails(authed("bob").doc("signups/opp-1_bob@example.com").set(signup("bob", "opp-1", { studentId: "alice" })));
  });
  test("students remove their own signup, nobody else's", async () => {
    await assertFails(authed("alice").doc("signups/opp-1_bob@example.com").delete());
    await assertSucceeds(authed("bob").doc("signups/opp-1_bob@example.com").delete());
  });
  test("staff remove any signup (event cleanup)", async () => {
    await assertSucceeds(authed("staff").doc("signups/opp-1_bob@example.com").delete());
    await assertSucceeds(authed("staff").doc("signups/opp-1_guestperson@example.com").delete());
  });
  test("staff cannot create a signup for another user", async () => {
    await assertFails(authed("staff").doc("signups/opp-1_alice@example.com").set(signup("alice")));
  });
  test("a signed-out guest can sign up with just an email, and re-save it", async () => {
    await assertSucceeds(signedOut().doc("signups/opp-1_new@example.com").set(guestSignup("new@example.com")));
    await assertSucceeds(signedOut().doc("signups/opp-1_guestperson@example.com").set(guestSignup("guestperson@example.com")));
  });
  test("a guest cannot take over a real student's signup by reusing its id", async () => {
    await assertFails(signedOut().doc("signups/opp-1_bob@example.com").set(guestSignup("bob@example.com")));
  });
  test("a guest cannot use a custom name or delete signups", async () => {
    await assertFails(signedOut().doc("signups/opp-1_new@example.com").set({ ...guestSignup("new@example.com"), studentName: "Somebody" }));
    await assertFails(signedOut().doc("signups/opp-1_guestperson@example.com").delete());
  });
  test("a verified account can claim a guest signup with its email; an unverified one cannot", async () => {
    const path = "signups/opp-1_guestperson@example.com";
    await assertFails(authed("guestperson").doc(path).update({ studentId: "guestperson", studentName: "G P" }));
    await assertFails(authed("alice", { email_verified: true }).doc(path).update({ studentId: "alice", studentName: "A" }));
    await assertSucceeds(authed("guestperson", { email_verified: true }).doc(path).update({ studentId: "guestperson", studentName: "G P" }));
  });
});

describe("5. hours credit cannot be forged", () => {
  const path = "signups/opp-1_bob@example.com";
  test("a student cannot create a signup already checked in or completed", async () => {
    await assertFails(authed("alice").doc("signups/opp-1_alice@example.com").set(signup("alice", "opp-1", { status: "completed" })));
    await assertFails(authed("alice").doc("signups/opp-1_alice@example.com").set(signup("alice", "opp-1", { checkedInAt: "now" })));
    await assertSucceeds(authed("alice").doc("signups/opp-1_alice@example.com").set(signup("alice", "opp-1", { status: "signed_up" })));
  });
  test("a student cannot change their own status", async () => {
    await assertFails(authed("bob").doc(path).update({ status: "completed" }));
    await assertFails(authed("bob").doc(path).update({ checkedInAt: "now", completedAt: "now" }));
  });
  test("a student cannot add their own credit fields to a signup", async () => {
    await assertFails(authed("bob").doc(path).update({ hoursAwarded: 99 }));
    await assertFails(authed("alice").doc("signups/opp-1_alice@example.com").set(signup("alice", "opp-1", { hoursAwarded: 99 })));
  });
  test("a guest cannot set a status either", async () => {
    await assertFails(signedOut().doc("signups/opp-1_new@example.com").set({ ...guestSignup("new@example.com"), status: "completed" }));
  });
  test("staff check a student in, mark complete and add new fields", async () => {
    await assertSucceeds(authed("staff").doc(path).update({ status: "checked_in", checkedInAt: "now" }));
    await assertSucceeds(authed("staff").doc(path).update({ status: "completed", completedAt: "now", hoursAwarded: 2 }));
  });
  test("staff cannot use an unknown status or change who a signup belongs to", async () => {
    await assertFails(authed("staff").doc(path).update({ status: "banana" }));
    await assertFails(authed("staff").doc(path).update({ studentId: "alice" }));
    await assertFails(authed("staff").doc(path).update({ studentEmail: "x@example.com" }));
  });
});

describe("what stays open for the teams", () => {
  test("any signed-in user can use a brand new collection, including subcollections", async () => {
    await assertSucceeds(authed("alice").doc("experiments/e1").set({ anything: true }));
    await assertSucceeds(authed("bob").doc("experiments/e1").update({ more: 1 }));
    await assertSucceeds(authed("alice").doc("experiments/e1/notes/n1").set({ text: "hi" }));
    await assertSucceeds(authed("alice").collection("experiments").get());
    await assertSucceeds(authed("alice").doc("experiments/e1").delete());
  });
  test("signed-out visitors cannot use new collections", async () => {
    await assertFails(signedOut().doc("experiments/e1").set({ anything: true }));
    await assertFails(signedOut().doc("experiments/e1").get());
  });
  test("the open collections are not a back door into the protected ones", async () => {
    await assertFails(authed("alice").doc("users/alice/private/x").set({ a: 1 }));
    await assertFails(authed("alice").doc("users/bob/private/x").get());
    await assertFails(authed("alice").doc("signups/opp-1_bob@example.com/notes/n").get());
    await assertFails(authed("alice").doc("opportunities/opp-1/comments/c").set({ a: 1 }));
    await assertFails(authed("alice").doc("eventTemplates/t1/versions/v1").get());
  });
});

describe("live capacity counter", () => {
  const join = (db, uid, count) => {
    const batch = db.batch();
    batch.update(db.doc("opportunities/opp-1"), { signupCount: count });
    batch.set(db.doc(`signups/opp-1_${uid}@example.com`), signup(uid));
    return batch.commit();
  };
  const reseed = async (opts) => {
    await testEnv.clearFirestore();
    await seed(opts);
  };

  test("joining bumps the counter by 1 in the same write as the signup", async () => {
    await reseed({ capacity: 5, signupCount: 1 });
    await assertSucceeds(join(authed("alice"), "alice", 2));
  });
  test("the counter cannot jump by 2, exceed capacity, or move without a signup", async () => {
    await reseed({ capacity: 2, signupCount: 1 });
    await assertFails(join(authed("alice"), "alice", 3));
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ signupCount: 2 }));
    await reseed({ capacity: 2, signupCount: 2 });
    await assertFails(join(authed("alice"), "alice", 3));
  });
  test("students cannot change other event fields (capacity, title)", async () => {
    await reseed({ capacity: 5, signupCount: 1 });
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ capacity: 500 }));
    await assertFails(authed("alice").doc("opportunities/opp-1").update({ signupCount: 2, title: "x" }));
  });
  test("cancelling lowers the counter in the same write as deleting the signup", async () => {
    await reseed({ capacity: 5, signupCount: 1 });
    const db = authed("bob");
    const batch = db.batch();
    batch.update(db.doc("opportunities/opp-1"), { signupCount: 0 });
    batch.delete(db.doc("signups/opp-1_bob@example.com"));
    await assertSucceeds(batch.commit());
  });
  test("the counter cannot be lowered without deleting a signup", async () => {
    await reseed({ capacity: 5, signupCount: 1 });
    await assertFails(authed("bob").doc("opportunities/opp-1").update({ signupCount: 0 }));
  });
  test("a signed-out guest can add one but not subtract or jump", async () => {
    await reseed({ capacity: 5, signupCount: 1 });
    await assertSucceeds(signedOut().doc("opportunities/opp-1").update({ signupCount: 2 }));
    await assertFails(signedOut().doc("opportunities/opp-1").update({ signupCount: 0 }));
    await assertFails(signedOut().doc("opportunities/opp-1").update({ signupCount: 9 }));
  });
});
