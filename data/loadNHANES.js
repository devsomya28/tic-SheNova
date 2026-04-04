/**
 * data/loadNHANES.js
 *
 * Loads NHANES_Select_Mean_Dietary_Intake_Estimates.csv into memory once
 * at startup. Exposes getNutrientData(age, sex) for any route/controller.
 *
 * Usage:
 *   const { loadNHANES, getNutrientData } = require('./data/loadNHANES');
 *   await loadNHANES();                          // call once in app.js
 *   const data = getNutrientData(28, 'Female');  // anywhere after that
 */

const fs   = require('fs');
const path = require('path');
const csv  = require('csv-parser');

// In-memory store: nhanes[sex][ageGroup][nutrient] = mean
let nhanes = {};
let loaded = false;

// Map a numeric age → the NHANES age-group label we want
function ageGroupFor(age) {
  if (age < 20)  return '12-19';
  if (age < 30)  return '20-29';
  if (age < 40)  return '30-39';
  if (age < 50)  return '40-49';
  if (age < 60)  return '50-59';
  if (age < 70)  return '60-69';
  return '70 and over';
}

// We only keep the most recent survey year in the file
const TARGET_YEAR = '2017-2018';

/**
 * loadNHANES()
 * Call once at server startup (returns a Promise).
 */
function loadNHANES() {
  return new Promise((resolve, reject) => {
    if (loaded) return resolve();

    const filePath = path.join(__dirname, 'NHANES_Select_Mean_Dietary_Intake_Estimates__4_.csv');

    if (!fs.existsSync(filePath)) {
      console.warn('⚠️  NHANES CSV not found at:', filePath);
      console.warn('   Diet recommendations will use hardcoded fallback values.');
      loaded = true;
      return resolve();
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Only keep the target survey year and known age groups
        if (row['Survey Years'] !== TARGET_YEAR) return;
        if (row['Race and Hispanic Origin'] !== 'All')    return;

        const sex      = (row['Sex'] || '').trim();          // 'All', 'Female', 'Male'
        const ageGroup = (row['Age Group'] || '').trim();
        const nutrient = (row['Nutrient'] || '').trim();
        const mean     = parseFloat(row['Mean']);

        if (!nutrient || isNaN(mean)) return;

        if (!nhanes[sex])                     nhanes[sex] = {};
        if (!nhanes[sex][ageGroup])           nhanes[sex][ageGroup] = {};
        nhanes[sex][ageGroup][nutrient] = mean;
      })
      .on('end', () => {
        loaded = true;
        const groups = Object.keys(nhanes['Female'] || {});
        console.log(`✅  NHANES loaded — ${groups.length} female age groups, year: ${TARGET_YEAR}`);
        resolve();
      })
      .on('error', (err) => {
        console.error('❌  NHANES CSV parse error:', err.message);
        loaded = true; // allow app to start anyway
        resolve();
      });
  });
}

/**
 * getNutrientData(age, sex)
 * Returns an object of { Nutrient: meanValue } for the user's age+sex group.
 * Falls back to 'All' sex data if female/male data is missing.
 * Falls back to hardcoded estimates if CSV never loaded.
 *
 * @param {number} age   - user's age in years
 * @param {string} sex   - 'Female' | 'Male' | 'All'
 * @returns {{ [nutrient: string]: number }}
 */
function getNutrientData(age, sex = 'Female') {
  const ageGroup = ageGroupFor(age);

  // Try exact sex, then 'Female' default, then 'All'
  const data =
    (nhanes[sex]    && nhanes[sex][ageGroup])    ||
    (nhanes['Female'] && nhanes['Female'][ageGroup]) ||
    (nhanes['All']  && nhanes['All'][ageGroup])  ||
    null;

  if (data) return { ...data };

  // Hardcoded fallback (female 20-and-over from 2017-2018)
  console.warn(`⚠️  NHANES: no data for sex="${sex}" age=${age} (group=${ageGroup}), using fallback`);
  return {
    'Calcium':       856.9,
    'Dietary Fiber':  15.5,
    'Iron':           12.3,
    'Potassium':    2324.3,
    'Saturated Fat':  24.7,
    'Sodium':       2986.6,
    'Vitamin D':       3.7,
  };
}

/**
 * getAllAgeGroups()
 * Returns all age groups available in the loaded data (useful for debugging).
 */
function getAllAgeGroups() {
  return Object.keys(nhanes['Female'] || nhanes['All'] || {});
}

module.exports = { loadNHANES, getNutrientData, getAllAgeGroups };
