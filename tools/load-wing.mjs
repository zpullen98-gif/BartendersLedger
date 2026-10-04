/* Loads the Ledger's data and engine scripts into a DOM-free sandbox so the
 * check scripts can call the wing's OWN functions (classifyLine, lineABV,
 * specUnits, buildRound...) instead of re-implementing them. Same discipline
 * as .scripts/check-grading.mjs: the number the app prints is the number the
 * gate checks.
 *
 * The files are classic browser scripts. They get just enough of a window
 * for their top-level code to reach its definitions; anything that touches a
 * real element is a no-op here. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

export const LEDGER = join(dirname(fileURLToPath(import.meta.url)), '..');
/* LEDGER_JS=<dir> points the loader at another copy of the scripts, so a
   check can be run against a previous build to prove it would have failed. */
const JS_DIR = process.env.LEDGER_JS || join(LEDGER, 'js');

const stub = {
  style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  appendChild() {}, insertBefore() {}, setAttribute() {}, remove() {}, focus() {}, click() {},
  addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
  closest: () => null, textContent: '', innerHTML: '', value: '',
};

export function loadWing(files) {
  const sandbox = {
    console,
    document: {
      /* Head scripts load while the document is being parsed. This
         DOM-free engine fixture never mounts post-load toolbar markup. */
      readyState: 'loading',
      addEventListener() {}, getElementById: () => Object.create(stub), querySelector: () => null,
      querySelectorAll: () => [], createElement: () => Object.create(stub), body: Object.create(stub),
      activeElement: null, head: Object.create(stub), documentElement: Object.create(stub),
    },
    location: { hash: '', search: '', origin: 'http://localhost', pathname: '/ledger/' },
    history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: {},
    setTimeout, clearTimeout, setInterval, clearInterval,
    matchMedia: () => ({ matches: false }),
    addEventListener() {}, removeEventListener() {},
    confirm: () => false, alert() {},
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const f of files) {
    const src = readFileSync(join(JS_DIR, f), 'utf8');
    try {
      vm.runInContext(src, sandbox, { filename: f });
    } catch (e) {
      /* app.js boots at its tail and expects real elements; its definitions
         are already in the context by then. Anything else is a real error. */
      if (f !== 'app.js') throw e;
    }
  }
  /* Top-level const/let/function bindings live in the context's script scope,
     not on its global object, so they are read back by name. */
  sandbox.get = (name) => vm.runInContext('(typeof ' + name + ' === "undefined" ? undefined : ' + name + ')', sandbox);
  return sandbox;
}

/* The default set: the canon, the balance engine and the tools panel, in the
   order index.html loads them. */
export const CORE_FILES = ['data-core.js', 'data-ingredients.js', 'ingredients.js', 'engine.js', 'data-questions.js', 'data-lore.js', 'data-service.js', 'srs.js', 'ui-study.js', 'ui-practice.js'];
