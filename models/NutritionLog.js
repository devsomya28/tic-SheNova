const mongoose = require('mongoose');

const nutritionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  meals: [{
    name: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    time: String
  }],
  waterGlasses: { type: Number, default: 0 },
  totalCalories: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
