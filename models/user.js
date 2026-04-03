const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  pin: { type: String },
  city: { type: String },
  age: { type: Number },
  onboardingComplete: { type: Boolean, default: false },
  role: { type: String, default: 'user' },

  // Onboarding answers
  cycleGap: { type: String },
  periodDuration: { type: String },
  physicalSymptoms: [String],
  emotionalSymptoms: [String],
  symptomSeverity: { type: Number },
  stressLevel: { type: String },
  sleepPattern: { type: String },
  dietPattern: { type: String },
  activityLevel: { type: String },
  knownConditions: [String],
  hasDoctorAccess: { type: String },

  // Risk score (computed on onboarding)
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, default: 'low' },
  riskFlags: [String],

  // Nutrition goals
  nutritionGoals: {
    calories: { type: Number, default: 1800 },
    water: { type: Number, default: 8 },
    protein: { type: Number, default: 60 }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
