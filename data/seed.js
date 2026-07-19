// Seeds the database with a couple of sample recipes so the site isn't empty
// on first run. Safe to re-run: it skips recipes that already exist by slug.
require('dotenv').config();

const Recipe = require('../models/recipe');
const { slugify, parseIngredientsText, parseLinesText } = require('../utils/recipe');

const seedRecipes = [
  {
    title: 'Butter Chicken',
    description: 'Rich, tomato-based curry with tender chicken thighs, simmered in butter and cream.',
    imagePath: '/uploads/seed-butter-chicken.svg',
    ingredientsText: [
      '500g chicken thighs, diced',
      '2 tbsp butter',
      '200ml heavy cream',
      '400g crushed tomatoes',
      '1 tsp garam masala',
      '2 clove garlic, minced',
      '1 tsp chili powder',
      'Salt to taste',
    ].join('\n'),
    stepsText: [
      'Marinate the chicken in yogurt and spices for at least 30 minutes.',
      'Sear the chicken in a hot pan until browned, then set aside.',
      'Melt the butter and saute garlic until fragrant.',
      'Add the crushed tomatoes and simmer for 10 minutes at medium heat, oven-warm at 180°C if finishing in the oven.',
      'Stir in the cream and garam masala, then return the chicken to the pan.',
      'Simmer for 15 minutes until the sauce thickens and chicken is cooked through.',
    ].join('\n'),
    tipsText: [
      'Marinate the chicken overnight for deeper flavor.',
      'Swap heavy cream for coconut cream for a dairy-free version.',
      'Serve with basmati rice or warm naan.',
    ].join('\n'),
  },
  {
    title: 'Banana Bread',
    description: 'Moist, spiced banana bread that turns overripe bananas into the best loaf in the kitchen.',
    imagePath: '/uploads/seed-banana-bread.svg',
    ingredientsText: [
      '3 ripe bananas, mashed',
      '150g sugar',
      '115g butter, melted',
      '2 eggs',
      '190g flour',
      '1 tsp baking soda',
      '1 pinch salt',
      '1 tsp vanilla extract',
    ].join('\n'),
    stepsText: [
      'Preheat the oven to 175°C and grease a loaf pan.',
      'Mix mashed bananas with melted butter.',
      'Stir in sugar, egg, and vanilla extract.',
      'Sprinkle the baking soda and salt over the mixture and stir in.',
      'Fold in the flour until just combined, then pour into the loaf pan.',
      'Bake at 175°C for 55-60 minutes, until a toothpick comes out clean.',
    ].join('\n'),
    tipsText: [
      'The riper (spottier) the bananas, the sweeter the loaf.',
      'Add walnuts or chocolate chips for extra texture.',
      'Let it cool fully before slicing to avoid crumbling.',
    ].join('\n'),
  },
];

for (const seed of seedRecipes) {
  const slug = slugify(seed.title);
  if (Recipe.findBySlug(slug)) {
    console.log(`Skipping "${seed.title}" - already seeded.`);
    continue;
  }

  Recipe.create({
    title: seed.title,
    description: seed.description,
    imagePath: seed.imagePath,
    ingredients: parseIngredientsText(seed.ingredientsText),
    steps: parseLinesText(seed.stepsText),
    tips: parseLinesText(seed.tipsText),
  });
  console.log(`Seeded "${seed.title}".`);
}
