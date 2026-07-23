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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${baseName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #161b22; padding: 30px; border-radius: 8px; border: 1px solid #30363d; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
    .stat-box { display: flex; justify-content: space-between; background: #21262d; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .stat { text-align: center; }
    .stat-val { font-size: 24px; font-weight: bold; color: #7ee787; }
    .stat-label { font-size: 12px; color: #8b949e; text-transform: uppercase; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { list-style: none; padding: 0; }
    li { background: #21262d; margin-bottom: 10px; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📄 ${baseName.replace(/_/g, ' ')}</h1>
    
    <div class="stat-box">
      <div class="stat"><div class="stat-val">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat"><div class="stat-val">${stats.passed}</div><div class="stat-label">Passed</div></div>
      <div class="stat"><div class="stat-val" style="color:#ff7b72;">${stats.failed}</div><div class="stat-label">Failed</div></div>
      <div class="stat"><div class="stat-val">${stats.skipped}</div><div class="stat-label">Skipped</div></div>
      <div class="stat"><div class="stat-val" style="color:#a5d6ff;">${stats.passRate}</div><div class="stat-label">Pass Rate</div></div>
    </div>

    ${metricsHtml}
    
    <h2>Test Cases</h2>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: #21262d; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr>
          <th style="padding: 15px; text-align: left; border-bottom: 1px solid #30363d; color: #8b949e; text-transform: uppercase; font-size: 13px;">Test Name</th>
          <th style="padding: 15px; text-align: left; border-bottom: 1px solid #30363d; color: #8b949e; text-transform: uppercase; font-size: 13px;">Outcome</th>
          ${testCases && testCases.length > 0 && testCases[0].duration ? '<th style="padding: 15px; text-align: left; border-bottom: 1px solid #30363d; color: #8b949e; text-transform: uppercase; font-size: 13px;">Duration</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${(testCases || []).map(tc => {
          let color = tc.outcome === 'PASS' ? '#3fb950' : (tc.outcome === 'FAIL' ? '#ff7b72' : '#d29922');
          return `
            <tr>
              <td style="padding: 15px; border-bottom: 1px solid #30363d;">${tc.name}</td>
              <td style="padding: 15px; border-bottom: 1px solid #30363d; color: ${color}; font-weight: bold;">${tc.outcome}</td>
              ${tc.duration ? `<td style="padding: 15px; border-bottom: 1px solid #30363d;">${tc.duration}s</td>` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="index.html">← Back to Dashboard</a>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, reportName), html);
  return { htmlFile: reportName, parsedData };
}
