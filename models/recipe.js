const fs = require('fs');
const path = require('path');
const { slugify } = require('../utils/recipe');

const recipesDir = path.join(__dirname, '..', 'data', 'recipes');
if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });

function filePath(slug) {
  return path.join(recipesDir, `${slug}.json`);
}

function readRecipeFile(slug) {
  try {
    return JSON.parse(fs.readFileSync(filePath(slug), 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function writeRecipeFile(recipe) {
  fs.writeFileSync(filePath(recipe.slug), JSON.stringify(recipe, null, 2));
}

function uniqueSlug(baseSlug, excludeSlug) {
  let slug = baseSlug;
  let suffix = 2;
  while (fs.existsSync(filePath(slug)) && slug !== excludeSlug) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

const Recipe = {
  all() {
    const files = fs.readdirSync(recipesDir).filter((f) => f.endsWith('.json'));
    const recipes = files.map((f) => JSON.parse(fs.readFileSync(path.join(recipesDir, f), 'utf-8')));
    return recipes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  findBySlug(slug) {
    return readRecipeFile(slug);
  },

  create({ title, description, imagePath, ingredients, steps, tips }) {
    const slug = uniqueSlug(slugify(title));
    const now = new Date().toISOString();

    const recipe = {
      slug,
      title,
      description,
      image_path: imagePath,
      ingredients,
      steps,
      tips,
      created_at: now,
      updated_at: now,
    };

    writeRecipeFile(recipe);
    return recipe;
  },

  update(slug, { title, description, imagePath, ingredients, steps, tips }) {
    const existing = readRecipeFile(slug);
    if (!existing) return null;

    const newSlug =
      title && slugify(title) !== slug ? uniqueSlug(slugify(title), slug) : slug;

    const updated = {
      ...existing,
      slug: newSlug,
      title,
      description,
      image_path: imagePath || existing.image_path,
      ingredients,
      steps,
      tips,
      updated_at: new Date().toISOString(),
    };

    writeRecipeFile(updated);
    if (newSlug !== slug) fs.unlinkSync(filePath(slug));

    return updated;
  },

  delete(slug) {
    const file = filePath(slug);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  },
};

module.exports = Recipe;
