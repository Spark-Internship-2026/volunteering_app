// Checks that a PR description contains proof that the change works.
// Used by .github/workflows/pr-proof.yml. Exports `checkProof` for tests.
//
// Accepted proof, inside the "## Proof it works" section:
//   - an image or video: markdown image, <img>, <video>, or a GitHub attachment /
//     .png .jpg .jpeg .gif .webp .mp4 .mov .webm link            (preferred)
//   - OR a fenced code block with real output (at least 40 characters), for changes
//     with nothing to look at (rules, scripts, config)
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SECTION = /^##\s+Proof it works\s*$/im;

export function checkProof(body = "") {
  const match = SECTION.exec(body);
  if (!match) {
    return { ok: false, reason: 'Missing the "## Proof it works" section from the PR template.' };
  }

  const rest = body.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  const section = (next === -1 ? rest : rest.slice(0, next)).replace(/<!--[\s\S]*?-->/g, "");

  const visual =
    /!\[[^\]]*\]\([^)\s]+\)/.test(section) ||
    /<(img|video)\b/i.test(section) ||
    /github\.com\/user-attachments\//i.test(section) ||
    /https?:\/\/\S+\.(png|jpe?g|gif|webp|mp4|mov|webm)\b/i.test(section);
  if (visual) return { ok: true, kind: "visual" };

  const fenced = [...section.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].some(
    (m) => m[1].trim().length >= 40,
  );
  if (fenced) return { ok: true, kind: "output" };

  return {
    ok: false,
    reason:
      'The "Proof it works" section is empty. Add a screenshot or screen recording (drag it into the description), or paste real terminal or test output in a code block.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const body = process.env.PR_BODY_FILE
    ? readFileSync(process.env.PR_BODY_FILE, "utf8")
    : (process.env.PR_BODY ?? "");
  const result = checkProof(body);
  if (result.ok) {
    console.log(`Proof found (${result.kind}).`);
  } else {
    console.error(`::error title=Proof of testing required::${result.reason}`);
    process.exit(1);
  }
}
