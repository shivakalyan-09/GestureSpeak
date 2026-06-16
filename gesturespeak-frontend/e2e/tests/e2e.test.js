import { By, until } from 'selenium-webdriver';
import LoginPage from '../pages/LoginPage.js';
import RegisterPage from '../pages/RegisterPage.js';
import DashboardPage from '../pages/DashboardPage.js';
import EmergencyPage from '../pages/EmergencyPage.js';
import HistoryPage from '../pages/HistoryPage.js';
import SettingsPage from '../pages/SettingsPage.js';

export default async function runTests(driver, targetUrl) {
  const results = [];
  
  // Page Objects
  const loginPage = new LoginPage(driver);
  const registerPage = new RegisterPage(driver);
  const dashboardPage = new DashboardPage(driver);
  const emergencyPage = new EmergencyPage(driver);
  const historyPage = new HistoryPage(driver);
  const settingsPage = new SettingsPage(driver);

  // Helper to register test result
  async function runTestCase(id, name, preconditions, steps, expected, testFn, severity = 'HIGH') {
    console.log(`Running [${id}] - ${name}...`);
    const testResult = {
      id,
      name,
      preconditions,
      steps: [],
      expected,
      actual: 'Completed successfully',
      status: 'PASS',
      severity: severity
    };

    const addStep = (stepText) => {
      console.log(`  -> Step: ${stepText}`);
      testResult.steps.push(stepText);
    };

    try {
      await testFn(addStep);
    } catch (err) {
      testResult.status = 'FAIL';
      testResult.actual = err.message;
      console.error(`  [FAILED] ${err.message}`);
      
      // Capture screenshot on failure
      const screenshotPath = await loginPage.takeScreenshot(`${id}-failed`);
      if (screenshotPath) {
        testResult.screenshot = screenshotPath;
      }
    }
    
    results.push(testResult);
  }

  // Define and run E2E test cases
  
  // -------------------------------------------------------------
  // SECTION 1: AUTHENTICATION TESTING
  // -------------------------------------------------------------
  
  await runTestCase(
    'AUTH-01',
    'Login with Valid Credentials (Mock Bypass)',
    'User is on the login page.',
    [
      'Navigate to login page',
      'Clear local storage session',
      'Input valid user mock email: "user@mock.com"',
      'Input valid password: "Password123"',
      'Click Log In button',
      'Wait for redirection to dashboard'
    ],
    'User is redirected to the dashboard page, showing welcome banner.',
    async (step) => {
      step('Navigating to target login URL');
      await loginPage.navigateTo(`${targetUrl}/login`);
      
      step('Clearing any existing session storage for isolation');
      await loginPage.clearLocalStorage();
      await loginPage.refreshPage();
      
      step('Entering valid email and password');
      await loginPage.login('user@mock.com', 'Password123');
      
      step('Waiting for redirection to /dashboard');
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/dashboard');
      }, 5000, 'Redirection to /dashboard timed out');
      
      step('Verifying welcome header presence');
      const welcome = await dashboardPage.getWelcomeText();
      if (!welcome.includes('Welcome back, user')) {
        throw new Error(`Expected welcome header containing "Welcome back, user" but got: "${welcome}"`);
      }
    }
  );

  await runTestCase(
    'AUTH-02',
    'Session Persistence after Page Refresh',
    'User is logged into the dashboard.',
    [
      'Refresh the current page',
      'Verify session is retained',
      'Check welcome header is still present'
    ],
    'Authentication session persists after refresh and user remains on dashboard.',
    async (step) => {
      step('Triggering browser page refresh');
      await dashboardPage.refreshPage();
      
      step('Checking if still on /dashboard');
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/dashboard');
      }, 5000, 'Redirection to /dashboard after refresh timed out');
      
      step('Verifying welcome header still displays username');
      const welcome = await dashboardPage.getWelcomeText();
      if (!welcome.includes('user')) {
        throw new Error(`Username welcome missing after refresh: "${welcome}"`);
      }
    }
  );

  await runTestCase(
    'AUTH-03',
    'Logout Functionality',
    'User is logged in and on the dashboard.',
    [
      'Click the Log Out button in the sidebar',
      'Wait for redirection to /login'
    ],
    'Session is cleared from client-side storage, and user is redirected back to login page.',
    async (step) => {
      step('Clicking Logout in the sidebar drawer');
      await dashboardPage.clickLogout();
      
      step('Waiting for redirection to /login');
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/login');
      }, 5000, 'Redirection to /login after logout timed out');
      
      step('Verifying mock session is cleared from localStorage');
      const session = await dashboardPage.getLocalStorageItem('mock_user_session');
      if (session !== null) {
        throw new Error(`Expected mock_user_session to be removed from local storage but found: ${session}`);
      }
    }
  );

  await runTestCase(
    'AUTH-04',
    'Unauthorized Access after Logout',
    'User is logged out.',
    [
      'Attempt to access /dashboard directly',
      'Wait for authentication guard redirection'
    ],
    'Route protection blocks direct access and redirects unauthenticated user back to /login.',
    async (step) => {
      step('Attempting direct navigation to /dashboard');
      await loginPage.navigateTo(`${targetUrl}/dashboard`);
      
      step('Waiting for redirect to /login');
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/login');
      }, 5000, 'Redirect to /login for unauthorized access timed out');
    }
  );

  await runTestCase(
    'AUTH-05',
    'Login Input Fields Empty Validations',
    'User is on the login page.',
    [
      'Navigate to login page',
      'Clear local storage session',
      'Leave email and password fields empty',
      'Click Log In',
      'Verify form fields trigger validation validation'
    ],
    'HTML5 required field constraints prevent form submission and highlight inputs.',
    async (step) => {
      step('Navigating to login URL');
      await loginPage.navigateTo(`${targetUrl}/login`);
      
      step('Clearing session for isolation');
      await loginPage.clearLocalStorage();
      await loginPage.refreshPage();
      
      step('Submitting empty login form');
      await loginPage.clickLogin();
      
      step('Verifying email field is marked invalid / empty check');
      const emailField = await loginPage.find(loginPage.emailInput);
      const isRequired = await emailField.getAttribute('required');
      if (isRequired !== 'true') {
        throw new Error('Email field is missing HTML5 "required" attribute.');
      }
    }
  );

  await runTestCase(
    'AUTH-06',
    'Invalid Email Format Validation',
    'User is on the login page.',
    [
      'Navigate to login page',
      'Clear local storage session',
      'Input invalid email format: "invalidemail"',
      'Verify input type is configured for email validation'
    ],
    'Email input uses HTML5 type="email" which restricts non-compliant format submissions.',
    async (step) => {
      step('Navigating to login URL');
      await loginPage.navigateTo(`${targetUrl}/login`);
      
      step('Clearing session for isolation');
      await loginPage.clearLocalStorage();
      await loginPage.refreshPage();
      
      step('Entering email with invalid format');
      await loginPage.fillEmail('invalidemail');
      
      step('Verifying email field input type is set to email');
      const emailField = await loginPage.find(loginPage.emailInput);
      const validity = await emailField.getAttribute('type');
      if (validity !== 'email') {
        throw new Error('Email field does not use input type="email" for format validations.');
      }
    }
  );

  // -------------------------------------------------------------
  // SECTION 2: NAVIGATION TESTING
  // -------------------------------------------------------------
  
  await runTestCase(
    'NAV-01',
    'Verify Sidebar Navigation Links & Page Titles',
    'User is logged in as a normal user.',
    [
      'Navigate to login page and clear session',
      'Log back in using "user@mock.com"',
      'Click Settings in sidebar and verify header title',
      'Click History Log in sidebar and verify header title',
      'Click Emergency SOS in sidebar and verify header title',
      'Click Learning in sidebar and verify header title',
      'Click Dashboard in sidebar and verify welcome banner'
    ],
    'All sidebar links function correctly and load their respective page components with matching header titles.',
    async (step) => {
      step('Navigating to login page');
      await loginPage.navigateTo(`${targetUrl}/login`);
      
      step('Clearing session for test isolation');
      await loginPage.clearLocalStorage();
      await loginPage.refreshPage();
      
      step('Logging in as standard mock user');
      await loginPage.login('user@mock.com', 'Password123');
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/dashboard'), 5000);
      
      step('Navigating to Settings via sidebar');
      await dashboardPage.clickSidebarSettings();
      await dashboardPage.waitForHeaderTitle('System Preferences');
      
      step('Navigating to History Log via sidebar');
      await dashboardPage.clickSidebarHistoryLog();
      await dashboardPage.waitForHeaderTitle('Prediction Log Archives');
      
      step('Navigating to Emergency SOS via sidebar');
      await dashboardPage.clickSidebarEmergencySOS();
      await dashboardPage.waitForHeaderTitle('SOS Emergency Control');

      step('Navigating to Learning Hub via sidebar');
      await dashboardPage.clickSidebarLearning();
      await dashboardPage.waitForHeaderTitle('Vocabulary Learning Hub');

      step('Navigating back to Dashboard via sidebar');
      await dashboardPage.clickSidebarDashboard();
      await dashboardPage.waitForHeaderTitle('Control Panel');
    }
  );

  await runTestCase(
    'NAV-02',
    'Verify Browser Back & Forward Navigation',
    'User is logged in on the Dashboard.',
    [
      'Navigate to Settings',
      'Click browser Back button',
      'Verify Dashboard page is restored',
      'Click browser Forward button',
      'Verify Settings page is loaded again'
    ],
    'React Router handles history stacks gracefully and coordinates back/forward requests without crashes.',
    async (step) => {
      step('Navigating to Settings page');
      await dashboardPage.clickSidebarSettings();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/settings'), 5000);
      
      step('Triggering browser Back navigation');
      await dashboardPage.goBack();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/dashboard'), 5000);
      
      step('Triggering browser Forward navigation');
      await dashboardPage.goForward();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/settings'), 5000);
    }
  );

  await runTestCase(
    'NAV-03',
    'Verify Role-Based Protected Routes (Admin Restriction)',
    'User is logged in as a normal user ("user@mock.com").',
    [
      'Attempt direct access to admin panel route: "/admin"',
      'Verify redirect bypass'
    ],
    'Role-based routing blocks regular user from accessing /admin and redirects them back to /dashboard.',
    async (step) => {
      step('Checking that Admin Panel link is NOT visible in sidebar for standard user');
      const isVisible = await dashboardPage.isAdminPanelVisible();
      if (isVisible) {
        throw new Error('Admin Panel sidebar link should not be visible to normal users.');
      }
      
      step('Attempting direct route access to /admin');
      await dashboardPage.navigateTo(`${targetUrl}/admin`);
      
      step('Waiting for redirection to /dashboard');
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.includes('/dashboard');
      }, 5000, 'Redirection to /dashboard from admin timed out');
    }
  );

  await runTestCase(
    'NAV-04',
    'Verify Admin Access to Protected Admin Panel',
    'User is logged out.',
    [
      'Navigate to login page and clear session',
      'Log in as admin user: "admin@mock.com"',
      'Verify Admin Panel link in sidebar',
      'Click Admin Panel link and verify loaded page title'
    ],
    'Admin panel is fully unlocked for users with ADMIN roles, displaying analytic grids.',
    async (step) => {
      step('Navigating to login page');
      await loginPage.navigateTo(`${targetUrl}/login`);
      
      step('Clearing session for admin transition');
      await loginPage.clearLocalStorage();
      await loginPage.refreshPage();
      
      step('Logging in as admin mock user');
      await loginPage.login('admin@mock.com', 'AdminPass123');
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/dashboard'), 5000);
      
      step('Checking Admin link presence in sidebar');
      const isVisible = await dashboardPage.isAdminPanelVisible();
      if (!isVisible) {
        throw new Error('Admin Panel link was not loaded in sidebar for role ADMIN.');
      }
      
      step('Clicking Admin Panel link');
      await dashboardPage.clickSidebarAdminPanel();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/admin'), 5000);
      const title = await dashboardPage.getHeaderTitle();
      if (!title.includes('Administrator Analytics')) {
        throw new Error(`Expected Admin page title "Administrator Analytics" but got: "${title}"`);
      }
    }
  );

  // -------------------------------------------------------------
  // SECTION 3: FORM VALIDATION TESTING (Emergency Contacts Circle)
  // -------------------------------------------------------------
  
  await runTestCase(
    'FORM-01',
    'Emergency Contact - Required Field Validation',
    'Admin user is logged in and navigates to SOS Control page.',
    [
      'Navigate to Emergency SOS page',
      'Click Emergency Contacts Tab',
      'Click Add Contact button',
      'Save contact with filled Name/Phone but empty Relationship to trigger custom validation',
      'Check validation warning alert text'
    ],
    'An alert validation warning displays stating "Name, Relationship, and Phone Number are required fields."',
    async (step) => {
      step('Navigating to Emergency page');
      await dashboardPage.clickSidebarEmergencySOS();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/emergency'), 5000);
      
      step('Opening Emergency Contacts tab');
      await emergencyPage.clickContactsTab();
      
      step('Opening Add Contact modal');
      await emergencyPage.clickAddContact();
      
      step('Saving contact with filled Name/Phone but empty Relationship');
      await emergencyPage.fillContactForm('John QA', null, '+919876543210', '');
      
      step('Verifying validation error text');
      const isError = await emergencyPage.isFormErrorAlertDisplayed();
      if (!isError) {
        throw new Error('Form validation alert was not displayed for empty inputs.');
      }
      const msg = await emergencyPage.getFormErrorMessage();
      if (!msg.includes('required fields')) {
        throw new Error(`Expected warning about required fields, but got: "${msg}"`);
      }
    }
  );

  await runTestCase(
    'FORM-02',
    'Emergency Contact - Invalid Phone Pattern & Formatting',
    'Contact form dialog is open.',
    [
      'Enter valid Name and Relationship',
      'Enter invalid phone number format: "12345678"',
      'Click Save Contact',
      'Verify alert validation warning description'
    ],
    'An alert message displays requesting the country code structure starting with + (e.g. +91).',
    async (step) => {
      step('Filling contact form with invalid phone format (missing +)');
      await emergencyPage.fillContactForm('John QA', 'Spouse', '12345678', '');
      
      step('Verifying phone validation error warning');
      const isError = await emergencyPage.isFormErrorAlertDisplayed();
      if (!isError) {
        throw new Error('Phone pattern validation warning alert not visible.');
      }
      const msg = await emergencyPage.getFormErrorMessage();
      if (!msg.includes('must start with')) {
        throw new Error(`Expected message requesting "+" country code, but got: "${msg}"`);
      }
    }
  );

  await runTestCase(
    'FORM-03',
    'Emergency Contact - Limit of 5 Boundary Testing',
    'Emergency Contact tab is open.',
    [
      'Cancel current contact form',
      'Calculate current contacts list size',
      'Attempt to add contacts until boundary of 5 limit is reached',
      'Verify "Add Contact" button is disabled or triggers boundary block'
    ],
    'Contact list limits users to maximum 5 items to prevent duplicate notification payloads.',
    async (step) => {
      step('Dismissing current invalid contact form');
      await emergencyPage.click(emergencyPage.cancelContactButton);
      
      step('Checking current contact numbers');
      const count = await emergencyPage.getContactsCount();
      step(`Current contact count: ${count}`);
      
      // Let's seed contacts if we have less than 5
      // Since we are in mock mode, it will append mock records
      let seedCount = count;
      while (seedCount < 5) {
        step(`Seeding contact #${seedCount + 1}`);
        await emergencyPage.clickAddContact();
        await emergencyPage.fillContactForm(`Contact ${seedCount + 1}`, 'Friend', `+9198765432${seedCount}`, '');
        
        // Wait for dialog paper element to become stale (closed and removed)
        const dialogs = await driver.findElements(By.xpath("//h2[contains(., 'CONTACT')]/ancestor::div[contains(@class, 'MuiDialog-paper')]"));
        if (dialogs.length > 0) {
          await driver.wait(until.stalenessOf(dialogs[0]), 5000).catch(() => {});
        }
        await new Promise(r => setTimeout(r, 400)); // general transition cooldown
        
        seedCount++;
      }
      
      step('Verifying Add Contact button is disabled or throws validation error when adding #6');
      const addBtn = await emergencyPage.find(emergencyPage.addContactButton);
      const isDisabled = await addBtn.getAttribute('disabled');
      if (isDisabled === 'true') {
        step('Add Contact button successfully disabled at boundary threshold.');
      } else {
        // If button not disabled, try saving and check form warning
        await emergencyPage.clickAddContact();
        await emergencyPage.fillContactForm('Limit Contact', 'Sibling', '+919999999999', '');
        const msg = await emergencyPage.getFormErrorMessage();
        if (!msg.includes('limit of 5')) {
          throw new Error(`Expected limit error message when adding 6th contact, but got: "${msg}"`);
        }
        await emergencyPage.click(emergencyPage.cancelContactButton);
      }
    }
  );

  await runTestCase(
    'FORM-04',
    'Emergency Contact - Duplicate Submission Prevention',
    'Emergency Contacts Circle tab is active.',
    [
      'Click Add Contact',
      'Enter duplicate details (name, same mobile number)',
      'Click Save Contact',
      'Verify duplicate alert warning text'
    ],
    'System flags duplicate phone numbers to prevent duplicate notification pipelines.',
    async (step) => {
      // Clear one contact so we are at 4, allowing us to test adding duplicate details
      step('Deleting first contact to free up slot');
      await emergencyPage.clickDeleteFirstContact();
      await driver.switchTo().alert().accept().catch(() => {}); // handle mock confirm
      
      step('Adding duplicate phone number contact');
      await emergencyPage.clickAddContact();
      // Use phone number +91987654324 which already exists (added during boundary test)
      await emergencyPage.fillContactForm('Duplicate Contact', 'Other', '+91987654324', '');
      
      step('Verifying duplicate warning details');
      const msg = await emergencyPage.getFormErrorMessage();
      if (!msg.includes('already exists')) {
        throw new Error(`Expected duplicate contact alert warning, but got: "${msg}"`);
      }
      await emergencyPage.click(emergencyPage.cancelContactButton);
    }
  );

  // -------------------------------------------------------------
  // SECTION 4: UI FUNCTIONAL TESTING
  // -------------------------------------------------------------
  
  await runTestCase(
    'UI-01',
    'Dashboard Loading & Metric Verification',
    'Admin is logged in on Dashboard.',
    [
      'Navigate to Dashboard',
      'Verify Welcome hero component matches current admin user',
      'Check numerical metric stats cards'
    ],
    'Dashboard renders metric stats cards (gestures, vocabulary, active emergency logs) with layout alignments.',
    async (step) => {
      step('Navigating back to control panel dashboard');
      await dashboardPage.clickSidebarDashboard();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/dashboard'), 5000);
      
      step('Checking welcome admin title');
      const welcome = await dashboardPage.getWelcomeText();
      if (!welcome.includes('admin')) {
        throw new Error(`Expected welcome header for admin but got: "${welcome}"`);
      }
      
      step('Verifying presence of metric cards');
      const statsElements = await driver.findElements(By.xpath("//*[text()='GESTURES RECOGNIZED' or text()='EMERGENCY ALERTS ACTIVE']"));
      if (statsElements.length === 0) {
        throw new Error('Numerical stats widgets failed to load on Dashboard.');
      }
    }
  );

  await runTestCase(
    'UI-02',
    'History Log - Search & Filter Verification',
    'User is on the History Log archive page.',
    [
      'Navigate to History Log',
      'Verify log data rows are rendered',
      'Input specific text in search log query bar',
      'Check filtering updates data table count'
    ],
    'Search input triggers matching keyword filter logs and trims down non-matching items.',
    async (step) => {
      step('Navigating to History log page');
      await dashboardPage.clickSidebarHistoryLog();
      await dashboardPage.waitForHeaderTitle('Prediction Log Archives');
      
      step('Checking total logs count');
      await driver.wait(async () => {
        const count = await historyPage.getLogsCount();
        return count > 0;
      }, 5000, "Timed out waiting for history logs to load.");
      
      const startCount = await historyPage.getLogsCount();
      step(`Initial logs count: ${startCount}`);
      
      step('Entering search term "thank_you"');
      await historyPage.searchLog('thank_you');
      
      step('Checking filtered logs count matches expectation');
      const filteredCount = await historyPage.getLogsCount();
      step(`Filtered logs count: ${filteredCount}`);
      if (filteredCount > startCount) {
        throw new Error('Filtered logs count cannot be larger than starting list count.');
      }
      
      step('Clearing search filter');
      await historyPage.searchLog('');
    }
  );

  await runTestCase(
    'UI-03',
    'Appearance Theme Toggle & Layout Responsiveness',
    'User is logged in on settings page.',
    [
      'Navigate to Settings Page',
      'Identify current visual theme class / dataset attributes',
      'Toggle appearance switch to light mode',
      'Check DOM theme data change',
      'Toggle back to dark mode and check persistence'
    ],
    'Toggling theme switches class tokens dynamically and updates local storage `app_theme` state.',
    async (step) => {
      step('Navigating to Settings page');
      await dashboardPage.clickSidebarSettings();
      await driver.wait(async () => (await driver.getCurrentUrl()).includes('/settings'), 5000);
      
      step('Reading HTML dataset app theme attribute');
      const htmlEl = await driver.findElement(By.css('html'));
      let themeAttr = await htmlEl.getAttribute('data-theme');
      step(`Initial theme dataset attribute: ${themeAttr}`);
      
      step('Toggling theme switch to swap themes');
      await settingsPage.toggleTheme();
      
      step('Verifying theme attribute is updated');
      let newThemeAttr = await htmlEl.getAttribute('data-theme');
      step(`New theme dataset attribute: ${newThemeAttr}`);
      if (themeAttr === newThemeAttr) {
        throw new Error(`HTML theme attribute failed to toggle! Value remained: ${newThemeAttr}`);
      }
      
      step('Checking localStorage persistence of new theme');
      const storedTheme = await settingsPage.getLocalStorageItem('app_theme');
      if (storedTheme !== newThemeAttr) {
        throw new Error(`Theme state did not persist in localStorage. Expected "${newThemeAttr}" but found "${storedTheme}"`);
      }
      
      // Restore theme to dark mode
      step('Restoring dark theme layout');
      await settingsPage.toggleTheme();
    }
  );

  // -------------------------------------------------------------
  // SECTION 5: SECURITY-ORIENTED UI TESTING
  // -------------------------------------------------------------
  
  await runTestCase(
    'SEC-01',
    'Sensitive Storage Session Validation',
    'Admin user is logged in.',
    [
      'Inspect localStorage session values',
      'Verify tokens and credentials are encrypted or properly stored in mock parameters'
    ],
    'Local storage uses tokenized session headers instead of clear text passwords.',
    async (step) => {
      step('Retrieving session storage contents');
      const sessionStr = await settingsPage.getLocalStorageItem('mock_user_session');
      if (!sessionStr) {
        throw new Error('Authentication session token is missing from client storage.');
      }
      
      step('Verifying details do not contain clear text passwords');
      const sessionObj = JSON.parse(sessionStr);
      if (sessionObj.user.password) {
        throw new Error('Security Breach: Clear text password exposed in local storage session objects!');
      }
      step('Session storage validated. Contains tokenized header: ' + sessionObj.token);
    }
  );

  await runTestCase(
    'SEC-02',
    'Browser Console Logs Exposure Check',
    'User is executing various workflows on the site.',
    [
      'Retrieve browser console warnings/errors logs',
      'Scan logs for passwords, API keys, or sensitive backend endpoints credentials'
    ],
    'No sensitive client credentials or database connection details are exposed via console logs.',
    async (step) => {
      step('Fetching browser log buffers');
      const logs = await settingsPage.getConsoleLogs();
      step(`Analyzing ${logs.length} browser console lines...`);
      
      logs.forEach(log => {
        const text = log.message.toLowerCase();
        if (text.includes('password') || text.includes('apikey') || text.includes('secret')) {
          throw new Error(`Security Alert: Sensitive data exposed in browser console log: ${log.message}`);
        }
      });
      step('Console logs review completed. No credentials leaks identified.');
    }
  );

  return results;
}
