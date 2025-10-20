# Amazon Price Tracker

A full-stack application that tracks and monitors product prices on Amazon in real time.  
Built with **FastAPI**, **PostgreSQL**, and **Selenium** for backend automation, and **Next.js** as the primary frontend interface.  
Includes a **Streamlit dashboard** for secondary data visualization.

---

## Project Overview

**Amazon Price Tracker** is a production-ready web application designed to automatically scrape, store, and analyze Amazon product prices.  
It enables users to track price fluctuations, monitor trends, and visualize data interactively.

The project demonstrates strong skills in backend development, API design, and frontend integration for real-world data tracking and analysis.

---

## Tech Stack

**Backend**
- FastAPI
- Selenium
- PostgreSQL (NeonDB)
- SQLAlchemy

**Frontend**
- Next.js (Primary)
- TailwindCSS
- Streamlit (Secondary Visualization UI)

---

## Features

- Fetch and store product details (name, price, rating, URL, etc.)
- Monitor price changes and update the database automatically
- Expose data via REST API endpoints
- Visualize results in Streamlit dashboard
- Responsive Next.js frontend for user interaction
- Supports scheduled scraping and data refresh

---

## Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Sameershahh/amazon_scraper.git
cd amazon_scraper
```

### 2. Create Virtual Environment
```bash
python -m venv venv
venv\Scripts\activate        # On Windows
source venv/bin/activate     # On Mac/Linux
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configuration Environment
```bash
DATABASE_URL=postgresql+psycopg2://user:password@host/dbname
```

### 5. Run the FastAPI Server
```bash
uvicorn backend.main:app --reload
```

### 6. Run the Next.js Frontend
```bash
cd amazon_scraper
npm install
npm run dev
```

### Open your browser to navigate to:
```bash
http://localhost:3000
```

## Future Improvements
- Add user authentication and saved product lists
- Implement price drop notifications via email
- Deploy backend and frontend to AWS or Vercel for production use

## Author
**Sameer Shah** — AI & Full-Stack Developer  
[Portfolio](https://sameershah-portfolio.vercel.app/) 

