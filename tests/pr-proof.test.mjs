import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { checkProof } from "../scripts/check-pr-proof.mjs";

const wrap = (proof) => `## What this PR does\nstuff\n\n## Proof it works\n${proof}\n\n## Firestore changes\nnone`;

describe("checkProof", () => {
  test("fails when the section is missing", () => {
    assert.equal(checkProof("## What\nhi").ok, false);
  });
  test("fails when the section is only the template comment", () => {
    assert.equal(checkProof(wrap("<!-- drag a screenshot here ![x](y.png) -->")).ok, false);
  });
  test("fails on plain text with no evidence", () => {
    assert.equal(checkProof(wrap("It works, trust me")).ok, false);
  });
  test("accepts a markdown image", () => {
    assert.deepEqual(checkProof(wrap("![login](https://github.com/user-attachments/assets/abc)")), { ok: true, kind: "visual" });
  });
  test("accepts an html image or video tag", () => {
    assert.equal(checkProof(wrap('<img width="300" src="https://x/y">')).ok, true);
    assert.equal(checkProof(wrap('<video src="https://x/y"></video>')).ok, true);
  });
  test("accepts a bare attachment or recording link", () => {
    assert.equal(checkProof(wrap("https://github.com/user-attachments/assets/1234")).ok, true);
    assert.equal(checkProof(wrap("https://example.com/demo.mp4")).ok, true);
  });
  test("accepts real output in a code block", () => {
    const out = "```\nnpm run rules:test\nℹ tests 64\nℹ pass 64\nℹ fail 0\n```";
    assert.deepEqual(checkProof(wrap(out)), { ok: true, kind: "output" });
  });
  test("rejects a nearly empty code block", () => {
    assert.equal(checkProof(wrap("```\nok\n```")).ok, false);
  });
  test("only looks inside the proof section", () => {
    const body = "## Proof it works\nnothing\n\n## Other\n![x](https://x/y.png)";
    assert.equal(checkProof(body).ok, false);
  });
});
