# THRESHOLD

A four-round, 25-question interactive threshold dossier with a 50-topic limits matrix.

**Open [`THRESHOLD.html`](./THRESHOLD.html) directly in your browser.** It is the complete application: HTML, CSS, JavaScript, typography, interactions, and export tools are contained in one file. No server, installation, account, or network access is required. To share it, send that one HTML file.

### Inside

Four cinematic rounds, individually tailored interaction controls, a real multiline answer for every question, fast question navigation, 50 searchable and classifiable boundary topics, unlimited custom topics, and a complete review.

At the end, **COPY ALL ANSWERS** copies the full written record, including the questions, contextual selections, limit classifications, and notes. TXT and JSON exports are also available.

Answers stay in the current browser session unless **SAVE ON DEVICE** is enabled. That optional feature uses the browser's local storage; it does not synchronize responses across devices. The app includes an explicit reset control.

### Source and verification

[`PROMPT.md`](./PROMPT.md) contains the immutable original creative brief and all 25 questions. Their wording, punctuation, and deliberate typography are retained verbatim.

Run `node tests/verify.mjs` to check question fidelity, topic count, embedded script syntax, and offline packaging. The standalone HTML remains independent of this test.

The private repository is the source of the distributed HTML. Do not commit participant response exports.
