# backend_api.py
from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import pathlib

# Import your existing functions/constants from scraper.py (unchanged)
from scraper import start_driver, scrape_from_search, scrape_from_search_pages, PRICES_FILE

app = FastAPI()

# Allow CORS for local dev / frontend calls (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Amazon Scraper API is running"}

# Keep your original scrape GET route unchanged (calls existing function that expects driver)
@app.get("/scrape")
def scrape(keyword: str = Query("wireless earbuds", description="Search keyword")):
    driver = start_driver(headless=True)
    try:
        scrape_from_search(driver, keyword)
        return {"message": f"Scraping complete for '{keyword}'"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        driver.quit()

# NEW/UPDATED: POST /run-scraper
# Accepts JSON body: { "keyword": "term", "pages": 3 }
@app.post("/run-scraper")
async def run_scraper(request: Request):
    data = await request.json()
    keyword = data.get("keyword")
    pages = int(data.get("pages", 1) or 1)

    if not keyword:
        raise HTTPException(status_code=400, detail="keyword required")

    # Log for debugging
    print(f"[run-scraper] keyword='{keyword}' pages={pages}")

    # Use the new helper that handles driver lifecycle and page loops.
    # This keeps your original `scrape_from_search(driver, keyword)` untouched.
    try:
        csv_name = scrape_from_search_pages(keyword, pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": f"Scraping complete for '{keyword}' ({pages} pages)", "csv_file": csv_name}

# Download CSV endpoint
@app.get("/download-csv")
def download_csv(filename: str = Query(..., description="CSV filename to download")):
    data_dir = os.path.dirname(PRICES_FILE)
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(data_dir, safe_filename)
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=safe_filename, media_type="text/csv")
    raise HTTPException(status_code=404, detail="file not found")

# Delete CSV endpoint
@app.delete("/delete-csv")
def delete_csv():
    try:
        base_dir = os.path.dirname(__file__)
        file_path = os.path.join(base_dir, "data", "prices.csv")

        if os.path.exists(file_path):
            os.remove(file_path)
            return {"success": True, "message": "prices.csv deleted successfully"}
        else:
            return {"success": False, "error": f"File not found at {file_path}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
