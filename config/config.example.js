/**
 * Example configuration file
 * Copy this to config.js and fill in your values
 */
module.exports = {
  // Discord bot token
  token: 'YOUR_DISCORD_BOT_TOKEN',
  
  // Discord channel IDs for each category
  channels: {
    bestsellers: 'BESTSELLERS_CHANNEL_ID',
    sale: 'SALE_CHANNEL_ID',
    exclusive: 'EXCLUSIVE_CHANNEL_ID',
    newArrivals: 'NEW_ARRIVALS_CHANNEL_ID'
  },
  
  // Scraping configuration
  scraper: {
    // Base URL for the LEGO store
    baseUrl: 'https://www.bankeebricks.ph/',
    
    // Category URLs (relative to baseUrl)
    categoryUrls: {
      bestsellers: 'best-sales',
      sale: 'offers-sale',
      exclusive: '16-exclusives',
      newArrivals: 'new-products'
    },
    
    // How often to check for updates (in minutes)
    pollingInterval: 60
  }
}; 