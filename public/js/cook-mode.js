(function () {
  'use strict';

  const startBtn = document.getElementById('start-cook-mode');
  const cookMode = document.getElementById('cook-mode');
  if (!startBtn || !cookMode) return;

  const closeBtn = document.getElementById('cook-mode-close');
  const prevBtn = document.getElementById('cook-mode-prev');
  const nextBtn = document.getElementById('cook-mode-next');
  const stepCountEl = document.getElementById('cook-mode-step-count');
  const stepTextEl = document.getElementById('cook-mode-step-text');
  const progressBar = document.getElementById('cook-mode-progress-bar');

  // Reuses the already-rendered (and already unit-converted) step markup
  // rather than re-fetching or duplicating conversion logic.
  const steps = Array.from(document.querySelectorAll('.step-list > li')).map((li) => li.innerHTML);

  let current = 0;
  let wakeLock = null;

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      wakeLock = null;
    }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }

  function render() {
    stepCountEl.textContent = `Step ${current + 1} of ${steps.length}`;
    stepTextEl.innerHTML = steps[current];
    progressBar.style.width = `${((current + 1) / steps.length) * 100}%`;
    prevBtn.disabled = current === 0;
    nextBtn.textContent = current === steps.length - 1 ? 'Done \u{1F389}' : 'Next →';
  }

  function open() {
    if (!steps.length) return;
    current = 0;
    render();
    cookMode.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    requestWakeLock();
  }

  function close() {
    cookMode.classList.remove('is-open');
    document.body.style.overflow = '';
    releaseWakeLock();
  }

  function next() {
    if (current === steps.length - 1) {
      close();
      return;
    }
    current += 1;
    render();
  }

  function prev() {
    if (current === 0) return;
    current -= 1;
    render();
  }

  startBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  document.addEventListener('keydown', (e) => {
    if (!cookMode.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Wake lock auto-releases when the tab loses visibility; re-acquire it
  // if the user comes back to the tab while still in cook mode.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && cookMode.classList.contains('is-open')) {
      requestWakeLock();
    }
  });
})();
