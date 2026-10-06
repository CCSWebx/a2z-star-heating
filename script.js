'use strict';

/*
 * A2Z Star — progressive enhancement only.
 * The form is a DEMO: nothing is sent, stored or logged.
 * No network requests, browser storage or analytics are used here.
 */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/* ---------- Mobile menu ---------- */

function initMenu() {
  const button = $('.menu-toggle');
  const menu = $('#mobile-menu');
  if (!button || !menu) return;

  const isOpen = () => !menu.hidden;

  function setMenu(open, { restoreFocus = false } = {}) {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    if (restoreFocus) button.focus();
  }

  button.addEventListener('click', () => setMenu(!isOpen()));

  $$('a', menu).forEach(link => {
    link.addEventListener('click', () => {
      setMenu(false);
      const target = link.hash ? document.getElementById(link.hash.slice(1)) : null;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) setMenu(false, { restoreFocus: true });
  });

  document.addEventListener('click', event => {
    if (isOpen() && !event.target.closest('.header')) setMenu(false);
  });

  const desktop = window.matchMedia('(max-width: 950px)');
  desktop.addEventListener('change', event => {
    if (!event.matches) setMenu(false);
  });
}

/* ---------- Demo quote form ---------- */

const REQUIRED_MESSAGES = {
  name: 'Please enter your name.',
  phone: 'Please enter a phone number.',
  service: 'Please choose a service.',
  message: 'Please tell us a little about the job.'
};

const PHONE_MESSAGE = 'Please enter a valid phone number.';
const EMAIL_MESSAGE = 'Please enter a valid email address.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlausiblePhone(value) {
  if (!/^\+?[\d\s().-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

function getFieldMessage(field) {
  const value = field.value.trim();
  if (field.required && !value) return REQUIRED_MESSAGES[field.name] || 'This field is required.';
  if (!value) return '';
  if (field.type === 'tel' && !isPlausiblePhone(value)) return PHONE_MESSAGE;
  if (field.type === 'email' && !EMAIL_PATTERN.test(value)) return EMAIL_MESSAGE;
  return '';
}

function initForm() {
  const form = $('#quote-form');
  if (!form) return;

  const fields = $$('input, select, textarea', form);
  const service = $('#service', form);
  const status = $('.form-status', form);
  const submit = $('[type="submit"]', form);

  const setStatus = text => { if (status) status.textContent = text; };

  function validateField(field) {
    const message = getFieldMessage(field);
    const error = document.getElementById(`${field.id}-error`);
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  }

  const isInvalid = field => field.hasAttribute('aria-invalid');

  fields.forEach(field => {
    field.addEventListener('blur', () => {
      if (field.value.trim() || isInvalid(field)) validateField(field);
    });
    const revalidate = () => { if (isInvalid(field)) validateField(field); };
    field.addEventListener('input', () => { revalidate(); setStatus(''); });
    field.addEventListener('change', revalidate);
  });

  // CTA → form: preselect the matching service, only when that option exists.
  $$('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      if (!service) return;
      const wanted = link.dataset.service;
      if ([...service.options].some(option => option.value === wanted)) {
        service.value = wanted;
        validateField(service);
      }
      setStatus('');
    });
  });

  form.addEventListener('submit', event => {
    // Demo only: never submit; no request, storage, analytics or logging of entered data.
    event.preventDefault();
    const results = fields.map(validateField);
    if (!results.every(Boolean)) {
      const count = results.filter(ok => !ok).length;
      setStatus(count === 1
        ? 'Please correct the field marked below.'
        : `Please correct the ${count} fields marked below.`);
      fields.find(isInvalid)?.focus();
      return;
    }
    setStatus('Demo complete — your enquiry has not been sent. Call 07403 556650 to discuss your job with A2Z.');
    status?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });

  if (submit) submit.disabled = false;
}

/* ---------- Privacy dialog ---------- */

function initPrivacy() {
  const dialog = $('#privacy');
  const opener = $('.privacy-link');
  if (!dialog || !opener || typeof dialog.showModal !== 'function') return;

  opener.addEventListener('click', () => dialog.showModal());

  $$('.close-dialog, .close-privacy', dialog).forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });

  // A click on the backdrop targets the <dialog> itself, outside its box.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });

  dialog.addEventListener('close', () => opener.focus({ preventScroll: true }));
}

initMenu();
initForm();
initPrivacy();
