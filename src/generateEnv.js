const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the file path
const envFilePath = path.join(__dirname, '..', '.env');

// Check if the file already exists
if (fs.existsSync(envFilePath)) {
  console.log('⚠️ An .env file already exists!');
  rl.question('Do you want to overwrite it? (y/n): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled. Existing .env file preserved.');
      rl.close();
      return;
    }
    generateEnvFile();
  });
} else {
  generateEnvFile();
}

/**
 * Generates the .env file by asking the user for input
 */
function generateEnvFile() {
  console.log('\n=== BankeeBricks Discord Notifier Bot - Environment Setup ===\n');
  console.log('Please provide the following information (press Enter to use default/skip):\n');
  
  let envContent = '';
  
  // Ask for Discord token
  askForValue('Enter your Discord bot token', null, 'DISCORD_TOKEN')
    .then(token => {
      envContent += `# Discord Bot Token\nDISCORD_TOKEN=${token}\n\n`;
      return askForValue('Enter the channel ID for #bestsellers', null, 'BESTSELLERS_CHANNEL_ID');
    })
    .then(bestsellersChannelId => {
      envContent += `# Channel IDs\nBESTSELLERS_CHANNEL_ID=${bestsellersChannelId}\n`;
      return askForValue('Enter the channel ID for #sale', null, 'SALE_CHANNEL_ID');
    })
    .then(saleChannelId => {
      envContent += `SALE_CHANNEL_ID=${saleChannelId}\n`;
      return askForValue('Enter the channel ID for #exclusive', null, 'EXCLUSIVE_CHANNEL_ID');
    })
    .then(exclusiveChannelId => {
      envContent += `EXCLUSIVE_CHANNEL_ID=${exclusiveChannelId}\n`;
      return askForValue('Enter the channel ID for #new-arrivals', null, 'NEW_ARRIVALS_CHANNEL_ID');
    })
    .then(newArrivalsChannelId => {
      envContent += `NEW_ARRIVALS_CHANNEL_ID=${newArrivalsChannelId}\n`;
      
      // Write the file
      fs.writeFileSync(envFilePath, envContent);
      console.log(`\n✅ .env file successfully created at: ${envFilePath}`);
      
      // Provide instructions
      console.log('\n=== Next Steps ===');
      console.log('1. Review your .env file to ensure everything is correct');
      console.log('2. Run the bot with: npm start');
      console.log('3. To test the scraper without Discord: npm run test:scraper-only');
      
      rl.close();
    })
    .catch(error => {
      console.error('Error generating .env file:', error);
      rl.close();
    });
}

/**
 * Asks user for a value with optional default
 * @param {string} question - The question to ask
 * @param {string|null} defaultValue - Default value
 * @param {string} varName - For printing instructions if empty
 * @returns {Promise<string>} - User input or default value
 */
function askForValue(question, defaultValue, varName) {
  return new Promise((resolve) => {
    const defaultText = defaultValue ? ` (default: ${defaultValue})` : '';
    rl.question(`${question}${defaultText}: `, (answer) => {
      const value = answer.trim() || defaultValue || '';
      
      if (!value) {
        console.log(`⚠️ No value provided for ${varName}. You'll need to set this manually later.`);
      }
      
      resolve(value);
    });
  });
} 