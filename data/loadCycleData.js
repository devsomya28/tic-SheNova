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

module.exports = { loadCycleData, getDataset, getPopulationStats, getSymptomFrequency };