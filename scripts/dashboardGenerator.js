import fs from 'fs';
import path from 'path';
import { parseExcel } from './excelParser.js';
import { generateReportHtml } from './reportGenerator.js';

async function run() {
  const reportsDir = path.resolve('../reports/excel');
  const outDir = path.resolve('../reports/html');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.xlsx'));
  
  const results = [];
  let perfMetrics = null;

  for (const file of files) {
    const filePath = path.join(reportsDir, file);
    try {
      const parsedData = await parseExcel(filePath);
      const output = generateReportHtml(parsedData, outDir);
      
      let tier = "Unknown";
      if (file.includes('Web')) tier = "🌐 Web Application E2E";
      if (file.includes('Android')) tier = "📱 Android Mobile E2E";
      if (file.includes('Security')) tier = "🛡️ Backend Security Scan";
      if (file.includes('Performance')) {
        tier = "📈 Performance Load Test";
        perfMetrics = parsedData.metrics;
      }
      
      results.push({
        tier,
        stats: parsedData.stats,
        reportUrl: output.htmlFile,
        isSecurity: file.includes('Security'),
        isPerf: file.includes('Performance')
      });
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  // Generate index.html dashboard
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GestureSpeak AI - Dashboard</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 40px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #161b22; border-radius: 8px; overflow: hidden; }
    th, td { padding: 15px; text-align: left; border-bottom: 1px solid #30363d; }
    th { background: #21262d; color: #8b949e; text-transform: uppercase; font-size: 13px; }
    tr:hover { background-color: #21262d; }
    a { color: #58a6ff; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
    .status-pass { color: #3fb950; font-weight: bold; }
    .status-fail { color: #ff7b72; font-weight: bold; }
    .status-secure { color: #3fb950; font-weight: bold; }
    .status-optimal { color: #3fb950; font-weight: bold; }
    .status-warning { color: #d29922; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Unified Summary & Report Deployment</h1>
    <p><strong>Live Environment:</strong> <a href="https://shivakalyan-09.github.io/GestureSpeak/">Open GestureSpeak AI</a></p>
    
    <h2>📊 Executive Testing Status Board</h2>
    <table>
      <thead>
        <tr>
          <th>Testing Tier</th>
          <th>Total Test Cases</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Skipped</th>
          <th>Pass Rate / Score</th>
          <th>Status</th>
          <th>Report URL</th>
        </tr>
      </thead>
      <tbody>
        ${results.map(r => {
          let statusClass = r.stats.status === "PASS" ? "status-pass" : (r.stats.status === "FAIL" ? "status-fail" : (r.stats.status === "SECURE" ? "status-secure" : (r.stats.status === "OPTIMAL" ? "status-optimal" : "status-warning")));
          let statusDisplay = "✅ " + r.stats.status;
          if (r.stats.status === "FAIL") statusDisplay = "❌ FAIL";
          if (r.stats.status === "WARNING") statusDisplay = "⚠️ WARNING";
          
          let totalStr = r.stats.total;
          let passStr = r.stats.passed;
          let failStr = r.stats.failed;
          let skipStr = r.stats.skipped;
          
          if (r.isSecurity) {
            totalStr += " (Rules)";
            passStr = "-"; failStr = "-"; skipStr = "-";
          }
          if (r.isPerf) {
            totalStr += " (Reqs)";
            passStr = "-"; failStr = "-"; skipStr = "-";
          }

          return `
            <tr>
              <td>${r.tier}</td>
              <td>${totalStr}</td>
              <td>${passStr}</td>
              <td>${failStr}</td>
              <td>${skipStr}</td>
              <td>${r.stats.passRate} ${r.isPerf ? 'Success' : ''}</td>
              <td class="${statusClass}">${statusDisplay}</td>
              <td><a href="${r.reportUrl}">View HTML Report</a></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    ${perfMetrics ? `
    <h2>📈 Performance Load Metrics</h2>
    <ul>
      <li><strong>Requests Per Second (RPS):</strong> ${perfMetrics.requestsPerSecond}</li>
      <li><strong>Average Response Time:</strong> ${perfMetrics.averageResponseTime}</li>
      <li><strong>Status rates:</strong> ${perfMetrics.successRate} successful, ${perfMetrics.errorRate} errors</li>
    </ul>
    ` : ''}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);

  // Generate GitHub Step Summary (Markdown + HTML)
  let mdSummary = `<h1>🚀 Unified Summary & Report Deployment summary</h1>

## 🌍 Live Environment
* **Web Application:** <a href="https://shivakalyan-09.github.io/GestureSpeak/" target="_blank">Click Here to Open GestureSpeak AI</a>

## 📊 Executive Testing Status Board
<table>
  <thead>
    <tr>
      <th>Testing Tier</th>
      <th>Total Test Cases</th>
      <th>Passed</th>
      <th>Failed</th>
      <th>Skipped</th>
      <th>Pass Rate / Score</th>
      <th>Status</th>
      <th>Report URL</th>
    </tr>
  </thead>
  <tbody>
    ${results.map(r => {
      let statusDisplay = "✅ " + r.stats.status;
      if (r.stats.status === "FAIL") statusDisplay = "❌ FAIL";
      if (r.stats.status === "WARNING") statusDisplay = "⚠️ WARNING";
      
      let totalStr = r.stats.total;
      let passStr = r.stats.passed;
      let failStr = r.stats.failed;
      let skipStr = r.stats.skipped;
      
      if (r.isSecurity) {
        totalStr += " (Rules)"; passStr = "-"; failStr = "-"; skipStr = "-";
      }
      if (r.isPerf) {
        totalStr += " (Reqs)"; passStr = "-"; failStr = "-"; skipStr = "-";
      }

      return `<tr>
        <td><strong>${r.tier}</strong></td>
        <td>${totalStr}</td>
        <td>${passStr}</td>
        <td>${failStr}</td>
        <td>${skipStr}</td>
        <td>${r.stats.passRate}</td>
        <td>${statusDisplay}</td>
        <td><a href="https://shivakalyan-09.github.io/GestureSpeak/${r.reportUrl}">View HTML Report</a></td>
      </tr>`;
    }).join('')}
  </tbody>
</table>\n`;

  if (perfMetrics) {
    mdSummary += `
## 📈 Performance Load Metrics
<ul>
  <li><strong>Requests Per Second (RPS):</strong> ${perfMetrics.requestsPerSecond}</li>
  <li><strong>Average Response Time:</strong> ${perfMetrics.averageResponseTime}</li>
  <li><strong>Maximum Response Time:</strong> ${perfMetrics.maximumResponseTime}</li>
  <li><strong>Minimum Response Time:</strong> ${perfMetrics.minimumResponseTime}</li>
  <li><strong>Status rates:</strong> ${perfMetrics.successRate} successful, ${perfMetrics.errorRate} errors</li>
</ul>\n`;
  }

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, mdSummary);
  } else {
    fs.writeFileSync(path.join(outDir, 'step-summary.md'), mdSummary);
  }
}

run();
