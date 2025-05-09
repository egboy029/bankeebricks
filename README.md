# BankeeBricks LEGO Notification Bot

A Discord bot that sends notifications for new LEGO products, sales, exclusive items, and bestsellers.

## Features

- Monitors LEGO products and sends notifications to Discord
- Categorizes products as bestsellers, sales, exclusives, or new arrivals
- Formats product information with rich embeds including images
- Handles price formatting with discount calculations

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/egboy029/bankeebricks.git
   cd bankeebricks
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure your Discord bot token and channel IDs in `config/config.js`:
   ```javascript
   module.exports = {
     token: 'YOUR_DISCORD_BOT_TOKEN',
     channels: {
       bestsellers: 'BESTSELLERS_CHANNEL_ID',
       sale: 'SALE_CHANNEL_ID',
       exclusive: 'EXCLUSIVE_CHANNEL_ID',
       newArrivals: 'NEW_ARRIVALS_CHANNEL_ID'
     }
   };
   ```

4. Start the application:
   ```
   npm start
   ```

## License

MIT

## Recent Updates

- Improved price formatting to properly display:
  - Regular prices (PHP X,XXX.XX)
  - Discounted prices with original prices
  - Percentage discounts
  - Original prices vs sale prices
- Enhanced Discord notifications to clearly show pricing information
- Improved website scraping to properly extract product data from BankeeBricks
- Fixed link extraction to ensure proper product URLs from BankeeBricks website
- Enhanced image handling for reliable Discord notifications
- Added better error handling and more detailed logging
- Updated all category URLs to current BankeeBricks paths

## Project Structure

- `src/index.js` - Main application entry point
- `src/scraper.js` - Website scraping functionality
- `src/discordService.js` - Discord notification service
- `src/productService.js` - Product tracking and change detection
- `config/config.js` - Configuration file

## Troubleshooting

- **Bot not sending notifications**: Check your Discord token and channel IDs in the `.env` file
- **Scraping issues**: BankeeBricks may have changed their website structure. Check the console logs for details
- **Bot crashes**: Check the PM2 logs for error details: `npm run prod:logs`

## Acknowledgements

- [Discord.js](https://discord.js.org/)
- [Cheerio](https://cheerio.js.org/)
- [BankeeBricks](https://www.bankeebricks.ph/) - LEGO Certified Store Philippines 