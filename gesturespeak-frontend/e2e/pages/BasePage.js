import { By, until, Key } from 'selenium-webdriver';
import fs from 'fs';
import path from 'path';

export default class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.defaultTimeout = 10000; // 10 seconds default wait
  }

  async navigateTo(url) {
    try {
      await this.driver.get(url);
      await this.driver.manage().window().maximize().catch(() => {});
    } catch (e) {
      console.warn("Failed to maximize window, proceeding:", e.message);
    }
  }

  async find(locator, timeout = this.defaultTimeout) {
    try {
      const by = typeof locator === 'string' ? By.css(locator) : locator;
      // Wait for presence in DOM
      await this.driver.wait(until.elementLocated(by), timeout);
      const element = await this.driver.findElement(by);
      
      // Scroll into view to make it visible
      try {
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});", element);
        await new Promise(r => setTimeout(r, 100)); // short wait for scroll transition
      } catch (ignored) {}

      // Wait for visibility
      await this.driver.wait(until.elementIsVisible(element), 3000).catch(() => {});
      
      return element;
    } catch (e) {
      throw new Error(`Failed to locate element using: ${JSON.stringify(locator)}. Details: ${e.message}`);
    }
  }

  async click(locator, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
    try {
      await element.click();
    } catch (err) {
      // Fallback to JS click if intercepted
      console.log(`Standard click failed, attempting JS click for locator: ${JSON.stringify(locator)}`);
      await this.driver.executeScript("arguments[0].click();", element);
    }
  }

  async clickElement(element) {
    try {
      await element.click();
    } catch (err) {
      console.log(`Standard clickElement failed, attempting JS click`);
      await this.driver.executeScript("arguments[0].click();", element);
    }
  }

  async write(locator, text, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    await this.driver.wait(until.elementIsEnabled(element), timeout);
    try {
      await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
    } catch (e) {
      await element.clear().catch(() => {});
    }
    await element.sendKeys(text);
  }

  async getText(locator, timeout = this.defaultTimeout) {
    const element = await this.find(locator, timeout);
    return await element.getText();
  }

  async isDisplayed(locator, timeout = 3000) {
    try {
      const element = await this.find(locator, timeout);
      return await element.isDisplayed();
    } catch (e) {
      return false;
    }
  }

  async getLocalStorageItem(key) {
    return await this.driver.executeScript((k) => {
      return localStorage.getItem(k);
    }, key);
  }

  async setLocalStorageItem(key, value) {
    await this.driver.executeScript((k, v) => {
      localStorage.setItem(k, v);
    }, key, value);
  }

  async clearLocalStorage() {
    await this.driver.executeScript(() => {
      localStorage.clear();
    });
  }

  async getSessionStorageItem(key) {
    return await this.driver.executeScript((k) => {
      return sessionStorage.getItem(k);
    }, key);
  }

  async getConsoleLogs() {
    try {
      const logs = await this.driver.manage().logs().get('browser');
      return logs;
    } catch (e) {
      return [];
    }
  }

  async refreshPage() {
    await this.driver.navigate().refresh();
  }

  async goBack() {
    await this.driver.navigate().back();
  }

  async goForward() {
    await this.driver.navigate().forward();
  }

  async getPageTitle() {
    return await this.driver.getTitle();
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async takeScreenshot(screenshotName) {
    try {
      const image = await this.driver.takeScreenshot();
      const dir = './screenshots';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = path.join(dir, `${screenshotName}.png`);
      fs.writeFileSync(filePath, image, 'base64');
      return path.resolve(filePath);
    } catch (err) {
      console.error(`Error saving screenshot ${screenshotName}:`, err.message);
      return null;
    }
  }
}
