#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
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

# Create logs directory for PM2
mkdir -p logs

# Copy example config if config doesn't exist
if [ ! -f "config/config.js" ]; then
  mkdir -p config
  cp config/config.example.js config/config.js
  echo "Please edit config/config.js with your Discord token and channel IDs"
fi

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration to restart on reboot
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Display status
pm2 status
echo "Deployment complete! Configure your config.js file if needed." 