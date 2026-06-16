import BasePage from './BasePage.js';
import { By } from 'selenium-webdriver';

export default class RegisterPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.usernameInput = By.css('input#username');
    this.emailInput = By.css('input#email');
    this.passwordInput = By.css('input#password');
    this.confirmPasswordInput = By.css('input#confirmPassword');
    this.registerButton = By.css('button.premium-btn, button[type="submit"]');
    this.errorAlert = By.css('.MuiAlert-root.MuiAlert-colorError');
    this.loginLink = By.css('a[href="/login"]');
  }

  async register(username, email, password, confirmPassword) {
    if (username !== null) await this.write(this.usernameInput, username);
    if (email !== null) await this.write(this.emailInput, email);
    if (password !== null) await this.write(this.passwordInput, password);
    if (confirmPassword !== null) await this.write(this.confirmPasswordInput, confirmPassword);
    await this.click(this.registerButton);
  }

  async getErrorMessage() {
    return await this.getText(this.errorAlert);
  }

  async isErrorAlertDisplayed() {
    return await this.isDisplayed(this.errorAlert, 2000);
  }

  async navigateToLogin() {
    await this.click(this.loginLink);
  }
}
