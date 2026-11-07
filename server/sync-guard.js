// prompt-guard.js içindeki koruma bloğunu cloudflare-worker.js içine kopyalar.
// Kullanım (server klasöründe):  node sync-guard.js
const fs = require('fs');
const path = require('path');

const START = '// === PROMPT-GUARD START ===';
const END = '// === PROMPT-GUARD END ===';
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

const source = read('prompt-guard.js');
const block = source.slice(source.indexOf(START), source.indexOf(END));
const workerPath = path.join(__dirname, 'cloudflare-worker.js');
const worker = read('cloudflare-worker.js');
const s = worker.indexOf(START);
const e = worker.indexOf(END);
if (s === -1 || e === -1) throw new Error('cloudflare-worker.js içinde PROMPT-GUARD işaretleri bulunamadı.');

fs.writeFileSync(workerPath, worker.slice(0, s) + block + worker.slice(e));
console.log('Koruma bloğu cloudflare-worker.js içine kopyalandı.');
