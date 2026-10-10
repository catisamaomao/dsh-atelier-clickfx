import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

// A small browser boundary fake: no real display or platform UI is exercised.
function harness({ canvasAvailable = true, reducedMotion = false } = {}) {
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

  const stats = { arcs: 0, clears: 0, fills: 0, colors: [] };
  const context = new Proxy({}, {
    get(target, key) {
      if (key === 'arc') return () => stats.arcs++;
      if (key === 'clearRect') return () => stats.clears++;
      if (key === 'fill') return () => stats.fills++;
      return target[key] ?? (() => {});
    },
    set(target, key, value) {
      if (key === 'fillStyle' || key === 'strokeStyle') stats.colors.push(value);
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
  };
  return {
    document, window, media, nodes, frames, stats, cssValues, mount, click, event, step,
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
  h.step(730);
  assert.equal(h.frames.size, 0);
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
  const single = setup(t);
  single.click();
  single.step(10);
  const arcsPerEffect = single.stats.arcs;
  assert.ok(arcsPerEffect > 0);
  const rapid = setup(t);
  for (let index = 0; index < 30; index++) {
    rapid.clock(index * 50);
    rapid.click();
  }
  assert.equal(rapid.frames.size, 1);
  rapid.step(1460);
  assert.equal(rapid.stats.arcs, arcsPerEffect * 8);
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
  h.step(730);
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
