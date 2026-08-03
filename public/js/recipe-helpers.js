(function () {
  'use strict';

  /* ==========================================================================
     2. Homepage Live Search & Filters
     ========================================================================== */
  function initFilters() {
    const searchInput = document.getElementById('recipe-search');
    const recipeCards = document.querySelectorAll('.recipe-card');
    if (!searchInput && recipeCards.length === 0) return;

    let searchVal = '';
    let difficultyVal = 'all';
    let timeVal = 'all';
    const activeTags = new Set();

    function applyFilters() {
      recipeCards.forEach(card => {
        const title = card.dataset.title || '';
        const desc = card.dataset.description || '';
        const ingredients = card.dataset.ingredients || '';
        const difficulty = card.dataset.difficulty || '';
        const minutes = parseInt(card.dataset.minutes) || 0;
        const cardTags = (card.dataset.tags || '').split('|').filter(Boolean);

        // Keyword Match
        const matchesSearch = !searchVal ||
          title.includes(searchVal) ||
          desc.includes(searchVal) ||
          ingredients.includes(searchVal);

        // Difficulty Match
        const matchesDifficulty = difficultyVal === 'all' || difficulty === difficultyVal;

        // Time Match
        let matchesTime = false;
        if (timeVal === 'all') {
          matchesTime = true;
        } else if (timeVal === 'quick') {
          matchesTime = minutes > 0 && minutes <= 30;
        } else if (timeVal === 'medium') {
          matchesTime = minutes > 0 && minutes <= 60;
        } else if (timeVal === 'slow') {
          matchesTime = minutes > 60;
        }

        // Dietary Tags Match (recipe must have ALL selected tags)
        const matchesTags = activeTags.size === 0 ||
          Array.from(activeTags).every(tag => cardTags.includes(tag));

        const visible = matchesSearch && matchesDifficulty && matchesTime && matchesTags;
        card.classList.toggle('is-hidden', !visible);
      });

      // Show empty state if all cards are hidden
      const visibleCards = document.querySelectorAll('.recipe-card:not(.is-hidden)');
      let emptyState = document.getElementById('filter-empty-state');
      const grid = document.getElementById('recipe-grid');

      if (visibleCards.length === 0 && grid) {
        if (!emptyState) {
          emptyState = document.createElement('div');
          emptyState.id = 'filter-empty-state';
          emptyState.className = 'empty-state';
          emptyState.innerHTML = '<p>No recipes match your criteria. Try adjusting your filters!</p>';
          grid.insertAdjacentElement('afterend', emptyState);
        }
      } else if (emptyState) {
        emptyState.remove();
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchVal = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }

    // Set up filter click listeners
    document.querySelectorAll('#difficulty-filters .filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        document.querySelectorAll('#difficulty-filters .filter-tag').forEach(t => t.classList.remove('is-active'));
        tag.classList.add('is-active');
        difficultyVal = tag.dataset.value;
        applyFilters();
      });
    });

    document.querySelectorAll('#time-filters .filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        document.querySelectorAll('#time-filters .filter-tag').forEach(t => t.classList.remove('is-active'));
        tag.classList.add('is-active');
        timeVal = tag.dataset.value;
        applyFilters();
      });
    });

    // Dietary filters are multi-select (toggle independently, no "All" button) -
    // a recipe must match every currently active tag.
    document.querySelectorAll('#dietary-filters .filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const value = tag.dataset.value;
        if (activeTags.has(value)) {
          activeTags.delete(value);
          tag.classList.remove('is-active');
        } else {
          activeTags.add(value);
          tag.classList.add('is-active');
        }
        applyFilters();
      });
    });
  }

  /* ==========================================================================
     3. Dynamic Servings Scaler
     ========================================================================== */
  function initServingsScaler() {
    const decreaseBtn = document.getElementById('servings-decrease');
    const increaseBtn = document.getElementById('servings-increase');
    const servingsValueEl = document.getElementById('servings-value');
    if (!decreaseBtn || !increaseBtn || !servingsValueEl) return;

    const baseServings = parseInt(servingsValueEl.dataset.baseServings) || 4;
    let currentServings = parseInt(servingsValueEl.textContent) || baseServings;

    function formatScaledAmount(n) {
      const rounded = Math.round(n * 100) / 100;
      return Number.isInteger(rounded) ? String(rounded) : String(parseFloat(rounded.toFixed(2)));
    }

    // Cache original base amounts - both unit-convertible amounts (g/ml/etc,
    // re-rendered via the metric/imperial toggle) and static ones (tsp/tbsp,
    // counts like "2 eggs", which just need their number rescaled in place).
    document.querySelectorAll('.js-amount, .ingredient-amount-static').forEach(el => {
      if (!el.dataset.baseAmount) {
        el.dataset.baseAmount = el.dataset.amount;
      }
    });

    function updateScale(newServings) {
      currentServings = newServings;
      servingsValueEl.textContent = currentServings;

      const ratio = currentServings / baseServings;

      document.querySelectorAll('.js-amount').forEach(el => {
        const baseVal = parseFloat(el.dataset.baseAmount);
        if (isNaN(baseVal)) return;

        const scaledAmount = baseVal * ratio;
        el.dataset.amount = scaledAmount; // Update data attribute so unit conversion picks it up
      });

      document.querySelectorAll('.ingredient-amount-static').forEach(el => {
        const baseVal = parseFloat(el.dataset.baseAmount);
        if (isNaN(baseVal)) return;

        const unit = el.dataset.unit || '';
        el.textContent = `${formatScaledAmount(baseVal * ratio)}${unit ? ' ' + unit : ''}`;
      });

      // Trigger unit toggle update to re-render .js-amount in the active system
      const activeUnitOption = document.querySelector('.unit-toggle__option.is-active');
      if (activeUnitOption) {
        activeUnitOption.click();
      }
    }

    decreaseBtn.addEventListener('click', () => {
      if (currentServings > 1) {
        updateScale(currentServings - 1);
      }
    });

    increaseBtn.addEventListener('click', () => {
      updateScale(currentServings + 1);
    });
  }

  /* ==========================================================================
     4. Smart Inline Step Timers
     ========================================================================== */
  let activeTimer = null;

  function showTimerWidget(label, totalSeconds) {
    if (activeTimer) {
      activeTimer.stop();
    }

    const widget = document.createElement('div');
    widget.className = 'active-timer-widget';
    widget.id = 'active-timer-widget';
    document.body.appendChild(widget);

    let remaining = totalSeconds;
    let intervalId = null;
    let isPaused = false;

    function formatTime(s) {
      const hrs = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = s % 60;
      const pad = n => String(n).padStart(2, '0');
      if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
      return `${pad(mins)}:${pad(secs)}`;
    }

    function playAlert() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;

        const playTone = (freq, start, duration) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.5, start);
          gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
          osc.start(start);
          osc.stop(start + duration);
        };

        // Pleasant chime sequence
        playTone(523.25, now, 0.3); // C5
        playTone(659.25, now + 0.15, 0.3); // E5
        playTone(783.99, now + 0.3, 0.4); // G5
        playTone(1046.50, now + 0.45, 0.6); // C6
      } catch (err) {
        console.warn('Audio Context chime failed', err);
      }
    }

    function tick() {
      if (remaining <= 0) {
        clearInterval(intervalId);
        widget.querySelector('.active-timer-widget__time').textContent = "Time's Up!";
        widget.querySelector('.active-timer-widget__time').style.color = 'var(--color-danger)';
        playAlert();

        let flash = 0;
        const flasher = setInterval(() => {
          if (flash > 8 || !document.getElementById('active-timer-widget')) {
            clearInterval(flasher);
            return;
          }
          widget.style.backgroundColor = flash % 2 === 0 ? 'var(--color-primary-light)' : 'var(--color-surface)';
          flash++;
        }, 400);

        widget.querySelector('.timer-pause').disabled = true;
        return;
      }

      remaining--;
      widget.querySelector('.active-timer-widget__time').textContent = formatTime(remaining);
    }

    widget.innerHTML = `
      <h4 class="active-timer-widget__title">${label}</h4>
      <div class="active-timer-widget__time">${formatTime(remaining)}</div>
      <div class="active-timer-widget__controls">
        <button type="button" class="btn btn-ghost timer-pause">Pause</button>
        <button type="button" class="btn btn-danger timer-close">Dismiss</button>
      </div>
    `;

    const pauseBtn = widget.querySelector('.timer-pause');
    const closeBtn = widget.querySelector('.timer-close');

    function startTimer() {
      intervalId = setInterval(tick, 1000);
    }

    startTimer();

    pauseBtn.addEventListener('click', () => {
      if (isPaused) {
        isPaused = false;
        pauseBtn.textContent = 'Pause';
        pauseBtn.className = 'btn btn-ghost timer-pause';
        startTimer();
      } else {
        isPaused = true;
        pauseBtn.textContent = 'Resume';
        pauseBtn.className = 'btn btn-primary timer-pause';
        clearInterval(intervalId);
      }
    });

    closeBtn.addEventListener('click', () => {
      stopTimer();
    });

    function stopTimer() {
      clearInterval(intervalId);
      widget.remove();
      activeTimer = null;
    }

    activeTimer = { stop: stopTimer };
  }

  function parseTimerPhrases(text) {
    // Regex for time matches like: 4 hours, 25 minutes, 30 min, 15-20 mins, 6 hrs
    const timeRegex = /(\d+(?:\s*(?:-|to)\s*\d+)?)\s*(min|minute|hour|hr|sec|second)s?\b/gi;
    
    return text.replace(timeRegex, (match, amount, unit) => {
      // For ranges, use the upper limit (e.g. 20 in 15-20 mins)
      const parts = amount.split(/[-]|to/);
      const val = parseFloat(parts[parts.length - 1].trim());
      if (isNaN(val)) return match;

      let multiplier = 60; // default minutes
      const u = unit.toLowerCase();
      if (u.includes('hour') || u.includes('hr')) {
        multiplier = 3600;
      } else if (u.includes('sec')) {
        multiplier = 1;
      }

      const totalSeconds = val * multiplier;
      
      // Return inline timer button
      return `<button type="button" class="inline-timer-btn" data-seconds="${totalSeconds}" data-label="Step Timer">⏱ ${match}</button>`;
    });
  }

  function initStepTimers() {
    // Add inline timer listeners to recipe steps
    document.querySelectorAll('.step-list li, #cook-mode-step-text').forEach(el => {
      // Don't parse already parsed markup
      if (el.querySelector('.inline-timer-btn')) return;
      el.innerHTML = parseTimerPhrases(el.innerHTML);
    });

    // Delegate click events on document for inline timers
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.inline-timer-btn');
      if (!btn) return;

      e.preventDefault();
      const seconds = parseInt(btn.dataset.seconds) || 0;
      let label = btn.dataset.label || 'Cooking Timer';
      
      // Try to determine step title/number
      const stepLi = btn.closest('li');
      if (stepLi) {
        // Find index of step
        const stepNum = Array.from(stepLi.parentNode.children).indexOf(stepLi) + 1;
        label = `Step ${stepNum} Timer`;
      } else {
        const cookStepEl = document.getElementById('cook-mode-step-count');
        if (cookStepEl) {
          label = cookStepEl.textContent;
        }
      }

      showTimerWidget(label, seconds);
    });
  }

  /* ==========================================================================
     Initialize All on DOMContentLoaded
     ========================================================================== */
  function init() {
    initFilters();
    initServingsScaler();
    initStepTimers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
