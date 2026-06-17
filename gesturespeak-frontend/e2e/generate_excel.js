import fs from 'fs';
import path from 'path';

try {
  const data = JSON.parse(fs.readFileSync('report.json', 'utf8'));
  const results = data.results;

  let csv = '"Test ID","Test Name","Preconditions","Test Steps","Expected Result","Actual Result","Pass/Fail Status","Severity"\n';

  for (const test of results) {
    const stepsText = test.steps && test.steps.length > 0 
      ? test.steps.join('\n') 
      : '1. Execute test assertions';
      
    const row = [
      test.id || '',
      test.name || '',
      test.preconditions || 'None',
      stepsText,
      test.expected || '',
      test.actual || '',
      test.status || 'PASS',
      test.severity || 'HIGH'
    ];
    
    const csvRow = row.map(val => `"${val.replace(/"/g, '""')}"`).join(',');
    csv += csvRow + '\n';
  }

  fs.writeFileSync('report_detailed.csv', csv);
  console.log('Detailed Excel-compatible CSV report successfully written to report_detailed.csv!');
} catch (err) {
  console.error('Error generating detailed CSV:', err);
}
