# THRESHOLD

A four-round, 25-question interactive threshold dossier with a 50-topic limits matrix.

**Open [`THRESHOLD.html`](./THRESHOLD.html) directly in a browser.** The application is one portable HTML file containing its CSS, JavaScript, interface, and export tools. No server, installation, account, or internet access is required.

## Experience

Four cinematic rounds, each question's exact authored wording, contextual controls, multiline written answers, a searchable 50-topic limits matrix, and custom classifications/notes.

The **SESSION** button in the masthead opens a complete question index with direct jumps, round progress, a backup download, restore, review, and session reset. The final review can display all questions, only engaged questions, or unanswered ones; **GO TO FIRST OPEN** returns directly to the first incomplete question.

## Keep your record

- **COPY ALL ANSWERS** produces a complete plain-text record with questions, selections, notes, and all limits.
- **DOWNLOAD .TXT** and **DOWNLOAD .JSON** produce standalone exports.
- **RESTORE .JSON** is available on the cover, in the Session index, and on the final review. Choose an exported JSON file, check its summary, and select **REPLACE SESSION** to load it. Invalid files and files with altered questions are rejected without changing your current session.
- **SAVE ON DEVICE** remains optional and is off by default. It uses browser local storage and is separate from portable JSON backup files. The app never uploads answers.

To resume on another device, send that device the HTML file **and** your exported JSON file, open the HTML locally, then use RESTORE .JSON. JSON records may contain sensitive responses; store and share them deliberately.

## Source and verification

[`PROMPT.md`](./PROMPT.md) contains the immutable original 25 questions and the design/implementation contract. Their wording is checked without normalization.

Run `node tests/verify.mjs` for source/content invariants and embedded-script syntax.

Run `node tests/browser.mjs` for automated Chrome/Chromium browser checks of question navigation, limits, exports, offline operation, mobile viewports, JSON restoration, and reset. Set `CHROME_BIN` to the executable path if your browser is not in the default search locations. Actual Android Brave device testing remains separate.

Do not commit participant response exports or locally filled-in artifacts.
