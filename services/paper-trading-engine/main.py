import os
import time
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_paper_trading():
    print("Starting Paper Trading Engine...")
    try:
        with engine.connect() as conn:
            print("Connected to database")
            
        while True:
            print("Processing trade signals and updating virtual portfolio...")
            # Logic for simulating trades would go here
            time.sleep(15)
    except Exception as e:
        print(f"Error in Paper Trading Engine: {e}")
        exit(1)

if __name__ == "__main__":
    run_paper_trading()
