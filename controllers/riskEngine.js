function calculateRisk(userData) {
  let score = 0;
  const flags = [];

  const allSymptoms = [
    ...(userData.physicalSymptoms || []),
    ...(userData.emotionalSymptoms || [])
  ];

  // Cycle irregularity (high weight)
  if (userData.cycleGap === 'irregular' || userData.cycleGap === '>35days') {
    score += 30;
    flags.push('Irregular cycles');
  } else if (userData.cycleGap === '21-25days') {
    score += 10;
  }

  // Physical symptoms
  if (allSymptoms.includes('facial_hair')) { score += 25; flags.push('Unusual hair growth'); }
  if (allSymptoms.includes('heavy_flow')) { score += 15; flags.push('Heavy menstrual flow'); }
  if (allSymptoms.includes('clots')) { score += 20; flags.push('Blood clots in flow'); }
  if (allSymptoms.includes('acne')) { score += 10; flags.push('Persistent acne'); }
  if (allSymptoms.includes('weight_gain')) { score += 12; flags.push('Unexplained weight gain'); }
  if (allSymptoms.includes('hair_loss')) { score += 10; flags.push('Hair thinning or loss'); }
  if (allSymptoms.includes('bloating')) { score += 8; flags.push('Frequent bloating'); }

  // Emotional/mental symptoms
  if (allSymptoms.includes('mood_swings')) { score += 8; flags.push('Significant mood swings'); }
  if (allSymptoms.includes('anxiety')) { score += 8; flags.push('Anxiety'); }
  if (allSymptoms.includes('brain_fog')) { score += 6; flags.push('Brain fog'); }

  // Lifestyle factors
  if (userData.stressLevel === 'very_high') { score += 10; flags.push('Very high stress'); }
  else if (userData.stressLevel === 'high') { score += 5; }

  if (userData.sleepPattern === 'poor') { score += 8; flags.push('Poor sleep quality'); }
  if (userData.activityLevel === 'sedentary') { score += 5; }

  // Severity multiplier
  const severity = userData.symptomSeverity || 5;
  if (severity >= 8) score = Math.round(score * 1.2);
  else if (severity <= 3) score = Math.round(score * 0.8);

  // Known conditions
  if ((userData.knownConditions || []).includes('pcos')) { score += 40; flags.push('Known PCOS diagnosis'); }
  if ((userData.knownConditions || []).includes('thyroid')) { score += 15; flags.push('Thyroid condition'); }

  score = Math.min(score, 100);

  const level = score >= 65 ? 'high' : score >= 35 ? 'moderate' : 'low';

  const recommendations = getRecommendations(level, flags);

  return { score, level, flags, recommendations };
}

function getRecommendations(level, flags) {
  const base = [
    'Track your cycle consistently for at least 3 months',
    'Maintain a balanced diet rich in whole foods',
    'Aim for 7–8 hours of quality sleep nightly',
    'Practice stress management (yoga, meditation, deep breathing)'
  ];

  if (level === 'high') {
    return [
      'Consult a gynecologist or endocrinologist as soon as possible',
      'Request a hormonal panel: LH, FSH, testosterone, AMH',
      'Consider an ultrasound to check for ovarian cysts',
      'Reduce refined sugars and processed carbohydrates',
      ...base
    ];
  }
  if (level === 'moderate') {
    return [
      'Schedule a check-up with your doctor within 1–2 months',
      'Start tracking symptoms daily using the cycle log',
      'Increase anti-inflammatory foods: turmeric, leafy greens, omega-3s',
      ...base
    ];
  }
  return [
    'Continue monitoring your cycle health regularly',
    ...base
  ];
}

module.exports = { calculateRisk };
