/**
 * controllers/dietEngine.js
 *
 * Takes NHANES nutrient averages (from loadNHANES.js) + the user's PCOS
 * risk result (from riskEngine.js) and returns structured diet recommendations.
 *
 * Usage:
 *   const { buildDietPlan } = require('../controllers/dietEngine');
 *   const plan = buildDietPlan(nutrientData, riskResult, userProfile);
 */

// ── Reference targets (PCOS-optimised clinical guidelines) ────────────────
const TARGETS = {
  'Calcium':       { target: 1000, unit: 'mg',   goal: 'increase', label: 'Calcium'       },
  'Dietary Fiber': { target: 25,   unit: 'g',    goal: 'increase', label: 'Dietary Fiber'  },
  'Iron':          { target: 18,   unit: 'mg',   goal: 'increase', label: 'Iron'           },
  'Potassium':     { target: 2600, unit: 'mg',   goal: 'increase', label: 'Potassium'      },
  'Saturated Fat': { target: 20,   unit: 'g',    goal: 'decrease', label: 'Saturated Fat'  },
  'Sodium':        { target: 2300, unit: 'mg',   goal: 'decrease', label: 'Sodium'         },
  'Vitamin D':     { target: 15,   unit: 'mcg',  goal: 'increase', label: 'Vitamin D'      },
};

// ── Food sources for each nutrient gap ────────────────────────────────────
const FOOD_SOURCES = {
  'Calcium': {
    increase: ['Low-fat dairy (milk, curd, paneer)', 'Fortified soy/almond milk', 'Ragi (finger millet)', 'Sesame seeds', 'Leafy greens (spinach, methi)'],
    tip: 'Pair with Vitamin D foods — they work together for absorption.',
  },
  'Dietary Fiber': {
    increase: ['Oats and barley', 'Whole dals and rajma', 'Flaxseeds (add to roti dough)', 'Vegetables like broccoli and carrot', 'Fruits with skin (apple, pear, guava)'],
    tip: 'Fiber slows glucose absorption — critical for managing insulin resistance in PCOS.',
  },
  'Iron': {
    increase: ['Poha with lemon juice', 'Dates and anjeer', 'Rajma and chana', 'Leafy greens cooked in iron vessel', 'Jaggery'],
    tip: 'Eat with Vitamin C (lemon, amla) to double iron absorption. Avoid tea/coffee within an hour.',
  },
  'Potassium': {
    increase: ['Banana', 'Sweet potato', 'Coconut water', 'Rajma and moong', 'Tomatoes and spinach'],
    tip: 'Potassium balances sodium and supports heart health, which PCOS can affect long-term.',
  },
  'Saturated Fat': {
    decrease: ['Replace ghee/butter with small amounts of olive oil or mustard oil', 'Choose lean protein (chicken breast, fish, tofu, lentils)', 'Avoid full-fat packaged snacks and cream-based curries', 'Use low-fat dairy instead of full-fat paneer daily'],
    tip: 'Saturated fat worsens insulin resistance. Limit to less than 20g/day.',
  },
  'Sodium': {
    decrease: ['Cook at home — restaurant food is very high in sodium', 'Avoid packaged chips, namkeen, instant noodles', 'Use herbs (jeera, coriander, haldi) for flavour instead of salt', 'Read labels — sauces and pickles have hidden sodium'],
    tip: 'High sodium can raise blood pressure, which PCOS already puts you at higher risk for.',
  },
  'Vitamin D': {
    increase: ['Fatty fish (salmon, sardines)', 'Egg yolks', 'Fortified milk and cereals', '15 minutes of morning sunlight daily', 'Vitamin D3 supplement (consult your doctor)'],
    tip: 'Up to 67–85% of women with PCOS are Vitamin D deficient. It directly affects insulin signalling.',
  },
};

// ── PCOS-specific meal pattern advice ─────────────────────────────────────
const PCOS_MEAL_TIPS = [
  {
    title: 'Eat low-glycaemic meals',
    body: 'Choose complex carbs: brown rice, whole wheat roti, oats, barley. These cause slower blood sugar rises, reducing insulin spikes that drive PCOS.',
    riskLevel: ['moderate', 'high'],
  },
  {
    title: 'Never skip breakfast',
    body: 'Skipping breakfast causes blood sugar crashes and cortisol spikes. Have a protein-rich breakfast (eggs, dal, paneer, curd) within an hour of waking.',
    riskLevel: ['low', 'moderate', 'high'],
  },
  {
    title: 'Protein at every meal',
    body: 'Aim for 25–30g of protein per meal. It reduces cravings, stabilises hormones, and supports muscle which improves insulin sensitivity.',
    riskLevel: ['moderate', 'high'],
  },
  {
    title: 'Anti-inflammatory foods',
    body: 'Add turmeric, ginger, garlic, omega-3 rich foods (chia, flaxseeds, walnuts, fatty fish) daily. Chronic inflammation is a core driver of PCOS.',
    riskLevel: ['moderate', 'high'],
  },
  {
    title: 'Limit sugar and refined carbs',
    body: 'White bread, maida, packaged sweets, sugary drinks — all cause insulin spikes. Switch to jaggery or dates in small amounts if you need sweetness.',
    riskLevel: ['moderate', 'high'],
  },
];

/**
 * buildNutrientSummary(nutrientData)
 * Returns an array of nutrient cards with current value, target, gap, and status.
 *
 * @param {{ [nutrient: string]: number }} nutrientData - from getNutrientData()
 * @returns {Array}
 */
function buildNutrientSummary(nutrientData) {
  return Object.entries(TARGETS).map(([key, cfg]) => {
    const current = nutrientData[key] ?? null;
    const { target, unit, goal, label } = cfg;

    let status = 'ok';
    let gap    = 0;

    if (current !== null) {
      if (goal === 'increase') {
        gap    = +(target - current).toFixed(1);
        status = current >= target ? 'ok' : current >= target * 0.75 ? 'low' : 'deficient';
      } else {
        gap    = +(current - target).toFixed(1);
        status = current <= target ? 'ok' : current <= target * 1.2 ? 'high' : 'excess';
      }
    }

    // Percentage toward goal (capped 0-100)
    const pct = current === null ? 0
      : goal === 'increase'
        ? Math.min(100, Math.round((current / target) * 100))
        : Math.min(100, Math.round((target / current) * 100));

    return { key, label, current, target, unit, goal, gap, status, pct };
  });
}

/**
 * buildFoodRecommendations(nutrientSummary, riskLevel)
 * Returns an ordered list of food recommendations based on biggest gaps.
 *
 * @param {Array}  nutrientSummary - output of buildNutrientSummary()
 * @param {string} riskLevel       - 'low' | 'moderate' | 'high'
 * @returns {Array}
 */
function buildFoodRecommendations(nutrientSummary, riskLevel) {
  const recs = [];

  // Priority-sort: deficient/excess first, then low/high, then ok
  const priorityScore = (s) => {
    if (s === 'deficient' || s === 'excess') return 3;
    if (s === 'low'       || s === 'high')   return 2;
    return 0;
  };

  const sorted = [...nutrientSummary]
    .filter(n => n.status !== 'ok')
    .sort((a, b) => priorityScore(b.status) - priorityScore(a.status));

  for (const n of sorted.slice(0, 4)) {
    const src = FOOD_SOURCES[n.key];
    if (!src) continue;

    const foods = n.goal === 'increase' ? src.increase : src.decrease;
    recs.push({
      nutrient: n.label,
      direction: n.goal,
      status: n.status,
      gap: n.gap,
      unit: n.unit,
      foods,
      tip: src.tip,
    });
  }

  // Add PCOS-specific meal pattern tips based on risk level
  const mealTips = PCOS_MEAL_TIPS.filter(t => t.riskLevel.includes(riskLevel));
  recs.push(...mealTips.slice(0, 3).map(t => ({
    nutrient: null,
    direction: 'lifestyle',
    title: t.title,
    body: t.body,
  })));

  return recs;
}

/**
 * buildDietPlan(nutrientData, riskResult, userProfile)
 * Main export — combines everything into one diet plan object.
 *
 * @param {{ [nutrient: string]: number }} nutrientData  - from loadNHANES.getNutrientData()
 * @param {{ level: string, score: number }} riskResult  - from riskEngine.calculateRisk()
 * @param {{ age: number }} userProfile
 * @returns {{ summary: Array, recommendations: Array, meta: object }}
 */
function buildDietPlan(nutrientData, riskResult, userProfile) {
  const summary         = buildNutrientSummary(nutrientData);
  const recommendations = buildFoodRecommendations(summary, riskResult.level);

  const deficientCount = summary.filter(n => n.status === 'deficient').length;
  const excessCount    = summary.filter(n => n.status === 'excess').length;

  return {
    summary,
    recommendations,
    meta: {
      riskLevel:       riskResult.level,
      riskScore:       riskResult.score,
      ageGroup:        userProfile.age,
      deficientCount,
      excessCount,
      dataSource:      'NHANES 2017–2018, Female, All racial/ethnic groups',
      disclaimer:      'This is an educational tool, not a clinical prescription. Consult a registered dietitian for personalised advice.',
    },
  };
}

module.exports = { buildDietPlan, buildNutrientSummary, TARGETS };
