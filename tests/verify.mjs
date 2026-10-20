import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const prompt = readFileSync(new URL('../PROMPT.md', import.meta.url), 'utf8');
const html = readFileSync(new URL('../THRESHOLD.html', import.meta.url), 'utf8');
const source = prompt.split('---- BEGIN ORIGINAL USER BRIEF ----')[1]?.split('---- END ORIGINAL USER BRIEF ----')[0];
assert.ok(source, 'Missing immutable source markers in PROMPT.md');
const canonical = [...source.matchAll(/^([0-9]{1,2})\) (.*)$/gm)]
  .map(m => ({ number: Number(m[1]), text: m[2] }));
assert.equal(canonical.length, 25, 'Source must contain exactly 25 questions');
assert.deepEqual(canonical.map(q => q.number), Array.from({ length: 25 }, (_, i) => i + 1));

const questionMatch = html.match(/const QUESTIONS=(\[[^\n]*\]);\s*const ROUNDS=/);
assert.ok(questionMatch, 'Embedded questionnaire not found');
const embedded = JSON.parse(questionMatch[1]);
assert.equal(embedded.length, 25, 'Page must contain 25 questions');
for (let i = 0; i < 25; i++) {
  assert.equal(embedded[i].id, canonical[i].number, 'Question order drift');
  assert.equal(embedded[i].text, canonical[i].text, 'Verbatim question drift at ' + (i + 1));
}
assert.ok(embedded.some(q => q.section === 'SUPRISES AND SHIFTS'), 'Exact heading changed');

const groupStart = html.indexOf('const GROUPS='), groupEnd = html.indexOf(';\nconst TOPICS=', groupStart);
assert.ok(groupStart >= 0 && groupEnd > groupStart, 'Limit-topic source not found');
const groups = runInNewContext('(' + html.slice(groupStart + 13, groupEnd) + ')');
const topics = groups.flatMap(g => g.topics);
assert.equal(topics.length, 50, 'There must be exactly 50 predefined topics');
assert.equal(new Set(topics).size, 50, 'Limit topics must be unique');

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Inline JavaScript not found');
new Script(script, { filename: 'THRESHOLD-inline.js' });
assert.match(html, /<meta name="viewport"/);
assert.match(html, /prefers-reduced-motion/);
assert.match(html, /COPY ALL ANSWERS/);
assert.match(html, /function renderSignalDeck/);
assert.match(html, /function buildStandaloneDossier/);
assert.match(html, /function exportBrief/);
assert.match(html, /data-action="download-dossier"/);
assert.match(html, /data-action="copy-brief"/);

assert.match(html, /data-action="print-review"/);
assert.match(html, /data-action="scale-step"/);
assert.match(html, /function sealSession/);
assert.match(html, /function unsealSession/);
assert.match(html, /AES-256-GCM/);
assert.match(html, /DOWNLOAD \.JSON/);
assert.doesNotMatch(html, /<script[^>]+src\s*=/i, 'External script forbidden');
assert.doesNotMatch(html, /<link[^>]+href\s*=/i, 'External stylesheet forbidden');
assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/, 'Network API detected');
console.log('PASS: exact 25-question source, 50 unique topics, inline script syntax, offline packaging');
