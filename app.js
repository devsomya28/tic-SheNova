require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const session  = require('express-session');
const path     = require('path');

// ── NEW: NHANES data loader ───────────────────────────────────────────────
const { loadNHANES } = require('./data/loadNHANES');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.get('/schemes', (req, res) => {
  res.render('schemes');
});
app.get('/faq', (req, res) => {
  res.render('faq');
});
// Routes
app.use('/',           require('./routes/auth'));
app.use('/onboarding', require('./routes/onboarding'));
app.use('/dashboard',  require('./routes/dashboard'));
app.use('/insights',   require('./routes/insights'));
app.use('/doctor',     require('./routes/doctor'));
app.use('/profile',    require('./routes/profile'));

// ── NEW: PCOS assessment + diet route ────────────────────────────────────
app.use('/pcos', require('./routes/pcos'));

// Start server — load NHANES CSV first, then cycle dataset
const { loadCycleData, getDataset } = require('./data/loadCycleData');
const PORT = process.env.PORT || 3000;

Promise.all([loadCycleData(), loadNHANES()])
  .then(() => {
    console.log('Cycle dataset row sample:', getDataset()[0]);
    app.listen(PORT, () => console.log(`Herlytics running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to load datasets:', err);
    process.exit(1);
  });
