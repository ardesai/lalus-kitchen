const path = require('path');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcryptjs');

const Recipe = require('../models/recipe');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const {
  parseIngredientsText,
  parseLinesText,
  ALLOWED_TAGS,
} = require('../utils/recipe');

const router = express.Router();

function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      req.uploadError = err.message || 'Image upload failed.';
    }
    next();
  });
}

function formValuesFromBody(body) {
  return {
    title: body.title || '',
    description: body.description || '',
    ingredientsText: body.ingredients || '',
    stepsText: body.steps || '',
    tipsText: body.tips || '',
    prepMinutes: body.prepMinutes || '',
    cookMinutes: body.cookMinutes || '',
    servings: body.servings || '',
    difficulty: body.difficulty || '',
    published: body.published === 'on',
    calories: body.calories || '',
    proteinG: body.proteinG || '',
    carbsG: body.carbsG || '',
    fatG: body.fatG || '',
    tags: parseTags(body.tags),
  };
}

const ALLOWED_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

function parseOptionalInt(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDifficulty(value) {
  return ALLOWED_DIFFICULTIES.has(value) ? value : null;
}

function parseTags(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return ALLOWED_TAGS.filter((t) => arr.includes(t));
}

// --- Auth ---

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null, siteName: "Lalu's Kitchen" });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  const validUsername = username === adminUsername;
  const validPassword =
    adminHash && password ? bcrypt.compareSync(password, adminHash) : false;

  if (!validUsername || !validPassword) {
    return res.status(401).render('admin/login', {
      error: 'Invalid username or password.',
      siteName: "Lalu's Kitchen",
    });
  }

  req.session.isAdmin = true;
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// --- Dashboard ---

router.get('/', requireAuth, (req, res) => {
  const recipes = Recipe.all();
  res.render('admin/dashboard', { recipes, siteName: "Lalu's Kitchen" });
});

// --- Create ---

router.get('/recipes/new', requireAuth, (req, res) => {
  res.render('admin/form', {
    siteName: "Lalu's Kitchen",
    mode: 'new',
    recipe: null,
    allowedTags: ALLOWED_TAGS,
    values: {
      title: '', description: '', ingredientsText: '', stepsText: '', tipsText: '',
      prepMinutes: '', cookMinutes: '', servings: '', difficulty: '', published: true,
      calories: '', proteinG: '', carbsG: '', fatG: '', tags: [],
    },
    errors: [],
  });
});

router.post('/recipes', requireAuth, handleUpload, (req, res) => {
  const errors = [];
  const { title, description } = req.body;
  const values = formValuesFromBody(req.body);

  if (!title || !title.trim()) errors.push('Title is required.');
  if (!description || !description.trim()) errors.push('Description is required.');
  if (!req.body.ingredients || !req.body.ingredients.trim()) errors.push('At least one ingredient is required.');
  if (!req.body.steps || !req.body.steps.trim()) errors.push('At least one cooking step is required.');
  if (req.uploadError) errors.push(req.uploadError);
  if (!req.file) errors.push('A hero photo is required before the recipe can be published.');

  if (errors.length) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('admin/form', {
      siteName: "Lalu's Kitchen",
      mode: 'new',
      recipe: null,
      allowedTags: ALLOWED_TAGS,
      values,
      errors,
    });
  }

  const recipe = Recipe.create({
    title: title.trim(),
    description: description.trim(),
    imagePath: `/uploads/${req.file.filename}`,
    ingredients: parseIngredientsText(req.body.ingredients),
    steps: parseLinesText(req.body.steps),
    tips: parseLinesText(req.body.tips),
    prepMinutes: parseOptionalInt(req.body.prepMinutes),
    cookMinutes: parseOptionalInt(req.body.cookMinutes),
    servings: parseOptionalInt(req.body.servings),
    difficulty: parseDifficulty(req.body.difficulty),
    published: req.body.published === 'on',
    calories: parseOptionalInt(req.body.calories),
    proteinG: parseOptionalNumber(req.body.proteinG),
    carbsG: parseOptionalNumber(req.body.carbsG),
    fatG: parseOptionalNumber(req.body.fatG),
    tags: parseTags(req.body.tags),
  });

  res.redirect(`/recipes/${recipe.slug}`);
});

// --- Edit ---

router.get('/recipes/:slug/edit', requireAuth, (req, res) => {
  const recipe = Recipe.findBySlug(req.params.slug);
  if (!recipe) return res.status(404).render('404', { siteName: "Lalu's Kitchen" });

  const values = {
    title: recipe.title,
    description: recipe.description,
    ingredientsText: recipe.ingredients
      .map((i) => [i.amount, i.unit, i.name].filter(Boolean).join(' '))
      .join('\n'),
    stepsText: recipe.steps.join('\n'),
    tipsText: recipe.tips.join('\n'),
    prepMinutes: recipe.prep_minutes != null ? String(recipe.prep_minutes) : '',
    cookMinutes: recipe.cook_minutes != null ? String(recipe.cook_minutes) : '',
    servings: recipe.servings != null ? String(recipe.servings) : '',
    difficulty: recipe.difficulty || '',
    published: recipe.published !== false,
    calories: recipe.calories != null ? String(recipe.calories) : '',
    proteinG: recipe.protein_g != null ? String(recipe.protein_g) : '',
    carbsG: recipe.carbs_g != null ? String(recipe.carbs_g) : '',
    fatG: recipe.fat_g != null ? String(recipe.fat_g) : '',
    tags: recipe.tags || [],
  };

  res.render('admin/form', {
    siteName: "Lalu's Kitchen",
    mode: 'edit',
    recipe,
    allowedTags: ALLOWED_TAGS,
    values,
    errors: [],
  });
});

router.post('/recipes/:slug', requireAuth, handleUpload, (req, res) => {
  const recipe = Recipe.findBySlug(req.params.slug);
  if (!recipe) return res.status(404).render('404', { siteName: "Lalu's Kitchen" });

  const errors = [];
  const { title, description } = req.body;
  const values = formValuesFromBody(req.body);

  if (!title || !title.trim()) errors.push('Title is required.');
  if (!description || !description.trim()) errors.push('Description is required.');
  if (!req.body.ingredients || !req.body.ingredients.trim()) errors.push('At least one ingredient is required.');
  if (!req.body.steps || !req.body.steps.trim()) errors.push('At least one cooking step is required.');
  if (req.uploadError) errors.push(req.uploadError);
  if (!req.file && !recipe.image_path) errors.push('A hero photo is required before the recipe can be published.');

  if (errors.length) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).render('admin/form', {
      siteName: "Lalu's Kitchen",
      mode: 'edit',
      recipe,
      allowedTags: ALLOWED_TAGS,
      values,
      errors,
    });
  }

  const oldImagePath = recipe.image_path;

  const updated = Recipe.update(req.params.slug, {
    title: title.trim(),
    description: description.trim(),
    imagePath: req.file ? `/uploads/${req.file.filename}` : null,
    ingredients: parseIngredientsText(req.body.ingredients),
    steps: parseLinesText(req.body.steps),
    tips: parseLinesText(req.body.tips),
    prepMinutes: parseOptionalInt(req.body.prepMinutes),
    cookMinutes: parseOptionalInt(req.body.cookMinutes),
    servings: parseOptionalInt(req.body.servings),
    difficulty: parseDifficulty(req.body.difficulty),
    published: req.body.published === 'on',
    calories: parseOptionalInt(req.body.calories),
    proteinG: parseOptionalNumber(req.body.proteinG),
    carbsG: parseOptionalNumber(req.body.carbsG),
    fatG: parseOptionalNumber(req.body.fatG),
    tags: parseTags(req.body.tags),
  });

  if (req.file && oldImagePath) {
    const oldFile = path.join(__dirname, '..', 'public', oldImagePath);
    fs.unlink(oldFile, () => {});
  }

  res.redirect(`/recipes/${updated.slug}`);
});

// --- Visibility ---

router.post('/recipes/:slug/toggle-visibility', requireAuth, (req, res) => {
  const recipe = Recipe.findBySlug(req.params.slug);
  if (!recipe) return res.status(404).render('404', { siteName: "Lalu's Kitchen" });

  const isPublished = recipe.published !== false;
  Recipe.setPublished(req.params.slug, !isPublished);
  res.redirect('/admin');
});

// --- Delete ---

router.post('/recipes/:slug/delete', requireAuth, (req, res) => {
  const recipe = Recipe.findBySlug(req.params.slug);
  if (recipe) {
    Recipe.delete(recipe.slug);
    if (recipe.image_path) {
      const imageFile = path.join(__dirname, '..', 'public', recipe.image_path);
      fs.unlink(imageFile, () => {});
    }
  }
  res.redirect('/admin');
});

module.exports = router;
