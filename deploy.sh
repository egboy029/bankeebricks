#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js and npm
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Clone repo if it doesn't exist, otherwise pull latest changes
if [ ! -d "bankeebricks" ]; then
  git clone https://github.com/egboy029/bankeebricks.git
  cd bankeebricks
else
  cd bankeebricks
  git pull
fi

# Install dependencies
npm install

# Copy example config if config doesn't exist
if [ ! -f "config/config.js" ]; then
  cp config/config.example.js config/config.js
  echo "Please edit config/config.js with your Discord token and channel IDs"
fi

# Start application with PM2
pm2 start src/index.js --name bankeebricks

# Save PM2 configuration to restart on reboot
pm2 save
pm2 startup

# Display status
pm2 status
echo "Deployment complete! Configure your config.js file if needed." 