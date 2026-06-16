import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

async function debug() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    console.log("Navigating to login page...");
    await driver.get("http://localhost:5173/login");
    
    console.log("Logging in...");
    await driver.findElement(By.css("input#email")).sendKeys("user@mock.com");
    await driver.findElement(By.css("input#password")).sendKeys("Password123");
    await driver.findElement(By.css("button[type='submit']")).click();
    
    console.log("Waiting for dashboard to load...");
    await driver.wait(until.urlContains("/dashboard"), 5000);
    console.log("Navigating to emergency page...");
    await driver.get("http://localhost:5173/emergency");
    
    console.log("Waiting for emergency page to load...");
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Clicking Emergency Contacts Tab...");
    // Find the second tab or button containing "Emergency Contacts"
    const tabs = await driver.findElements(By.xpath("//button[contains(., 'Emergency Contacts')]"));
    if (tabs.length > 0) {
      await tabs[0].click();
      console.log("Clicked tab!");
    } else {
      console.log("Could not find Emergency Contacts tab!");
    }
    await new Promise(r => setTimeout(r, 1000));

    console.log("Clicking Add Contact button...");
    const addBtn = await driver.findElement(By.xpath("//button[contains(., 'Add Contact')]"));
    await addBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    console.log("Dumping Dialog content...");
    const dialog = await driver.findElement(By.css(".MuiDialog-paper"));
    const html = await dialog.getAttribute('outerHTML');
    console.log("DIALOG HTML:\n", html);
  } catch (err) {
    console.error("DEBUG ERROR:", err);
  } finally {
    await driver.quit();
  }
}
debug();
