import BasePage from './BasePage.js';
import { By } from 'selenium-webdriver';

export default class DashboardPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.welcomeHeader = By.xpath("//h4[contains(text(), 'Welcome')]");
    
    // Quick access card items
    this.signToTextCard = By.xpath("//h6[text()='Sign to Text']/ancestor::div[contains(@class, 'MuiCard-root')]");
    this.textToSpeechCard = By.xpath("//h6[text()='Text to Speech']/ancestor::div[contains(@class, 'MuiCard-root')]");
    this.liveTranslateCard = By.xpath("//h6[text()='Live Translate']/ancestor::div[contains(@class, 'MuiCard-root')]");
    this.signLearningCard = By.xpath("//h6[text()='Sign Learning']/ancestor::div[contains(@class, 'MuiCard-root')]");
    
    // Sidebar items located via SVG data-testid but returning their MuiListItemButton parent containers (which support .click())
    this.sidebarDashboard = By.xpath("//*[@data-testid='DashboardIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarSignToText = By.xpath("//*[@data-testid='CameraAltIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarTextToSpeech = By.xpath("//*[@data-testid='RecordVoiceOverIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarLiveTranslate = By.xpath("//*[@data-testid='TranslateIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarLearning = By.xpath("//*[@data-testid='SchoolIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarEmergencySOS = By.xpath("//*[@data-testid='SmsFailedIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarHistoryLog = By.xpath("//*[@data-testid='HistoryIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarSettings = By.xpath("//*[@data-testid='SettingsIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarAdminPanel = By.xpath("//*[@data-testid='SupervisorAccountIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.sidebarLogout = By.xpath("//*[@data-testid='ExitToAppIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    this.themeToggle = By.xpath("//*[@data-testid='LightModeIcon' or @data-testid='DarkModeIcon']/ancestor::*[contains(@class, 'MuiListItemButton-root')]");
    
    // Top Bar items
    this.headerTitle = By.xpath("//header//div[contains(@class, 'MuiToolbar-root')]//div[contains(@class, 'MuiTypography-root') or contains(@class, 'Typography')]");
    this.topBarSosTrigger = By.xpath("//button[contains(., 'SOS TRIGGER')]");
    this.sidebarToggle = By.xpath("//button[@aria-label='open drawer']");
  }

  async getWelcomeText() {
    return await this.getText(this.welcomeHeader);
  }

  async clickSignToTextCard() {
    await this.click(this.signToTextCard);
  }

  async clickTextToSpeechCard() {
    await this.click(this.textToSpeechCard);
  }

  async clickLiveTranslateCard() {
    await this.click(this.liveTranslateCard);
  }

  async clickSignLearningCard() {
    await this.click(this.signLearningCard);
  }

  async clickSidebarItem(locator, targetSegment) {
    await new Promise(r => setTimeout(r, 450));
    await this.click(locator);
    try {
      await this.driver.wait(async () => {
        const url = await this.driver.getCurrentUrl();
        return url.includes(targetSegment);
      }, 3000);
    } catch (e) {
      console.log(`[Self-Healing] Click on sidebar item ${JSON.stringify(locator)} failed to navigate to ${targetSegment}. Retrying click...`);
      await this.click(locator);
      await this.driver.wait(async () => {
        const url = await this.driver.getCurrentUrl();
        return url.includes(targetSegment);
      }, 5000);
    }
  }

  async clickSidebarDashboard() {
    await this.clickSidebarItem(this.sidebarDashboard, '/dashboard');
  }

  async clickSidebarSignToText() {
    await this.clickSidebarItem(this.sidebarSignToText, '/sign-detection');
  }

  async clickSidebarTextToSpeech() {
    await this.clickSidebarItem(this.sidebarTextToSpeech, '/text-to-speech');
  }

  async clickSidebarLiveTranslate() {
    await this.clickSidebarItem(this.sidebarLiveTranslate, '/live-translate');
  }

  async clickSidebarLearning() {
    await this.clickSidebarItem(this.sidebarLearning, '/learning');
  }

  async clickSidebarEmergencySOS() {
    await this.clickSidebarItem(this.sidebarEmergencySOS, '/emergency');
  }

  async clickSidebarHistoryLog() {
    await this.clickSidebarItem(this.sidebarHistoryLog, '/history');
  }

  async clickSidebarSettings() {
    await this.clickSidebarItem(this.sidebarSettings, '/settings');
  }

  async clickSidebarAdminPanel() {
    await this.clickSidebarItem(this.sidebarAdminPanel, '/admin');
  }

  async clickLogout() {
    await this.clickSidebarItem(this.sidebarLogout, '/login');
  }

  async clickThemeToggle() {
    await this.click(this.themeToggle);
  }

  async clickTopBarSosTrigger() {
    await this.click(this.topBarSosTrigger);
  }

  async clickSidebarToggle() {
    await this.click(this.sidebarToggle);
  }

  async getHeaderTitle() {
    // Locate title container which has component="div" and variant="h5" compiled as div
    const elements = await this.driver.findElements(By.xpath("//header//*[contains(@class, 'MuiTypography-h5') or contains(@class, 'MuiTypography-root')]"));
    if (elements.length > 0) {
      return await elements[0].getText();
    }
    return "";
  }

  async waitForHeaderTitle(expectedText, timeout = 5000) {
    await this.driver.wait(async () => {
      const title = await this.getHeaderTitle();
      return title.includes(expectedText);
    }, timeout, `Header title did not update to contain "${expectedText}"`);
    return await this.getHeaderTitle();
  }

  async isAdminPanelVisible() {
    return await this.isDisplayed(this.sidebarAdminPanel, 2000);
  }
}
