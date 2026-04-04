const mongoose = require('mongoose');

const bloodDonorSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  age:         { type: Number, required: true },
  bloodGroup:  { type: String, required: true },
  city:        { type: String, required: true },
  address:     { type: String, required: true },
  contact:     { type: String, required: true },
  units:       { type: Number, default: 1 },
  available:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('BloodDonor', bloodDonorSchema);