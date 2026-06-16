import BasePage from './BasePage.js';
import { By } from 'selenium-webdriver';

export default class SettingsPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.usernameInput = By.xpath("//label[contains(text(), 'Username')]/parent::div//input");
    this.emailInput = By.xpath("//label[contains(text(), 'Email')]/parent::div//input");
    this.saveProfileButton = By.xpath("//button[contains(., 'Save Profile')]");
    
    // Mui Switch selectors
    this.themeSwitch = By.css('input.MuiSwitch-input');
    this.themeSwitchLabel = By.css('.MuiSwitch-root');
    
    this.serverAddressInput = By.xpath("//label[contains(text(), 'Server Address') or contains(text(), 'Spring Boot')]/parent::div//input");
    this.rebindServerButton = By.xpath("//button[contains(., 'Rebind Server Node')]");
    
    this.successAlert = By.css('.MuiAlert-root.MuiAlert-colorSuccess');
  }

  async updateUsername(newUsername) {
    await this.write(this.usernameInput, newUsername);
    await this.click(this.saveProfileButton);
  }

  async getRegisteredEmail() {
    const el = await this.find(this.emailInput);
    return await el.getAttribute('value');
  }

  async isEmailInputDisabled() {
    const el = await this.find(this.emailInput);
    return (await el.getAttribute('disabled')) !== null;
  }

  async toggleTheme() {
    await this.click(this.themeSwitchLabel);
  }

  async isDarkModeEnabled() {
    const checkbox = await this.find(this.themeSwitch);
    return await checkbox.isSelected();
  }

  async updateServerAddress(address) {
    await this.write(this.serverAddressInput, address);
    await this.click(this.rebindServerButton);
  }

  async getServerAddress() {
    const el = await this.find(this.serverAddressInput);
    return await el.getAttribute('value');
  }

  async getSuccessMessage() {
    return await this.getText(this.successAlert);
  }

  async isSuccessAlertDisplayed() {
    return await this.isDisplayed(this.successAlert, 2000);
  }
}
