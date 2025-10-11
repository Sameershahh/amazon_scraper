import os
import csv
import time
import random
from datetime import datetime, timezone
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ----------------------
# Config
# ----------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PRODUCTS_FILE = os.path.join(DATA_DIR, "products.csv")
PRICES_FILE = os.path.join(DATA_DIR, "prices.csv")

HEADLESS = True
WAIT_TIME = 10

os.makedirs(DATA_DIR, exist_ok=True)

# ----------------------
# Setup Chrome Driver
# ----------------------
def start_driver(headless=True):
    chrome_options = webdriver.ChromeOptions()
    if headless:
        chrome_options.add_argument("--headless=new")

    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")

    chrome_options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

# ----------------------
# Save Prices CSV
# (unchanged)
# ----------------------
def save_price(sku, title, price, currency, status, url):
    file_exists = os.path.exists(PRICES_FILE)
    with open(PRICES_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["date", "sku", "title", "price", "currency", "status", "url"])
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        writer.writerow([today, sku, title, price, currency, status, url])
    print(f"[OK] Saved: {sku} | {title[:50]} | {price} {currency} | {status}")

# ----------------------
# Extract price with multiple fallbacks
# (unchanged)
# ----------------------
def extract_price(item):
    selectors = [
        "span.a-price span.a-offscreen",
        "span.a-price .a-offscreen",
        "span.a-color-base.a-text-bold",
        "span.a-price-whole",
        "span.a-text-price span.a-offscreen",
    ]
    for selector in selectors:
        try:
            elem = item.find_element(By.CSS_SELECTOR, selector)
            price_text = elem.get_attribute("innerText").replace("$", "").replace(",", "").strip()
            if price_text:
                return float(price_text)
        except:
            continue
    return None

# ----------------------
# Scrape product page
# (unchanged)
# ----------------------
def scrape_product(driver, url, sku):
    driver.get(url)
    time.sleep(random.uniform(2, 4))

    try:
        title_elem = WebDriverWait(driver, WAIT_TIME).until(
            EC.presence_of_element_located((By.ID, "productTitle"))
        )
        title = title_elem.text.strip()
    except:
        title = "Unknown"

    # note: keep existing behavior
    price = extract_price(driver)  # original code used driver here; leaving as-is
    status = "ok" if price else "no_price"

    save_price(sku, title, price or "", "USD", status, url)

# ----------------------
# CSV Mode
# (unchanged)
# ----------------------
def scrape_from_csv(driver, max_items=None):
    if not os.path.exists(PRODUCTS_FILE):
        raise FileNotFoundError(f"{PRODUCTS_FILE} not found.")

    with open(PRODUCTS_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        products = list(reader)

    if max_items:
        products = products[:max_items]

    for product in products:
        url = product.get("url") or f"https://www.amazon.com/dp/{product['sku']}"
        sku = product["sku"]
        scrape_product(driver, url, sku)
        time.sleep(random.uniform(2, 5))

# ----------------------
# Search Mode (original function — unchanged)
# ----------------------
def scrape_from_search(driver, keyword):
    base_url = f"https://www.amazon.com/s?k={keyword.replace(' ', '+')}"
    print(f"Searching Amazon for: {base_url}")  

    driver.get(base_url)
    time.sleep(random.uniform(3, 5))

    items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot div[data-asin][data-component-type='s-search-result']")
    print(f"Found {len(items)} items")

    if not items:
        print("No items found — Amazon might be blocking or layout changed.")

    for item in items:
        asin = item.get_attribute("data-asin")
        if not asin:
            continue

        try:
            title = item.find_element(By.CSS_SELECTOR, "h2 a span").text.strip()
        except:
            title = "Unknown"

        price = extract_price(item)
        status = "ok" if price else "no_price"

        url = f"https://www.amazon.com/dp/{asin}"
        save_price(asin, title, price or "", "USD", status, url)

    print(f"Results saved to: {os.path.abspath(PRICES_FILE)}")

# ----------------------
# New helper: scrape multiple pages (safe append — new)
# ----------------------
def scrape_from_search_pages(keyword, pages=1):
    """
    Scrapes multiple pages of Amazon search results and writes to PRICES_FILE.
    - Removes previous PRICES_FILE at the start so each run is fresh.
    - Tries direct URL with &page=N and if items are empty, tries clicking pagination button.
    - Returns the basename of PRICES_FILE (so backend can return csv_file to frontend).
    """
    # Remove old prices file to ensure fresh output
    if os.path.exists(PRICES_FILE):
        try:
            os.remove(PRICES_FILE)
            print(f"[scrape_from_search_pages] Removed previous {PRICES_FILE}")
        except Exception as e:
            print(f"[scrape_from_search_pages] Warning: could not remove old file: {e}")

    driver = start_driver(headless=HEADLESS)
    try:
        base = f"https://www.amazon.com/s?k={keyword.replace(' ', '+')}"
        print(f"[scrape_from_search_pages] Starting multi-page scrape for '{keyword}' ({pages} pages)")

        for page in range(1, pages + 1):
            url = f"{base}&page={page}"
            print(f"[scrape_from_search_pages] Visiting page {page}: {url}")
            driver.get(url)
            time.sleep(random.uniform(2.5, 5.0))

            items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot div[data-asin][data-component-type='s-search-result']")
            print(f"[scrape_from_search_pages] Found {len(items)} items on page {page}")

            # Fallback: if no items found via direct URL, try clicking pagination button
            if not items:
                try:
                    print("[scrape_from_search_pages] No items found via direct URL, attempting pagination click fallback...")
                    pag_buttons = driver.find_elements(By.CSS_SELECTOR, "a.s-pagination-item")
                    clicked = False
                    for b in pag_buttons:
                        text = (b.text or "").strip()
                        if text == str(page):
                            try:
                                b.click()
                                clicked = True
                                time.sleep(random.uniform(2, 4))
                                break
                            except Exception:
                                continue
                    if clicked:
                        items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot div[data-asin][data-component-type='s-search-result']")
                        print(f"[scrape_from_search_pages] After click, found {len(items)} items on page {page}")
                except Exception as e:
                    print(f"[scrape_from_search_pages] Pagination fallback failed: {e}")

            if not items:
                print(f"[scrape_from_search_pages] Warning: still no items on page {page}. Continuing to next page.")
                continue

            for item in items:
                try:
                    asin = item.get_attribute("data-asin")
                    if not asin:
                        continue
                    try:
                        title = item.find_element(By.CSS_SELECTOR, "h2 a span").text.strip()
                    except:
                        title = "Unknown"
                    price = extract_price(item)
                    status = "ok" if price else "no_price"
                    url = f"https://www.amazon.com/dp/{asin}"
                    save_price(asin, title, price or "", "USD", status, url)
                except Exception as e:
                    print(f"[scrape_from_search_pages] Error processing item: {e}")
                    continue

            # short random delay between pages
            time.sleep(random.uniform(1.5, 3.0))

    finally:
        driver.quit()

    print(f"[scrape_from_search_pages] Finished. Results saved to: {os.path.abspath(PRICES_FILE)}")
    return os.path.basename(PRICES_FILE)

# ----------------------
# Main CLI (unchanged)
# ----------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Amazon Scraper CLI")
    parser.add_argument("--mode", choices=["csv", "search"], default="search")
    parser.add_argument("--keyword", type=str, default="wireless earbuds")
    parser.add_argument("--max_items", type=int, default=0)
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    driver = start_driver(headless=args.headless)

    try:
        if args.mode == "csv":
            scrape_from_csv(driver, max_items=args.max_items or None)
        else:
            scrape_from_search(driver, args.keyword)
    finally:
        driver.quit()

    print(f"Results saved in: {os.path.abspath(PRICES_FILE)}")
    print("Scraping finished successfully!")
