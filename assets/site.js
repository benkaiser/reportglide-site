const menu = document.querySelector('.menu-toggle');
const mobileMenu = matchMedia('(max-width: 760px)');
if (menu) {
  menu.hidden = !mobileMenu.matches;
  mobileMenu.addEventListener('change', () => {
    menu.hidden = !mobileMenu.matches;
    menu.setAttribute('aria-expanded', 'false');
  });
  menu.addEventListener('click', () => {
    menu.setAttribute('aria-expanded', String(menu.getAttribute('aria-expanded') !== 'true'));
  });
  document.querySelectorAll('#navigation a').forEach(link => {
    link.addEventListener('click', () => menu.setAttribute('aria-expanded', 'false'));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });
}

const params = new URLSearchParams(location.search);
const stickyCta = document.querySelector('.sticky-cta');
if (stickyCta && 'IntersectionObserver' in window) {
  const hero = document.querySelector('.hero, .text-hero');
  const stops = [...document.querySelectorAll('#contact, .page-cta, .footer')];
  const visible = new Set();
  const update = () => { stickyCta.hidden = visible.size > 0; };
  const watch = new IntersectionObserver(entries => {
    entries.forEach(entry => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
    update();
  });
  [hero, ...stops].filter(Boolean).forEach(element => watch.observe(element));
}
let activeComparison = null;
let comparisonPinned = false;
function closeComparison() {
  if (!activeComparison) return;
  activeComparison.querySelector('[role="tooltip"]').hidden = true;
  activeComparison.querySelector('button').setAttribute('aria-expanded', 'false');
  activeComparison = null;
  comparisonPinned = false;
}
function openComparison(cell) {
  if (activeComparison !== cell) closeComparison();
  activeComparison = cell;
  const button = cell.querySelector('button');
  const tooltip = cell.querySelector('[role="tooltip"]');
  tooltip.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  const anchor = button.getBoundingClientRect();
  const box = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.max(16, Math.min(innerWidth - box.width - 16, anchor.left + anchor.width / 2 - box.width / 2))}px`;
  tooltip.style.top = `${anchor.top > box.height + 24 ? anchor.top - box.height - 10 : anchor.bottom + 10}px`;
}
document.querySelectorAll('.comparison-cell').forEach(cell => {
  cell.addEventListener('mouseenter', () => openComparison(cell));
  cell.addEventListener('mouseleave', () => {
    if (!comparisonPinned && !cell.contains(document.activeElement)) closeComparison();
  });
  cell.addEventListener('focusin', () => openComparison(cell));
  cell.addEventListener('focusout', event => {
    if (!cell.contains(event.relatedTarget)) closeComparison();
  });
  cell.querySelector('button').addEventListener('click', () => {
    if (activeComparison === cell && comparisonPinned) closeComparison();
    else {
      openComparison(cell);
      comparisonPinned = true;
    }
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeComparison();
});
document.addEventListener('click', event => {
  if (activeComparison && !activeComparison.contains(event.target)) closeComparison();
});
window.addEventListener('resize', closeComparison);
window.addEventListener('scroll', () => {
  if (!activeComparison) return;
  const anchor = activeComparison.getBoundingClientRect();
  if (anchor.bottom < 0 || anchor.top > innerHeight) closeComparison();
  else openComparison(activeComparison);
}, { passive: true });

const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign'];
const attribution = new URLSearchParams();
for (const key of campaignKeys) {
  const value = params.get(key);
  if (value) attribution.set(key, value.slice(0, 160));
}
const sourcePath = params.get('from');
const sourcePages = new Set(['/', '/occupational-therapy/', '/speech-pathology/', '/australian-processing/', '/faq/']);
const landingPage = sourcePages.has(sourcePath) ? sourcePath : location.pathname;

// Keep only known campaign fields in same-origin navigation, never enquiry text.
document.querySelectorAll('a[href]').forEach(link => {
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return;
  for (const [key, value] of attribution) url.searchParams.set(key, value);
  const profession = params.get('profession');
  if (profession === 'ot' || profession === 'speech') {
    if (!url.searchParams.has('profession')) url.searchParams.set('profession', profession);
  }
  if (url.hash === '#contact') url.searchParams.set('from', sourcePages.has(landingPage) ? landingPage : '/');
  link.href = url.href;
});

const form = document.getElementById('contact-form');
if (form) {
  const submit = document.getElementById('contact-submit');
  const status = document.getElementById('form-status');
  const result = document.getElementById('contact-result');
  const email = form.dataset.email;
  const allowedOrigins = new Set([form.dataset.origin, form.dataset.origin.replace('https://', 'https://www.')]);
  const returnOrigin = allowedOrigins.has(location.origin) ? location.origin : form.dataset.origin;
  const returnUrl = new URL('/#contact', returnOrigin);
  const loadedAt = Date.now();
  document.getElementById('contact-loaded').value = String(loadedAt);
  document.getElementById('contact-return').value = returnUrl.href;
  document.getElementById('source-page').value = sourcePages.has(landingPage) ? landingPage : '/';
  for (const key of campaignKeys) document.getElementById(key.replaceAll('_', '-')).value = attribution.get(key) || '';
  if (params.get('profession') === 'ot') document.getElementById('contact-profession').value = 'Occupational therapist';
  if (params.get('profession') === 'speech') document.getElementById('contact-profession').value = 'Speech pathologist';

  const states = {
    received: 'Thanks for getting in touch. We’ll be in touch to discuss your practice.',
    invalid: `Your enquiry wasn’t saved. Please check your email and allow a few seconds before trying again, or email ${email}.`,
    'rate-limited': `Your enquiry wasn’t saved because there have been too many attempts. Please try later or email ${email}.`,
    'saved-email-failed': `Your enquiry was saved, but we couldn’t complete email delivery. Please email ${email}; you don’t need to submit again.`,
    failed: `We couldn’t complete your enquiry. Please email ${email}.`,
  };
  const state = params.get('enquiry');
  if (Object.hasOwn(states, state)) {
    result.textContent = states[state];
    if (state === 'received' && params.get('confirmation') === 'failed') {
      result.textContent += ' Our team received your enquiry, but we couldn’t send your confirmation email. You don’t need to submit again.';
    }
    result.dataset.state = state;
    result.hidden = false;
    if (state === 'received' || state === 'saved-email-failed') form.hidden = true;
    result.focus();
    window.addEventListener('pageshow', () => result.focus(), { once: true });
  }

  if (!allowedOrigins.has(location.origin)) {
    status.textContent = `This preview cannot submit enquiries. Use ${form.dataset.origin} or email ${email}.`;
  } else {
    status.textContent = 'The form will be ready in a few seconds.';
    const ready = () => {
      if (Date.now() - loadedAt < 3100) return;
      submit.disabled = false;
      status.textContent = '';
    };
    const timer = setInterval(() => {
      ready();
      if (!submit.disabled) clearInterval(timer);
    }, 100);
    window.addEventListener('pageshow', event => {
      if (event.persisted) {
        ready();
        if (!submit.disabled) status.textContent = 'Check the outcome of your previous submission before sending again.';
      }
    });
    form.addEventListener('submit', event => {
      if (Date.now() - loadedAt < 3100) {
        event.preventDefault();
        status.textContent = 'Please allow a few seconds before sending your enquiry.';
        return;
      }
      if (new TextEncoder().encode(new URLSearchParams(new FormData(form)).toString()).length > 32000) {
        event.preventDefault();
        status.textContent = `Your enquiry is too long to send. Please shorten it or email ${email}.`;
        return;
      }
      submit.disabled = true;
      status.textContent = 'Sending your enquiry…';
    });
  }
}
