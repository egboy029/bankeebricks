const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes products from a given category URL
 * @param {string} url - The URL of the category to scrape
 * @param {string} categoryType - The type of category (bestsellers, sale, etc.)
 * @returns {Promise<Array>} - Array of product objects
 */
async function scrapeCategory(url, categoryType = 'general') {
  try {
    console.log(`Scraping URL: ${url} for category: ${categoryType}`);
    
    // Set up axios with headers to mimic a browser request
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 15000 // Extend timeout to 15 seconds
    });
    
    const $ = cheerio.load(response.data);
    
    // More detailed debug info
    console.log(`Page title: ${$('title').text()}`);
    console.log(`Page URL: ${url}`);
    console.log(`Response status: ${response.status}`);
    
    // BankeeBricks has a specific structure, extract based on that
    let products = [];
    
    // For product listings page, extract products
    console.log(`Looking for product listings on ${url}...`);
    const productItems = $('.ajax_block_product, .product-miniature, .product-item, article');
    console.log(`Found ${productItems.length} product items using main selectors`);
    
    if (productItems.length > 0) {
      productItems.each(function() {
        const product = extractProductData($, $(this));
        if (product && isValidProduct(product)) {
          products.push(product);
        }
      });
    } else {
      // Try alternative selectors if no products found
      const productListings = $('#js-product-list, .products-grid, .product_list, .products');
      console.log(`Found ${productListings.length} product listing containers`);
      
      if (productListings.length > 0) {
        const containerProducts = extractProductsFromContainer($, productListings);
        products = products.concat(containerProducts);
      } else {
        // If still no products found, use broader search
        products = extractAllProductsFromPage($);
      }
    }
    
    // If no products found, return demo products
    if (products.length === 0) {
      console.log(`No products found for ${categoryType}. Returning demo products.`);
      return createDemoProducts(categoryType);
    }
    
    // Make sure product links and images are absolute URLs but preserve BankeeBricks links
    products = products.map(product => {
      // Fix product links - make them absolute but preserve BankeeBricks domain
      if (product.link && !product.link.startsWith('http')) {
        product.link = new URL(product.link, 'https://www.bankeebricks.ph').href;
      }
      
      // Fix image URLs - make them absolute
      if (product.imageUrl && !product.imageUrl.startsWith('http')) {
        product.imageUrl = new URL(product.imageUrl, 'https://www.bankeebricks.ph').href;
      }
      
      // DO NOT replace with LEGO.com links - preserve original BankeeBricks links
      // Only fix if image is missing
      if (!product.imageUrl && product.name && product.name.includes('LEGO')) {
        const setNumberMatch = product.name.match(/\b\d{5}\b/);
        if (setNumberMatch) {
          const setNumber = setNumberMatch[0];
          product.imageUrl = `https://www.lego.com/cdn/cs/set/assets/${setNumber}_1.png`;
          // Do not change product links to LEGO.com - keep original BankeeBricks links
        }
      }
      
      return product;
    });
    
    console.log(`Successfully extracted ${products.length} products for ${categoryType}`);
    return products;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Headers:`, error.response.headers);
    }
    
    // Return demo products for testing in case of error
    console.log(`Returning demo products for ${categoryType} due to error`);
    return createDemoProducts(categoryType);
  }
}

/**
 * Extract products from a section near a heading
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Object} headingElement - The heading element
 * @returns {Array} - Array of product objects
 */
function extractProductsFromSection($, headingElement) {
  const products = [];
  
  // Try to find products in the next element or parent container
  let container = headingElement.next();
  let productElements = container.find('.product-miniature, .product-item, [class*="product"]');
  
  // If no products found, look in parent container
  if (productElements.length === 0) {
    container = headingElement.parent();
    productElements = container.find('.product-miniature, .product-item, [class*="product"]');
  }
  
  // If still no products, look at siblings
  if (productElements.length === 0) {
    productElements = headingElement.siblings().find('.product-miniature, .product-item, [class*="product"]');
  }
  
  productElements.each(function() {
    const product = extractProductData($, $(this));
    if (product && isValidProduct(product)) {
      products.push(product);
    }
  });
  
  return products;
}

/**
 * Extract products from a container element
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Object} container - The container element
 * @returns {Array} - Array of product objects
 */
function extractProductsFromContainer($, container) {
  const products = [];
  
  // Look for product elements - BankeeBricks usually has product info in a specific format
  // First try with their typical product element format
  const productElements = container.find('.product-miniature, .product-item, .item, article, .product-container');
  
  if (productElements.length > 0) {
    productElements.each(function() {
      const product = extractProductData($, $(this));
      if (product && isValidProduct(product)) {
        products.push(product);
      }
    });
  } else {
    // If no products found using the typical selectors, try looking for the list structure
    // This is for the format seen on the best-sales page
    container.find('li, .ajax_block_product').each(function() {
      // Check if this element contains product information
      if ($(this).find('.product-title, h5, .price, img').length > 0) {
        const product = extractProductData($, $(this));
        if (product && isValidProduct(product)) {
          products.push(product);
        }
      }
    });
  }
  
  return products;
}

/**
 * Extract all products from the page
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Array} - Array of product objects
 */
function extractAllProductsFromPage($) {
  const products = [];
  
  // For BankeeBricks, first try the product listing container
  const productListings = $('#js-product-list, .products-grid, .product_list');
  if (productListings.length > 0) {
    console.log('Found product listing container');
    const containerProducts = extractProductsFromContainer($, productListings);
    products.push(...containerProducts);
  }
  
  // If no products found in listing containers, try looking for individual product blocks
  if (products.length === 0) {
    // Look for elements that have typical product info structure
    $('.ajax_block_product, .product-container, .product-miniature').each(function() {
      const product = extractProductData($, $(this));
      if (product && isValidProduct(product) && !products.some(p => p.id === product.id)) {
        products.push(product);
      }
    });
  }
  
  // If still no products found, try a broader, more generic approach
  if (products.length === 0) {
    console.log('No products found in standard containers, trying generic search');
    // Look for any elements with price information (PHP currency)
    $('*').each(function() {
      const text = $(this).text();
      if (/PHP\s*[\d,]+\.?\d*/.test(text)) {
        const element = $(this).closest('article, .product, .item, div[class*="product"], li.ajax_block_product');
        if (element.length > 0) {
          const product = extractProductData($, element);
          if (product && isValidProduct(product) && !products.some(p => p.id === product.id)) {
            products.push(product);
          }
        }
      }
    });
  }
  
  return products;
}

/**
 * Extract product data from an element
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Object} element - The product element
 * @returns {Object} - Product object
 */
function extractProductData($, element) {
  // BankeeBricks uses a specific format for product listings
  // Debug the element structure
  console.log(`Extracting data from element with classes: ${element.attr('class')}`);
  
  // Find the product name - BankeeBricks uses h5 or .product-title for names
  const nameElement = element.find('.product-title a, .product-name a, h2 a, h3 a, h5 a, .item-title a, h5').first();
  let name = '';
  
  if (nameElement.length > 0) {
    name = nameElement.text().trim();
  } else {
    name = element.find('.product-title, .product-name, h2, h3, h5, .item-title').first().text().trim();
  }
  
  // Clean up name - sometimes there's extra whitespace or line breaks
  name = name.replace(/\s+/g, ' ').trim();
  
  // Find the product link - first try the name element, then look at product link
  let link = '';
  if (nameElement.length > 0 && nameElement.attr('href')) {
    link = nameElement.attr('href');
  } 
  
  // If no link found in name element, try looking for product links
  if (!link) {
    const linkElement = element.find('.product_img_link, .product-image a, a.product-thumbnail, a').first();
    if (linkElement.length > 0) {
      link = linkElement.attr('href') || '';
    }
  }
  
  // If still no link and there's a product ID, try to build a link
  if (!link) {
    const productId = element.attr('data-id-product') || element.attr('data-product-id');
    if (productId) {
      // Attempt to build a URL from the product ID
      link = `https://www.bankeebricks.ph/product.php?id_product=${productId}`;
    }
  }
  
  // Find the price - BankeeBricks typically shows price with PHP currency
  let price = '';
  
  // First check for the actual price (PHP) 
  const priceElements = element.find('.price, .product-price, .special-price, [class*="price"], .content_price span');
  if (priceElements.length > 0) {
    priceElements.each(function() {
      const priceText = $(this).text().trim();
      if (priceText.includes('PHP')) {
        if (price) {
          price += ' ' + priceText; // Add additional prices (for sale items)
        } else {
          price = priceText;
        }
      } else if (priceText.includes('%') && priceText.includes('Off')) {
        // This is a percentage discount
        if (price) {
          price += ' ' + priceText;
        } else {
          price = priceText;
        }
      }
    });
  }
  
  // If no specific price element found, look for PHP format in text
  if (!price) {
    const text = element.text();
    // Look for PHP price
    const phpMatches = text.match(/PHP\s*[\d,]+\.?\d*/g);
    if (phpMatches && phpMatches.length > 0) {
      price = phpMatches.join(' ');
    } else {
      // Look for percentage discount
      const percentMatch = text.match(/(\d+)%\s*Off/i);
      if (percentMatch) {
        price = percentMatch[0];
      }
    }
  }
  
  // Find product image - BankeeBricks typically has this in img elements
  let imageUrl = '';
  // First look for product image
  const imgElement = element.find('.product-image img, .product_img_link img, .product-thumbnail img, img').first();
  if (imgElement.length) {
    // BankeeBricks may use different attributes for images
    imageUrl = imgElement.attr('data-src-large') || 
               imgElement.attr('data-full-size-image-url') ||
               imgElement.attr('data-high-res-src') || 
               imgElement.attr('data-original') ||
               imgElement.attr('data-lazy-src') ||
               imgElement.attr('data-src') ||
               imgElement.attr('src') || '';
  }
  
  // Try to find product ID - BankeeBricks may include this in attributes
  let productId = element.attr('data-id-product') || 
                  element.attr('data-product-id');
  
  // Try extracting ID from URL if attribute not found
  if (!productId && link) {
    const idMatch = link.match(/id_product=(\d+)/) || link.match(/\/(\d+)-/);
    if (idMatch && idMatch[1]) {
      productId = idMatch[1];
    } else {
      // Try looking for ID in parent elements
      const parentWithId = element.closest('[data-id-product], [data-product-id]');
      if (parentWithId.length > 0) {
        productId = parentWithId.attr('data-id-product') || parentWithId.attr('data-product-id');
      }
    }
  }
  
  // If no ID found, generate one from the name
  if (!productId && name) {
    productId = `product-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
  }
  
  // Check if product is in stock - BankeeBricks typically indicates out of stock items
  const inStock = !element.find('.out-of-stock, .unavailable, .sold-out').length;
  
  console.log(`Extracted product: ${name}, Link: ${link}`);
  
  return {
    id: productId,
    name,
    price,
    link,
    imageUrl,
    inStock
  };
}

/**
 * Check if a product object is valid (has required fields)
 * @param {Object} product - Product object
 * @returns {boolean} - True if product is valid
 */
function isValidProduct(product) {
  return (
    product.id && 
    product.name && product.name.length > 3 &&
    product.price &&
    (product.link || product.imageUrl)
  );
}

/**
 * Create demo products for testing
 * @param {string} categoryType - The type of category
 * @returns {Array} - Array of demo product objects
 */
function createDemoProducts(categoryType) {
  const demoProducts = [
    {
      id: 'product-10302',
      name: 'LEGO® D2C Icons 10302 Optimus Prime, Age 18+, Building Blocks, 2022 (1508pcs)',
      price: 'PHP 12,799.00',
      link: 'https://www.bankeebricks.ph/lego-d2c-icons-10302-optimus-prime-age-18-building-blocks-2022-1508pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/3/7/9/8/3798-home_default.jpg',
      inStock: true
    },
    {
      id: 'product-21339',
      name: 'LEGO® D2C Ideas 21339 BTS Dynamite, Age 18+, Building Blocks, 2023 (749pcs)',
      price: 'PHP 7,299.00',
      link: 'https://www.bankeebricks.ph/lego-d2c-ideas-21339-bts-dynamite-age-18-building-blocks-2023-749pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/4/0/5/9/4059-home_default.jpg',
      inStock: true
    },
    {
      id: 'product-10281',
      name: 'LEGO® Creator Expert 10281 Bonsai Tree, Age 18+, Building Blocks, 2021 (878pcs)',
      price: 'PHP 3,799.00',
      link: 'https://www.bankeebricks.ph/lego-creator-expert-10281-bonsai-tree-age-18-building-blocks-2021-878pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/2/5/0/4/2504-home_default.jpg',
      inStock: true
    }
  ];
  
  // Add a category-specific product
  const categoryProducts = {
    bestsellers: {
      id: 'product-10295',
      name: 'LEGO® D2C 10295 Creator Expert Porsche 911, Age 18+, Building Blocks, 2021 (1458pcs)',
      price: 'PHP 11,499.00',
      link: 'https://www.bankeebricks.ph/lego-d2c-10295-creator-expert-porsche-911-age-18-building-blocks-2021-1458pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/2/8/5/0/2850-home_default.jpg',
      inStock: true
    },
    sale: {
      id: 'product-10280',
      name: 'LEGO® Creator Expert 10280 Flower Bouquet, Age 18+, Building Blocks, 2021 (756pcs)',
      price: 'PHP 3,360.00 PHP 4,199.00',
      link: 'https://www.bankeebricks.ph/lego-creator-expert-10280-flower-bouquet-age-18-building-blocks-2021-756pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/2/4/9/9/2499-home_default.jpg',
      inStock: true
    },
    exclusive: {
      id: 'product-10333',
      name: 'LEGO® D2C Ideas 10333 Viking Village, Age 18+, Building Blocks, 2023 (2103pcs)',
      price: 'PHP 12,799.00',
      link: 'https://www.bankeebricks.ph/lego-d2c-ideas-10333-viking-village-age-18-building-blocks-2023-2103pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/4/0/6/1/4061-home_default.jpg',
      inStock: true
    },
    newArrivals: {
      id: 'product-21345',
      name: 'LEGO® D2C Ideas 21345 Polaroid OneStep SX-70 Camera, Age 18+, Building Blocks, 2023 (516pcs)',
      price: 'PHP 6,499.00',
      link: 'https://www.bankeebricks.ph/lego-d2c-ideas-21345-polaroid-onestep-sx-70-camera-age-18-building-blocks-2023-516pcs',
      imageUrl: 'https://www.bankeebricks.ph/img/p/4/0/3/7/4037-home_default.jpg',
      inStock: true
    }
  };
  
  if (categoryProducts[categoryType]) {
    // Add the category-specific product
    demoProducts.unshift(categoryProducts[categoryType]);
  }
  
  console.log(`Created ${demoProducts.length} demo products for ${categoryType}`);
  
  return demoProducts;
}

/**
 * Extract product ID from URL
 * @param {string} url - Product URL
 * @returns {string|null} - Product ID or null
 */
function extractProductId(url) {
  if (!url) return null;
  
  // Try to extract product ID from URL
  const patterns = [
    /product\/([a-zA-Z0-9-]+)/, // product/product-name
    /\/([0-9]+)-/,              // /12345-product-name
    /[_\/-]([0-9]{4,6})[_\/-]/  // Match LEGO set numbers
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

module.exports = {
  scrapeCategory
}; 