const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');
const { getCycleStats } = require('../controllers/cycleEngine');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);

    const cycleLogs = await CycleLog.find({ userId: user._id }).sort({ periodStartDate: -1 });

    const dates = cycleLogs.map(l => l.periodStartDate);
    const cycleStats = getCycleStats(dates);

    // Dummy / optional data (prevents EJS crashes)
    const todayNutrition = {};
    const recentLogs = cycleLogs.slice(0, 10);

    res.render('dashboard', {
      user: user || {},
      cycleStats: cycleStats || null,
      cycleLogs: cycleLogs || [],
      todayNutrition: todayNutrition,
      recentLogs: recentLogs
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
});


// Log a new period
router.post('/log', requireLogin, async (req, res) => {
  try {
    const { periodStartDate, flowLevel, hasClots, mood, symptoms } = req.body;

    await CycleLog.create({
      userId: req.session.user.id,
      periodStartDate: new Date(periodStartDate),
      flowLevel,
      hasClots: hasClots === 'on',
      mood,
      symptoms: [].concat(symptoms || [])
    });

    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving log");
  }
});

module.exports = router;