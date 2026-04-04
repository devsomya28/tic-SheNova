const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

let dataset = [];

function loadCycleData() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'cleaned_dataset(1).csv');
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => dataset.push(row))
      .on('end', () => {
        console.log(`✅ Cycle dataset loaded: ${dataset.length} records`);
        resolve(dataset);
      })
      .on('error', reject);
  });
}

function getDataset() { return dataset; }

// Compare user's cycle gap to population
function getPopulationStats(userAvgGap) {
  if (!dataset.length) return null;

  const similar = dataset.filter(row => {
    const phase = row['Phase'] || row['phase'] || '';
    return phase.toLowerCase().includes('menstrual');
  });

  const gaps = dataset
    .map(row => parseFloat(row['study_interval'] || row['Study Interval'] || 0))
    .filter(n => n > 0 && n < 100);

  if (!gaps.length) return null;

  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const shorter = gaps.filter(g => g < userAvgGap).length;
  const percentile = Math.round((shorter / gaps.length) * 100);

  return {
    populationAvgGap: Math.round(avg),
    userPercentile: percentile,
    totalRecords: dataset.length,
    message: `Your cycle is longer than ${percentile}% of cycles in our dataset (avg: ${Math.round(avg)} days)`
  };
}

// Get symptom frequency from population
function getSymptomFrequency(symptom) {
  if (!dataset.length) return null;

  const columnMap = {
    'stress_very_high': 'stress_level',
    'heavy_flow':       'flow_intensity',
    'acne':             'acne',
    'back_pain':        'back_pain',
    'clots':            'clots',
  };

  const col = columnMap[symptom];
  if (!col) return null;

  const total = dataset.length;
  const matching = dataset.filter(row => {
    const val = (row[col] || '').toLowerCase();
    return val === 'high' || val === 'yes' || val === 'true' || val === '1';
  }).length;

  return total ? Math.round((matching / total) * 100) : null;
}
// ── Exercise recommendations from Sleep Health dataset ──
let sleepDataset = [];

function loadSleepData() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'Sleep_health_and_lifestyle_dataset.csv');
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => sleepDataset.push(row))
      .on('end', () => {
        console.log(`✅ Sleep dataset loaded: ${sleepDataset.length} records`);
        resolve(sleepDataset);
      })
      .on('error', reject);
  });
}

function getExerciseRecommendations(user, phaseName) {
  if (!sleepDataset.length) return null;

  // Map user's stressLevel string → numeric range
  const stressMap = {
    'low': [1, 3],
    'moderate': [4, 5],
    'high': [6, 8],
  };
  const userStress = user.stressLevel?.toLowerCase() || 'moderate';
  const [stressMin, stressMax] = stressMap[userStress] || [4, 5];

  // Map user's activityLevel → numeric range
  const activityMap = {
    'sedentary': [0, 30],
    'light': [30, 45],
    'moderate': [45, 60],
    'active': [60, 90],
  };
  const userActivity = user.activityLevel?.toLowerCase() || 'moderate';
  const [actMin, actMax] = activityMap[userActivity] || [45, 60];

  // Filter dataset rows that match user's stress + activity profile
  const matched = sleepDataset.filter(row => {
    const stress = parseFloat(row['Stress Level'] || 0);
    const activity = parseFloat(row['Physical Activity Level'] || 0);
    return stress >= stressMin && stress <= stressMax &&
           activity >= actMin && activity <= actMax;
  });

  const pool = matched.length > 0 ? matched : sleepDataset;

  // Phase → intensity mapping
  const phaseIntensity = {
    'Menstrual':  'low',
    'Follicular': 'high',
    'Ovulation':  'high',
    'Luteal':     'moderate',
  };
  const targetIntensity = phaseIntensity[phaseName] || 'moderate';

  // Build recommendations based on phase intensity + dataset insights
  const avgActivity = Math.round(
    pool.reduce((sum, r) => sum + parseFloat(r['Physical Activity Level'] || 0), 0) / pool.length
  );
  const avgSleep = (
    pool.reduce((sum, r) => sum + parseFloat(r['Sleep Duration'] || 0), 0) / pool.length
  ).toFixed(1);
  const commonDisorder = (() => {
    const counts = {};
    pool.forEach(r => {
      const d = r['Sleep Disorder'] || 'None';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
  })();

  // Generate phase-aware exercise list enriched with dataset context
  const exercisesByPhase = {
    low: [
      `Gentle yoga or stretching (your profile matches ${pool.length} similar users)`,
      `Short 20–30 min walks — dataset avg activity: ${avgActivity} min/day`,
      `Child's pose and restorative poses for cramp relief`,
      `Rest is productive — similar users average ${avgSleep}h sleep`,
    ],
    moderate: [
      `Moderate yoga or pilates — matched to your stress level`,
      `Light walks 30–40 min — dataset avg: ${avgActivity} min/day`,
      `Swimming for mood and cramp relief`,
      `Reduce intensity as period nears — avg sleep target: ${avgSleep}h`,
    ],
    high: [
      `Running, cycling, or HIIT — energy peaks now`,
      `Strength training — dataset avg activity for your profile: ${avgActivity} min/day`,
      `Dance, swim, or group classes`,
      commonDisorder !== 'None'
        ? `Watch for ${commonDisorder} signs — common in similar profiles`
        : `Outdoor activities for mood and hormone boost`,
    ],
  };

  return {
    exercises: exercisesByPhase[targetIntensity],
    dataSource: `Based on ${pool.length} matched profiles from sleep health dataset`,
    avgActivity,
    avgSleep,
  };
}

module.exports = {
  loadCycleData,
  loadSleepData,         // ← new
  getDataset,
  getPopulationStats,
  getSymptomFrequency,
  getExerciseRecommendations,  // ← new
};

module.exports = { loadCycleData, loadSleepData, getDataset, getPopulationStats, getSymptomFrequency, getExerciseRecommendations };