const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DiscordService {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
      ]
    });
    
    this.isReady = false;
    
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}!`);
      this.isReady = true;
    });
    
    // Log any errors
    this.client.on('error', error => {
      console.error('Discord client error:', error);
    });
  }
  
  /**
   * Initialize the Discord bot
   */
  async initialize() {
    try {
      await this.client.login(config.token);
    } catch (error) {
      console.error('Failed to login to Discord:', error);
      throw error;
    }
  }
  
  /**
   * Send a notification for a new product
   * @param {string} category - Category name (bestsellers, sale, exclusive, newArrivals)
   * @param {Object} product - Product object
   */
  async sendProductNotification(category, product) {
    if (!this.isReady) {
      console.warn('Discord client not ready yet. Skipping notification.');
      return;
    }
    
    const channelId = config.channels[category];
    if (!channelId) {
      console.error(`No channel configured for category: ${category}`);
      return;
    }
    
    const channel = this.client.channels.cache.get(channelId);
    if (!channel) {
      console.error(`Could not find channel with ID: ${channelId}`);
      return;
    }
    
    try {
      console.log('Preparing notification with image URL:', product.imageUrl);
      
      // Download the image and create an attachment
      let attachment = null;
      let localImagePath = null;
      
      try {
        if (product.imageUrl) {
          localImagePath = await this.downloadImage(product.imageUrl, product.id);
          if (localImagePath) {
            attachment = new AttachmentBuilder(localImagePath, { name: `${product.id}.png` });
          }
        }
      } catch (imageError) {
        console.error('Error downloading image:', imageError);
      }
      
      // Format the price correctly
      const { formattedPrice, isDiscounted, originalPrice, discountPercentage } = this.formatPrice(product.price);
      
      // Create a rich embed for the product
      const embed = new EmbedBuilder()
        .setColor(this.getCategoryColor(category))
        .setTitle(product.name)
        .setURL(product.link);
        
      // Set description with properly formatted price
      if (isDiscounted) {
        let priceDescription = `**Price:** ${formattedPrice}`;
        
        // Add original price if available
        if (originalPrice) {
          priceDescription += `\n**Original:** ${originalPrice}`;
        }
        
        // Add discount percentage if available
        if (product.price.includes('%') || discountPercentage) {
          const percentage = discountPercentage || product.price.match(/(\d+)%/)?.[1];
          if (percentage) {
            priceDescription += `\n**Discount:** ${percentage}% Off`;
          }
        }
        
        embed.setDescription(priceDescription);
      } else if (!product.inStock) {
        embed.setDescription(`**Price:** ${formattedPrice}\n**Status:** Out of Stock`);
      } else {
        embed.setDescription(`**Price:** ${formattedPrice}`);
      }
      
      embed.setTimestamp()
        .setFooter({ text: `BankeeBricks - ${this.formatCategoryName(category)}` });
      
      // Add the image if we have an attachment
      if (attachment) {
        embed.setImage(`attachment://${attachment.name}`);
        await channel.send({ embeds: [embed], files: [attachment] });
      } else if (product.imageUrl) {
        // Try using the image URL directly if we couldn't download it
        embed.setImage(this.ensureValidImageUrl(product.imageUrl));
        await channel.send({ embeds: [embed] });
      } else {
        // No image available
        await channel.send({ embeds: [embed] });
      }
      
      // Clean up the local file if it exists
      if (localImagePath) {
        try {
          await fs.unlink(localImagePath);
        } catch (unlinkError) {
          console.error('Error deleting temporary image file:', unlinkError);
        }
      }
      
      console.log(`Notification sent for ${product.name} in ${category} category`);
    } catch (error) {
      console.error(`Error sending notification for ${product.name}:`, error);
      
      // Try sending a simple message as fallback
      try {
        // Format price for fallback message
        const { formattedPrice, isDiscounted, originalPrice, discountPercentage } = this.formatPrice(product.price);
        
        let fallbackMessage = `**New ${this.formatCategoryName(category)} Product:**\n` +
          `**${product.name}**\n` +
          `Price: ${formattedPrice}`;
          
        // Add original price if this is a discounted item
        if (isDiscounted && originalPrice) {
          fallbackMessage += `\nOriginal: ${originalPrice}`;
        }
        
        // Add discount percentage if available
        if (isDiscounted && discountPercentage) {
          fallbackMessage += `\nDiscount: ${discountPercentage}% Off`;
        }
        
        // Only add Status if not in stock
        if (!product.inStock) {
          fallbackMessage += `\nStatus: Out of Stock`;
        }
        
        fallbackMessage += `\nLink: ${product.link}`;
        
        await channel.send(fallbackMessage);
        console.log(`Fallback notification sent for ${product.name}`);
      } catch (fallbackError) {
        console.error('Even fallback notification failed:', fallbackError);
      }
    }
  }
  
  /**
   * Download an image and save it locally
   * @param {string} url - The image URL
   * @param {string} productId - ID of the product
   * @returns {Promise<string>} - Path to the downloaded image
   */
  async downloadImage(url, productId) {
    try {
      // Make sure URL has proper protocol
      url = this.ensureValidImageUrl(url);
      
      // Create a unique filename
      const filename = `${productId}-${Date.now()}.png`;
      const tempDir = os.tmpdir();
      const filepath = path.join(tempDir, filename);
      
      console.log(`Downloading image from ${url} to ${filepath}`);
      
      // Download the file
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Save the file
      await fs.writeFile(filepath, response.data);
      console.log(`Image downloaded successfully to ${filepath}`);
      
      return filepath;
    } catch (error) {
      console.error(`Error downloading image from ${url}:`, error.message);
      return null;
    }
  }
  
  /**
   * Ensure the image URL is valid for Discord embeds
   * @param {string} url - The image URL
   * @returns {string} - A validated image URL or empty string if invalid
   */
  ensureValidImageUrl(url) {
    if (!url) return '';
    
    // Make sure URL has proper protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url.replace(/^\/\//, '');
    }
    
    // Ensure URL ends with a common image extension
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
    
    if (!hasImageExtension) {
      // If no extension, try to add .png
      if (!url.includes('?') && !url.includes('#')) {
        url += '.png';
      }
    }
    
    return url;
  }
  
  /**
   * Get color for category embeds
   * @param {string} category - Category name
   * @returns {number} - Color hex code as number
   */
  getCategoryColor(category) {
    const colors = {
      bestsellers: 0x00FF00, // Green
      sale: 0xFF0000,        // Red
      exclusive: 0xFFFF00,   // Yellow
      newArrivals: 0x0000FF  // Blue
    };
    
    return colors[category] || 0x808080; // Default gray
  }
  
  /**
   * Format category name for display
   * @param {string} category - Category name
   * @returns {string} - Formatted category name
   */
  formatCategoryName(category) {
    const names = {
      bestsellers: 'Bestsellers',
      sale: 'Sale',
      exclusive: 'Exclusive',
      newArrivals: 'New Arrivals'
    };
    
    return names[category] || category;
  }
  
  /**
   * Format price string for display
   * @param {string} price - Raw price string 
   * @returns {Object} - Formatted price information
   */
  formatPrice(price) {
    if (!price) return { formattedPrice: 'N/A', isDiscounted: false };
    
    // Clean up the price string
    let formattedPrice = price.trim();
    
    // First, clean up any "In Stock" text that might be included in the price
    formattedPrice = formattedPrice.replace(/\d+\s*In\s*Stock/i, '').trim();
    
    console.log(`Formatting price: "${formattedPrice}"`);
    
    // Extract percentage discount information
    const percentMatch = formattedPrice.match(/(\d+)%\s*Off/i);
    const discountPercentage = percentMatch ? percentMatch[1] : null;
    
    // Extract PHP amounts
    const phpPriceMatch = formattedPrice.match(/PHP\s*([\d,]+\.?\d*)/g);
    
    // CASE 1: PHP price(s) with percentage discount
    if (phpPriceMatch && phpPriceMatch.length >= 1 && discountPercentage) {
      console.log(`Found PHP price: ${phpPriceMatch[0]} and discount: ${discountPercentage}%`);
      
      // Check if we have both discounted and original price
      if (phpPriceMatch.length >= 2) {
        // We have both prices - first is discounted, second is original
        return {
          formattedPrice: phpPriceMatch[0],
          isDiscounted: true,
          originalPrice: phpPriceMatch[1],
          discountPercentage: discountPercentage
        };
      } else {
        // We have only one price with percentage - calculate the original price
        const rawPrice = phpPriceMatch[0].replace(/PHP\s*/, '');
        const priceValue = parseFloat(rawPrice.replace(/,/g, ''));
        
        if (!isNaN(priceValue) && discountPercentage) {
          // Calculate the original price based on the percentage off
          const discountPercent = parseInt(discountPercentage);
          if (!isNaN(discountPercent) && discountPercent > 0) {
            const originalValue = priceValue / (1 - discountPercent/100);
            // Format similar to the original
            const originalPrice = `PHP ${originalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
            
            return {
              formattedPrice: phpPriceMatch[0],
              isDiscounted: true,
              originalPrice: originalPrice,
              discountPercentage: discountPercentage
            };
          }
        }
        
        // If calculation fails, just return the price with discount percentage
        return {
          formattedPrice: phpPriceMatch[0],
          isDiscounted: true,
          discountPercentage: discountPercentage
        };
      }
    }
    
    // CASE 2: Only percentage discount (no PHP price)
    if (!phpPriceMatch && discountPercentage) {
      console.log(`Only found discount percentage: ${discountPercentage}%`);
      
      return {
        formattedPrice: `${discountPercentage}% Off`,
        isDiscounted: true,
        discountPercentage: discountPercentage
      };
    }
    
    // CASE 3: Multiple PHP prices without explicit percentage
    if (phpPriceMatch && phpPriceMatch.length > 1 && !discountPercentage) {
      console.log(`Found multiple prices: ${phpPriceMatch.join(', ')}`);
      
      // Try to calculate the discount percentage
      const firstPrice = parseFloat(phpPriceMatch[0].replace(/PHP\s*/, '').replace(/,/g, ''));
      const secondPrice = parseFloat(phpPriceMatch[1].replace(/PHP\s*/, '').replace(/,/g, ''));
      
      if (!isNaN(firstPrice) && !isNaN(secondPrice) && secondPrice > firstPrice) {
        // Calculate discount percentage - assuming first price is discounted, second is original
        const calculatedDiscount = Math.round(((secondPrice - firstPrice) / secondPrice) * 100);
        
        return {
          formattedPrice: phpPriceMatch[0],
          isDiscounted: true,
          originalPrice: phpPriceMatch[1],
          discountPercentage: calculatedDiscount.toString()
        };
      }
      
      // If calculation fails or doesn't make sense, just return both prices
      return {
        formattedPrice: phpPriceMatch[0],
        isDiscounted: true,
        originalPrice: phpPriceMatch[1]
      };
    }
    
    // CASE 4: Single PHP price with no discount
    if (phpPriceMatch && phpPriceMatch.length === 1 && !discountPercentage) {
      console.log(`Found single price: ${phpPriceMatch[0]}`);
      return {
        formattedPrice: phpPriceMatch[0],
        isDiscounted: false
      };
    }
    
    // Fall back to returning the original string
    console.log(`Using original price string: ${formattedPrice}`);
    return { 
      formattedPrice, 
      isDiscounted: formattedPrice.toLowerCase().includes('off') 
    };
  }
  
  /**
   * Destroy the Discord client
   */
  destroy() {
    if (this.client) {
      this.client.destroy();
      this.isReady = false;
    }
  }
}

module.exports = new DiscordService(); 