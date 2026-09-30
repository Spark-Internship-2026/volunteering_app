## What this PR does
<!-- One or two sentences. Which team / feature? -->

## Proof it works
<!--
REQUIRED. A check fails until this section has real proof that your change works.
Show it working on your laptop (localhost:3000) or on the preview link the bot posts on this PR.

Best: a screenshot or a short screen recording (drag the file into this box, GitHub will
turn it into a link). Show the before and the after if you can.

If there is nothing to look at (rules, scripts, config), paste the real terminal/test output
in a code block instead.
-->


## Firestore changes (required, even if "none")
Your laptop (`dev:local`) uses open rules, but staging, previews and production use the restricted rules,
so a change can work locally and still get "permission denied" on the preview. Check with
`npm run dev:restricted`, and list everything so nothing is missed:

- **New or changed collections:**
- **New fields (collection.field, type):**
- **Who writes each one? (student / staff / guest / signed-out):**
- **New queries (filters/sorts/limits):**
