// Helpers for turning free-text admin form input into structured data
// that the front-end can convert between metric and imperial.

const CONVERTIBLE_UNITS = new Set(['g', 'kg', 'ml', 'l']);

function slugify(title) {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parses one ingredient line, e.g. "250g flour", "2 tbsp olive oil",
// "1 clove garlic, minced", or "Salt to taste" (no amount).
// All numeric amounts are assumed to already be metric.
const INGREDIENT_LINE = /^\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(g|kg|ml|l|tsp|tbsp|tsps|tbsps|teaspoons?|tablespoons?|pinch(?:es)?|clove|cloves|cup|cups|pcs?|pieces?)?\s+(.*)$/i;

const UNIT_ALIASES = {
  tsps: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsps: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  pinches: 'pinch',
  cloves: 'clove',
  pc: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
};

function parseAmount(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.includes('/')) {
    const [num, denom] = trimmed.split('/').map((n) => parseFloat(n.trim()));
    if (denom) return num / denom;
  }
  return parseFloat(trimmed.replace(',', '.'));
}

function parseIngredientLine(line) {
  const text = line.trim();
  if (!text) return null;

  const match = text.match(INGREDIENT_LINE);
  if (!match) {
    return { amount: null, unit: null, name: text };
  }

  const [, amountRaw, unitRaw, name] = match;
  const amount = parseAmount(amountRaw);
  let unit = unitRaw ? unitRaw.toLowerCase() : null;
  if (unit && UNIT_ALIASES[unit]) unit = UNIT_ALIASES[unit];

  return { amount, unit, name: name.trim() };
}

function parseIngredientsText(text) {
  return (text || '')
    .split('\n')
    .map((line) => parseIngredientLine(line))
    .filter(Boolean);
}

function parseLinesText(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isConvertibleUnit(unit) {
  return CONVERTIBLE_UNITS.has(unit);
}

function formatAmount(amount) {
  if (amount === null || amount === undefined) return '';
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text) {
  return (text || '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// Wraps Celsius temperatures (e.g. "180°C", "180 C", "200C") in a span the
// client-side unit toggle can find and convert to Fahrenheit on the fly.
// Expects already-escaped text as input.
function markupTemperatures(escapedText) {
  return escapedText.replace(
    /(\d+(?:\.\d+)?)\s*°?\s*C\b/g,
    (full, celsius) => `<span class="js-temp" data-celsius="${celsius}">${celsius}&deg;C</span>`
  );
}

// Formats a minute count as e.g. "25 min", "1 hr", or "1 hr 30 min".
// Returns null when there's nothing meaningful to show.
function formatDuration(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return null;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

// Derives the display-ready prep/cook/total/servings/difficulty/nutrition
// for a recipe. Fields are all optional, so each may come back null.
function recipeMeta(recipe) {
  const prepMinutes = Number(recipe.prep_minutes) || 0;
  const cookMinutes = Number(recipe.cook_minutes) || 0;
  return {
    prep: formatDuration(recipe.prep_minutes),
    cook: formatDuration(recipe.cook_minutes),
    total: formatDuration(prepMinutes + cookMinutes),
    servings: recipe.servings || null,
    difficulty: recipe.difficulty || null,
    calories: recipe.calories || null,
    protein: recipe.protein_g || null,
    carbs: recipe.carbs_g || null,
    fat: recipe.fat_g || null,
  };
}

// Curated set of dietary tags, so filtering/data stays consistent instead of
// relying on free-text (which would drift - "Veg" vs "Vegetarian" etc.)
const ALLOWED_TAGS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'High-Protein',
  'Low-Carb',
  'Keto',
  'Nut-Free',
];

module.exports = {
  slugify,
  parseIngredientLine,
  parseIngredientsText,
  parseLinesText,
  isConvertibleUnit,
  formatAmount,
  escapeHtml,
  markupTemperatures,
  formatDuration,
  recipeMeta,
  ALLOWED_TAGS,
};
