/* =================================================================
   ЦВЕТОЧКИ НА CANVAS
   Два слоя:
   1) Яркая «река» цветков на главном экране (два canvas: за заголовком
      и перед ним — часть цветков пролетает перед буквами).
   2) Тёмный размытый слой цветков на фоне всех страниц.

   ВСЕ НАСТРОЙКИ — В ОБЪЕКТЕ FLOWERS_CONFIG НИЖЕ.
   Чистый JavaScript, без библиотек.
   ================================================================= */

const FLOWERS_CONFIG = {
  // --- Главный экран (река цветков) ---
  hero: {
    countDesktop: 540,   // сколько цветков на компьютере (400–600)
    countMobile: 190,    // сколько на телефоне (150–220)
    speed: 1,            // общая скорость: 0.5 — медленнее, 2 — в два раза быстрее
    riverWidth: 0.24,    // ширина «реки» (доля высоты экрана)
    waveHeight: 0.12,    // насколько сильно река изгибается волной
    sizeMin: 10,         // размер дальних (маленьких) цветков, px
    sizeMax: 74,         // размер ближних (крупных) цветков, px
    leafShare: 0.1,      // доля тёмно-зелёных листиков (0.1 = 10%)
    frontDepth: 0.88,    // цветки «ближе» этого значения летят ПЕРЕД заголовком (1 — ни одного)
    frontDepthMobile: 0.95, // то же для телефона (меньше цветков перед текстом)
    introDuration: 1700, // за сколько миллисекунд цветки «вылетают» при загрузке

    // Опадание при прокрутке: цветки по очереди срываются с «реки» и падают вниз
    fallDistance: 0.85,  // к какой доле высоты главного экрана опадут все цветки
    fallSmooth: 0.07,    // плавность (0.03 — очень мягко и с запаздыванием, 0.2 — почти сразу)
    fallDrift: 1         // насколько сильно ветер уносит падающие цветки в сторону
  },

  // --- Фоновый тёмный слой на всех страницах ---
  background: {
    countDesktop: 90,
    countMobile: 40,
    speed: 0.35,         // скорость падения
    parallax: 0,         // насколько слой сдвигается вверх при прокрутке (0 — не сдвигается)
    scrollFall: 0.28,    // насколько быстрее падают лепестки, пока листаете страницу
    sizeMin: 14,
    sizeMax: 44
    // Прозрачность слоя — в css/style.css, класс .petals-bg (opacity)
  },

  // --- Реакция на курсор / палец ---
  mouse: {
    radius: 150,   // радиус «дыры» вокруг курсора, px
    force: 1.2,    // сила отталкивания
    spring: 0.04,  // как быстро цветок возвращается на место
    damping: 0.86  // «вязкость» (0.8 — быстро успокаивается, 0.95 — долго колышется)
  },

  // --- Цвета цветков: inner — середина лепестка, outer — край.
  //     weight — как часто встречается (больше = чаще) ---
  colors: [
    { inner: '#ffffff', outer: '#ecebf1', weight: 5 },   // белый
    { inner: '#f5f4f8', outer: '#c4c3cd', weight: 3 },   // серебристый
    { inner: '#fff6f9', outer: '#f0d2de', weight: 1.1 }, // чуть розовый
    { inner: '#f8f5ff', outer: '#d8cff0', weight: 1.1 }, // чуть лавандовый
    { inner: '#f4f8ff', outer: '#cddff4', weight: 1 }    // чуть голубой
  ],
  leafColors: ['#1d3a2b', '#284a36', '#152b20'],

  maxDPR: 2 // чёткость на экранах Retina (больше 2 — тяжело для телефона)
};


(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const CFG = FLOWERS_CONFIG;
  const SPRITE = 128;        // размер заготовки одного цветка (px)
  const BLURS = [0, 2, 5];   // три степени размытия: резкий, мягкий, туманный

  /* ---------- 1. Рисуем заготовки цветков один раз ---------- */

  const supportsFilter = (() => {
    const test = document.createElement('canvas').getContext('2d');
    if (!test || !('filter' in test)) return false;
    test.filter = 'blur(2px)';
    return test.filter === 'blur(2px)';
  })();

  // Один лепесток (смотрит вверх) с небольшой выемкой на кончике
  function petalPath(r) {
    const p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(-r * 0.62, -r * 0.28, -r * 0.58, -r * 0.92, -r * 0.14, -r);
    p.quadraticCurveTo(0, -r * 0.9, r * 0.14, -r);
    p.bezierCurveTo(r * 0.58, -r * 0.92, r * 0.62, -r * 0.28, 0, 0);
    p.closePath();
    return p;
  }

  function drawFlower(g, tint) {
    const r = SPRITE * 0.34;
    const petal = petalPath(r);
    g.save();
    g.translate(SPRITE / 2, SPRITE / 2);

    const grad = g.createRadialGradient(0, 0, r * 0.08, 0, 0, r);
    grad.addColorStop(0, tint.inner);
    grad.addColorStop(0.55, tint.inner);
    grad.addColorStop(1, tint.outer);

    for (let i = 0; i < 5; i++) {
      g.save();
      g.rotate((i * Math.PI * 2) / 5);
      g.fillStyle = grad;
      g.fill(petal);
      // тонкая прожилка
      g.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, -r * 0.18);
      g.lineTo(0, -r * 0.7);
      g.stroke();
      g.restore();
    }

    // Объём: одна сторона цветка чуть темнее
    g.globalCompositeOperation = 'source-atop';
    const shade = g.createLinearGradient(-r, -r, r, r);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(40, 40, 60, 0.28)');
    g.fillStyle = shade;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.globalCompositeOperation = 'source-over';

    // Серединка
    const core = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.17);
    core.addColorStop(0, '#f6efd8');
    core.addColorStop(1, '#b9b09a');
    g.fillStyle = core;
    g.beginPath();
    g.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawLeaf(g, color) {
    const r = SPRITE * 0.36;
    g.save();
    g.translate(SPRITE / 2, SPRITE / 2);
    g.rotate(0.6);
    const leaf = new Path2D();
    leaf.moveTo(0, -r);
    leaf.bezierCurveTo(r * 0.5, -r * 0.5, r * 0.45, r * 0.5, 0, r);
    leaf.bezierCurveTo(-r * 0.45, r * 0.5, -r * 0.5, -r * 0.5, 0, -r);
    const grad = g.createLinearGradient(-r * 0.4, 0, r * 0.4, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#0c1a12');
    g.fillStyle = grad;
    g.fill(leaf);
    g.strokeStyle = 'rgba(160, 200, 170, 0.18)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, -r * 0.85);
    g.lineTo(0, r * 0.85);
    g.stroke();
    g.restore();
  }

  // Делаем заготовку с нужным размытием
  function makeSprite(draw, arg, blur) {
    const sharp = document.createElement('canvas');
    sharp.width = sharp.height = SPRITE;
    draw(sharp.getContext('2d'), arg);
    if (!blur) return sharp;

    const out = document.createElement('canvas');
    out.width = out.height = SPRITE;
    const g = out.getContext('2d');
    if (supportsFilter) {
      g.filter = 'blur(' + blur + 'px)';
      g.drawImage(sharp, 0, 0);
    } else {
      // Запасной способ размыть: уменьшить и растянуть обратно
      const small = document.createElement('canvas');
      const s = Math.max(8, Math.round(SPRITE / (1 + blur * 0.8)));
      small.width = small.height = s;
      small.getContext('2d').drawImage(sharp, 0, 0, s, s);
      g.imageSmoothingEnabled = true;
      g.drawImage(small, 0, 0, SPRITE, SPRITE);
    }
    return out;
  }

  // sprites.flowers[номер цвета][размытие], sprites.leaves[номер цвета][размытие]
  const sprites = {
    flowers: CFG.colors.map((tint) => BLURS.map((b) => makeSprite(drawFlower, tint, b))),
    leaves: CFG.leafColors.map((c) => BLURS.map((b) => makeSprite(drawLeaf, c, b)))
  };

  const totalWeight = CFG.colors.reduce((sum, c) => sum + c.weight, 0);
  function pickTint() {
    let r = Math.random() * totalWeight;
    for (let i = 0; i < CFG.colors.length; i++) {
      r -= CFG.colors[i].weight;
      if (r <= 0) return i;
    }
    return 0;
  }

  // Случайное число «колоколом» (чаще около нуля)
  function gauss() {
    return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => t * t * (3 - 2 * t);


  /* ---------- 2. Подготовка canvas под размер экрана ---------- */

  function fitCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDPR);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    return { w, h, dpr };
  }

  // Рисуем один цветок: позиция, поворот, «переворот» (сплющивание), размер, прозрачность
  function drawOne(ctx, sprite, x, y, size, rot, flip, alpha, dpr) {
    if (alpha <= 0.01) return;
    const cos = Math.cos(rot) * dpr;
    const sin = Math.sin(rot) * dpr;
    ctx.globalAlpha = alpha;
    ctx.setTransform(cos, sin, -sin * flip, cos * flip, x * dpr, y * dpr);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  }


  /* ---------- 3. Река цветков на главном экране ---------- */

  const hero = document.querySelector('.hero');
  const backCanvas = document.getElementById('flowers-back');
  const frontCanvas = document.getElementById('flowers-front');
  let heroSystem = null;

  if (hero && backCanvas && frontCanvas) {
    const H = CFG.hero;
    const back = backCanvas.getContext('2d');
    const front = frontCanvas.getContext('2d');
    let view = { w: 0, h: 0, dpr: 1 };
    let flowers = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let startTime = performance.now();
    let fall = 0;          // плавный прогресс опадания 0…1
    let scrollSmooth = 0;  // плавная прокрутка, px
    let cleared = false;   // все цветки опали и холсты уже очищены

    // Центр реки на высоте y для точки x: широкая плавная волна, слегка наискосок
    function riverY(x, t) {
      const w = view.w || 1;
      const h = view.h;
      const k = x / w;
      return h * 0.5
        + Math.sin(k * Math.PI * 1.8 + t * 0.00016) * h * H.waveHeight
        + Math.sin(k * Math.PI * 4.2 - t * 0.0001 + 1.3) * h * H.waveHeight * 0.35
        - (k - 0.5) * h * 0.14;
    }

    function spreadFor(z) {
      // Дальние (z≈0) — узко в середине реки, ближние (z≈1) — шире, к краям экрана
      return view.h * H.riverWidth * (0.3 + z * z * 2.1);
    }

    function createFlower(randomX) {
      const z = Math.pow(Math.random(), 1.5);           // глубина: 0 — далеко, 1 — близко
      const leaf = Math.random() < H.leafShare;
      const blur = z < 0.32 ? 2 : z < 0.62 ? 1 : (z > 0.97 ? 1 : 0);
      const set = leaf
        ? sprites.leaves[(Math.random() * sprites.leaves.length) | 0]
        : sprites.flowers[pickTint()];
      return {
        z,
        sprite: set[blur],
        front: z > (isMobile ? H.frontDepthMobile : H.frontDepth),
        x: randomX ? Math.random() * (view.w + 200) - 100 : -100 - Math.random() * 200,
        offset: gauss() * spreadFor(z),
        // На узких экранах цветки чуть мельче, чтобы не закрывали текст
        size: lerp(H.sizeMin, H.sizeMax, Math.pow(z, 1.4)) * (0.75 + Math.random() * 0.5) * (leaf ? 0.8 : 1)
          * Math.min(1, Math.max(0.6, view.w / 1200)),
        alpha: lerp(0.28, 1, z) * (leaf ? 0.85 : 1),
        vx: (14 + z * 62) * (0.75 + Math.random() * 0.5),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * (0.4 + z * 0.9),
        flipSpeed: 0.4 + Math.random() * 0.9,
        swayAmp: 6 + Math.random() * 18 * (0.4 + z),
        swaySpeed: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        delay: 0,
        swayPh: Math.random() * Math.PI * 2,  // фаза покачивания (копится каждый кадр)
        flipPh: Math.random() * Math.PI * 2,  // фаза «переворота»
        // Опадание при прокрутке: когда цветок срывается, куда его уносит и как крутит
        fallAt: Math.random() * 0.5 + (1 - z) * 0.1,
        fallDrift: (Math.random() - 0.3) * (90 + z * 260),
        fallSpin: (Math.random() - 0.5) * (3 + z * 5),
        fallSpeed: 1 + Math.random() * 0.4,
        // смещение от курсора (пружина)
        dx: 0, dy: 0, ddx: 0, ddy: 0
      };
    }

    // Сколько прокручено от верха главного экрана, px
    function heroScroll() {
      return Math.max(0, window.scrollY - hero.offsetTop);
    }
    function fallTarget() {
      return clamp01(heroScroll() / Math.max(1, hero.offsetHeight * H.fallDistance));
    }

    function build() {
      view = fitCanvas(backCanvas);
      fitCanvas(frontCanvas);
      const count = isMobile ? H.countMobile : H.countDesktop;
      flowers = [];
      for (let i = 0; i < count; i++) {
        const f = createFlower(true);
        // Волна появления: слева направо + немного случайности
        f.delay = (f.x / Math.max(view.w, 1)) * H.introDuration * 0.55 + Math.random() * H.introDuration * 0.2;
        flowers.push(f);
      }
      // Дальние рисуем первыми, ближние — поверх
      flowers.sort((a, b) => a.z - b.z);
      // Если страницу открыли уже прокрученной — цветки сразу на своих местах
      fall = reduceMotion ? 0 : fallTarget();
      scrollSmooth = reduceMotion ? 0 : heroScroll();
    }

    function resize() {
      const oldW = view.w || 1;
      view = fitCanvas(backCanvas);
      fitCanvas(frontCanvas);
      flowers.forEach((f) => { f.x = (f.x / oldW) * view.w; });
      if (reduceMotion) render(performance.now(), 0);
    }

    function render(now, dt) {
      const t = now;
      const sinceStart = now - startTime;
      const step = Math.min(dt / 16.67, 3); // поправка на частоту кадров
      const w = view.w;
      const h = view.h;
      const dpr = view.dpr;
      const M = CFG.mouse;
      const R2 = M.radius * M.radius;

      // Плавно догоняем прокрутку: цветки опадают мягко, даже если колесо дёргается
      if (dt && !reduceMotion) {
        const k = 1 - Math.pow(1 - H.fallSmooth, step);
        const target = fallTarget();
        fall += (target - fall) * k;
        if (Math.abs(target - fall) < 0.0004) fall = target;
        const s = heroScroll();
        scrollSmooth += (s - scrollSmooth) * Math.min(1, k * 2.5);
        if (Math.abs(s - scrollSmooth) < 0.3) scrollSmooth = s;
      }

      // Все цветки опали — очищаем холсты один раз и не тратим силы
      if (fall >= 1) {
        if (!cleared) {
          back.setTransform(1, 0, 0, 1, 0, 0);
          back.clearRect(0, 0, backCanvas.width, backCanvas.height);
          front.setTransform(1, 0, 0, 1, 0, 0);
          front.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
          cleared = true;
        }
        return;
      }
      cleared = false;

      back.setTransform(1, 0, 0, 1, 0, 0);
      back.clearRect(0, 0, backCanvas.width, backCanvas.height);
      front.setTransform(1, 0, 0, 1, 0, 0);
      front.clearRect(0, 0, frontCanvas.width, frontCanvas.height);

      for (let i = 0; i < flowers.length; i++) {
        const f = flowers[i];

        // q — насколько этот цветок уже опал (0 — ещё в реке, 1 — улетел вниз за экран)
        const q = clamp01(((fall - f.fallAt) / 0.4) * f.fallSpeed);
        const qs = smooth(q);

        if (dt) {
          f.x += f.vx * H.speed * (dt / 1000) * (1 - qs * 0.6);
          f.rot += f.spin * H.speed * (dt / 1000) * (1 + q * 1.5);
          // Падающий цветок покачивается и переворачивается быстрее
          f.swayPh += (dt / 1000) * f.swaySpeed * (1 + q * 1.6);
          f.flipPh += (dt / 1000) * f.flipSpeed * (1 + q * 2.2);

          // Улетел за правый край — переносим на левый (только пока он в реке)
          if (f.x > w + f.size && q === 0) {
            f.x = -f.size - Math.random() * 120;
            f.offset = gauss() * spreadFor(f.z);
          }
        }

        const sway = Math.sin(f.swayPh) * f.swayAmp * (1 + q * 1.8);
        let x = f.x;
        let y = riverY(f.x, t) + f.offset + sway;

        // Прокрутка: цветок в реке уезжает вверх вместе со страницей,
        // а сорвавшийся — плавно, с ускорением, падает вниз и уносится ветром
        if (!reduceMotion) {
          y -= scrollSmooth * (1 - qs);
          y += q * q * h * 1.7;
          x += qs * f.fallDrift * H.fallDrift + Math.sin(f.swayPh * 1.7) * q * (14 + f.z * 26);
        }

        // Отталкивание от курсора + пружина обратно
        if (dt) {
          if (pointer.active) {
            const px = x + f.dx - pointer.x;
            const py = y + f.dy - pointer.y;
            const d2 = px * px + py * py;
            if (d2 < R2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const push = (1 - d / M.radius) * M.force * (0.6 + f.z) * step;
              f.ddx += (px / d) * push * 2.2;
              f.ddy += (py / d) * push * 2.2;
            }
          }
          f.ddx += -f.dx * M.spring * step;
          f.ddy += -f.dy * M.spring * step;
          f.ddx *= Math.pow(M.damping, step);
          f.ddy *= Math.pow(M.damping, step);
          f.dx += f.ddx * step;
          f.dy += f.ddy * step;
        }
        x += f.dx;
        y += f.dy;

        // У краёв экрана цветки чуть крупнее (перспектива)
        const edge = Math.abs(x - w / 2) / (w / 2);
        let size = f.size * (1 + edge * 0.35 * f.z);
        let alpha = f.alpha * (1 - q * 0.3);

        // Вступление: цветки «вылетают» волной слева
        if (!reduceMotion && sinceStart < H.introDuration + 1500) {
          const p = easeOut(clamp01((sinceStart - f.delay) / 900));
          x -= (1 - p) * w * 0.18 * (0.4 + f.z);
          alpha *= p;
          size *= 0.5 + 0.5 * p;
        }

        // «Покачивание»: цветок слегка поворачивается к нам то одной, то другой стороной
        // (у падающего — сильнее, будто кувыркается в воздухе)
        const flip = (0.74 - q * 0.4) + (0.26 + q * 0.4) * Math.cos(f.flipPh);
        const rot = f.rot + f.fallSpin * qs;
        drawOne(f.front ? front : back, f.sprite, x, y, size, rot, flip, alpha, dpr);
      }

      back.globalAlpha = 1;
      front.globalAlpha = 1;
    }

    // Позиция курсора / пальца. Холсты закреплены на экране (position: fixed),
    // поэтому координаты окна совпадают с координатами холста.
    function setPointer(clientX, clientY) {
      pointer.x = clientX;
      pointer.y = clientY;
      pointer.active = true;
    }

    // Холсты «прилипают» к экрану, чтобы цветки могли падать дальше главного экрана
    if (!reduceMotion) hero.classList.add('hero--falling');

    if (!reduceMotion) {
      window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
      window.addEventListener('touchstart', (e) => {
        if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      window.addEventListener('touchend', () => { pointer.active = false; }, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; });
    }

    build();
    startTime = performance.now();

    // Когда все цветки опали, render() сам очищает холсты и почти ничего не делает
    heroSystem = { render, resize };
  }


  /* ---------- 4. Тёмный фоновый слой на всех страницах ---------- */

  const bgCanvas = document.getElementById('petals-bg');
  let bgSystem = null;

  if (bgCanvas) {
    const B = CFG.background;
    const ctx = bgCanvas.getContext('2d');
    let view = { w: 0, h: 0, dpr: 1 };
    let petals = [];

    function createPetal() {
      const z = Math.random();
      const leaf = Math.random() < 0.15;
      const set = leaf
        ? sprites.leaves[(Math.random() * sprites.leaves.length) | 0]
        : sprites.flowers[pickTint()];
      return {
        z,
        sprite: set[z < 0.5 ? 2 : 1],
        x: Math.random() * view.w,
        y: Math.random() * view.h,
        size: lerp(B.sizeMin, B.sizeMax, z) * (0.8 + Math.random() * 0.4),
        vy: (10 + z * 22),
        vx: (6 + Math.random() * 10),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2
      };
    }

    function build() {
      view = fitCanvas(bgCanvas);
      const count = isMobile ? B.countMobile : B.countDesktop;
      petals = [];
      for (let i = 0; i < count; i++) petals.push(createPetal());
    }

    function resize() {
      const old = { w: view.w || 1, h: view.h || 1 };
      view = fitCanvas(bgCanvas);
      petals.forEach((p) => { p.x = (p.x / old.w) * view.w; p.y = (p.y / old.h) * view.h; });
      if (reduceMotion) render(performance.now(), 0);
    }

    let lastScroll = window.scrollY;
    let gust = 0; // плавная «порывистость» от прокрутки, px/с

    function render(now, dt) {
      const w = view.w;
      const h = view.h;
      const scroll = reduceMotion ? 0 : window.scrollY * B.parallax;

      // Чем быстрее листаете — тем быстрее опадают лепестки (и плавно успокаиваются)
      if (dt) {
        const sy = window.scrollY;
        const speedNow = Math.min(Math.abs(sy - lastScroll) / (dt / 1000), 2500);
        lastScroll = sy;
        gust += (speedNow - gust) * (speedNow > gust ? 0.12 : 0.04);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        if (dt) {
          p.y += (p.vy * B.speed + gust * B.scrollFall * (0.4 + p.z * 0.6)) * (dt / 1000);
          p.x += p.vx * B.speed * (dt / 1000);
          p.rot += p.spin * (dt / 1000);
        }
        // Слой сдвигается при прокрутке (ближние — сильнее): лёгкий параллакс
        const span = h + p.size * 2;
        let y = (p.y - scroll * (0.5 + p.z)) % span;
        if (y < 0) y += span;
        y -= p.size;
        let x = (p.x + Math.sin(now * 0.0004 + p.phase) * 20) % (w + p.size * 2);
        if (x < 0) x += w + p.size * 2;
        x -= p.size;
        drawOne(ctx, p.sprite, x, y, p.size, p.rot, 0.7 + 0.3 * Math.cos(now * 0.0006 + p.phase), 0.55 + p.z * 0.45, view.dpr);
      }
      ctx.globalAlpha = 1;
    }

    build();
    bgSystem = { render, resize };
  }


  /* ---------- 5. Общий цикл анимации ---------- */

  const loop = {
    frame: 0,
    last: 0,
    tick(now) {
      const dt = loop.last ? Math.min(now - loop.last, 64) : 16.67;
      loop.last = now;
      if (heroSystem) heroSystem.render(now, dt);
      if (bgSystem) bgSystem.render(now, dt);
      loop.frame = requestAnimationFrame(loop.tick);
    },
    wake() {
      if (reduceMotion || loop.frame || document.hidden) return;
      loop.last = 0;
      loop.frame = requestAnimationFrame(loop.tick);
    },
    stop() {
      cancelAnimationFrame(loop.frame);
      loop.frame = 0;
    }
  };

  // Вкладка скрыта — полностью останавливаемся
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) loop.stop(); else loop.wake();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (heroSystem) heroSystem.resize();
      if (bgSystem) bgSystem.resize();
    }, 150);
  });

  if (reduceMotion) {
    // «Уменьшить движение»: рисуем один неподвижный кадр
    const now = performance.now() + 100000;
    if (heroSystem) heroSystem.render(now, 0);
    if (bgSystem) bgSystem.render(now, 0);
  } else {
    loop.wake();
  }
})();
