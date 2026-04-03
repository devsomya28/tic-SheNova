const router = require('express').Router();
const CycleLog = require('../models/CycleLog');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { getCycleStats } = require('../controllers/cycleEngine');

// ✅ NEW: CSV imports
const fs = require('fs');
const csv = require('csv-parser');

// ✅ Load dataset once
let dataset = [];

fs.createReadStream(__dirname + '/../data/pcos.csv')
  .pipe(csv())
  .on('data', (data) => dataset.push(data))
  .on('end', () => {
    console.log("✅ CSV Loaded:", dataset.length, "rows");
  });


// ================= EXISTING ROUTES =================

router.get('/cycle-stats', async (req, res) => {
  const logs = await CycleLog.find({ userId: req.session.user._id })
    .sort({ periodStartDate: -1 })
    .limit(6);

  const stats = getCycleStats(logs);
  res.json(stats || {});
});

router.get('/recent-logs', async (req, res) => {
  const logs = await CycleLog.find({ userId: req.session.user._id })
    .sort({ periodStartDate: -1 })
    .limit(12);

  res.json(logs);
});

router.get('/risk', async (req, res) => {
  const user = await User.findById(req.session.user._id);
  res.json({
    score: user.riskScore,
    level: user.riskLevel,
    flags: user.riskFlags
  });
});


// ================= NEW FEATURE =================
// 🧠 PCOS Risk Prediction

router.post('/pcos-risk', async (req, res) => {
  const userInput = req.body;

  let risk = "Low";

  // 🔥 Smart logic
  if (
    userInput.irregular_cycle === true &&
    userInput.facial_hair === true &&
    userInput.weight_gain === true
  ) {
    risk = "High";
  } 
  else if (
    userInput.irregular_cycle === true ||
    userInput.acne === true ||
    userInput.stress === "high"
  ) {
    risk = "Medium";
  }

  res.json({
    message: "PCOS Risk Analysis",
    risk: risk,
    datasetRows: dataset.length // 👈 shows dataset is loaded
  });
});


// ================= EXPORT =================
module.exports = router;