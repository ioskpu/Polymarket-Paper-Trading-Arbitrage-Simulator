import os
import time
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_strategy():
    print("Running Strategy Engine...")
    try:
        # Check database connection
        with engine.connect() as conn:
            print("Connected to database")
            
        while True:
            print("Analyzing market data for arbitrage opportunities...")
            # Logic for arbitrage analysis would go here
            
            time.sleep(30) # Wait 30 seconds
    except Exception as e:
        print(f"Error in Strategy Engine: {e}")
        exit(1)

if __name__ == "__main__":
    run_strategy()
