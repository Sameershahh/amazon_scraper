import os
import csv
import time, re
import random
import logging
import asyncio
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from sqlalchemy import text

# ----------------------
# DB Integration
# ----------------------
from database import AsyncSessionLocal
from models import AmazonProduct

# ----------------------
# Config
# ----------------------
HEADLESS = True
WAIT_TIME = 10
ASIN_RE = re.compile(r"([A-Z0-9]{10})")

# ----------------------
# Logging (Production)
# ----------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("scraper.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ----------------------
# Setup Chrome Driver
# ----------------------
def start_driver(headless=True):
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless=new")

    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--lang=en-US")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

# ----------------------
# Save to Database
# ----------------------
async def save_to_db(asin, title, price, currency, status, product_url):
    """Async helper to save scraped item to database (production safe)."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                text("SELECT asin FROM amazon_products WHERE asin = :asin"),
                {"asin": asin},
            )
            if result.first():
                logger.info(f" Skipping duplicate ASIN: {asin}")
                return

            product = AmazonProduct(
                asin=asin,
                title=title,
                price=price,
                currency=currency,
                status=status,
                product_url=product_url,
            )
            session.add(product)
            await session.commit()
            logger.info(f"[OK] Saved to DB: {asin} | {title[:60]} | {price} {currency} | {status}")

        except Exception as e:
            await session.rollback()
            logger.error(f"[DB ERROR] {e}")

def save_price(asin, title, price, currency, status, url):
    """Sync wrapper for DB save."""
    try:
        asyncio.run(save_to_db(asin, title, price, currency, status, url))
    except Exception as e:
        logger.error(f"[ASYNC ERROR] {e}")

# ----------------------
# CSV Helper
# ----------------------
def save_to_csv(data, keyword):
    """Save scraped ASIN data to a CSV file."""
    folder = "scraped_csv"
    os.makedirs(folder, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(folder, f"{keyword}_{timestamp}.csv")

    fieldnames = ["asin", "title", "price", "currency", "status", "product_url"]
    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

    logger.info(f"[CSV SAVED] {filename}")
    return filename

# ----------------------
# Main Scraper
# ----------------------
def scrape_from_search_pages(keyword, pages=1):
    print(f" Starting scrape for '{keyword}' ({pages} pages)")

    driver = start_driver(headless=HEADLESS)
    all_results = []

    try:
        base = f"https://www.amazon.com/s?k={keyword.replace(' ', '+')}"

        for page in range(1, pages + 1):
            url = f"{base}&page={page}"
            print(f"[PAGE {page}] {url}")

            try:
                driver.get(url)
            except Exception as e:
                print(f"[ERROR] Page load failed: {e}")
                continue

            page_src = driver.page_source
            if "Robot Check" in page_src or "Enter the characters" in page_src:
                print("[/] Amazon robot check / anti-bot page detected. Aborting this run.")
                return []

            try:
                WebDriverWait(driver, WAIT_TIME).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.s-main-slot [data-asin]"))
                )
            except Exception:
                print(f"[WARN] Timeout waiting for results on page {page}")
                continue

            time.sleep(random.uniform(2.0, 4.0))
            items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot div[data-asin][data-component-type='s-search-result']")
            if not items:
                items = driver.find_elements(By.XPATH, "//div[@data-asin and contains(@class,'s-result-item')]")

            print(f"→ Found {len(items)} items on page {page}")

            for item in items:
                time.sleep(random.uniform(0.8, 2.2))
                try:
                    asin = (item.get_attribute("data-asin") or "").strip()
                    if not asin or not ASIN_RE.fullmatch(asin):
                        continue

                    try:
                        anchor = item.find_element(By.CSS_SELECTOR, "h2 a")
                        href = anchor.get_attribute("href") or ""
                        product_url = href.split("?")[0]
                    except:
                        product_url = f"https://www.amazon.com/dp/{asin}"

                    title = "Unknown"
                    for sel in [
                        "h2 a span",
                        "span.a-size-base-plus.a-color-base.a-text-normal",
                        "span.a-size-medium.a-color-base.a-text-normal",
                    ]:
                        try:
                            txt = item.find_element(By.CSS_SELECTOR, sel).text.strip()
                            if txt:
                                title = txt
                                break
                        except:
                            continue

                    price = None
                    for sel in [
                        "span.a-price span.a-offscreen",
                        "span.a-price-whole",
                        "span.a-text-price span.a-offscreen",
                    ]:
                        try:
                            el = item.find_element(By.CSS_SELECTOR, sel)
                            raw = el.text.strip().replace("$", "").replace(",", "")
                            if raw:
                                price = float(re.sub(r"[^\d.]", "", raw))
                                break
                        except:
                            continue

                    status = "ok" if price else "no_price"
                    currency = "USD"

                    save_price(asin, title, price or "", currency, status, product_url)

                    all_results.append({
                        "asin": asin,
                        "title": title,
                        "price": price or "",
                        "currency": currency,
                        "status": status,
                        "product_url": product_url,
                    })

                except Exception as e:
                    print(f"[ERROR] Skipping item: {e}")
                    continue

            time.sleep(random.uniform(2.5, 5.0))

        print(f" Scraper finished. Total results: {len(all_results)}")
        if all_results:
            save_to_csv(all_results, keyword)

        return all_results

    finally:
        try:
            driver.quit()
        except Exception:
            pass
        print(" Driver closed.")


def scrape_product_by_asin(asin: str):
    """
    Scrape a single Amazon product directly from its ASIN page.
    Returns structured product data.
    """
    driver = start_driver(headless=HEADLESS)
    product_url = f"https://www.amazon.com/dp/{asin}"

    try:
        print(f"[🔍] Scraping ASIN: {asin}")
        driver.get(product_url)
        print(f"[INFO] Opening URL: {product_url}")
        WebDriverWait(driver, WAIT_TIME).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "body"))
        )
        time.sleep(random.uniform(2.0, 3.5))

        page_src = driver.page_source
        if "Robot Check" in page_src or "Enter the characters" in page_src:
            print(f"[⚠️] Robot check detected for ASIN: {asin}")
            return None

        # ✅ Title
        title = None
        for sel in [
            "#productTitle",
            "span#title",
            "h1 span.a-size-large",
        ]:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                title = el.text.strip()
                if title:
                    break
            except:
                continue
        if not title:
            print(f"[❌] Title not found for ASIN: {asin}")
            return None

        # ✅ Price
        price = None
        for sel in [
            "span.a-price span.a-offscreen",
            "#corePriceDisplay_desktop_feature_div span.a-offscreen",
            "span#price_inside_buybox",
            "span#priceblock_ourprice",
            "span#priceblock_dealprice",
        ]:
            try:
                el = driver.find_element(By.CSS_SELECTOR, sel)
                raw = el.text.strip()
                if raw:
                    price = float(re.sub(r"[^\d.]", "", raw))
                    break
            except:
                continue

        status = "ok" if price else "no_price"
        currency = "USD"

        print(f"[✅] Scraped {asin} | {title[:50]} | {price if price else 'N/A'}")

        return {
            "asin": asin,
            "title": title,
            "price": price or "",
            "currency": currency,
            "status": status,
            "product_url": product_url,
        }

    except Exception as e:
        print(f"[❌] Failed to scrape ASIN {asin}: {e}")
        return None

    finally:
        try:
            driver.quit()
        except:
            pass
