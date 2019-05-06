const { prepareDriver, cleanupDriver } = require('../utils/browser-automation');
const { expect } = require('chai');
const should = require('chai').should();
const { By, until, Key, elementIsVisible } = require('selenium-webdriver');

let c = require('../utils/constants.js');
let u = require('../utils/utils.js');

describe('Проверка поисковой системы (и фильтров) по товарам', function () {
  this.timeout(0);
  let driver;
  before(async () => {
    driver = await prepareDriver();
  });
  after(() => cleanupDriver(driver));

  it('Поиск по названию находит нужные товары', async function () {
    await u.login(driver);
    await u.w(driver);
    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();
    let nameInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_NAME_INPUT));
    nameInput.sendKeys(c.FORM_DATA.ITEM_NAME);
    let searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    let searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
    let tbd = [];
    for(let i = 0; i<searchResults.length; i++){
      let inner = await searchResults[i].getAttribute('innerText');
      if(!inner.toLowerCase().includes(c.FORM_DATA.ITEM_NAME.toLowerCase())){tbd.push(i);}
    }
    tbd.reverse();
    for(let i = 0; i<tbd.length; i++){searchResults.splice(tbd[i], 1);}
    searchResults.should.have.lengthOf.at.least(20);
    await u.s(driver);
  });

  it('Поиск включает фильтрацию по разделу каталога и находит нужные товары', async function () {
    var {numOfItemsInNode,nodeName} = await u.getVerifiedData(driver);
    await u.s(driver);
    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    await u.waitForEl(driver,c.SELECTORS.notloading.NODE_LIST);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();
    let nodeInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_NODE_INPUT));
    nodeInput.sendKeys(nodeName);
    const searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    const searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
    await u.s(driver);
    expect(searchResults.length).to.equal(numOfItemsInNode);
    await u.s(driver);
  });

  it('Поиск включает фильтрацию по разделу каталога (рекурсивно) и находит нужные товары', async function () {
    var {numOfNestedItems,nodeName} = await u.getVerifiedData(driver);
    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    await u.waitForEl(driver,c.SELECTORS.notloading.NODE_LIST);
    await u.w(driver);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();
    let nodeInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_NODE_INPUT));
    nodeInput.sendKeys(nodeName);
    let nestedInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+" "+c.SELECTORS.upload.ITEM_SEARCH_NESTED_INPUT));
    nestedInput.click();
    const searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.NODE_LIST);
    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    const searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
    await u.s(driver);
    expect(searchResults.length).to.equal(numOfNestedItems);
  });

  it('Поиск по 1С коду товара находит нужный товар', async function () {
    var {numOfItemsInNode,itemCodes} = await u.getVerifiedData(driver);
    await u.s(driver);
    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();
    let nodeInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_ITEM_CODE));
    nodeInput.sendKeys(itemCodes[0]);
    const searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    await u.w(driver);
    const searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
    let resultCode = await searchResults[0].getAttribute('data-item');
    expect(resultCode).to.equal(itemCodes[0]);
    await u.s(driver);
  });

  it('Поиск ао 1С кодам товаров находит нужные товары', async function () {
    var {numOfItemsInNode,itemCodes} = await u.getVerifiedData(driver);
    await u.s(driver);
    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();
    let nodeInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_ITEM_CODE));
    for(let i = 0; i<itemCodes.length; i++){
        await nodeInput.sendKeys(itemCodes[i]+", ");
    }
    await u.waitForEl(driver, c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN);
    const searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    const searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
    await u.s(driver);
    for(let i =0; i<itemCodes.length; i++){
      let resultCode = await searchResults[i].getAttribute('data-item');
      expect(resultCode).to.equal(itemCodes[i]);
    }

    await u.s(driver);
  });

  it('Фильтрация товаров работает', async function () {
    var {numOfItemsInNode,itemCodes} = await u.getVerifiedData(driver);
    await u.s(driver);
    await u.waitForEl(driver,c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW);
    const searchViewBtn = await driver.findElement(By.css(c.SELECTORS.upload.CATALOGUE_TREE_SEARCH_VIEW));
    await searchViewBtn.click();
    let nodeInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_ITEM_CODE));
    for(let i = 0; i<itemCodes.length; i++){
        await nodeInput.sendKeys(itemCodes[i]+", ");
    }
    const searchSubmitBtn = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_SEARCH_FORM+">"+c.SELECTORS.upload.ITEM_SEARCH_SUBMIT_BTN));
    await searchSubmitBtn.click();
    await u.waitForEl(driver, c.SELECTORS.notloading.ITEM_LIST);
    const filterInput = await driver.findElement(By.css(c.SELECTORS.upload.ITEM_LIST_FILTER));
    await filterInput.click();
    await filterInput.sendKeys(itemCodes[0]);
    await u.w(driver);
    const searchResults = await driver.findElements(By.css(c.SELECTORS.upload.ITEM_LIST_ITEM));
    expect(searchResults.length).to.equal(1);
    await u.s(driver);
  });
});
