const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CycleLog = require('../models/CycleLog');
const { getCycleStats } = require('../controllers/cycleEngine');
const { calculateRisk } = require('../controllers/riskEngine');
const { getPopulationStats, getSymptomFrequency } = require('../data/loadCycleData');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/report', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  const logs = await CycleLog.find({ userId: user._id }).sort({ periodStartDate: -1 });

  const dates = logs.map(l => l.periodStartDate);
  const stats = getCycleStats(dates);
  const risk = calculateRisk(user);

  const populationStats = stats ? getPopulationStats(stats.avg) : null;
  const symptomFreqs = {
    heavy_flow: getSymptomFrequency('heavy_flow'),
    acne:       getSymptomFrequency('acne'),
    back_pain:  getSymptomFrequency('back_pain'),
    clots:      getSymptomFrequency('clots'),
  };

  const generatedOn = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  res.render('report', { user, stats, logs, risk, populationStats, symptomFreqs, generatedOn });
});

module.exports = router;