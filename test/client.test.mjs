import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const variants = ['ripple', 'bloom', 'comets', 'orbit', 'butterflies'];
const lifetimes = { ripple: 720, bloom: 820, comets: 760, orbit: 900, butterflies: 860 };

function seededRandom(seed = 1) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

// A small browser boundary fake: no real display or platform UI is exercised.
function harness({ canvasAvailable = true, reducedMotion = false, random = seededRandom() } = {}) {
  class Target {
    handlers = new Map();
    addEventListener(type, callback, options) {
      if (!this.handlers.has(type)) this.handlers.set(type, new Map());
      this.handlers.get(type).set(callback, options);
    }
    removeEventListener(type, callback) { this.handlers.get(type)?.delete(callback); }
    fire(type, properties = {}) {
      for (const callback of this.handlers.get(type)?.keys() || []) callback(properties);
    }
    count() { return [...this.handlers.values()].reduce((count, handlers) => count + handlers.size, 0); }
  }

  const stats = { arcs: 0, clears: 0, fills: 0, colors: [], calls: [], randomCalls: 0 };
  let depth = 0;
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => {
        for (const value of args) {
          if (typeof value === 'number') assert.ok(Number.isFinite(value), `${key} received non-finite geometry`);
        }
        stats.calls.push({ method: key, args, depth });
        if (key === 'save') depth++;
        if (key === 'restore') { depth--; assert.ok(depth >= 0, 'Canvas restore must have a matching save'); }
        if (key === 'arc') stats.arcs++;
        if (key === 'clearRect') stats.clears++;
        if (key === 'fill') stats.fills++;
      };
    },
    set(target, key, value) {
      if (key === 'fillStyle' || key === 'strokeStyle') stats.colors.push(value);
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${key} must remain finite`);
      if (key === 'globalAlpha') assert.ok(value >= 0 && value <= 1, 'Canvas alpha must stay in range');
      target[key] = value;
      return true;
    },
  });
  const nodes = [];
  const document = new Target();
  const media = new Target();
  media.matches = reducedMotion;
  document.hidden = false;
  document.body = { appendChild: node => nodes.push(node) };
  document.createElement = () => ({
    attributes: new Map(),
    styles: new Map(),
    style: { setProperty(name, value, priority) { this.owner.styles.set(name, { value, priority }); } },
    setAttribute(name, value) { this.attributes.set(name, value); },
    getContext() { return canvasAvailable ? context : null; },
    remove() { const index = nodes.indexOf(this); if (index >= 0) nodes.splice(index, 1); },
  });
  const createElement = document.createElement;
  document.createElement = () => {
    const element = createElement();
    element.style.owner = element;
    return element;
  };
  const window = new Target();
  Object.assign(window, { innerWidth: 2000, innerHeight: 1500, devicePixelRatio: 3, matchMedia: () => media });
  const cssValues = new Map();
  const frames = new Map();
  let clock = 0, nextFrame = 0, plugin, cleanup = () => {};
  window.__ModuleLoader__ = {
    load({ id, factory }) {
      assert.equal(id, 'dsh-atelier-clickfx');
      plugin = factory();
    },
  };
  vm.runInNewContext(source, {
    Math: Object.assign(Object.create(Math), { random: () => { stats.randomCalls++; return random(); } }),
    window,
    document,
    performance: { now: () => clock },
    getComputedStyle: () => ({ getPropertyValue: name => cssValues.get(name) || '' }),
    CSS: { supports: (_type, value) => value !== 'invalid-color' },
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const mount = () => plugin.apply({ effect(callback) { cleanup = callback(); } });
  mount();
  const event = (type, properties = {}) => document.fire(type, {
    pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true,
    clientX: 140, clientY: 180, ...properties,
  });
  const click = properties => { event('pointerdown', properties); event('pointerup', properties); };
  const step = time => {
    clock = time;
    const queue = [...frames.values()];
    frames.clear();
    queue.forEach(callback => callback(time));
    assert.equal(depth, 0, 'each frame must restore its Canvas state');
  };
  return {
    document, window, media, nodes, frames, stats, cssValues, mount, click, event, step, plugin,
    clock: time => { clock = time; }, cleanup: () => cleanup(),
  };
}

function setup(t, options) {
  const browser = harness(options);
  t.after(() => browser.cleanup());
  return browser;
}

test('a click animates, then returns to idle without a scheduled frame', t => {
  const h = setup(t);
  assert.equal(h.frames.size, 0);
  h.click();
  assert.equal(h.frames.size, 1);
  h.step(180);
  assert.ok(h.stats.fills > 0);
  h.step(901);
  assert.equal(h.frames.size, 0);
});

test('random selection covers every style in each bag with no adjacent repeats across bags', t => {
  const h = setup(t);
  for (const random of [() => 0, () => 0.5, () => 0.999999, seededRandom(42)]) {
    const pick = h.plugin.createVariantPicker(random);
    const selections = Array.from({ length: 100 }, () => pick());
    for (let index = 0; index < selections.length; index += variants.length) {
      assert.deepEqual(selections.slice(index, index + variants.length).sort(), [...variants].sort());
    }
    for (let index = 1; index < selections.length; index++) {
      assert.notEqual(selections[index], selections[index - 1]);
    }
  }
});

test('all five styles draw distinct finite geometry and expire at their own lifetimes', t => {
  // A constant random source makes production seed draws irrelevant to bag order.
  const h = setup(t, { random: () => 0.5 });
  const pick = h.plugin.createVariantPicker(() => 0.5);
  const signatures = new Map();
  for (let index = 0; index < variants.length; index++) {
    const variant = pick();
    const start = index * 1000;
    h.clock(start);
    h.click();
    h.step(start);
    h.stats.calls.length = 0;
    h.step(start + 180);
    assert.ok(h.stats.calls.some(call => call.method === 'fill'), `${variant} should draw filled ornaments`);
    assert.ok(h.stats.calls.some(call => call.method === 'stroke'), `${variant} should draw stroked ornaments`);
    signatures.set(variant, h.stats.calls.map(call => call.method).join(','));
    h.step(start + lifetimes[variant] - 1);
    assert.equal(h.frames.size, 1, `${variant} should still be alive just before expiry`);
    h.stats.calls.length = 0;
    h.step(start + lifetimes[variant]);
    assert.equal(h.frames.size, 0, `${variant} should return to idle at expiry`);
    assert.ok(!h.stats.calls.some(call => call.method === 'fill' || call.method === 'stroke'));
  }
  assert.deepEqual([...signatures.keys()].sort(), [...variants].sort());
  assert.equal(new Set(signatures.values()).size, variants.length, 'styles must have visibly different drawing paths');
});

test('ignored clicks do not consume a style from the random bag', t => {
  const h = setup(t);
  const initialRandomCalls = h.stats.randomCalls;
  h.click({ button: 2 });
  h.click({ pointerType: 'touch' });
  h.click({ isPrimary: false });
  h.event('pointerdown');
  h.event('pointermove', { clientX: 170 });
  h.event('pointerup');
  h.event('pointerdown');
  h.event('pointercancel');
  h.event('pointerup');
  h.document.hidden = true;
  h.click();
  h.document.hidden = false;
  h.media.matches = true;
  h.click();
  h.media.matches = false;
  h.event('pointerdown');
  h.clock(1000);
  h.event('pointerup');
  assert.equal(h.stats.randomCalls, initialRandomCalls);
  h.click();
  assert.ok(h.stats.randomCalls > initialRandomCalls);
  const acceptedRandomCalls = h.stats.randomCalls;
  h.clock(1020);
  h.click();
  assert.equal(h.stats.randomCalls, acceptedRandomCalls, 'throttled clicks must not consume a style either');
});

test('overlay stays decorative and does not intercept pointer input', t => {
  const h = setup(t);
  const canvas = h.nodes[0];
  assert.equal(canvas.attributes.get('aria-hidden'), 'true');
  assert.equal(canvas.attributes.get('role'), 'presentation');
  assert.deepEqual(canvas.styles.get('pointer-events'), { value: 'none', priority: 'important' });
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    for (const options of h.document.handlers.get(type).values()) {
      assert.equal(options.passive, true);
    }
  }
});

test('dragging away and returning to the start does not trigger a click effect', t => {
  const h = setup(t);
  h.event('pointerdown');
  h.event('pointermove', { clientX: 170 });
  h.event('pointermove', { clientX: 140 });
  h.event('pointerup');
  assert.equal(h.frames.size, 0);
});

test('long presses, right clicks, touch and non-primary pointers are ignored', t => {
  const h = setup(t);
  h.event('pointerdown');
  h.clock(1000);
  h.event('pointerup');
  h.click({ button: 2 });
  h.click({ pointerType: 'touch' });
  h.click({ isPrimary: false });
  assert.equal(h.frames.size, 0);
});

test('pointer cancellation and mismatched pointer IDs do not complete a gesture', t => {
  const h = setup(t);
  h.event('pointerdown');
  h.event('pointercancel');
  h.event('pointerup');
  h.event('pointerdown');
  h.event('pointerup', { pointerId: 2 });
  assert.equal(h.frames.size, 0);
});

test('reduced motion suppresses clicks and stops active animation immediately', t => {
  const h = setup(t, { reducedMotion: true });
  h.click();
  assert.equal(h.frames.size, 0);
  h.media.matches = false;
  h.clock(100);
  h.click();
  assert.equal(h.frames.size, 1);
  h.media.matches = true;
  h.media.fire('change');
  assert.equal(h.frames.size, 0);
});

test('rapid input keeps one animation loop and caps concurrent effects at eight', t => {
  const rapid = setup(t);
  for (let index = 0; index < 30; index++) {
    rapid.clock(index * 50);
    rapid.click({ clientX: 100 + index, clientY: 180 });
  }
  assert.equal(rapid.frames.size, 1);
  rapid.stats.calls.length = 0;
  rapid.step(1460);
  const centers = rapid.stats.calls.filter(call => call.method === 'translate' && call.depth === 1);
  assert.deepEqual(centers.map(call => call.args), Array.from({ length: 8 }, (_, index) => [122 + index, 180]));
  rapid.step(2400);
  assert.equal(rapid.frames.size, 0);
});

test('backgrounding, focus loss and resizing clear animations and pending gestures', t => {
  const h = setup(t);
  h.click();
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.clock(100);
  h.click();
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.click();
  h.window.fire('resize');
  assert.equal(h.frames.size, 0);
  h.clock(200);
  h.event('pointerdown');
  h.window.fire('blur');
  h.event('pointerup');
  assert.equal(h.frames.size, 0);
});

test('remounting and repeated disposal leave no duplicate nodes, listeners or frames', t => {
  const h = setup(t);
  const listenerCount = h.document.count();
  h.mount();
  assert.equal(h.nodes.length, 1);
  assert.equal(h.document.count(), listenerCount);
  h.click();
  h.cleanup();
  h.cleanup();
  assert.equal(h.nodes.length, 0);
  assert.equal(h.document.count() + h.window.count() + h.media.count(), 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.window.__dshAtelierClickFx_v1__, undefined);
});

test('high-DPI backing canvas stays within the pixel budget, allowing dimension rounding', t => {
  const h = setup(t);
  const canvas = h.nodes[0];
  assert.ok(canvas.width * canvas.height < 8_010_000);
  h.window.innerWidth = 7680;
  h.window.innerHeight = 4320;
  h.window.devicePixelRatio = 4;
  h.window.fire('resize');
  assert.ok(canvas.width * canvas.height < 8_010_000);
});

test('theme colors are re-read for each click after a skin change', t => {
  const h = setup(t);
  h.cssValues.set('--maid-gold-soft', '#aabbcc');
  h.click();
  h.step(180);
  assert.ok(h.stats.colors.includes('#aabbcc'));
  h.step(901);
  h.stats.colors.length = 0;
  h.cssValues.set('--maid-gold-soft', '#ccbbaa');
  h.clock(1000);
  h.click();
  h.step(1100);
  assert.ok(h.stats.colors.includes('#ccbbaa'));
  assert.ok(!h.stats.colors.includes('#aabbcc'));
});

test('an unavailable Canvas context leaves the application untouched', t => {
  const h = setup(t, { canvasAvailable: false });
  h.click();
  assert.equal(h.nodes.length, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.document.count() + h.window.count() + h.media.count(), 0);
});
