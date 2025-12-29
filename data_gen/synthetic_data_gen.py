import random
import json
import datetime
import os

# Turkish receipt templates and data
MARKETS = ["BIM", "A101", "MIGROS", "SOK", "CARREFOURSA"]
PRODUCTS = [
    {"name": "MILK 1L", "price_range": (20, 35), "kdv": 1},
    {"name": "EGGS 30PC", "price_range": (80, 120), "kdv": 1},
    {"name": "BREAD", "price_range": (10, 15), "kdv": 1},
    {"name": "TOMATO KG", "price_range": (25, 50), "kdv": 1},
    {"name": "CHEESE 500G", "price_range": (150, 250), "kdv": 8},
    {"name": "OLIVES 1KG", "price_range": (200, 300), "kdv": 8},
    {"name": "PASTA", "price_range": (15, 25), "kdv": 1},
    {"name": "BLEACH", "price_range": (40, 80), "kdv": 20},
    {"name": "SHAMPOO", "price_range": (60, 150), "kdv": 20},
    {"name": "TOOTHPASTE", "price_range": (50, 100), "kdv": 20},
    {"name": "COLA 2.5L", "price_range": (35, 50), "kdv": 20},
    {"name": "CHIPS", "price_range": (25, 45), "kdv": 20},
]

def generate_noise(text, probability=0.05):
    """Injects OCR-like noise into text."""
    noise_map = {
        'S': '5', '5': 'S',
        'I': '1', '1': 'I',
        'O': '0', '0': 'O',
        'B': '8', '8': 'B',
        'Z': '2', '2': 'Z',
        'Ş': 'S', 'İ': 'I', 'Ğ': 'G',
        'Ç': 'C', 'Ö': 'O', 'Ü': 'U'
    }
    chars = list(text)
    for i, char in enumerate(chars):
        if random.random() < probability:
            if char in noise_map:
                chars[i] = noise_map[char]
            elif random.random() < 0.3: # Random deletion or glitch
                chars[i] = random.choice(['.', ',', '-', ' '])
    return "".join(chars)

def generate_receipt():
    market = random.choice(MARKETS)
    date = datetime.date(2023, 1, 1) + datetime.timedelta(days=random.randint(0, 700))
    time = f"{random.randint(8, 22):02d}:{random.randint(0, 59):02d}"
    
    products_count = random.randint(1, 10)
    selected_products = []
    total_amount = 0
    kdv_details = {}

    receipt_lines = []
    receipt_lines.append(f"*** {market} ***")
    receipt_lines.append(f"Date: {date.strftime('%d.%m.%Y')} Time: {time}")
    receipt_lines.append(f"Receipt No: {random.randint(1000, 9999)}")
    receipt_lines.append("-" * 30)

    for _ in range(products_count):
        prod = random.choice(PRODUCTS)
        qty = random.randint(1, 3)
        price = round(random.uniform(*prod['price_range']), 2)
        line_total = qty * price
        total_amount += line_total
        
        # Calculate KDV
        kdv_rate = prod['kdv']
        kdv_amount = line_total * (kdv_rate / 100) # Simplified tax calc (usually internal)
        if kdv_rate not in kdv_details:
            kdv_details[kdv_rate] = 0
        kdv_details[kdv_rate] += kdv_amount

        line_str = f"{prod['name']} x{qty}   {line_total:.2f}"
        receipt_lines.append(line_str)
        selected_products.append({
            "name": prod['name'],
            "quantity": qty,
            "price": price,
            "total": line_total
        })

    receipt_lines.append("-" * 30)
    receipt_lines.append(f"TOTAL: {total_amount:.2f}")
    
    for rate, amount in kdv_details.items():
        receipt_lines.append(f"VAT %{rate}: {amount:.2f}")

    receipt_lines.append("-" * 30)
    receipt_lines.append("THANK YOU HAVE A NICE DAY")

    # Structured Ground Truth
    ground_truth = {
        "market": market,
        "date": date.strftime('%d.%m.%Y'),
        "total_amount": round(total_amount, 2),
        "kdv_breakdown": {f"%{k}": round(v, 2) for k, v in kdv_details.items()},
        "items": selected_products
    }

    raw_text = "\n".join(receipt_lines)
    noisy_text = generate_noise(raw_text)

    return {
        "raw_text": raw_text,
        "ocr_text": noisy_text,
        "ground_truth": ground_truth
    }

if __name__ == "__main__":
    output_dir = "data_gen/output"
    os.makedirs(output_dir, exist_ok=True)
    
    dataset = []
    for i in range(100): # Generating 100 samples for demo
        data = generate_receipt()
        dataset.append(data)
    
    with open(f"{output_dir}/synthetic_receipts.jsonl", "w", encoding="utf-8") as f:
        for entry in dataset:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            
    print(f"Generated {len(dataset)} synthetic receipts in {output_dir}/synthetic_receipts.jsonl")
