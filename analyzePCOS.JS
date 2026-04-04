/**
 * analyzePCOS.js — scans ALL sheets to find the one with real PCOS data
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function findCol(headers, keyword) {
  const kw = keyword.toLowerCase().replace(/[\s()\/\-_.]/g, '');
  return headers.find(h => h && h.toLowerCase().replace(/[\s()\/\-_.]/g, '').includes(kw)) || null;
}

function prevalenceAmong(rows, col, positiveVals, filterCol, filterVal) {
  const filtered = rows.filter(r => String(r[filterCol]).trim() === filterVal);
  if (!filtered.length) return 0;
  const count = filtered.filter(r => positiveVals.includes(String(r[col]).trim())).length;
  return count / filtered.length;
}

function oddsRatioToWeight(pcos, nonPcos) {
  const oddsPos = pcos    / (1 - pcos    + 0.001);
  const oddsNeg = nonPcos / (1 - nonPcos + 0.001);
  const or      = oddsPos / (oddsNeg + 0.001);
  return {
    or,
    weight: Math.max(0, Math.min(40, Math.round(Math.log(Math.max(or, 1)) * 10)))
  };
}

function main() {
  const filePath = path.join(__dirname, 'data', 'PCOS_data_without_infertility.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌  File not found: ${filePath}\n`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);

  // ── List all sheets ────────────────────────────────────────────────────
  console.log(`\n📚  Sheets in workbook: ${wb.SheetNames.length}`);
  wb.SheetNames.forEach((name, i) => console.log(`    [${i}] "${name}"`));

  // ── Find the sheet that has PCOS data (most columns, has "PCOS") ───────
  let dataSheet = null;
  let dataSheetName = null;
  let maxCols = 0;

  for (const name of wb.SheetNames) {
    const ws  = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find widest row (most columns = likely the data sheet)
    const widest = raw.reduce((max, r) => Math.max(max, r.length), 0);
    const hasData = raw.some(r => r.join(' ').toLowerCase().includes('pcos'));

    console.log(`    Sheet "${name}": ${raw.length} rows, max ${widest} cols, hasPCOS=${hasData}`);

    if (hasData && widest > maxCols) {
      maxCols      = widest;
      dataSheet    = ws;
      dataSheetName = name;
    }
  }

  if (!dataSheet) {
    // fallback: just use widest sheet
    let max = 0;
    for (const name of wb.SheetNames) {
      const ws  = wb.Sheets[name];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const widest = raw.reduce((m, r) => Math.max(m, r.length), 0);
      if (widest > max) { max = widest; dataSheet = ws; dataSheetName = name; }
    }
  }

  console.log(`\n✅  Using sheet: "${dataSheetName}" (${maxCols} columns)`);

  const raw = XLSX.utils.sheet_to_json(dataSheet, { header: 1, defval: '' });

  // ── Find header row (row with most non-empty cells) ────────────────────
  let headerRowIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(raw.length, 30); i++) {
    const row = raw[i];
    const nonEmpty  = row.filter(c => c !== '').length;
    const hasPcos   = row.join(' ').toLowerCase().includes('pcos');
    const score     = nonEmpty + (hasPcos ? 100 : 0);
    if (score > bestScore) { bestScore = score; headerRowIdx = i; }
  }

  if (headerRowIdx === -1) {
    console.error('❌  Could not find header row');
    process.exit(1);
  }

  console.log(`✅  Header row at index ${headerRowIdx}`);
  const headers = raw[headerRowIdx].map(h => String(h).trim());
  console.log('\n📋  Columns found:');
  headers.forEach((h, i) => { if (h) console.log(`    [${i}] "${h}"`); });

  // Build data rows
  const dataRows = raw.slice(headerRowIdx + 1)
    .filter(r => r.some(c => c !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = String(r[i] ?? '').trim(); });
      return obj;
    });

  console.log(`\n📊  Data rows: ${dataRows.length}`);
  if (dataRows[0]) console.log('    Sample:', JSON.stringify(dataRows[0]).slice(0, 300));

  // ── Normalize PCOS column ──────────────────────────────────────────────
  const pcosCol = findCol(headers.filter(Boolean), 'PCOS');
  if (!pcosCol) {
    console.error('❌  Cannot find PCOS column in headers:', headers);
    process.exit(1);
  }
  console.log(`\n🎯  PCOS column → "${pcosCol}"`);

  dataRows.forEach(r => {
    const v = String(r[pcosCol] ?? '').toLowerCase();
    r.__pcos = (v === '1' || v === 'yes') ? '1' : '0';
  });

  const pcosRows    = dataRows.filter(r => r.__pcos === '1');
  const nonPcosRows = dataRows.filter(r => r.__pcos === '0');
  console.log(`👩  PCOS positive: ${pcosRows.length}  PCOS negative: ${nonPcosRows.length}\n`);

  // ── Symptom weights ────────────────────────────────────────────────────
  const symptomSearch = [
    { key: 'hair_growth',    search: 'hairgrowth',    positiveVals: ['1','Yes','yes'] },
    { key: 'skin_darkening', search: 'skindarkening', positiveVals: ['1','Yes','yes'] },
    { key: 'hair_loss',      search: 'hairloss',      positiveVals: ['1','Yes','yes'] },
    { key: 'pimples',        search: 'pimples',       positiveVals: ['1','Yes','yes'] },
    { key: 'weight_gain',    search: 'weightgain',    positiveVals: ['1','Yes','yes'] },
    { key: 'fast_food',      search: 'fastfood',      positiveVals: ['1','Yes','yes'] },
    { key: 'no_exercise',    search: 'exercise',      positiveVals: ['0','No','no']  },
  ];

  const weights = {};
  const stats   = {};

  console.log('📊  Symptom analysis:');
  const validHeaders = headers.filter(Boolean);

  for (const s of symptomSearch) {
    const col = findCol(validHeaders, s.search);
    if (!col) {
      console.log(`  ⚠️  "${s.key}" — not found (search: "${s.search}")`);
      weights[s.key] = 0;
      continue;
    }
    const uniqueVals = [...new Set(dataRows.map(r => r[col]))].slice(0, 6);
    const inPcos     = prevalenceAmong(dataRows, col, s.positiveVals, '__pcos', '1');
    const inNonPcos  = prevalenceAmong(dataRows, col, s.positiveVals, '__pcos', '0');
    const { or, weight } = oddsRatioToWeight(inPcos, inNonPcos);
    weights[s.key] = weight;
    stats[s.key]   = { column: col, uniqueValues: uniqueVals,
      prevalenceInPCOS: `${(inPcos*100).toFixed(1)}%`,
      prevalenceInNonPCOS: `${(inNonPcos*100).toFixed(1)}%`,
      oddsRatio: or.toFixed(2), derivedWeight: weight };
    console.log(`  ${s.key.padEnd(20)} col="${col}"  vals=${JSON.stringify(uniqueVals)}  PCOS=${(inPcos*100).toFixed(1).padStart(5)}%  nonPCOS=${(inNonPcos*100).toFixed(1).padStart(5)}%  OR=${or.toFixed(2).padStart(6)}  weight=${weight}`);
  }

  // ── Cycle stats ────────────────────────────────────────────────────────
  const clCol = findCol(validHeaders, 'cyclelength');
  let cycleStats = { pcos_avg_cycle_days: 'N/A', nonpcos_avg_cycle_days: 'N/A' };
  if (clCol) {
    const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 'N/A';
    const extract = arr => arr.map(r => parseFloat(r[clCol])).filter(n => !isNaN(n) && n > 10 && n < 100);
    cycleStats = { pcos_avg_cycle_days: avg(extract(pcosRows)), nonpcos_avg_cycle_days: avg(extract(nonPcosRows)) };
    console.log(`\n📊  Cycle: PCOS avg=${cycleStats.pcos_avg_cycle_days}d  nonPCOS avg=${cycleStats.nonpcos_avg_cycle_days}d`);
  }

  // Irregular cycle
  const cycleCol = findCol(validHeaders, 'cycler');
  if (cycleCol) {
    const uniqueVals = [...new Set(dataRows.map(r => r[cycleCol]))];
    console.log(`    Cycle col "${cycleCol}" values:`, uniqueVals);
    // Most common value = regular, everything else = irregular
    const valCounts = {};
    dataRows.forEach(r => { const v = r[cycleCol]; valCounts[v] = (valCounts[v]||0)+1; });
    const mostCommon = Object.entries(valCounts).sort((a,b) => b[1]-a[1])[0][0];
    const irregularVal = uniqueVals.filter(v => v !== mostCommon && v !== '');
    if (irregularVal.length) {
      const inPcos    = prevalenceAmong(dataRows, cycleCol, irregularVal, '__pcos', '1');
      const inNonPcos = prevalenceAmong(dataRows, cycleCol, irregularVal, '__pcos', '0');
      const { or, weight } = oddsRatioToWeight(inPcos, inNonPcos);
      weights['cycleGap_irregular'] = weight;
      stats['cycleGap_irregular'] = { column: cycleCol, irregularVal,
        prevalenceInPCOS: `${(inPcos*100).toFixed(1)}%`, prevalenceInNonPCOS: `${(inNonPcos*100).toFixed(1)}%`,
        oddsRatio: or.toFixed(2), derivedWeight: weight };
      console.log(`    cycleGap_irregular  PCOS=${(inPcos*100).toFixed(1)}%  nonPCOS=${(inNonPcos*100).toFixed(1)}%  OR=${or.toFixed(2)}  weight=${weight}`);
    }
  }

  const fallbackWeights = {
    cycleGap_more35: 22, cycleGap_less21: 12, clots: 16, heavy_flow: 14,
    spotting: 9, back_pain: 5, stress_very_high: 10, stress_high: 6,
    diet_restricting: 9, diet_skipping: 5, activity_too_tired: 7, sleep_very_poor: 7, sleep_poor: 4,
  };

  const output = {
    _meta: { source: `PCOS_data_without_infertility.xlsx — sheet: "${dataSheetName}"`,
      total_rows: dataRows.length, pcos_positive: pcosRows.length,
      generated_at: new Date().toISOString(), columns_found: validHeaders },
    cycleStats, derivedWeights: weights, fallbackWeights, detailedStats: stats,
  };

  const outPath = path.join(__dirname, 'pcos_derived_weights.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅  Saved → ${outPath}`);
  console.log('    Restart your server — riskEngine.js loads these weights automatically.\n');
}

main();