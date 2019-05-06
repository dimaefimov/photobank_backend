const { prepareDriver, cleanupDriver } = require('../utils/browser-automation');
const { expect } = require('chai');
const should = require('chai').should();
const { By, until, Key, elementIsVisible } = require('selenium-webdriver');

let c = require('../utils/constants.js');
let u = require('../utils/utils.js');

describe('Скачивание существующих ресурсов', function () {
    this.timeout(0); // set timelimit to infinity - otherwise you'll get 2000ms timeUp error.;
    let driver;
    before(async () => {
      driver = await prepareDriver();
    });
    after(() => cleanupDriver(driver));

    it('Ресурс из списка скачивается', async function () {
      await u.login(driver);
      await u.w(driver);
      await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
      const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
      await searchViewBtn.click();
      await u.waitForEl(driver,c.SELECTORS.notloading.ITEM_LIST);
      let searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
      await searchSubmitBtn.click();
      await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
      let searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
      let numOfResources = 0;
      let itemCounter = 0;
      let resources;
      while(numOfResources<1){
        let item = searchResults[itemCounter++];
        await item.click();
        await u.waitForEl(driver, c.SELECTORS.notloading.RESOURCE_LIST);
        try{
          resources = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
          numOfResources = resources.length;
        }catch(e){}
        await driver.executeScript("arguments[0].scrollIntoView(true)", item);
        await driver.wait(until.elementIsVisible(item), 500, 'Could not locate the child element within the time specified');
      }
      await driver.actions({bridge: true}).move({origin:resources[0]}).perform();
      let dl = await driver.findElement(By.css(c.SELECTORS.upload.RESOURCE_TILE_BTN.download));
      await u.waitForEl(driver,c.SELECTORS.upload.RESOURCE_TILE_BTN.download);
      await dl.click();
      await u.waitForEl(driver,c.SELECTORS.NOTIFICATION_TOAST);
      let toast = await driver.findElement(By.css(c.SELECTORS.NOTIFICATION_TOAST));
      expect(await toast.getText()).to.equal("Скачан 1 ресурс");
      await u.s(driver);
    });

    it('Ресурсы из выгрузки скачиваются', async function () {
      let neededResources = 3;
      await u.login(driver);
      await u.w(driver);
      await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
      const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
      await searchViewBtn.click();
      await u.waitForEl(driver,c.SELECTORS.notloading.ITEM_LIST);
      let searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
      await searchSubmitBtn.click();
      await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
      let searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
      let numOfResources = 0;
      let itemCounter = 0;
      let resources;
      while(numOfResources<3){
        let item = searchResults[itemCounter++];
        await item.click();
        await u.waitForEl(driver, c.SELECTORS.notloading.RESOURCE_LIST);
        try{
          resources = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
          for(let i = 0; i<resources.length; i++){
            await driver.actions({bridge: true}).move({origin:resources[i]}).perform();
            let dl = await driver.findElement(By.css(c.SELECTORS.upload.RESOURCE_TILE_BTN.download_queue));
            await u.waitForEl(driver,c.SELECTORS.upload.RESOURCE_TILE_BTN.download_queue);
            await dl.click();
            await u.waitForEl(driver,c.SELECTORS.NOTIFICATION_TOAST);
            await u.sw(driver);
            let notificationCloseBtn = await driver.findElement(By.css(c.SELECTORS.NOTIFICATION_TOAST+">button"));
            await notificationCloseBtn.click();
          }
          numOfResources += resources.length;
        }catch(e){}
        await driver.executeScript("arguments[0].scrollIntoView(true)", item);
        await driver.wait(until.elementIsVisible(item), 500, 'Could not locate the child element within the time specified');
      }
      let poolBtn = await driver.findElement(By.css(c.SELECTORS.upload.DOWNLOAD_POOL_BTN));
      await poolBtn.click();
      await u.waitForEl(driver,c.SELECTORS.upload.DOWNLOAD_ALL_BTN);
      let dlAllBtn = await driver.findElement(By.css(c.SELECTORS.upload.DOWNLOAD_ALL_BTN));
      await dlAllBtn.click();
      await u.w(driver);
      await u.waitForEl(driver,c.SELECTORS.NOTIFICATION_TOAST);
      let toast = await driver.findElement(By.css(c.SELECTORS.NOTIFICATION_TOAST));
      expect((await toast.getText()).match(/\d/)[0]).to.equal(numOfResources.toString());
      await u.s(driver);
    });
  });
