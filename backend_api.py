from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import pandas as pd
import os
import datetime
import tempfile
from io import StringIO

from models import AmazonProduct  # your SQLAlchemy model
from scraper import scrape_from_search_pages, scrape_product_by_asin  # your existing scraper
from database import Base  # Base metadata

# =========================
# Database setup
# =========================
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =========================
# FastAPI setup
# =========================
app = FastAPI(title="Amazon Scraper API", version="3.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Models
# =========================
class ScraperRequest(BaseModel):
    keyword: str
    pages: int = 1


# =========================
# Root
# =========================
@app.get("/")
def root():
    return {"message": "Amazon Scraper API is live."}


# =========================
# Auto-cleanup old data (24h)
# =========================
def auto_cleanup_old_data():
    db = SessionLocal()
    try:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
        deleted = db.query(AmazonProduct).filter(AmazonProduct.created_at < cutoff).delete()
        db.commit()
        if deleted:
            print(f"Cleaned {deleted} old records (>24h).")
    except Exception as e:
        print(f"Cleanup failed: {e}")
    finally:
        db.close()


auto_cleanup_old_data()


# =========================
# Search Scraper
# =========================
@app.post("/run-scraper")
def run_scraper(request: ScraperRequest):
    keyword = request.keyword.strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword cannot be empty")

    try:
        results = scrape_from_search_pages(keyword, request.pages)
        if not results:
            raise HTTPException(status_code=404, detail="No data scraped")

        db = SessionLocal()
        added, skipped = 0, 0

        for item in results:
            asin = item.get("asin")
            if not asin:
                continue

            if db.query(AmazonProduct).filter_by(asin=asin).first():
                skipped += 1
                continue

            product = AmazonProduct(
                asin=asin,
                title=item.get("title", "Unknown"),
                price=item.get("price", "N/A"),
                currency=item.get("currency", "USD"),
                status=item.get("status", "ok"),
                product_url=item.get("product_url", "")
            )
            db.add(product)
            added += 1

        db.commit()
        db.close()

        return JSONResponse(content={
            "message": f"Scraping complete for '{keyword}'",
            "added": added,
            "skipped": skipped
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraper failed: {str(e)}")


# =========================
# CSV Scraper (DB-only)
# =========================
@app.post("/scrape-csv")
async def scrape_csv(file: UploadFile = File(...)):
    """
    Upload a CSV containing an 'ASIN' column.
    Scrapes each ASIN and stores the result in the database asynchronously.
    """
    try:
        #  Read CSV safely
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode("utf-8")))

        #  Normalize columns
        df.columns = [col.strip().upper() for col in df.columns]
        if "ASIN" not in df.columns:
            raise HTTPException(status_code=400, detail="CSV must contain an 'ASIN' column")

        asins = df["ASIN"].dropna().astype(str).unique().tolist()
        if not asins:
            raise HTTPException(status_code=400, detail="No ASINs found in CSV")

        added, skipped, failed = 0, 0, 0

        db = SessionLocal()

        #  Async loop
        for asin in asins:
            asin = asin.strip()
            if not asin:
                continue

            #  Check duplicates in DB
            result = await db.execute(select(AmazonProduct).where(AmazonProduct.asin == asin))
            existing = result.scalars().first()
            if existing:
                skipped += 1
                continue

            try:
                print(f" Scraping ASIN: {asin}")
                item = scrape_product_by_asin(asin)

                if not item:
                    failed += 1
                    print(f" Failed to scrape {asin}")
                    continue

                print(f" Scraped: {item.get('title', 'Unknown')}")

                product = AmazonProduct(
                    asin=item.get("asin", asin),
                    title=item.get("title", "Unknown"),
                    price=item.get("price", "N/A"),
                    currency=item.get("currency", "USD"),
                    status=item.get("status", "ok"),
                    product_url=item.get("product_url", "")
                )

                db.add(product)
                await db.commit()
                added += 1

            except Exception as scrape_error:
                failed += 1
                await db.rollback()
                print(f" Error scraping {asin}: {scrape_error}")

        db.close()

        return JSONResponse(content={
            "message": "Scraping completed from CSV",
            "added": added,
            "skipped": skipped,
            "failed": failed
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV scrape failed: {e}")

# =========================
# Download CSV (from DB)
# =========================
@app.get("/download_csv")
def download_csv(mode: str = "combined"):
    db = SessionLocal()
    try:
        products = db.query(AmazonProduct).all()
    finally:
        db.close()

    if not products:
        raise HTTPException(status_code=404, detail="No data in database")

    df = pd.DataFrame([{
        "ASIN": p.asin,
        "Title": p.title,
        "Price": p.price,
        "Currency": p.currency,
        "Status": p.status,
        "Product URL": p.product_url
    } for p in products])

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        df.to_csv(tmp.name, index=False)
        tmp_path = tmp.name

    return FileResponse(tmp_path, media_type="text/csv", filename="amazon_products.csv")


# =========================
# Clear DB (called by frontend)
# =========================
@app.delete("/clear_db")
def clear_database():
    db = SessionLocal()
    try:
        deleted = db.query(AmazonProduct).delete()
        db.commit()
        return {"message": f"Cleared {deleted} products from database."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Clear DB failed: {e}")
    finally:
        db.close()
