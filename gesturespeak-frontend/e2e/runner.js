import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import firefox from 'selenium-webdriver/firefox.js';
import edge from 'selenium-webdriver/edge.js';
import fs from 'fs';
import path from 'path';
import runTests from './tests/e2e.test.js';

// Parse command line arguments
const args = process.argv.slice(2);
let browserName = 'chrome'; // default
for (const arg of args) {
  if (arg.startsWith('--browser=')) {
    browserName = arg.split('=')[1].toLowerCase();
  }
}

const targetUrl = 'http://localhost:5173'; // Vite default local URL

async function createDriver(browser) {
  let builder = new Builder().forBrowser(browser);
  
  const isCI = process.env.CI === 'true';

  if (browser === 'chrome') {
    const options = new chrome.Options();
    if (isCI) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
    }
    builder.setChromeOptions(options);
  } else if (browser === 'firefox') {
    const options = new firefox.Options();
    if (isCI) {
      options.addArguments('--headless');
    }
    builder.setFirefoxOptions(options);
  } else if (browser === 'edge') {
    const options = new edge.Options();
    if (isCI) {
      options.addArguments('--headless');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
    }
    builder.setEdgeOptions(options);
  }

  return await builder.build();
}

function generateHtmlReport(results, browser, duration) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  const timestamp = new Date().toLocaleString();

  // CSS and components for report
  let rowsHtml = '';
  results.forEach((test, idx) => {
    const statusClass = test.status === 'PASS' ? 'badge-pass' : 'badge-fail';
    const severityBadge = test.status === 'FAIL' 
      ? `<span class="badge badge-error" style="margin-left: 8px;">${test.severity || 'HIGH'}</span>` 
      : '';
    
    let stepsList = test.steps.map(s => `<li>${s}</li>`).join('');
    let screenshotSection = '';
    
    if (test.status === 'FAIL' && test.screenshot) {
      // relative path to report.html
      const relPath = path.relative(process.cwd(), test.screenshot).replace(/\\/g, '/');
      screenshotSection = `
        <div class="screenshot-container">
          <p><strong>Failure Screenshot:</strong></p>
          <img class="screenshot-img" src="${relPath}" alt="Failure Screenshot" onclick="openModal('${relPath}')" />
        </div>
      `;
    }

    rowsHtml += `
      <tr class="test-row" id="test-${test.id}">
        <td>
          <div class="test-meta">
            <span class="test-id">${test.id}</span>
            <span class="badge ${statusClass}">${test.status}</span>
            ${severityBadge}
          </div>
          <h3 class="test-name">${test.name}</h3>
          <div class="test-details">
            <p><strong>Preconditions:</strong> ${test.preconditions || 'None'}</p>
            <p><strong>Expected:</strong> ${test.expected}</p>
            <p><strong>Actual:</strong> <span class="${test.status === 'FAIL' ? 'text-fail' : 'text-pass'}">${test.actual}</span></p>
            <div class="steps-box">
              <strong>Steps Executed:</strong>
              <ol>${stepsList}</ol>
            </div>
            ${screenshotSection}
          </div>
        </td>
      </tr>
    `;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GestureSpeak E2E Selenium Test Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Outfit:wght@600;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-app: #030712;
      --bg-card: rgba(15, 23, 42, 0.6);
      --border-glass: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-sub: #94a3b8;
      --primary: #4facfe;
      --secondary: #ec38bc;
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-app);
      color: var(--text-main);
      min-height: 100vh;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 2.5rem;
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #ec38bc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
      letter-spacing: -1px;
    }
    
    .subtitle {
      color: var(--text-sub);
      font-size: 1.1rem;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }
    
    .card-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-sub);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .card-value {
      font-family: 'Outfit', sans-serif;
      font-size: 2.2rem;
      font-weight: 900;
    }
    
    .color-primary { color: var(--primary); }
    .color-success { color: var(--success); }
    .color-error { color: var(--error); }
    .color-warning { color: var(--warning); }
    
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      padding: 16px 24px;
      border-radius: 16px;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .filter-buttons {
      display: flex;
      gap: 8px;
    }
    
    button.filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-glass);
      color: var(--text-sub);
      padding: 8px 16px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    button.filter-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
    }
    
    button.filter-btn.active {
      background: var(--primary);
      color: #030712;
      border-color: var(--primary);
    }
    
    .search-box input {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-glass);
      color: var(--text-main);
      padding: 10px 16px;
      border-radius: 12px;
      width: 280px;
      font-size: 0.95rem;
      outline: none;
    }
    
    .search-box input:focus {
      border-color: var(--primary);
    }
    
    .report-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .test-row {
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      border-radius: 20px;
      margin-bottom: 16px;
      display: block;
      padding: 24px;
      box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.2);
    }
    
    .test-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .test-id {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      color: var(--primary);
      font-size: 1.1rem;
    }
    
    .badge {
      font-size: 0.75rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
    }
    
    .badge-pass {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .badge-fail {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .badge-error {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .test-name {
      font-family: 'Outfit', sans-serif;
      font-size: 1.35rem;
      font-weight: 900;
      color: var(--text-main);
      margin-bottom: 16px;
    }
    
    .test-details {
      color: var(--text-sub);
      font-size: 0.95rem;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .steps-box {
      margin-top: 10px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-glass);
      border-radius: 12px;
      padding: 16px;
    }
    
    .steps-box ol {
      margin-left: 20px;
      margin-top: 8px;
    }
    
    .steps-box li {
      margin-bottom: 6px;
      line-height: 1.4;
    }
    
    .text-pass { color: var(--success); font-weight: bold; }
    .text-fail { color: var(--error); font-weight: bold; }
    
    .screenshot-container {
      margin-top: 15px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-glass);
      border-radius: 12px;
      padding: 12px;
    }
    
    .screenshot-img {
      max-width: 100%;
      height: auto;
      max-height: 220px;
      border-radius: 8px;
      margin-top: 8px;
      cursor: zoom-in;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: opacity 0.2s;
    }
    
    .screenshot-img:hover {
      opacity: 0.8;
    }
    
    /* Screenshot Modal */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      padding-top: 50px;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(3, 7, 18, 0.95);
    }
    
    .modal-content {
      margin: auto;
      display: block;
      max-width: 90%;
      max-height: 80vh;
      border-radius: 12px;
      border: 2px solid var(--border-glass);
      box-shadow: 0 0 50px rgba(0,0,0,0.8);
    }
    
    .close-modal {
      position: absolute;
      top: 20px;
      right: 35px;
      color: var(--text-main);
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .close-modal:hover {
      color: var(--primary);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>GestureSpeak E2E Automation</h1>
      <p class="subtitle">Selenium WebDriver Test Execution Report</p>
    </header>
    
    <div class="summary-grid">
      <div class="card">
        <div class="card-title">Browser</div>
        <div class="card-value color-primary" style="text-transform: capitalize;">${browser}</div>
      </div>
      <div class="card">
        <div class="card-title">Pass Rate</div>
        <div class="card-value color-success">${passRate}%</div>
      </div>
      <div class="card">
        <div class="card-title">Passed / Total</div>
        <div class="card-value color-success">${passed} / ${total}</div>
      </div>
      <div class="card">
        <div class="card-title">Failed</div>
        <div class="card-value color-error">${failed}</div>
      </div>
      <div class="card">
        <div class="card-title">Duration</div>
        <div class="card-value color-warning">${(duration / 1000).toFixed(1)}s</div>
      </div>
    </div>
    
    <div class="filter-bar">
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="filterTests('all')">All Tests</button>
        <button class="filter-btn" onclick="filterTests('pass')">Passed</button>
        <button class="filter-btn" onclick="filterTests('fail')">Failed</button>
      </div>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search test cases..." onkeyup="searchTests()">
      </div>
    </div>
    
    <table class="report-table">
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  
  <div id="screenshotModal" class="modal">
    <span class="close-modal" onclick="closeModal()">&times;</span>
    <img class="modal-content" id="modalImg">
  </div>
  
  <script>
    function filterTests(status) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      const rows = document.querySelectorAll('.test-row');
      rows.forEach(row => {
        const badge = row.querySelector('.badge');
        const isPass = badge.classList.contains('badge-pass');
        
        if (status === 'all') {
          row.style.display = 'block';
        } else if (status === 'pass') {
          row.style.display = isPass ? 'block' : 'none';
        } else if (status === 'fail') {
          row.style.display = !isPass ? 'block' : 'none';
        }
      });
    }
    
    function searchTests() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const rows = document.querySelectorAll('.test-row');
      rows.forEach(row => {
        const id = row.querySelector('.test-id').innerText.toLowerCase();
        const name = row.querySelector('.test-name').innerText.toLowerCase();
        const details = row.querySelector('.test-details').innerText.toLowerCase();
        
        if (id.includes(query) || name.includes(query) || details.includes(query)) {
          row.style.display = 'block';
        } else {
          row.style.display = 'none';
        }
      });
    }
    
    function openModal(src) {
      const modal = document.getElementById('screenshotModal');
      const modalImg = document.getElementById('modalImg');
      modal.style.display = "block";
      modalImg.src = src;
    }
    
    function closeModal() {
      document.getElementById('screenshotModal').style.display = "none";
    }
    
    window.onclick = function(event) {
      const modal = document.getElementById('screenshotModal');
      if (event.target === modal) {
        modal.style.display = "none";
      }
    }
  </script>
</body>
</html>`;

  fs.writeFileSync('report.html', html);
  console.log(`HTML report generated: ${path.resolve('report.html')}`);
}

function generateCsvReport(results) {
  let csvContent = '"Test Case ID","Test Case Name","Status"\n';
  results.forEach(test => {
    const escapedName = test.name.replace(/"/g, '""');
    csvContent += `"${test.id}","${escapedName}","${test.status}"\n`;
  });
  fs.writeFileSync('report.csv', csvContent);
  console.log(`CSV report generated: ${path.resolve('report.csv')}`);
}

async function start() {
  console.log(`Initializing Selenium WebDriver for browser: ${browserName}...`);
  let driver;
  try {
    driver = await createDriver(browserName);
    const startTime = Date.now();
    
    // Execute the test suites passing the driver and target base url
    const results = await runTests(driver, targetUrl);
    
    const duration = Date.now() - startTime;
    console.log(`\nTest suite execution completed in ${(duration/1000).toFixed(1)}s.`);
    
    // Generate HTML report
    generateHtmlReport(results, browserName, duration);
    
    // Generate CSV report (Excel compatible)
    generateCsvReport(results);
    
    // Save results to report.json as well
    fs.writeFileSync('report.json', JSON.stringify({
      browser: browserName,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      results: results
    }, null, 2));
    
  } catch (err) {
    console.error("Critical error in automation suite runner:", err);
  } finally {
    if (driver) {
      console.log("Shutting down Selenium WebDriver session...");
      await driver.quit();
    }
  }
}

start();
