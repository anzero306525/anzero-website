/* =================================================================
   JAVASCRIPT САЙТА ANZERO WEBSITE
   Один общий файл для всех страниц. Каждая часть сначала проверяет,
   есть ли на странице нужный блок, — поэтому на страницах, где блока
   нет, ничего не ломается.
   Цветочки — в отдельном файле js/flowers.js.
   ================================================================= */

// Включена ли в системе настройка «уменьшить движение»
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Есть ли у устройства мышь (на телефонах и планшетах — нет)
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;


/* --- 0. Открытие страницы ---
   Обычно страница открывается с самого начала. Но если пришли по ссылке
   на раздел (например index.html#process из меню на странице «Цены»),
   плавно прокручиваем к этому разделу. #якорь потом убираем из адреса. */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const startHash = window.location.hash;
const startTarget = startHash.length > 1 ? document.querySelector(startHash) : null;

function clearHash() {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

clearHash();
window.addEventListener('hashchange', clearHash);

function scrollToStart() {
  if (startTarget) return;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

scrollToStart();
window.addEventListener('load', () => {
  if (startTarget) {
    setTimeout(() => startTarget.scrollIntoView({ behavior: 'instant' }), 50);
  } else {
    scrollToStart();
  }
});
// Возврат на страницу кнопкой «Назад» из кэша браузера
window.addEventListener('pageshow', (event) => {
  if (event.persisted) scrollToStart();
});


/* --- 1. Мобильное меню (кнопка-бургер) --- */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

function setMenu(open) {
  nav.classList.toggle('nav--open', open);
  burger.classList.toggle('burger--open', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
}

burger.addEventListener('click', () => setMenu(!nav.classList.contains('nav--open')));

// Когда выбрали пункт меню — закрываем меню
nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('nav--open')) setMenu(false);
});


/* --- 2. Шапка, полоска прогресса и кнопка «Наверх» при прокрутке --- */
const header = document.getElementById('header');
const progress = document.getElementById('progress');
const toTop = document.getElementById('to-top');
let scrollTicking = false;

function onScroll() {
  const y = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  // Прокрутили больше 20 пикселей — шапка становится компактной, с размытым фоном
  header.classList.toggle('header--scrolled', y > 20);
  // Полоска сверху показывает, какая часть страницы уже прочитана
  progress.style.transform = 'scaleX(' + (maxScroll > 0 ? y / maxScroll : 0) + ')';
  // Кнопка «Наверх» появляется, когда прокрутили вниз
  toTop.classList.toggle('to-top--visible', y > 600);

  scrollTicking = false;
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

toTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});


/* --- 3. Подсветка пункта меню того раздела, который сейчас на экране ---
   Работает на главной: у ссылок меню есть data-section="id раздела". */
const sectionLinks = Array.from(document.querySelectorAll('.nav__link[data-section]'));

if (sectionLinks.length && 'IntersectionObserver' in window) {
  // Следим за всеми разделами страницы. Если в середине экрана раздел,
  // для которого нет пункта меню (главный экран, «Обо мне», финал), — ничего не подсвечиваем.
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => {
        const active = link.dataset.section === entry.target.id;
        link.classList.toggle('nav__link--active', active);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  document.querySelectorAll('main > section[id]').forEach((section) => sectionObserver.observe(section));
}


/* --- 4. Заголовки «по словам» ---
   Заголовок с классом .split разбиваем на слова (<span class="word">),
   и CSS выводит их по очереди. */
function splitWords(element) {
  let index = 0;
  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(' '));
        } else {
          const word = document.createElement('span');
          word.className = 'word';
          word.textContent = part;
          word.style.setProperty('--i', index++);
          fragment.appendChild(word);
        }
      });
      node.replaceWith(fragment);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
      // Например, <span class="t3d--cream">есть</span> — одно «слово»
      node.classList.add('word');
      node.style.setProperty('--i', index++);
    }
  });
  element.classList.add('is-split');
}

document.querySelectorAll('.split').forEach(splitWords);


/* --- 5. Появление блоков при прокрутке ---
   Следим за элементами с классом .reveal. Как только элемент
   показался на экране — добавляем класс .visible (см. style.css).
   Блоки, появившиеся одновременно, выезжают по очереди (каждый на 100 мс позже). */
const STAGGER = 100; // задержка между соседними блоками, мс
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry, index) => {
        const item = entry.target;
        if (!item.classList.contains('split')) item.style.transitionDelay = (index * STAGGER) + 'ms';
        item.classList.add('visible');
        observer.unobserve(item); // анимируем только один раз
        // После появления убираем задержку, чтобы наведение срабатывало мгновенно
        setTimeout(() => { item.style.transitionDelay = ''; }, 900 + index * STAGGER);
      });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealItems.forEach((item) => observer.observe(item));
} else {
  // Старый браузер или «уменьшить движение» — просто показываем всё сразу
  revealItems.forEach((item) => item.classList.add('visible'));
}


/* --- 6. 3D-наклон карточек за мышью (до 6°) ---
   Работает только с мышью: на телефонах и планшетах отключён. */
const MAX_TILT = 6; // максимальный наклон в градусах

if (canHover && !reduceMotion) {
  document.querySelectorAll('.w-card, .work-card').forEach((card) => {
    let frame = null;

    card.addEventListener('pointermove', (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;  // от -0.5 до 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--ry', (x * MAX_TILT * 2).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * MAX_TILT * 2).toFixed(2) + 'deg');
        card.classList.add('is-tilting');
        frame = null;
      });
    });

    card.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      card.classList.remove('is-tilting');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  });
}


/* --- 7. Кружок-курсор (только компьютер с мышью) --- */
const cursor = document.getElementById('cursor');

if (cursor && canHover && !reduceMotion) {
  const pos = { x: 0, y: 0, sx: 0, sy: 0 };
  let cursorFrame = 0;

  function moveCursor() {
    pos.sx += (pos.x - pos.sx) * 0.22;
    pos.sy += (pos.y - pos.sy) * 0.22;
    cursor.style.transform = 'translate3d(' + pos.sx.toFixed(1) + 'px, ' + pos.sy.toFixed(1) + 'px, 0)';
    const left = Math.abs(pos.x - pos.sx) + Math.abs(pos.y - pos.sy);
    cursorFrame = left > 0.1 ? requestAnimationFrame(moveCursor) : 0;
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pos.x = event.clientX;
    pos.y = event.clientY;
    if (!cursor.classList.contains('cursor--on')) {
      // Первое появление — сразу под мышью, без «прилёта» из угла
      pos.sx = pos.x;
      pos.sy = pos.y;
      cursor.classList.add('cursor--on');
    }
    // Над ссылками и кнопками кружок увеличивается
    const overLink = event.target.closest && event.target.closest('a, button, summary, input, textarea, label');
    cursor.classList.toggle('cursor--link', Boolean(overLink));
    if (!cursorFrame) cursorFrame = requestAnimationFrame(moveCursor);
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    cursor.classList.remove('cursor--on');
  });
}


/* --- 8. Мои работы: окно со скриншотом ---
   По клику на карточку берём из неё картинку, тип, название, описание
   и кнопку «Смотреть сайт» и показываем всё это в большом окне. */
const modal = document.getElementById('work-modal');

if (modal) {
  const workCards = Array.from(document.querySelectorAll('.work-card'));
  const modalWindow = modal.querySelector('.modal__window');
  const modalImg = document.getElementById('modal-img');
  const modalType = document.getElementById('modal-type');
  const modalTitle = document.getElementById('modal-title');
  const modalText = document.getElementById('modal-text');
  const modalActions = document.getElementById('modal-actions');
  const modalOrder = document.getElementById('modal-order');
  let lastFocused = null;
  let modalCloseTimer = null;

  function openModal(card) {
    const image = card.querySelector('.cover__img');
    const title = card.querySelector('.work-card__title').textContent;

    modalImg.src = image.getAttribute('src');
    modalImg.alt = image.alt;
    modalType.textContent = card.querySelector('.work-card__badge').textContent;
    modalTitle.textContent = title;
    modalText.textContent = card.querySelector('.work-card__text').textContent;
    // Копируем кнопку «Смотреть сайт» (или надпись «Скоро онлайн»)
    modalActions.innerHTML = '';
    const action = card.querySelector('.work-card__footer > :first-child');
    if (action) modalActions.appendChild(action.cloneNode(true));
    // «Хочу похожий сайт» подставит название работы в форму на странице контактов
    modalOrder.href = 'contacts.html?work=' + encodeURIComponent(title);

    clearTimeout(modalCloseTimer);
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('modal-lock');
    modalWindow.scrollTop = 0;
    void modal.offsetWidth; // чтобы браузер успел «увидеть» окно до анимации
    modal.classList.add('modal--open');
    modalWindow.focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('modal--open');
    document.documentElement.classList.remove('modal-lock');
    modalCloseTimer = setTimeout(() => { modal.hidden = true; }, reduceMotion ? 0 : 400);
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  }

  workCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      // Клик по ссылке «Смотреть сайт» открывает сайт, а не окно
      if (event.target.closest('a')) return;
      openModal(card);
    });
  });

  modal.querySelectorAll('[data-modal-close]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key === 'Escape') closeModal();

    // Клавиша Tab «ходит по кругу» только внутри окна
    if (event.key === 'Tab') {
      const focusable = modalWindow.querySelectorAll('button, a[href]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modalWindow)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}


/* --- 9. Форма заявки (страница «Контакты» и финал на главной) ---
   ВАЖНО: сайт открывается как обычный файл, без сервера, поэтому
   сама форма письма не отправляет. При отправке открывается
   почтовая программа с готовым письмом на ваш адрес.

   ГДЕ МЕНЯТЬ: впишите свою почту в переменную ниже. */
const MY_EMAIL = 'gumenuk306525@gmail.com'; // ← почта, на которую уходят заявки

const form = document.getElementById('contact-form');

if (form) {
  const formStatus = document.getElementById('form-status');
  const formSubmit = document.getElementById('form-submit');
  const formFields = form.querySelectorAll('input, textarea');
  const messageField = document.getElementById('form-message');
  const SUBMIT_TEXT = formSubmit.textContent;

  // Пришли с кнопки «Заказать» (страница цен) или «Хочу похожий сайт» (работы)?
  // Тогда сразу подставляем текст в сообщение и убираем добавку из адреса.
  const params = new URLSearchParams(window.location.search);
  if (params.get('plan')) {
    messageField.value = 'Здравствуйте! Хочу заказать: «' + params.get('plan') + '». ';
  } else if (params.get('work')) {
    messageField.value = 'Здравствуйте! Хочу сайт, похожий на «' + params.get('work') + '». ';
  }
  if (window.location.search) {
    history.replaceState(null, '', window.location.pathname);
  }

  // Подсвечиваем незаполненное поле и показываем подсказку
  function checkField(field) {
    const isEmpty = field.value.trim() === '';
    field.closest('.form__field').classList.toggle('form__field--error', isEmpty);
    field.setAttribute('aria-invalid', isEmpty ? 'true' : 'false');
    return !isEmpty;
  }

  formFields.forEach((field) => {
    // Как только начали исправлять — убираем ошибку
    field.addEventListener('input', () => {
      if (field.closest('.form__field--error')) checkField(field);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // не перезагружаем страницу

    const allValid = Array.from(formFields).map(checkField).every(Boolean);
    if (!allValid) {
      formStatus.textContent = 'Заполните, пожалуйста, отмеченные поля.';
      formStatus.classList.add('form__status--error');
      form.querySelector('.form__field--error input, .form__field--error textarea').focus();
      return;
    }

    // Берём то, что ввёл посетитель
    const name = form.elements['name'].value.trim();
    const contact = form.elements['contact'].value.trim();
    const message = form.elements['message'].value.trim();

    // Собираем письмо
    const subject = 'Заявка с сайта от ' + name;
    const body = 'Имя: ' + name + '\nКак связаться: ' + contact + '\n\n' + message;

    // Кнопка показывает, что происходит: «Открываю почту…» → «Готово ✓»
    formSubmit.disabled = true;
    formSubmit.textContent = 'Открываю почту…';

    window.location.href = 'mailto:' + MY_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    setTimeout(() => {
      formSubmit.textContent = 'Готово ✓';
      formSubmit.classList.add('btn--success');
    }, 700);
    setTimeout(() => {
      formSubmit.disabled = false;
      formSubmit.textContent = SUBMIT_TEXT;
      formSubmit.classList.remove('btn--success');
    }, 3500);

    formStatus.classList.remove('form__status--error');
    formStatus.textContent = 'Спасибо, ' + name + '! Заявка подготовлена — отправьте письмо в почтовой программе.';
    form.reset();
  });
}


/* --- 10. Бегущая лента технологий ---
   Для бесконечной прокрутки нужна вторая копия значков: делаем её здесь. */
document.querySelectorAll('.marquee__track').forEach((track) => {
  Array.from(track.children).forEach((item) => {
    const copy = item.cloneNode(true);
    copy.classList.add('tech--clone');
    copy.setAttribute('aria-hidden', 'true');
    track.appendChild(copy);
  });
});


/* --- 11. Текущий год в подвале (обновляется сам) --- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
