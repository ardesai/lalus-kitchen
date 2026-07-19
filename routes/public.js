const express = require('express');
const Recipe = require('../models/recipe');
const { escapeHtml, markupTemperatures, isConvertibleUnit, formatAmount } = require('../utils/recipe');

const router = express.Router();

router.get('/', (req, res) => {
  const recipes = Recipe.all();
  res.render('index', { recipes, siteName: "Lalu's Kitchen" });
});

router.get('/recipes/:slug', (req, res) => {
  const recipe = Recipe.findBySlug(req.params.slug);
  if (!recipe) {
    return res.status(404).render('404', { siteName: "Lalu's Kitchen" });
  }

  const stepsHtml = recipe.steps.map((step) => markupTemperatures(escapeHtml(step)));

  const ingredientsView = recipe.ingredients.map((ing) => ({
    ...ing,
    convertible: isConvertibleUnit(ing.unit),
    displayAmount: formatAmount(ing.amount),
  }));

  res.render('recipe', { recipe, stepsHtml, ingredientsView, siteName: "Lalu's Kitchen" });
});

module.exports = router;
