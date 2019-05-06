const { prepareDriver, cleanupDriver } = require('../utils/browser-automation');
const { expect } = require('chai');
const should = require('chai').should();
const { By, until, Key, elementIsVisible } = require('selenium-webdriver');

let c = require('../utils/constants.js');
let u = require('../utils/utils.js');

describe('Загрузка ресурсов на сервер', function () {
  this.timeout(0);
  const absPath = process.env.TEST_UPLOAD_FILE_PATH;
  let driver;
  before(async () => {
    driver = await prepareDriver();
  });
  after(() => cleanupDriver(driver));

  it('Загрузка для одного товара', async function () {
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

    let itemCounter = 0;
    let numOfResources = 0;
    do{
      let item = searchResults[itemCounter++];
      await item.click();
      await u.waitForEl(driver, c.SELECTORS.notloading.RESOURCE_LIST);
      resources = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
      numOfResources = resources.length;
    }while(numOfResources>0);

    await u.waitForEl(driver, c.SELECTORS.upload.BROWSE_FILES_BTN);
    let fileInput = await driver.findElement(By.css(c.SELECTORS.upload.BROWSE_FILES_BTN+">input[type='file']"));
    await fileInput.sendKeys(absPath+c.ABS_FILE_PATHS[0]);
    let uploadBtn = await driver.findElement(By.css(c.SELECTORS.upload.UPLOAD_FILES_BTN));
    let resBefore = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
    await uploadBtn.click();
    await u.waitForEl(driver, c.SELECTORS.NOTIFICATION_TOAST);
    await u.w(driver);
    let resAfter = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
    expect(resAfter.length-resBefore.length).to.equal(1);
    await u.s(driver);
  });

  it('Загрузка нескольких файлов для одного товара', async function () {
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

    let itemCounter = 1;
    let numOfResources = 0;

    await u.w(driver);

    do{
      let item = searchResults[itemCounter++];
      await item.click();
      await u.waitForEl(driver, c.SELECTORS.notloading.RESOURCE_LIST);
      await u.sw(driver);
      resources = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
      numOfResources = resources.length;
    }while(numOfResources>0);

    await u.waitForEl(driver, c.SELECTORS.upload.BROWSE_FILES_BTN+">input[type='file']");
    let fileInput = await driver.findElement(By.css(c.SELECTORS.upload.BROWSE_FILES_BTN+">input[type='file']"));
    await fileInput.sendKeys(absPath+c.ABS_FILE_PATHS.join('\n'+absPath));
    await u.w(driver);
    await u.waitForEl(driver, c.SELECTORS.upload.UPLOAD_FILES_BTN+":enabled");
    let uploadBtn = await driver.findElement(By.css(c.SELECTORS.upload.UPLOAD_FILES_BTN));
    let resBefore = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
    await uploadBtn.click();
    await u.waitForEl(driver, c.SELECTORS.NOTIFICATION_TOAST);
    await u.w(driver);
    let resAfter = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
    expect(resAfter.length-resBefore.length).to.equal(c.ABS_FILE_PATHS.length);
    await u.s(driver);
  });

  it('Загрузка для нескольких товаров', async function () {
    await u.login(driver);
    await u.w(driver);
    await u.waitForEl(driver, c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();

    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    let searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();

    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    let searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));

    let itemCounter = 0;
    let numOfResources = 0;

    for(let i = 0; i<3; i++){
      do{
        let item = searchResults[itemCounter++];
        await item.click();
        await u.waitForEl(driver, c.SELECTORS.notloading.RESOURCE_LIST);
        resources = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
        numOfResources = resources.length;
      }while(numOfResources>0);

      await u.waitForEl(driver, c.SELECTORS.upload.BROWSE_FILES_BTN);
      let fileInput = await driver.findElement(By.css(c.SELECTORS.upload.BROWSE_FILES_BTN+">input[type='file']"));
      await fileInput.sendKeys(absPath+c.ABS_FILE_PATHS.join('\n'+absPath));
    }

    let poolBtn = await driver.findElement(By.css(c.SELECTORS.upload.UPLOAD_POOL_BTN));
    await poolBtn.click();
    let uploadAllBtn = await driver.findElement(By.css(c.SELECTORS.upload.UPLOAD_ALL_BTN));
    await uploadAllBtn.click();

    await u.w(driver);
    await u.waitForEl(driver, c.SELECTORS.NOTIFICATION_TOAST);
    let toast = await driver.findElement(By.css(c.SELECTORS.NOTIFICATION_TOAST+' p.notification__notification-caption'));
    let toasttxt = await toast.getText();
    expect(toasttxt).to.equal("Загрузка на сервер завершена");
    await u.s(driver);
  });

  it('Загрузка файлов на свалку', async function () {
    await u.login(driver);
    await u.w(driver);

    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_TREE_VIEW);
    const treeViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_TREE_VIEW));
    await treeViewBtn.click();

    await u.waitForEl(driver,c.SELECTORS.upload.GARBAGE_SWITCH);
    let garbageSwitch = driver.findElement(By.css(c.SELECTORS.upload.GARBAGE_SWITCH));
    await garbageSwitch.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.NODE_LIST);

    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_TREE_NODE_ANCHOR);
    let searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_TREE_NODE_ANCHOR));
    await searchSubmitBtn.click();

    await u.waitForEl(driver, c.SELECTORS.upload.BROWSE_FILES_BTN);
    let fileInput = await driver.findElement(By.css(c.SELECTORS.upload.BROWSE_FILES_BTN+">input[type='file']"));
    await fileInput.sendKeys(absPath+c.ABS_FILE_PATHS.join('\n'+absPath));
    let uploadBtn = await driver.findElement(By.css(c.SELECTORS.upload.UPLOAD_FILES_BTN));
    let resBefore = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
    await uploadBtn.click();
    await u.waitForEl(driver, c.SELECTORS.NOTIFICATION_TOAST);
    await u.w(driver);
    let resAfter = await driver.findElements(By.css(c.SELECTORS.upload.RESOURCE_LIST_ITEM));
    expect(resAfter.length-resBefore.length).to.equal(c.ABS_FILE_PATHS.length);
    await u.s(driver);
  });
});
