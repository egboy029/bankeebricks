require('dotenv').config();
const schedule = require('node-schedule');
const config = require('../config/config');
const scraper = require('./scraper');
const productService = require('./productService');
const discordService = require('./discordService');

// Categories to monitor
const CATEGORIES = {
  bestsellers: {
    id: 'bestsellers',
    url: config.urls.bestsellers
  },
  sale: {
    id: 'sale',
    url: config.urls.sale
  },
  exclusive: {
    id: 'exclusive',
    url: config.urls.exclusive
  },
  newArrivals: {
    id: 'newArrivals',
    url: config.urls.newArrivals
  }
};

/**
 * Check for new products in a category
 * @param {Object} category - Category object with id and url
 */
async function checkCategory(category) {
  try {
    console.log(`Checking ${category.id} category...`);
    
    // Scrape products from category, passing the category ID
    const products = await scraper.scrapeCategory(category.url, category.id);
    console.log(`Found ${products.length} products in ${category.id}`);
    
    // Process products to find new ones
    const newProducts = productService.processNewProducts(category.id, products);
    console.log(`Found ${newProducts.length} new products in ${category.id}`);
    
    // Send notifications for new products
    for (const product of newProducts) {
      await discordService.sendProductNotification(category.id, product);
    }
  } catch (error) {
    console.error(`Error checking category ${category.id}:`, error);
  }
}

/**
 * Check all categories for new products
 */
async function checkAllCategories() {
  for (const category of Object.values(CATEGORIES)) {
    await checkCategory(category);
  }
}

/**
 * Initialize the application
 */
async function initialize() {
  try {
    console.log('Initializing BankeeBricks Discord Notifier Bot...');
    
    // Initialize Discord bot
    await discordService.initialize();
    
    // Run initial check
    await checkAllCategories();
    
    // Schedule periodic checks
    const interval = `*/${config.pollingInterval} * * * *`; // Format: "*/minutes * * * *"
    console.log(`Scheduling checks at interval: ${interval}`);
    
    schedule.scheduleJob(interval, async () => {
      await checkAllCategories();
    });
    
    console.log('Bot initialized and running!');
  } catch (error) {
    console.error('Failed to initialize the bot:', error);
    process.exit(1);
  }
}

// Handle application shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  discordService.destroy();
  process.exit(0);
});

// Start the application
initialize(); 