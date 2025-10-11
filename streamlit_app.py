import streamlit as st
import pandas as pd
import os
from scraper import PRODUCTS_FILE, PRICES_FILE, start_driver, scrape_from_csv, scrape_from_search

st.set_page_config(layout="wide", page_title="Amazon Price Tracker")

st.title("📦 Amazon Price Tracker (Dual Mode)")

# Sidebar
st.sidebar.header("Options")
mode = st.sidebar.radio("Choose Mode", ["CSV Mode", "Search Mode"])
headless = st.sidebar.checkbox("Headless browser", value=True)
max_items = st.sidebar.number_input("Max items (CSV mode only, 0 = all)", min_value=0, value=0, step=1)

# CSV Mode
if mode == "CSV Mode":
    st.subheader("📂 Using products.csv")
    if os.path.exists(PRODUCTS_FILE):
        df_products = pd.read_csv(PRODUCTS_FILE)
        st.dataframe(df_products)
    else:
        st.warning("No products.csv found.")

    if st.button("Run CSV Scraper"):
        driver = start_driver(headless=headless)
        scrape_from_csv(driver, max_items=max_items if max_items > 0 else None)
        driver.quit()
        st.success("CSV scraping completed!")

# Search Mode
if mode == "Search Mode":
    keyword = st.text_input("Enter keyword or ASIN (e.g., wired mouse, B07PGL2ZSL)")
    if st.button("Run Search Scraper"):
        driver = start_driver(headless=headless)
        scrape_from_search(driver, keyword)
        driver.quit()
        st.success(f"Scraping for '{keyword}' completed!")

# Show results
st.subheader("📈 Prices history (data/prices.csv)")
if os.path.exists(PRICES_FILE):
    df_prices = pd.read_csv(PRICES_FILE)
    st.dataframe(df_prices.tail(200))
else:
    st.warning("No prices.csv yet. Run a scraper to create it.")
