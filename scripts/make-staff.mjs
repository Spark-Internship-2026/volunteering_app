// Promote a user to staff in the LOCAL Firestore emulator.
// Usage: npm run make-staff -- dev@example.com
const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run make-staff -- <email>");
  process.exit(1);
}

const project = process.env.GCLOUD_PROJECT ?? "volunteering-39547";
const base = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
const headers = { Authorization: "Bearer owner", "Content-Type": "application/json" };

const res = await fetch(`${base}:runQuery`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
    },
  }),
});
const doc = (await res.json()).find((r) => r.document)?.document;
if (!doc) {
  console.error(`No user doc found for ${email}. Sign up in the app first.`);
  process.exit(1);
}

const patch = await fetch(`${base.replace("/documents", "")}/documents/${doc.name.split("/documents/")[1]}?updateMask.fieldPaths=role`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ fields: { role: { stringValue: "staff" } } }),
});
console.log(patch.ok ? `${email} is now staff` : `Failed: ${await patch.text()}`);
