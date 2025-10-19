from pydantic import BaseSettings, AnyUrl, validator
from typing import Optional
import os

class Settings(BaseSettings):
    DATABASE_URL: Optional[str]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @validator("DATABASE_URL", pre=True, always=True)
    def replace_postgres_scheme(cls, v):
        if not v:
            raise ValueError("DATABASE_URL not set in environment variables")
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg2://", 1)
        return v

settings = Settings()