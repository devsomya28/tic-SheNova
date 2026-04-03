const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    if (req.session) {
      req.session.flash = {
        type: 'error',
        message: 'Please log in to continue.'
      };
    }
    return res.redirect('/login');
  }
  next();
};

const requireOnboarding = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  if (!req.session.user.onboardingComplete) {
    return res.redirect('/onboarding');
  }

  next();
};

const requireGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  requireAuth,
  requireOnboarding,
  requireGuest
};