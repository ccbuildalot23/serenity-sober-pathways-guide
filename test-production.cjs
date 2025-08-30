const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting production deployment test...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to https://serenity-eta-ten.vercel.app...');
    await page.goto('https://serenity-eta-ten.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Check page title
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    // Check for blank screen
    const bodyText = await page.textContent('body');
    if (!bodyText || bodyText.trim() === '') {
      console.log('❌ BLANK SCREEN DETECTED - No text content in body');
    } else {
      console.log(`✅ Page has content - Body text length: ${bodyText.length} characters`);
    }
    
    // Check for main app div
    const appDiv = await page.$('#root');
    if (appDiv) {
      console.log('✅ Root div found');
      const rootContent = await page.textContent('#root');
      if (rootContent && rootContent.trim() !== '') {
        console.log(`✅ Root div has content: ${rootContent.substring(0, 100)}...`);
      } else {
        console.log('❌ Root div is empty');
      }
    } else {
      console.log('❌ Root div not found');
    }
    
    // Check for visible elements
    const visibleElements = await page.$$eval('*', elements => {
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetHeight > 0;
      }).length;
    });
    console.log(`✅ Visible elements on page: ${visibleElements}`);
    
    // Check for buttons or forms
    const buttons = await page.$$('button');
    console.log(`✅ Buttons found: ${buttons.length}`);
    
    const forms = await page.$$('form');
    console.log(`✅ Forms found: ${forms.length}`);
    
    // Take a screenshot
    await page.screenshot({ path: 'production-test.png' });
    console.log('📸 Screenshot saved as production-test.png');
    
    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console error: ${msg.text()}`);
      }
    });
    
    console.log('\n✅ Production deployment test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();