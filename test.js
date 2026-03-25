const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to local server
  await page.goto('http://localhost:8000/index.html');

  // Wait for the game to load
  await page.waitForSelector('.bottle-wrapper');

  // Take screenshot of initial state
  await page.screenshot({ path: 'screenshot_initial.png' });
  console.log('Initial screenshot saved as screenshot_initial.png');

  // Let's perform a couple of pours to test it
  // Need to get elements fresh after each state update because they are re-rendered

  // Pour from 10L (index 0) to 5L (index 1)
  console.log('Clicking bottle 0');
  let bottles = await page.$$('.bottle-wrapper');
  await bottles[0].click();
  await page.waitForTimeout(500); // small delay to see selection

  console.log('Clicking bottle 1');
  bottles = await page.$$('.bottle-wrapper');
  await bottles[1].click();

  await page.waitForTimeout(1000); // Wait for animation

  // Pour from 5L (index 1) to 2L (index 2)
  console.log('Clicking bottle 1');
  bottles = await page.$$('.bottle-wrapper');
  await bottles[1].click();
  await page.waitForTimeout(500);

  console.log('Clicking bottle 2');
  bottles = await page.$$('.bottle-wrapper');
  await bottles[2].click();

  await page.waitForTimeout(1000); // Wait for animation

  // Take screenshot of state after a couple of pours
  await page.screenshot({ path: 'screenshot_played.png' });
  console.log('Played screenshot saved as screenshot_played.png');

  // Verify state
  // 10L: should have 5L left
  // 5L: should have 3L left
  // 2L: should have 2L
  let labels = await page.$$('.bottle-label');
  const label0 = await labels[0].innerText();
  const label1 = await labels[1].innerText();
  const label2 = await labels[2].innerText();

  console.log('Bottle States after pours:');
  console.log(`Bottle 0: ${label0}`);
  console.log(`Bottle 1: ${label1}`);
  console.log(`Bottle 2: ${label2}`);

  if (label0 === '5L / 10L' && label1 === '3L / 5L' && label2 === '2L / 2L') {
    console.log('✅ Pours verified successfully!');
  } else {
    console.error('❌ Pouring mechanics failed verification!');
  }


  // One more pour to win!
  // Empty 2L (index 2) back into 10L (index 0)
  console.log('Pouring bottle 2 to bottle 0');
  bottles = await page.$$('.bottle-wrapper');
  await bottles[2].click();
  await page.waitForTimeout(500);
  bottles = await page.$$('.bottle-wrapper');
  await bottles[0].click();
  await page.waitForTimeout(1000);

  // Pour 5L (index 1 - currently has 3L) into 2L (index 2)
  console.log('Pouring bottle 1 to bottle 2');
  bottles = await page.$$('.bottle-wrapper');
  await bottles[1].click();
  await page.waitForTimeout(500);
  bottles = await page.$$('.bottle-wrapper');
  await bottles[2].click();
  await page.waitForTimeout(1000);

  labels = await page.$$('.bottle-label');
  const finalLabel1 = await labels[1].innerText();
  console.log(`Bottle 1 Final State: ${finalLabel1}`);

  if (finalLabel1 === '1L / 5L') {
     console.log('✅ Reached 1L target!');
  }

  await page.screenshot({ path: 'screenshot_win.png' });
  console.log('Win screenshot saved as screenshot_win.png');

  await browser.close();
})();
