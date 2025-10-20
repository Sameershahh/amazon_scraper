Amazon Price Tracker

A full-stack application that monitors product prices on Amazon, stores historical data, and visualizes price trends through a modern web interface.
The project combines a Python-based backend for scraping and data management with a Next.js frontend for analytics and interaction.
It is built with clean architecture principles and ready for deployment on production environments such as AWS or Render.

Overview

The Amazon Price Tracker automatically extracts pricing data from selected Amazon product pages, saves the information in a structured database, and displays price histories and product details on an interactive dashboard.
The primary frontend is developed in Next.js and resides in the amazon_scraper/ subdirectory, while the backend is implemented in Python (FastAPI).
An additional Streamlit interface is included for internal testing and administrative inspection.

Features

Automated product scraping from Amazon

Centralized database for product and price history

RESTful API for frontend integration

Interactive Next.js dashboard for visual analytics

Internal Streamlit dashboard for testing

Modular and maintainable codebase following separation of concerns

Environment-based configuration for deployment flexibility

Tech Stack
Component	Technology	Purpose
Frontend	Next.js	Main dashboard and user interface
Backend	FastAPI (Python)	API layer and business logic
Database	PostgreSQL / SQLite	Persistent data storage
Web Scraping	Requests, BeautifulSoup	Data extraction from Amazon
Internal UI	Streamlit	Administrative / testing interface
Deployment	AWS EC2 / Vercel	Hosting and scalability
Project Structure
amazon_price_tracker/
│
├── backend/
│   ├── main.py             # FastAPI entry point
│   ├── scraper.py          # Amazon scraping logic
│   ├── database.py         # Database setup and connection
│   ├── models.py           # SQLAlchemy ORM models
│   ├── utils/              # Helper utilities
│   └── requirements.txt
│
├── amazon_scraper/         # Primary frontend (Next.js)
│   ├── pages/
│   ├── components/
│   ├── public/
│   └── package.json
│
├── streamlit_app.py        # Secondary Streamlit admin UI
└── README.md

Setup Instructions
1. Clone the repository
git clone https://github.com/Sameershahh/amazon_scraper.git
cd amazon_scraper

2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate      # Windows: .\venv\Scripts\activate
pip install -r requirements.txt


Create a .env file:

DATABASE_URL=sqlite:///prices.db
SCRAPE_INTERVAL=3600


Start the backend:

uvicorn main:app --reload

3. Frontend setup
cd amazon_scraper
npm install
npm run dev


Access the frontend at: http://localhost:3000

4. Optional: Streamlit interface
streamlit run streamlit_app.py

How It Works

Users add product URLs in the Next.js dashboard.

The backend uses the scraper to fetch live price and product data.

Data is stored in the database along with timestamps.

The frontend displays aggregated information and historical trends.

(Planned) Notification logic will trigger alerts for price drops.

Example Screenshots
![Dashboard](assets/dashboard.png)
![Price History](assets/price_history.png)
![Admin Panel](assets/admin_panel.png)

API Endpoints (Summary)
Method	Endpoint	Description
POST	/api/add-product	Add a new product to track
GET	/api/products	Retrieve all tracked products
GET	/api/price-history/{id}	Retrieve price history for a specific product
DELETE	/api/product/{id}	Remove a product from tracking
Roadmap

Add automated alerting (email, Telegram, or web push)

Implement proxy rotation and CAPTCHA handling for stable scraping

Introduce user authentication and roles

Dockerize both backend and frontend for container deployment

Integrate scheduling (Celery / cron) for periodic scraping

Expand to support multiple Amazon regions (.in, .uk, .de)

Limitations

Frequent scraping may lead to Amazon’s anti-bot blocking; proxies are recommended.

Multi-region support is not yet implemented.

Unit and integration testing are still under development.

Notification system is planned but not yet available.

Contributing

Contributions are welcome.
To contribute:

Fork the repository.

Create a feature branch.

Implement and test your changes.

Open a pull request describing the improvement.

License

Licensed under the MIT License
.

Author

Sameer Shah
Python & Machine Learning Developer
GitHub: @Sameershahh
