function getCycleStats(logs) {
  // logs = array of CycleLog documents, sorted newest first
  if (!logs || logs.length === 0) return null;

  const dates = logs.map(l => new Date(l.periodStartDate)).sort((a, b) => b - a);

  let avg = 28, min = 28, max = 28, variance = 0;

  if (dates.length >= 2) {
    const gaps = [];
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = Math.round((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
      if (diff > 0 && diff < 100) gaps.push(diff);
    }
    if (gaps.length > 0) {
      avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      min = Math.min(...gaps);
      max = Math.max(...gaps);
      variance = max - min;
    }
  }

  const lastPeriod = dates[0];
  const today = new Date();
  const dayOfCycle = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24)) + 1;
  const nextPeriod = new Date(lastPeriod.getTime() + avg * 24 * 60 * 60 * 1000);
  const daysUntilNext = Math.ceil((nextPeriod - today) / (1000 * 60 * 60 * 24));

  const phase = getPhase(dayOfCycle, avg);

  return {
    avg,
    min,
    max,
    variance,
    dayOfCycle,
    nextPeriod,
    daysUntilNext,
    phase,
    isIrregular: variance > 7,
    lastPeriod,
    totalLogs: logs.length
  };
}

function getPhase(dayOfCycle, cycleLength) {
  const phases = {
    menstrual: {
      name: 'Menstrual',
      emoji: '🌑',
      color: '#E57373',
      tip: 'Rest and restore. Iron-rich foods help — spinach, dates, lentils.',
      energy: 'Low — honour your body\'s need for rest.',
      foods: ['Spinach', 'Dates', 'Red lentils', 'Dark chocolate'],
      avoid: ['Caffeine', 'Salty foods', 'Alcohol']
    },
    follicular: {
      name: 'Follicular',
      emoji: '🌒',
      color: '#FFB74D',
      tip: 'Energy rising. Great time to start new projects and exercise.',
      energy: 'Rising — a good time to be productive and social.',
      foods: ['Eggs', 'Fermented foods', 'Seeds', 'Lean protein'],
      avoid: ['Processed foods', 'Excess sugar']
    },
    ovulation: {
      name: 'Ovulation',
      emoji: '🌕',
      color: '#81C784',
      tip: 'Peak energy and confidence. You may feel more magnetic today.',
      energy: 'Peak — leverage this window for big decisions and workouts.',
      foods: ['Leafy greens', 'Quinoa', 'Berries', 'Raw veggies'],
      avoid: ['Heavy meals', 'Alcohol']
    },
    luteal: {
      name: 'Luteal',
      emoji: '🌘',
      color: '#9575CD',
      tip: 'Progesterone rising. Craving carbs is normal — choose complex ones.',
      energy: 'Declining — self-care and lighter activities suit you best.',
      foods: ['Chickpeas', 'Brown rice', 'Chamomile tea', 'Pumpkin seeds'],
      avoid: ['Refined carbs', 'Caffeine', 'Salty snacks']
    }
  };

  if (dayOfCycle <= 5) return phases.menstrual;
  if (dayOfCycle <= 13) return phases.follicular;
  if (dayOfCycle <= 16) return phases.ovulation;
  return phases.luteal;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

module.exports = { getCycleStats, getPhase, formatDate };
