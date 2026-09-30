import { readFileSync } from "node:fs";
import { after, before, describe, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "volunteering-dev-rules-test",
    firestore: {
      rules: readFileSync("firestore.dev.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe("firestore.dev.rules (open rules)", () => {
  test("signed-in user can write arbitrary fields and collections", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.doc("signups/x").set({ anything: true, status: "checked-in" }));
    await assertSucceeds(db.doc("newCollection/y").set({ hello: "world" }));
  });

  test("signed-in user can edit their own role", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.doc("users/u1").set({ role: "staff" }));
  });

  test("signed-out visitor can get one event but not list or write it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("opportunities/o1").set({ title: "T" });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(db.doc("opportunities/o1").get());
    await assertFails(db.collection("opportunities").get());
    await assertFails(db.doc("opportunities/o1").set({ title: "hack" }));
  });

  test("signed-out visitor can only create guest signups", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      db.doc("signups/o1_g@example.com").set({
        studentId: "guest",
        studentEmail: "g@example.com",
        opportunityId: "o1",
      }),
    );
    await assertFails(
      db.doc("signups/o1_h@example.com").set({
        studentId: "someone",
        studentEmail: "h@example.com",
        opportunityId: "o1",
      }),
    );
  });
});
