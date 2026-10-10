window.__ModuleLoader__.load({
  id: 'dsh-atelier-clickfx',
  factory() {
    const KEY = '__dshAtelierClickFx_v1__';
    const DURATIONS = { ripple: 720, bloom: 820, comets: 760, orbit: 900, butterflies: 860 };
    const LIMIT = 8;
    const TAU = Math.PI * 2;

    // A shuffled bag gives variety without starving a style or repeating at a seam.
    function createVariantPicker(random = Math.random) {
      let bag = [], previous = null;
      return () => {
        if (!bag.length) {
          bag = Object.keys(DURATIONS);
          for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
          }
          if (bag[0] === previous) {
            const j = 1 + Math.floor(random() * (bag.length - 1));
            [bag[0], bag[j]] = [bag[j], bag[0]];
          }
        }
        previous = bag.shift();
        return previous;
      };
    }

    function mount() {
      window[KEY]?.();
      const canvas = document.createElement('canvas');
      canvas.id = 'dsh-atelier-clickfx';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('role', 'presentation');
      // Inline important styles isolate the overlay from third-party skin CSS.
      const styles = {
        position: 'fixed', inset: '0', 'z-index': '2147483646',
        'pointer-events': 'none', 'user-select': 'none',
        width: '100vw', height: '100vh', margin: '0', padding: '0',
        border: '0', background: 'transparent', opacity: '1',
        'border-radius': '0', transform: 'none', filter: 'none',
        'box-shadow': 'none', 'mix-blend-mode': 'normal',
      };
      for (const [name, value] of Object.entries(styles)) canvas.style.setProperty(name, value, 'important');
      const paint = canvas.getContext('2d', { alpha: true });
      if (!paint) return () => {};
      document.body.appendChild(canvas);

      let width = 0, height = 0, scale = 1, frame = 0, disposed = false;
      let bursts = [], press = null, lastBurst = -Infinity;
      const nextVariant = createVariantPicker();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listeners = [];
      function listen(target, type, fn, options) {
        target.addEventListener(type, fn, options);
        listeners.push(() => target.removeEventListener(type, fn, options));
      }
      function resize() {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        // Bound high-DPI memory; a 4K display does not require a 6K+ overlay.
        scale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8_000_000 / (width * height)));
        canvas.width = Math.ceil(width * scale);
        canvas.height = Math.ceil(height * scale);
        paint.setTransform(scale, 0, 0, scale, 0, 0);
      }
      function palette() {
        const css = getComputedStyle(document.body);
        const color = (names, fallback) => {
          for (const name of names) {
            const value = css.getPropertyValue(name).trim();
            if (value && CSS.supports('color', value)) return value;
          }
          return fallback;
        };
        return {
          gold: color(['--maid-gold-soft', '--maid-gold'], '#e2cfaa'),
          blue: color(['--maid-periwinkle', '--dsw-alias-brand-primary'], '#8ea5da'),
          white: color(['--maid-porcelain', '--dsw-alias-label-primary'], '#f8f6f0'),
        };
      }
      function star(x, y, radius, rotation, color, alpha) {
        paint.save();
        paint.translate(x, y);
        paint.rotate(rotation);
        paint.globalAlpha = Math.max(0, alpha);
        paint.fillStyle = color;
        paint.beginPath();
        for (let n = 0; n < 8; n++) {
          const angle = n * Math.PI / 4;
          const r = n % 2 ? radius * 0.22 : radius;
          const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
          if (n === 0) paint.moveTo(px, py); else paint.lineTo(px, py);
        }
        paint.closePath();
        paint.fill();
        paint.restore();
      }
      function ring(x, y, radius, color, alpha, lineWidth, start = 0, end = TAU) {
        paint.globalAlpha = Math.max(0, alpha);
        paint.strokeStyle = color;
        paint.lineWidth = lineWidth;
        paint.beginPath();
        paint.arc(x, y, radius, start, end);
        paint.stroke();
      }
      function dust(colors, seed, ease, t, fade, count = 5) {
        for (let n = 0; n < count; n++) {
          const angle = seed + n * 2.39996;
          const distance = 5 + ease * (20 + n * 4);
          paint.globalAlpha = 0.65 * fade;
          paint.fillStyle = n % 2 ? colors.blue : colors.white;
          paint.beginPath();
          paint.arc(Math.cos(angle) * distance, Math.sin(angle) * distance - t * 9, 0.7, 0, TAU);
          paint.fill();
        }
      }
      function ripple({ colors, seed }, t, ease, fade) {
        const radius = 6 + 37 * ease;
        ring(0, 0, radius, colors.gold, 0.82 * fade, 1.1);
        for (let n = 0; n < 4; n++) {
          const angle = n * Math.PI / 2 + seed + t * 0.16;
          ring(0, 0, radius * 0.76, colors.blue, 0.6 * fade, 0.75, angle, angle + 0.78);
        }
        star(0, 0, 5.8 * (1 - t), Math.PI / 4, colors.white, fade * 0.9);
        for (let n = 0; n < 6; n++) {
          const angle = seed + n * TAU / 6;
          const distance = 9 + ease * (29 + (n % 3) * 6);
          const px = Math.cos(angle) * distance;
          const py = Math.sin(angle) * distance - t * 5;
          const size = (n % 2 ? 2.5 : 3.8) * (0.65 + 0.35 * Math.sin(Math.PI * t));
          star(px, py, size, angle + t * 0.3, n % 2 ? colors.blue : colors.gold, fade * 0.9);
        }
        dust(colors, seed, ease, t, fade);
      }
      function bloom({ colors, seed }, t, ease, fade) {
        for (let n = 0; n < 6; n++) {
          paint.save();
          paint.rotate(seed + n * TAU / 6 + t * 0.18);
          const tip = 10 + 32 * ease, base = 3 + ease * 4, width = 3 + 8 * ease;
          paint.beginPath();
          paint.moveTo(base, 0);
          paint.bezierCurveTo(tip * 0.5, -width, tip, -width, tip, 0);
          paint.bezierCurveTo(tip, width, tip * 0.5, width, base, 0);
          paint.closePath();
          paint.fillStyle = n % 2 ? colors.blue : colors.gold;
          paint.globalAlpha = 0.1 * fade;
          paint.fill();
          paint.strokeStyle = n % 2 ? colors.blue : colors.gold;
          paint.globalAlpha = 0.9 * fade;
          paint.lineWidth = 0.95;
          paint.stroke();
          star(tip + 4, 0, 1.8, Math.PI / 4, colors.white, fade * 0.85);
          paint.restore();
        }
        ring(0, 0, 3 + ease * 4, colors.gold, fade * 0.85, 1);
        star(0, 0, 4.5, Math.PI / 4 + t * 0.6, colors.white, fade);
        dust(colors, seed + 0.5, ease, t, fade, 3);
      }
      function comets({ colors, seed }, t, ease, fade) {
        for (let n = 0; n < 5; n++) {
          const angle = seed + (n - 2) * 0.55;
          const reach = 30 + (n % 3) * 9;
          const head = 7 + ease * reach, tail = 7 + Math.max(0, ease - 0.32) * reach;
          const hx = Math.cos(angle) * head, hy = Math.sin(angle) * head - t * t * 8;
          paint.globalAlpha = fade * 0.72;
          paint.strokeStyle = n % 2 ? colors.blue : colors.gold;
          paint.lineWidth = n === 2 ? 1.35 : 0.8;
          paint.beginPath();
          paint.moveTo(Math.cos(angle) * tail, Math.sin(angle) * tail);
          paint.quadraticCurveTo(hx - Math.sin(angle) * 5, hy + Math.cos(angle) * 5, hx, hy);
          paint.stroke();
          star(hx, hy, n === 2 ? 5.4 : 3.2, angle + t * 0.2, n % 2 ? colors.blue : colors.gold, fade);
        }
        star(0, 0, 4 * (1 - t), seed, colors.white, fade);
        dust(colors, seed, ease, t, fade, 3);
      }
      function orbit({ colors, seed }, t, ease, fade) {
        const rx = 9 + ease * 37, ry = 4 + ease * 12;
        for (let n = 0; n < 2; n++) {
          const tilt = seed + (n ? Math.PI / 3 : -Math.PI / 3);
          paint.globalAlpha = fade * (n ? 0.65 : 0.8);
          paint.strokeStyle = n ? colors.blue : colors.gold;
          paint.lineWidth = n ? 0.75 : 1;
          paint.beginPath();
          paint.ellipse(0, 0, rx, ry, tilt, 0, TAU);
          paint.stroke();
          for (let j = 0; j < 2; j++) {
            const angle = t * TAU * (n ? -0.7 : 0.7) + j * Math.PI;
            const px = Math.cos(angle) * rx, py = Math.sin(angle) * ry;
            star(px * Math.cos(tilt) - py * Math.sin(tilt), px * Math.sin(tilt) + py * Math.cos(tilt),
              j ? 2.5 : 4, angle + tilt, n ? colors.blue : colors.gold, fade);
          }
        }
        star(0, 0, 7 * (1 - t * 0.65), Math.PI / 4 + t * 0.5, colors.white, fade);
        dust(colors, seed, ease, t, fade, 3);
      }
      function butterflies({ colors, seed }, t, ease, fade) {
        for (let n = 0; n < 3; n++) {
          const angle = seed + n * TAU / 3;
          const distance = 5 + ease * (n === 0 ? 30 : 39);
          paint.save();
          paint.translate(Math.cos(angle) * distance, Math.sin(angle) * distance - t * 6);
          paint.rotate(angle + Math.PI / 2 + Math.sin(t * 5 + n) * 0.18);
          const size = n === 0 ? 8 : 6;
          const wing = size * (0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 3 + n)));
          paint.beginPath();
          for (const side of [-1, 1]) {
            paint.moveTo(0, 0);
            paint.bezierCurveTo(side * wing, -size * 1.2, side * wing * 1.6, -size * 0.8, side * wing, 0);
            paint.bezierCurveTo(side * wing * 1.25, size * 0.7, side * wing * 0.25, size, 0, 0);
          }
          paint.fillStyle = n % 2 ? colors.blue : colors.gold;
          paint.globalAlpha = fade * 0.16;
          paint.fill();
          paint.strokeStyle = n % 2 ? colors.blue : colors.gold;
          paint.globalAlpha = fade * 0.95;
          paint.lineWidth = 0.95;
          paint.stroke();
          star(0, 0, size * 0.36, 0, colors.white, fade);
          paint.restore();
        }
        star(0, 0, 3 * (1 - t), seed, colors.gold, fade * 0.8);
        dust(colors, seed + 0.4, ease, t, fade);
      }
      const renderers = { ripple, bloom, comets, orbit, butterflies };
      function draw(burst, now) {
        const t = Math.min(1, Math.max(0, (now - burst.time) / burst.duration));
        const ease = 1 - Math.pow(1 - t, 3);
        const fade = Math.pow(1 - t, 1.4);
        paint.save();
        paint.translate(burst.x, burst.y);
        paint.lineCap = 'round';
        paint.lineJoin = 'round';
        renderers[burst.variant](burst, t, ease, fade);
        paint.restore();
      }
      function tick(now) {
        frame = 0;
        if (disposed) return;
        paint.clearRect(0, 0, width, height);
        bursts = bursts.filter(burst => now - burst.time < burst.duration);
        for (const burst of bursts) draw(burst, now);
        paint.globalAlpha = 1;
        if (bursts.length) frame = requestAnimationFrame(tick);
      }
      function reset() {
        press = null;
        bursts = [];
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        paint.clearRect(0, 0, width, height);
      }
      function onDown(event) {
        if (event.button !== 0 || !event.isPrimary || event.pointerType === 'touch') return;
        press = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
      }
      function onMove(event) {
        if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press.moved = true;
      }
      function onUp(event) {
        const down = press;
        press = null;
        const now = performance.now();
        if (!down || down.id !== event.pointerId || down.moved || event.button !== 0 || !event.isPrimary
          || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7
          || now - down.time > 700 || now - lastBurst < 45 || reduced.matches || document.hidden) return;
        lastBurst = now;
        const variant = nextVariant();
        bursts.push({ x: event.clientX, y: event.clientY, time: now, colors: palette(), seed: Math.random() * TAU,
          variant, duration: DURATIONS[variant] });
        if (bursts.length > LIMIT) bursts.shift();
        if (!frame) frame = requestAnimationFrame(tick);
      }
      resize();
      const passiveCapture = { capture: true, passive: true };
      listen(document, 'pointerdown', onDown, passiveCapture);
      listen(document, 'pointermove', onMove, passiveCapture);
      listen(document, 'pointerup', onUp, passiveCapture);
      listen(document, 'pointercancel', () => { press = null; }, passiveCapture);
      listen(document, 'visibilitychange', reset);
      listen(window, 'blur', reset);
      listen(window, 'resize', () => { reset(); resize(); });
      listen(reduced, 'change', reset);
      function dispose() {
        if (disposed) return;
        disposed = true;
        reset();
        for (const off of listeners) off();
        canvas.remove();
        if (window[KEY] === dispose) delete window[KEY];
      }
      window[KEY] = dispose;
      return dispose;
    }
    return { inject: [], createVariantPicker, apply(ctx) { ctx.effect(mount); } };
  },
});
