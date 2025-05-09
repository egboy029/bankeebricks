# 📦 BankeeBricks Discord Notifier Bot - Features

A simple Discord bot built with JavaScript to automatically notify about new LEGO items on [bankeebricks.ph](https://www.bankeebricks.ph) in real time.

---

## 🚀 Core Features

### 🔍 Automatic Monitoring
- Scrapes and monitors the following BankeeBricks categories:
  - 🟢 Bestsellers
  - 🔴 Sale
  - 🟡 Exclusive
  - 🔵 New Arrivals
- No user commands required — completely automatic.

### 💬 Category-Specific Notifications
- Posts updates in **separate text channels**, one per category:
  - `#bestsellers`
  - `#sale`
  - `#exclusive`
  - `#new-arrivals`
- Each message includes:
  - Product name
  - Price
  - Product link (embed in the product name)
  - Thumbnail image
  - in stock or This product is no longer in stock

### 🧠 Change Detection
- Keeps track of previously seen products (via product ID or URL).
- Only notifies when a **new item is added** to a category.

### 🔁 Periodic Checks
- Checks for updates at a set interval every 1 minute





