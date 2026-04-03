const router = require('express').Router();

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { calculateRisk } = require('../controllers/riskEngine');

/**
 * GET /onboarding
 */
router.get('/', requireAuth, (req, res) => {
  if (req.session.user.onboardingComplete) {
    return res.redirect('/dashboard');
  }

  res.render('onboarding/index', { step: 1 });
});

/**
 * POST /onboarding/save
 */
router.post('/save', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    const userId = req.session.user._id;

    // Ensure arrays
    const physicalSymptoms = [].concat(data.physicalSymptoms || []);
    const emotionalSymptoms = [].concat(data.emotionalSymptoms || []);
    const knownConditions = [].concat(data.knownConditions || []);

    const updateData = {
      cycleGap: data.cycleGap,
      periodDuration: data.periodDuration,
      physicalSymptoms,
      emotionalSymptoms,
      symptomSeverity: parseInt(data.symptomSeverity) || 5,
      stressLevel: data.stressLevel,
      sleepPattern: data.sleepPattern,
      dietPattern: data.dietPattern,
      activityLevel: data.activityLevel,
      knownConditions,
      hasDoctorAccess: data.hasDoctorAccess,
      onboardingComplete: true
    };

    // Risk calculation
    const risk = calculateRisk(updateData);
    updateData.riskScore = risk.score;
    updateData.riskLevel = risk.level;
    updateData.riskFlags = risk.flags;

    await User.findByIdAndUpdate(userId, updateData);

    // Update session
    req.session.user.onboardingComplete = true;
    req.session.user.riskLevel = risk.level;
    req.session.user.riskScore = risk.score;

    return res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    return res.redirect('/onboarding');
  }
});

module.exports = router;