# THRESHOLD

A four-round, 25-question offline questionnaire with a 50-topic limits index.

Open **[THRESHOLD.html](./THRESHOLD.html)** directly in your browser. Every interface, animation, script, visualization, and export tool is embedded in that single file. It does not require a server, network connection, account, CDN, or installation.

## Experience

The four-round flow preserves all 25 questions **verbatim** from [PROMPT.md](./PROMPT.md). Each question has a contextual input and an editable multiline response. Drag or use the **− / +** controls to adjust numbered meters precisely. Navigation, chapter introductions, and the 50-topic limits selector work offline on desktop and mobile.

The masthead **SESSION** control shows all 25 questions with direct navigation, progress by round, review access, backup, restore, and reset.

## Signal Deck

The final review includes **SIGNAL DECK**, a visual readout derived entirely from selected controls and limit classifications:

- Before / now comparison (question 1)
- Paper / practice comparison (question 12)
- Fantasy / experience comparison (question 19)
- Person / trust / setting / act weights (question 14)
- Six-category limits distribution, with direct links to the filtered limits index
- Four-round response coverage

Unanswered controls remain unplotted. These are recorded selections, not generated interpretations or inferred scores. The review also filters completed/open questions and links back to their exact source.

## Save, restore, export

All records remain on the current device unless the user explicitly saves or shares an exported file.

| Control | Result |
|---|---|
| **COPY ALL ANSWERS** | Complete plain-text record: original questions, answers, selections, classifications, and notes |
| **DOWNLOAD .TXT** | Readable complete text export |
| **DOWNLOAD .JSON** | Portable, **unencrypted** complete session export |
| **ENCRYPTED .THX** / **ENCRYPTED BACKUP** | Portable AES-256-GCM encrypted session backup protected by an entered passphrase |
| **RESTORE RECORD** | Loads either an ordinary `.json` or encrypted `.thx` backup after local validation and explicit replacement |
| **PRINT / PDF** | Browser print dialog with a full print-formatted record, including questions hidden by review filters |
| **SAVE ON DEVICE** | Optional browser localStorage saving, **off by default** |

Encrypted `.thx` backups use PBKDF2-SHA-256 with 210,000 iterations, a fresh random 16-byte salt and 12-byte AES-GCM nonce for each export. Encryption runs locally with the browser's Web Crypto API. **The app does not store or recover the passphrase.** If Web Crypto is unavailable in a local-file browser context, encrypted backup is unavailable; normal JSON export still works.

**Important distinction:** a `.thx` file is encrypted. Ordinary `.json` / `.txt` exports and the optional browser localStorage save **are not encrypted**. Do not commit participant-filled exports or paste passphrases into project files.

To resume on another device, transfer `THRESHOLD.html` and a JSON or THX backup to that device, open the HTML file locally, and select **RESTORE RECORD**.

## Verification

The repository includes two automated test paths, both independent of application runtime requirements:

- `node tests/verify.mjs` checks the 25 original question strings exactly against `PROMPT.md`, all 50 unique topics, offline packaging, and JavaScript syntax.
- `node tests/browser.mjs` runs Chrome/Chromium behavioral tests on local `file://` loading, navigation, input persistence, 50-topic classification, desktop/mobile responsiveness, copy/export/restore, JSON compatibility, encrypted backup round trips, wrong-passphrase and tamper rejection, Signal Deck navigation, focus handling, fine adjustment, printing CSS, local saving, and complete reset.

Set `CHROME_BIN` to the browser executable path if necessary. Tests do not require installing a JavaScript framework.

Real Android Brave and cross-browser password-backup testing remain manual checks; Chrome emulation does not establish actual device acceptance.

The Git repository contains the **blank application and its governing prompt**, not any participant response data.
