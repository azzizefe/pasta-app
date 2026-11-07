// Collects every Turkish UI phrase that tx() can be asked to translate and writes
// scripts/i18n/source.json ({ "1": "Turkish text", ... }). Existing ids are kept, so the
// translation files (en.json, fr.json, ar.json) stay aligned when phrases are added.
//
// Collected:
//   1. string arguments of tx("...")
//   2. Turkish string literals at module level in screens/components/types (display data that is
//      translated where it is rendered, e.g. {tx(item.title)})
//
// Usage: node scripts/i18n/extract-phrases.js   then fill the new ids in en/fr/ar.json and run
//        node scripts/i18n/build-phrases.js
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'source.json');
const TR = /[ğüşıöçĞÜŞİÖÇ]|\b(ve|ile|için|bir|bu|Kredi|Pasta|Tümü|Orta|Sade|Romantik|Rustik|Lüks|Diğer|Temel|Stil|Lezzet)\b/;
const DATA_DIRS = ['src/screens', 'src/components', 'src/types'];
// Never shown to users, or not rendered anywhere.
const SKIP_FILES = /(LiveBakeryWorkbench|ShowcaseCarousel|ReferralCard|languages)\.tsx?$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

const found = new Set();
for (const file of [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.tsx')]) {
  if (SKIP_FILES.test(file)) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const isData = DATA_DIRS.some((d) => rel.startsWith(d));
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inFunction = (n) => {
    for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return true;
    return false;
  };
  const skipped = (n) => {
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isImportDeclaration(p)) return true;
      if (ts.isCallExpression(p) && /^(console\.\w+|require)$/.test(p.expression.getText(sf))) return true;
    }
    return false;
  };
  const inStyles = (n) => {
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isCallExpression(p) && /StyleSheet\.create$/.test(p.expression.getText(sf))) return true;
      if (ts.isTypeNode(p)) return true;
    }
    return false;
  };
  const isKey = (n) => n.parent && (ts.isPropertyAssignment(n.parent) || ts.isPropertySignature(n.parent)) && n.parent.name === n;
  const inAttr = (n, re) => {
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p)) return re.test(p.name.getText(sf));
      if (ts.isFunctionLike(p)) return false;
    }
    return false;
  };
  const visit = (n) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'tx' && n.arguments[0]) {
      const a = n.arguments[0];
      if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) found.add(a.text);
    }
    if (isData && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !skipped(n) && !inStyles(n) && !isKey(n)) {
      const text = n.text;
      // Module-level display data: Turkish-looking, or a capitalised label such as a month name.
      const label = /^[A-ZÇĞİÖŞÜ][^_#/@.:]*$/.test(text) && !/^[A-Z][a-z]+[A-Z]/.test(text) && text.length > 1;
      if (!inFunction(n) && (TR.test(text) || label)) found.add(text);
      // Field titles and suggestion chips the builder translates inside its field components.
      else if (inAttr(n, /^(title|suggestions)$/) && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(text)) found.add(text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const byText = new Map(Object.entries(previous).map(([id, text]) => [text, id]));
let next = Math.max(0, ...Object.keys(previous).map(Number)) + 1;
const result = {};
for (const [id, text] of Object.entries(previous)) if (found.has(text)) result[id] = text;
let added = 0;
for (const text of found) {
  if (!byText.has(text)) {
    result[String(next++)] = text;
    added++;
  }
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
console.log(`${Object.keys(result).length} phrases (${added} new) → scripts/i18n/source.json`);
