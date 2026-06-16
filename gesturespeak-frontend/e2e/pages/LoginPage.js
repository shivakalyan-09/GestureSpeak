import BasePage from './BasePage.js';
import { By } from 'selenium-webdriver';

export default class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.emailInput = By.css('input#email');
    this.passwordInput = By.css('input#password');
    this.loginButton = By.css('button.premium-btn, button[type="submit"]');
    this.errorAlert = By.css('.MuiAlert-root.MuiAlert-colorError');
    this.registerLink = By.css('a[href="/register"]');
    this.forgotPasswordLink = By.css('a[href="/forgot-password"]');
  }

  async login(email, password) {
    if (email !== null) {
      await this.write(this.emailInput, email);
    } else {
      // Clear field
      const el = await this.find(this.emailInput);
      await el.sendKeys(import.meta.env ? '' : ''); // we'll use base page writing
    }
    if (password !== null) {
      await this.write(this.passwordInput, password);
    }
    await this.click(this.loginButton);
  }

  async fillEmail(email) {
    await this.write(this.emailInput, email);
  }

  async fillPassword(password) {
    await this.write(this.passwordInput, password);
  }

  async clickLogin() {
    await this.click(this.loginButton);
  }

  async getErrorMessage() {
    return await this.getText(this.errorAlert);
  }

  async isErrorAlertDisplayed() {
    return await this.isDisplayed(this.errorAlert, 2000);
  }

  async navigateToRegister() {
    await this.click(this.registerLink);
  }

  async navigateToForgotPassword() {
    await this.click(this.forgotPasswordLink);
  }
}
