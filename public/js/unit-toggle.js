(function () {
  'use strict';

  const STORAGE_KEY = 'lalusKitchenUnitSystem';

  // Metric -> Imperial conversions. Everything stored server-side is metric.
  const CONVERSIONS = {
    g: (amount) => ({ value: amount / 28.3495, unit: 'oz' }),
    kg: (amount) => ({ value: (amount * 1000) / 28.3495, unit: 'oz' }),
    ml: (amount) => ({ value: amount / 236.588, unit: 'cups' }),
    l: (amount) => ({ value: (amount * 1000) / 236.588, unit: 'cups' }),
  };

  function formatNumber(n) {
    const rounded = Math.round(n * 100) / 100;
    if (Number.isInteger(rounded)) return String(rounded);
    return String(parseFloat(rounded.toFixed(2)));
  }

  function applyUnitSystem(system) {
    document.querySelectorAll('.js-amount').forEach((el) => {
      const metricAmount = parseFloat(el.dataset.amount);
      const metricUnit = el.dataset.unit;
      const converter = CONVERSIONS[metricUnit];

      if (system === 'imperial' && converter) {
        const { value, unit } = converter(metricAmount);
        el.textContent = `${formatNumber(value)} ${unit}`;
      } else {
        el.textContent = `${formatNumber(metricAmount)} ${metricUnit}`;
      }
    });

    document.querySelectorAll('.js-temp').forEach((el) => {
      const celsius = parseFloat(el.dataset.celsius);
      if (system === 'imperial') {
        const fahrenheit = Math.round((celsius * 9) / 5 + 32);
        el.innerHTML = `${fahrenheit}&deg;F`;
      } else {
        el.innerHTML = `${formatNumber(celsius)}&deg;C`;
      }
    });

    document.querySelectorAll('.unit-toggle').forEach((toggle) => {
      toggle.querySelectorAll('.unit-toggle__option').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.unit === system);
      });
    });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'metric';
    applyUnitSystem(saved);

    document.querySelectorAll('.unit-toggle__option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const system = btn.dataset.unit;
        localStorage.setItem(STORAGE_KEY, system);
        applyUnitSystem(system);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
