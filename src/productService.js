/**
 * Service to manage product data and detect changes
 */
class ProductService {
  constructor() {
    // Store products by category
    this.productsByCategory = {
      bestsellers: new Map(),
      sale: new Map(),
      exclusive: new Map(),
      newArrivals: new Map()
    };
  }

  /**
   * Processes new products and returns only products not seen before
   * @param {string} category - Category name (bestsellers, sale, exclusive, newArrivals)
   * @param {Array} products - Array of product objects from scraper
   * @returns {Array} - Array of new products that weren't seen before
   */
  processNewProducts(category, products) {
    if (!this.productsByCategory[category]) {
      throw new Error(`Invalid category: ${category}`);
    }

    const categoryProducts = this.productsByCategory[category];
    const newProducts = [];

    products.forEach(product => {
      // Skip products without ID
      if (!product.id) return;

      // If product is not already in our store, it's new
      if (!categoryProducts.has(product.id)) {
        newProducts.push(product);
        categoryProducts.set(product.id, product);
      }
    });

    return newProducts;
  }

  /**
   * Gets all stored products for a category
   * @param {string} category - Category name
   * @returns {Array} - Array of stored products
   */
  getProductsByCategory(category) {
    if (!this.productsByCategory[category]) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    return Array.from(this.productsByCategory[category].values());
  }

  /**
   * Clears all stored products
   */
  clearAllProducts() {
    Object.keys(this.productsByCategory).forEach(category => {
      this.productsByCategory[category].clear();
    });
  }
}

module.exports = new ProductService(); 