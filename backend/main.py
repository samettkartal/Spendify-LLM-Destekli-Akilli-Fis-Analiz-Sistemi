from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pytesseract
from PIL import Image
import io
import json
import os
import sqlite3
import uuid
import shutil
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import sys
import re

# Windows için Yaygın Tesseract Yolları
possible_tesseract_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\samet\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
]
for path in possible_tesseract_paths:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        print(f"BİLGİ: Tesseract bulundu: {path}")
        break


# Llama-cpp-python import
try:
    from llama_cpp import Llama
except ImportError:
    Llama = None

app = FastAPI()

# CORS configuration
origins = ["*"] # Geliştirme kolaylığı için *

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
DB_PATH = "receipts.db"
MODEL_PATH = "./models/Spendify/spendify_model_unsloth_q4_k_m.gguf"

# Static Files (Resimleri sunmak için)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
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
    conn.commit()
    
    # Add currency column if it doesn't exist (Migration)
    try:
        c.execute("ALTER TABLE receipts ADD COLUMN currency TEXT")
        print("INFO: Added 'currency' column to receipts table.")
        conn.commit()
    except sqlite3.OperationalError:
        # Column likely already exists
        pass
        
    conn.close()

init_db()

# --- MODEL SETUP ---
llm = None

def load_model():
    global llm
    if Llama is None:
        print("UYARI: llama-cpp-python yüklü değil. Mock modunda çalışacak.")
        return

    if not os.path.exists(MODEL_PATH):
        print(f"UYARI: Model dosyası bulunamadı: {MODEL_PATH}. Lütfen modeli bu dizine koyun.")
        return

    try:
        llm = Llama(
            model_path=MODEL_PATH,
            n_gpu_layers=-1, 
            n_ctx=8192,
            verbose=False
        )
        print("BAŞARILI: Llama modeli yüklendi.")
    except Exception as e:
        print(f"HATA: Model yüklenirken hata oluştu: {e}")

@app.on_event("startup")
async def startup_event():
    load_model()

# --- HELPERS ---
def clean_json_output(text):
    try:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(text[start:end])
        return None
    except:
        return None

def clean_amount(text):
    if not text: return "0.00"
    
    # 1. Clean explicit currency symbols/text to avoid confusion (optional, but good practice)
    # text = re.sub(r'[A-Za-z₺$€£]+', '', text) 
    
    # 2. Extract all potential numbers
    # Matches patterns like: 123.45, 123,45, 1,234.50, 10
    # We look for digits + standard separators
    matches = re.findall(r'[\d.,]+', text)
    
    if not matches:
        return "0.00"
        
    # If multiple matches found (e.g. "20", "3.63" from "20% 3.63"), likely the last one is the amount for totals/tax
    # But we need to filter out common noise like just "." or ","
    valid_numbers = []
    for match in matches:
        clean_match = match.replace(',', '.').rstrip('.') # rudimentary normalization for check
        try:
            val = float(clean_match)
            valid_numbers.append(val)
        except:
            continue
            
    if not valid_numbers:
        return "0.00"
        
    # Heuristic: The largest number is usually the Total. 
    # But for Tax, it might not be. 
    # Usually the amount is at the end of the string.
    # Let's take the last valid number sequence from the original text for better context? 
    # No, re.findall returns in order.
    
    # Let's clean the LAST candidate found, as that matches "Tax: 20% 3.63" pattern.
    candidate = matches[-1]
    
    # Now rigorous cleaning of that specific candidate
    cleaned = re.sub(r'[^\d.,]', '', candidate)
    
    if ',' in cleaned and '.' in cleaned:
        if cleaned.find(',') > cleaned.find('.'):
             cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
             cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
        
    try:
        return "{:.2f}".format(float(cleaned))
    except:
        return "0.00"

def clean_currency(text):
    if not text: return "₺"
    text = text.strip().upper()
    if any(x in text for x in ['TL', 'TRY', 'TURK', 'LIRA', '₺']): return "₺"
    if any(x in text for x in ['USD', 'DOLLAR', '$']): return "$"
    if any(x in text for x in ['EUR', 'EURO', '€']): return "€"
    if any(x in text for x in ['GBP', 'POUND', '£']): return "£"
    return "₺" # Default to TL if totally unknown, or keep text? User asked to default to TL.



def process_with_llm(ocr_text):
    if llm is None:
        # Mock Response
        return {
            "merchant": "MOCK MARKET",
            "date": "01.01.2024",
            "total_amount": "150.00",
            "tax": "25.00",
            "currency": "₺"
        }

    print(f"DEBUG: OCR Text Length: {len(ocr_text)}")
    print(f"DEBUG: OCR Text Preview: {ocr_text[:100]}...")

    prompt = f"""Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
You are an advanced receipt understanding AI. Analyze the input OCR text and extract the following JSON fields.

Rules:
1. **merchant**: The name of the shop. **ALWAYS** return the very first meaningful line of text as the merchant if no known brand is found.
2. **date**: The date of the transaction as found on the receipt.
3. **total_amount**: The final grand total amount.
4. **tax**: The tax amount (VAT, TAX) if available.
5. **tax_rate**: The tax rate percentage if available.
6. **currency**: The currency symbol found on the receipt.

### Reference Examples (Do NOT copy these values):
Input:
TARGET STORE
12.04.2023
TOTAL 7.50

Response:
{{
  "merchant": "TARGET STORE",
  "date": "12.04.2023",
  "total_amount": "7.50",
  "tax": "0.00",
  "tax_rate": "0",
  "currency": "$"
}}

Input:
Uber Eats
Date: Nov 10, 2024
Total: 25.50

Response:
{{
  "merchant": "Uber Eats",
  "date": "10.11.2024",
  "total_amount": "25.50",
  "tax": "1.50",
  "tax_rate": "0",
  "currency": "$"
}}

### REAL TASK (Analyze the below text):
Input:
{ocr_text}

### Response:
"""
    output = llm(prompt, max_tokens=256, stop=["###"], echo=False, temperature=0.2, top_p=0.9)
    generated_text = output['choices'][0]['text']
    print(f"DEBUG: LLM Raw Output: {generated_text}")

    # DEBUG LOGGING TO FILE
    with open("debug_log.txt", "a", encoding="utf-8") as f:
        f.write("\n\n--- NEW REQUEST ---\n")
        f.write(f"OCR TEXT LEN: {len(ocr_text)}\n")
        f.write(f"OCR TEXT:\n{ocr_text}\n")
        f.write(f"LLM OUTPUT:\n{generated_text}\n")
    
    parsed_json = clean_json_output(generated_text)
    
    # Basit bir fallback, eğer LLM boş dönerse
    if not parsed_json:
        return {"merchant": "Bilinmiyor", "date": "", "total_amount": "0.00", "tax": "0.00"}
        
    return parsed_json

# --- API ENDPOINTS ---

@app.get("/receipts")
def get_receipts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM receipts ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

class UpdateReceiptModel(BaseModel):
    merchant: Optional[str]
    date: Optional[str]
    total: Optional[str]
    tax: Optional[str]
    category: Optional[str]
    tax_rate: Optional[str]
    currency: Optional[str]

class CreateReceiptModel(BaseModel):
    merchant: str
    date: str
    total: str
    tax: str
    category: str
    tax_rate: str
    currency: str
    filename: str
    image_url: str

@app.post("/receipts")
def create_receipt(data: CreateReceiptModel):
    receipt_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO receipts (id, filename, merchant, date, total, tax, category, tax_rate, currency, status, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (receipt_id, data.filename, data.merchant, data.date, data.total, data.tax, data.category, data.tax_rate, data.currency, "Tamamlandı", data.image_url))
    conn.commit()
    conn.close()
    return {"status": "created", "id": receipt_id}

@app.put("/receipts/{receipt_id}")
def update_receipt(receipt_id: str, data: UpdateReceiptModel):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        UPDATE receipts 
        SET merchant=?, date=?, total=?, tax=?, category=?, tax_rate=?, currency=?
        WHERE id=?
    """, (data.merchant, data.date, data.total, data.tax, data.category, data.tax_rate, data.currency, receipt_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}

@app.delete("/receipts/{receipt_id}")
def delete_receipt(receipt_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT filename FROM receipts WHERE id=?", (receipt_id,))
    row = c.fetchone()
    if row:
        file_path = UPLOAD_DIR / row[0]
        if file_path.exists():
            os.remove(file_path)
    
    c.execute("DELETE FROM receipts WHERE id=?", (receipt_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.post("/upload")
async def upload_receipt(file: UploadFile = File(...)):
    try:
        # 1. Dosyayı Kaydet
        file_ext = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Resim okuma (OCR için)
        image = Image.open(file_path)
        
        # 2. OCR ve LLM
        try:
            text = pytesseract.image_to_string(image, lang='eng')
        except pytesseract.TesseractNotFoundError:
            # Fallback for dev env without tesseract
            print("HATA: Tesseract OCR bulunamadı! Mock modunda devam ediliyor.")
            text = "MOCK RECEIPT TEXT"
        except Exception as ocr_err:
            print(f"HATA: OCR işlemi başarısız: {ocr_err}")
            text = "MOCK RECEIPT TEXT"

        data = process_with_llm(text)
        
        # 3. Veriyi Hazırla (DB'ye KAYDETME YOK)
        merchant = data.get("merchant", "Bilinmiyor")
        date = data.get("date", "")
        # Clean amounts
        total = clean_amount(data.get("total_amount", "0.00"))
        tax = clean_amount(data.get("tax", "0.00"))
        
        tax_rate = data.get("tax_rate", "")
        currency = clean_currency(data.get("currency", "₺"))
        
        return {
            "filename": unique_filename,
            "image_url": f"/static/{unique_filename}",
            "structured_data": {
                "merchant": merchant,
                "date": date,
                "total_amount": total,
                "tax": tax,
                "tax_rate": tax_rate,
                "currency": currency
            }
        }
        
    except Exception as e:
        print(f"Hata: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
