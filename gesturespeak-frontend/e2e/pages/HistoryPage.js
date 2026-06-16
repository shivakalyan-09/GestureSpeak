import BasePage from './BasePage.js';
import { By } from 'selenium-webdriver';

export default class HistoryPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.searchInput = By.xpath("//input[@placeholder='Search history log...']");
    this.exportCsvButton = By.xpath("//button[contains(., 'Export CSV')]");
    this.clearAllButton = By.xpath("//button[contains(., 'Clear All')]");
    this.tableRow = By.xpath("//table/tbody/tr");
    this.emptyStateMessage = By.xpath("//div[contains(text(), 'No records found')]");
  }

  async searchLog(query) {
    await this.write(this.searchInput, query);
  }

  async clickExportCsv() {
    await this.click(this.exportCsvButton);
  }

  async clickClearAll() {
    await this.click(this.clearAllButton);
  }

  async getLogsCount() {
    try {
      const rows = await this.driver.findElements(this.tableRow);
      if (rows.length === 1) {
        const text = await rows[0].getText();
        if (text.includes("No records found") || text.includes("No activities")) {
          return 0;
        }
      }
      return rows.length;
    } catch (e) {
      return 0;
    }
  }

  async getFirstRowTranslation() {
    const rows = await this.driver.findElements(this.tableRow);
    if (rows.length > 0) {
      const cells = await rows[0].findElements(By.xpath("./td"));
      if (cells.length > 3) {
        return await cells[3].getText(); // Index 3 is Translation
      }
    }
    return "";
  }

  async deleteFirstRow() {
    const rows = await this.driver.findElements(this.tableRow);
    if (rows.length > 0) {
      const deleteBtn = await rows[0].findElement(By.xpath(".//button[contains(@class, 'MuiIconButton-colorError')]"));
      await deleteBtn.click();
    }
  }
}
