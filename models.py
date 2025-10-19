from sqlalchemy import Column, Integer, String
from database import Base

class AmazonProduct(Base):
    __tablename__ = "amazon_products"

    id = Column(Integer, primary_key=True, index=True)
    asin = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=True)
    price = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    status = Column(String, nullable=True)
    product_url = Column(String, nullable=True)
    
