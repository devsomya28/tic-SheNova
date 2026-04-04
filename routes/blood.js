const express = require('express');
const router = express.Router();
const BloodDonor = require('../models/BloodDonor');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// 👉 FIX: base route
router.get('/', requireLogin, (req, res) => {
  res.redirect('/blood/donate');
});

// ── Donate page ─────────────────────────────
router.get('/donate', requireLogin, (req, res) => {
  res.render('blood/donate', { success: null, error: null });
});

router.post('/donate', requireLogin, async (req, res) => {
  try {
    const { name, age, bloodGroup, city, address, contact, units } = req.body;
    await BloodDonor.create({
      name,
      age,
      bloodGroup,
      city,
      address,
      contact,
      units: units || 1
    });

    res.render('blood/donate', {
      success: 'Thank you! Your donation has been registered. 🩸',
      error: null
    });
  } catch (err) {
    console.log('BLOOD DONATE ERROR:', err.message);
    res.render('blood/donate', {
      success: null,
      error: 'Something went wrong. Please try again.'
    });
  }
});

// ── Accept page ─────────────────────────────
router.get('/accept', requireLogin, async (req, res) => {
  const donors = await BloodDonor.find({ available: true }).sort({ createdAt: -1 });
  res.render('blood/accept', { donors, success: null });
});

router.post('/accept/:id', requireLogin, async (req, res) => {
  try {
    await BloodDonor.findByIdAndUpdate(req.params.id, { available: false });

    const donors = await BloodDonor.find({ available: true }).sort({ createdAt: -1 });

    res.render('blood/accept', {
      donors,
      success: 'Blood accepted successfully! Please contact the donor. 💚'
    });
  } catch (err) {
    const donors = await BloodDonor.find({ available: true }).sort({ createdAt: -1 });

    res.render('blood/accept', {
      donors,
      success: null
    });
  }
});

module.exports = router;