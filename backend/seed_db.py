import sqlite3
import uuid
import random
import datetime

# Database config
DB_PATH = "receipts.db"

# Sample Data
MERCHANTS = [
    "Migros", "Bim", "A101", "Şok", "CarrefourSA", "Starbucks", "Kahve Dünyası", 
    "Shell", "Opet", "BP", "LC Waikiki", "Mavi", "Zara", "Trendyol", "Hepsiburada", 
    "Amazon", "Netflix", "Spotify", "Apple", "Turkcell", "Vodafone"
]

CATEGORIES = {
    "Migros": "Grocery", "Bim": "Grocery", "A101": "Grocery", "Şok": "Grocery", "CarrefourSA": "Grocery",
    "Starbucks": "Food & Drink", "Kahve Dünyası": "Food & Drink",
    "Shell": "Fuel", "Opet": "Fuel", "BP": "Fuel",
    "LC Waikiki": "Clothing", "Mavi": "Clothing", "Zara": "Clothing",
    "Trendyol": "Shopping", "Hepsiburada": "Shopping", "Amazon": "Shopping",
    "Netflix": "Entertainment", "Spotify": "Entertainment",
    "Apple": "Technology", "Turkcell": "Bill", "Vodafone": "Bill"
}

def generate_random_date():
    # Generate a date within the last 365 days
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=365)
    random_days = random.randint(0, 365)
    random_date = start_date + datetime.timedelta(days=random_days)
    return random_date.strftime("%d.%m.%Y")

def seed_db():
    print(f"Connecting to {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Create table if not exists (in case it's a fresh run)
    c.execute('''
        CREATE TABLE IF NOT EXISTS receipts (
            id TEXT PRIMARY KEY,
            filename TEXT,
            merchant TEXT,
            date TEXT,
            total TEXT,
            tax TEXT,
            category TEXT,
            tax_rate TEXT,
            status TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Generate 50 random receipts
    print("Generating 50 random receipts...")
    
    receipts = []
    for _ in range(50):
        merchant = random.choice(MERCHANTS)
        category = CATEGORIES.get(merchant, "Other")
        date = generate_random_date()
        
        # Random total between 20 and 2000
        total_val = round(random.uniform(20.0, 2000.0), 2)
        total_str = f"{total_val:.2f}"
        
        # Tax ~ 10% or 20%
        tax_rate_val = random.choice([0.10, 0.20])
        tax_val = round(total_val * tax_rate_val, 2)
        tax_str = f"{tax_val:.2f}"
        tax_rate_str = "%10" if tax_rate_val == 0.10 else "%20"
        
        receipt_id = str(uuid.uuid4())
        filename = f"mock_{uuid.uuid4()}.jpg"
        status = "Completed"
        image_url = "" # No real image
        
        receipts.append((
            receipt_id, filename, merchant, date, total_str, tax_str, category, tax_rate_str, status, image_url
        ))

    c.executemany('''
        INSERT INTO receipts (id, filename, merchant, date, total, tax, category, tax_rate, status, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', receipts)

    conn.commit()
    print("Database seeded successfully!")
    conn.close()

if __name__ == "__main__":
    seed_db()
