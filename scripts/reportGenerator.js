import fs from 'fs';
import path from 'path';

export function generateReportHtml(parsedData, outDir) {
  const { stats, metrics, testCases, filename } = parsedData;
  const baseName = path.parse(filename).name;
  
  // Mapping e.g. Web_Test_Report -> web-report
  let reportName = baseName.toLowerCase().replace(/_test_report|_report|_e2e_test_cases/g, '') + "-report.html";
  if (filename.includes("Web")) reportName = "web-report.html";
  if (filename.includes("Android")) reportName = "android-report.html";
  if (filename.includes("Security")) reportName = "security-report.html";
  if (filename.includes("Performance")) reportName = "performance-report.html";

  let metricsHtml = "";
  if (Object.keys(metrics).length > 0) {
    metricsHtml = `
      <h2>Performance Metrics</h2>
      <ul>
        <li><strong>Requests Per Second:</strong> ${metrics.requestsPerSecond}</li>
        <li><strong>Average Response Time:</strong> ${metrics.averageResponseTime}</li>
        <li><strong>Maximum Response Time:</strong> ${metrics.maximumResponseTime}</li>
        <li><strong>Minimum Response Time:</strong> ${metrics.minimumResponseTime}</li>
        <li><strong>Success Rate:</strong> ${metrics.successRate}</li>
        <li><strong>Error Rate:</strong> ${metrics.errorRate}</li>
      </ul>
    `;
  }

  const passRateNum = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : "0.0";
  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  let testTableRows = (testCases || []).map((tc, index) => {
    let statusBadge = tc.outcome === 'PASS' 
      ? '<span style="background: rgba(52, 211, 153, 0.2); color: #34d399; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">✅ PASS</span>' 
      : (tc.outcome === 'FAIL' 
        ? '<span style="background: rgba(248, 113, 113, 0.2); color: #f87171; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">❌ FAIL</span>' 
        : '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">⚠️ ' + tc.outcome + '</span>');
    
    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 16px; color: #94a3b8; font-size: 14px;">${index + 1}</td>
        <td style="padding: 16px; color: #f8fafc; font-size: 14px;">${tc.name}</td>
        <td style="padding: 16px;">${statusBadge}</td>
        <td style="padding: 16px; color: #cbd5e1; font-size: 14px;">${tc.duration ? tc.duration + 's' : '-'}</td>
        <td style="padding: 16px; color: #ef4444; font-size: 14px;">-</td>
        <td style="padding: 16px; color: #94a3b8; font-size: 14px;">-</td>
      </tr>
    `;
  }).join('');

  if (testTableRows === '') {
    testTableRows = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">No test cases recorded.</td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GestureSpeak - ${baseName.replace(/_/g, ' ')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Gradient Banner */
    .banner { background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6); border-radius: 16px; padding: 40px 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); margin-bottom: 30px; }
    .banner h1 { margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; display: flex; align-items: center; justify-content: center; gap: 12px; }
    .banner-meta { margin-top: 12px; font-size: 14px; color: rgba(255, 255, 255, 0.8); font-weight: 500; }
    .banner-link { display: inline-block; margin-top: 16px; padding: 8px 16px; background: rgba(0,0,0,0.2); border-radius: 20px; color: #fff; text-decoration: none; font-size: 13px; font-weight: 500; backdrop-filter: blur(4px); }
    .banner-link:hover { background: rgba(0,0,0,0.3); }
    
    /* Stat Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #1e293b; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255,255,255,0.05); }
    .stat-num { font-size: 42px; font-weight: 800; line-height: 1; margin-bottom: 8px; }
    .stat-label { font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    
    /* Colors */
    .c-total { color: #818cf8; }
    .c-pass { color: #34d399; }
    .c-fail { color: #f87171; }
    .c-rate { color: #38bdf8; }
    
    /* Table */
    .table-container { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); }
    
    .back-link { display: block; margin-top: 40px; text-align: center; color: #94a3b8; text-decoration: none; font-size: 14px; }
    .back-link:hover { color: #f8fafc; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="banner">
      <h1>🌐 GestureSpeak – ${baseName.replace(/_/g, ' ')} Report</h1>
      <div class="banner-meta">Build #latest • ${dateStr} • Branch: main</div>
      <a href="https://shivakalyan-09.github.io/GestureSpeak/" class="banner-link">🔗 https://shivakalyan-09.github.io/GestureSpeak/</a>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num c-total">${stats.total}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-num c-pass">${stats.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-num c-fail">${stats.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-num c-rate">${passRateNum}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>
    
    ${Object.keys(metrics).length > 0 ? `
    <div style="background: #1e293b; padding: 24px; border-radius: 12px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05);">
      <h2 style="margin-top:0; font-size: 18px; color: #f8fafc;">Performance Metrics</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; color: #cbd5e1; font-size: 14px;">
        <div><strong>RPS:</strong> ${metrics.requestsPerSecond}</div>
        <div><strong>Avg Response:</strong> ${metrics.averageResponseTime}</div>
        <div><strong>Max Response:</strong> ${metrics.maximumResponseTime}</div>
        <div><strong>Min Response:</strong> ${metrics.minimumResponseTime}</div>
        <div><strong>Success Rate:</strong> <span style="color:#34d399">${metrics.successRate}</span></div>
        <div><strong>Error Rate:</strong> <span style="color:#f87171">${metrics.errorRate}</span></div>
      </div>
    </div>` : ''}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Test Case</th>
            <th style="width: 100px;">Status</th>
            <th style="width: 100px;">Duration</th>
            <th style="width: 100px;">Error</th>
            <th style="width: 120px;">Screenshot</th>
          </tr>
        </thead>
        <tbody>
          ${testTableRows}
        </tbody>
      </table>
    </div>

    <a href="index.html" class="back-link">← Back to Dashboard</a>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, reportName), html);
  return { htmlFile: reportName, parsedData };
}
