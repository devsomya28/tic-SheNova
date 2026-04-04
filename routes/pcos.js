/**
 * routes/pcos.js
 *
 * Two endpoints:
 *   GET  /pcos          → renders the assessment questionnaire page
 *   POST /pcos/assess   → receives form data, returns JSON with risk + diet plan
 *
 * The POST is called by the frontend JS (fetch), not a full page reload.
 */

const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const { calculateRisk }   = require('../controllers/riskEngine');
const { buildDietPlan }   = require('../controllers/dietEngine');
const { getNutrientData } = require('../data/loadNHANES');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ── GET /pcos ─────────────────────────────────────────────────────────────
// Renders the assessment page. Passes the logged-in user to pre-fill age.
router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render('pcos', { user, plan: null, error: null });
  } catch (err) {
    console.error('GET /pcos error:', err);
    res.status(500).send('Server error');
  }
});

// ── POST /pcos/assess ─────────────────────────────────────────────────────
// Receives JSON body from the frontend fetch call.
// Returns JSON: { risk, dietPlan }
//
// Expected body:
// {
//   age: 26,
//   cycleGap: 'irregular' | 'more35' | 'less21' | 'normal',
//   cycSym: ['clots', 'heavy_flow', 'spotting', 'back_pain'],
//   physSym: ['facial_hair', 'skin_darkening', 'hair_loss', 'weight_gain', 'acne'],
//   activity: 'active' | 'light' | 'too_tired' | 'no_exercise',
//   diet: 'balanced' | 'fast_food' | 'skipping' | 'restricting'
// }
router.post('/assess', requireLogin, async (req, res) => {
  try {
    const { age, cycleGap, cycSym = [], physSym = [], activity, diet } = req.body;

    // ── Validate ───────────────────────────────────────────────────────────
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 10 || ageNum > 80) {
      return res.status(400).json({ error: 'Please provide a valid age between 10 and 80.' });
    }

    // ── Build the user object riskEngine expects ───────────────────────────
    // Map our form keys to riskEngine's expected keys
    const physicalSymptoms = [
      ...(physSym.includes('facial_hair')    ? ['facial_hair']    : []),
      ...(physSym.includes('skin_darkening') ? ['skin_darkening'] : []),
      ...(physSym.includes('hair_loss')      ? ['hair_loss']      : []),
      ...(physSym.includes('weight_gain')    ? ['weight_gain']    : []),
      ...(physSym.includes('acne')           ? ['acne']           : []),
      ...(cycSym.includes('clots')           ? ['clots']          : []),
      ...(cycSym.includes('heavy_flow')      ? ['heavy_flow']     : []),
      ...(cycSym.includes('spotting')        ? ['spotting']       : []),
      ...(cycSym.includes('back_pain')       ? ['back_pain']      : []),
    ];

    const userInput = {
      age:              ageNum,
      cycleGap:         cycleGap || 'normal',
      physicalSymptoms,
      stressLevel:      null,  // not asked in this form version
      dietPattern:      diet   || 'balanced',
      activityLevel:    activity || 'light',
      sleepPattern:     null,
    };

    // ── Calculate PCOS risk (uses riskEngine.js — your existing code) ──────
    const risk = calculateRisk(userInput);

    // ── Get NHANES nutrient averages for this user's age group ─────────────
    const nutrientData = getNutrientData(ageNum, 'Female');

    // ── Build diet plan from NHANES gaps + risk level ──────────────────────
    const dietPlan = buildDietPlan(nutrientData, risk, { age: ageNum });

    // ── Optionally save to session so insights page can use it ────────────
    req.session.lastPcosResult = { risk, dietPlan, assessedAt: new Date() };

    return res.json({ risk, dietPlan });

  } catch (err) {
    console.error('POST /pcos/assess error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
