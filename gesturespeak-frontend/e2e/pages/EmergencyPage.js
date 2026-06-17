import BasePage from './BasePage.js';
import { By, until } from 'selenium-webdriver';

export default class EmergencyPage extends BasePage {
  constructor(driver) {
    super(driver);
    
    // Tab headers
    this.sosDashboardTab = By.xpath("//button[contains(., 'SOS Dashboard')]");
    this.contactsTab = By.xpath("//button[contains(., 'Emergency Contacts')]");
    this.historyLogsTab = By.xpath("//button[contains(., 'SOS History Logs')]");
    
    // TAB 0: SOS Dashboard elements
    this.sosPulseButton = By.xpath("//h5[text()='SOS']/parent::div");
    this.sosSendingSpinner = By.css('.MuiCircularProgress-root');
    this.sirenAlarmButton = By.xpath("//button[contains(., 'SIREN ALARM')]");
    this.dismissSignalButton = By.xpath("//button[contains(., 'DISMISS SIGNAL & ALARM')]");
    this.dismissWarningButton = By.xpath("//button[contains(., 'DISMISS SOS WARNING')]");
    
    // Location preview elements
    this.latitudeValue = By.xpath("//div[text()='LATITUDE']/following-sibling::p");
    this.longitudeValue = By.xpath("//div[text()='LONGITUDE']/following-sibling::p");
    this.updateCoordsButton = By.xpath("//button[contains(., 'Update Coordinates') or contains(., 'Get Coordinates') or contains(., 'Retry Location')]");
    
    // TAB 1: Contacts elements
    this.addContactButton = By.xpath("//button[contains(., 'Add Contact')]");
    this.contactsTableRow = By.xpath("//div[contains(@class, 'glass-card') and .//button[contains(., 'Delete')]]");
    this.primaryStarButton = By.xpath(".//button[contains(@class, 'IconButton-root')]"); // relative to row
    
    // Contact Dialog Form Elements (using partial text contains matches for Mui labels with required asterisks)
    this.dialogTitle = By.xpath("//h2[contains(@class, 'MuiDialogTitle-root') or contains(., 'CONTACT')]");
    this.fullNameInput = By.xpath("//label[contains(text(), 'Full Name')]/parent::div//input");
    this.relationshipSelect = By.xpath("//*[contains(text(), 'Relationship')]/parent::div//*[contains(@class, 'MuiSelect-select')]");
    this.relationshipOption = (rel) => By.xpath(`//li[@role='option' and @data-value='${rel}']`);
    this.phoneInput = By.xpath("//label[contains(text(), 'Phone') or contains(text(), 'Mobile')]/parent::div//input");
    this.emailInput = By.xpath("//label[contains(text(), 'Email')]/parent::div//input");
    this.saveContactButton = By.xpath("//button[@type='submit' and contains(., 'Save')]");
    this.cancelContactButton = By.xpath("//button[contains(., 'Cancel')]");
    this.formErrorAlert = By.xpath("//form//*[contains(@class, 'MuiAlert-root')]");
    
    // SOS Confirmation Dialog
    this.confirmSendSosButton = By.xpath("//button[contains(., 'Send SOS')]");
    this.cancelSendSosButton = By.xpath("//button[contains(., 'Cancel')]");
    
    // SOS Success Dialog/Modal
    this.successModalHeader = By.xpath("//h5[contains(., 'Emergency Alert Sent Successfully')]");
    this.successModalDismissButton = By.xpath("//button[contains(., 'Open SOS History')]");
    
    // TAB 2: History logs elements
    this.historySearchInput = By.xpath("//label[contains(text(), 'Search location') or contains(text(), 'details')]/parent::div//input");
    this.filterStatusSelect = By.xpath("//label[contains(text(), 'Filter')]/parent::div//div[@role='combobox']");
    this.clearHistoryLogsButton = By.xpath("//button[contains(., 'Clear History Logs')]");
    this.historyLogTableRow = By.xpath("//table/tbody/tr");
  }

  async clickSosDashboardTab() {
    await this.click(this.sosDashboardTab);
  }

  async clickContactsTab() {
    await this.click(this.contactsTab);
  }

  async clickHistoryLogsTab() {
    await this.click(this.historyLogsTab);
  }

  async triggerSos() {
    await this.click(this.sosPulseButton);
  }

  async confirmSosDispatch() {
    await this.click(this.confirmSendSosButton);
  }

  async dismissSuccessModal() {
    await this.click(this.successModalHeader);
    await this.click(this.successModalDismissButton);
  }

  async clickSirenAlarm() {
    await this.click(this.sirenAlarmButton);
  }

  async clickUpdateCoordinates() {
    await this.click(this.updateCoordsButton);
  }

  async getLatitude() {
    return await this.getText(this.latitudeValue);
  }

  async getLongitude() {
    return await this.getText(this.longitudeValue);
  }

  async clickAddContact() {
    await this.click(this.addContactButton);
    await this.driver.wait(until.elementLocated(this.dialogTitle), 5000);
    await new Promise(r => setTimeout(r, 400)); // wait for dialog transition
  }

  async fillContactForm(name, relationship, phone, email = '') {
    if (name !== null) {
      await this.write(this.fullNameInput, name);
    }
    
    if (relationship !== null) {
      await this.click(this.relationshipSelect);
      await new Promise(r => setTimeout(r, 400)); // wait for dropdown listbox animation
      const option = this.relationshipOption(relationship);
      await this.click(option);
      await new Promise(r => setTimeout(r, 200)); // wait for dropdown to close
    }
    
    if (phone !== null) {
      await this.write(this.phoneInput, phone);
    }
    
    if (email !== null) {
      await this.write(this.emailInput, email);
    }
    
    await this.click(this.saveContactButton);
  }

  async getFormErrorMessage() {
    return await this.getText(this.formErrorAlert);
  }

  async isFormErrorAlertDisplayed() {
    return await this.isDisplayed(this.formErrorAlert, 2000);
  }

  async getContactsCount() {
    try {
      const rows = await this.driver.findElements(this.contactsTableRow);
      if (rows.length === 1) {
        const text = await rows[0].getText();
        if (text.includes("No emergency") || text.includes("No contacts")) {
          return 0;
        }
      }
      return rows.length;
    } catch (e) {
      return 0;
    }
  }

  async getFirstContactName() {
    const rows = await this.driver.findElements(this.contactsTableRow);
    if (rows.length > 0) {
      const nameEl = await rows[0].findElement(By.css(".MuiTypography-subtitle1"));
      return await nameEl.getText();
    }
    return "";
  }

  async clickDeleteFirstContact() {
    const rows = await this.driver.findElements(this.contactsTableRow);
    if (rows.length > 0) {
      const deleteButton = await rows[0].findElement(By.xpath(".//button[contains(., 'Delete')]"));
      await deleteButton.click();
    }
  }

  async clickEditFirstContact() {
    const rows = await this.driver.findElements(this.contactsTableRow);
    if (rows.length > 0) {
      const editButton = await rows[0].findElement(By.xpath(".//button[contains(., 'Edit')]"));
      await editButton.click();
      await this.driver.wait(until.elementLocated(this.dialogTitle), 5000);
      await new Promise(r => setTimeout(r, 400)); // wait for transition
    }
  }

  async searchHistory(query) {
    await this.write(this.historySearchInput, query);
  }

  async getHistoryLogsCount() {
    try {
      const rows = await this.driver.findElements(this.historyLogTableRow);
      if (rows.length === 1) {
        const text = await rows[0].getText();
        if (text.includes("No historical") || text.includes("No records")) {
          return 0;
        }
      }
      return rows.length;
    } catch (e) {
      return 0;
    }
  }
}
