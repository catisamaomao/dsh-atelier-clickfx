window.__ModuleLoader__.load({
  id: 'dsh-atelier-clickfx',
  factory() {
    const KEY = '__dshAtelierClickFx_v1__';
    const LIFE = 720;
    const LIMIT = 8;
    const TAU = Math.PI * 2;

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
      function draw(burst, now) {
        const t = Math.min(1, Math.max(0, (now - burst.time) / LIFE));
        const ease = 1 - Math.pow(1 - t, 3);
        const fade = Math.pow(1 - t, 1.55);
        const { x, y, colors, seed } = burst;
        const radius = 6 + 37 * ease;
        ring(x, y, radius, colors.gold, 0.72 * fade, 1.1);
        // Four separated inner arcs echo the skin's delicate ornamental trim.
        for (let n = 0; n < 4; n++) {
          const angle = n * Math.PI / 2 + seed + t * 0.16;
          ring(x, y, radius * 0.76, colors.blue, 0.45 * fade, 0.65, angle, angle + 0.78);
        }
        star(x, y, 5.8 * (1 - t), Math.PI / 4, colors.white, fade * 0.8);
        for (let n = 0; n < 6; n++) {
          const angle = seed + n * TAU / 6;
          const distance = 9 + ease * (29 + (n % 3) * 6);
          const px = x + Math.cos(angle) * distance;
          const py = y + Math.sin(angle) * distance - t * 5;
          const size = (n % 2 ? 2.5 : 3.8) * (0.65 + 0.35 * Math.sin(Math.PI * t));
          star(px, py, size, angle + t * 0.3, n % 2 ? colors.blue : colors.gold, fade * 0.9);
        }
        for (let n = 0; n < 5; n++) {
          const angle = seed + n * 2.39996;
          const distance = 5 + ease * (20 + n * 4);
          paint.globalAlpha = 0.65 * fade;
          paint.fillStyle = n % 2 ? colors.blue : colors.white;
          paint.beginPath();
          paint.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance - t * 9, 0.7, 0, TAU);
          paint.fill();
        }
      }
      function tick(now) {
        frame = 0;
        if (disposed) return;
        paint.clearRect(0, 0, width, height);
        bursts = bursts.filter(burst => now - burst.time < LIFE);
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
        bursts.push({ x: event.clientX, y: event.clientY, time: now, colors: palette(), seed: Math.random() * TAU });
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
    return { inject: [], apply(ctx) { ctx.effect(mount); } };
  },
});
