# =============================================================================
# HIB.RİT ÇÖZÜM: CORD + SENTETİK + OCR GÜRÜLTÜSÜ (AUGMENTATION)
# =============================================================================

import json
import re
import random
import datetime
from datasets import load_dataset, Dataset

print("🚀 Veri hazırlama işlemi başlıyor...")

# ==========================================
# 1. OCR GÜRÜLTÜSÜ ENJEKSİYONU (Augmentation)
# ==========================================
def inject_ocr_noise(text, probability=0.1):
    """
    Gerçek dünyadaki OCR hatalarını simüle eder.
    Metindeki karakterleri %10 ihtimalle benzer ama yanlış karakterlerle değiştirir.
    """
    noise_map = {
        'S': '5', '5': 'S',
        'I': '1', '1': 'I', 'l': '1',
        'O': '0', '0': 'O',
        'B': '8', '8': 'B',
        'Z': '2', '2': 'Z',
        'A': '4',
        'E': 'F',
        ':': '.', '.': ',',
        ' ': '  ' # Çift boşluk
    }
    
    chars = list(text)
    for i, char in enumerate(chars):
        if random.random() < probability:
            # 1. Karakter değişimi
            if char in noise_map:
                chars[i] = noise_map[char]
            # 2. Rastgele bozulma
            elif random.random() < 0.2:
                chars[i] = random.choice(['.', '-', '*', '_', ' '])
                
    return "".join(chars)

# ==========================================
# 2. SENTETİK TÜRKÇE VERİ ÜRETİCİ
# ==========================================
def generate_synthetic_turkish_data(count=2000):
    print(f"🇹🇷 {count} adet Sentetik Türkçe Fiş üretiliyor...")
    
    MARKETS = ["BIM", "A101", "MIGROS", "SOK", "TEKEL SHOP", "FIRIN", "KASAP", "ECZANE"]
    PRODUCTS = [
        {"name": "SUT", "price": (20, 35)},
        {"name": "EKMEK", "price": (10, 15)},
        {"name": "YUMURTA", "price": (80, 120)},
        {"name": "PEYNIR", "price": (150, 250)},
        {"name": "ZEYTIN", "price": (200, 300)},
        {"name": "KOLA", "price": (30, 50)},
        {"name": "CIPS", "price": (25, 45)},
        {"name": "DETERJAN", "price": (100, 200)},
    ]
    
    data = []
    for _ in range(count):
        market = random.choice(MARKETS)
        date_obj = datetime.date(2023, 1, 1) + datetime.timedelta(days=random.randint(0, 365))
        date_str = date_obj.strftime('%d.%m.%Y')
        
        item_count = random.randint(2, 6)
        total = 0
        lines = [f"*** {market} ***", f"Tarih: {date_str}"]
        
        for _ in range(item_count):
            prod = random.choice(PRODUCTS)
            price = round(random.uniform(*prod['price']), 2)
            qty = random.randint(1, 3)
            line_total = price * qty
            total += line_total
            lines.append(f"{prod['name']} x{qty} {line_total:.2f}")
            
        tax = total * 0.18 # Basit KDV
        lines.append(f"TOPLAM: {total:.2f}")
        lines.append(f"KDV: {tax:.2f}")
        
        full_text = "\n".join(lines)
        
        # Hem temiz hem gürültülü versiyonunu ekle
        gt = {"satici": market, "tarih": date_str, "toplam": f"{total:.2f}", "kdv": f"{tax:.2f}"}
        
        # 1. Temiz Veri
        data.append({"text": full_text, "gt": gt})
        # 2. Gürültülü Veri (Augmentation)
        data.append({"text": inject_ocr_noise(full_text, 0.15), "gt": gt})
        
    return data

# ==========================================
# 3. CORD VERİ SETİNİ ÇEK VE İŞLE
# ==========================================
processed_data = []

try:
    print("🌍 HuggingFace CORD verisi indiriliyor...")
    hf_dataset = load_dataset("naver-clova-ix/cord-v2", split="train")
    
    print(f"✅ {len(hf_dataset)} adet CORD fişi işleniyor...")
    
    for item in hf_dataset:
        try:
            gt_json = json.loads(item.get('ground_truth', '{}'))
            
            # Text oluştur
            lines = []
            if "valid_line" in gt_json:
                for l in gt_json["valid_line"]:
                    words = l.get("words", [])
                    lines.append(" ".join([w["text"] for w in words]))
            full_text = "\n".join(lines)
            
            # Değerleri çek
            date_val = "Bulunamadı"
            total_val = "0.00"
            tax_val = "0.00"
            merchant_val = "Bilinmiyor"
            
            if "valid_line" in gt_json:
                for l in gt_json["valid_line"]:
                    cat = l.get("category", "")
                    txt = " ".join([w["text"] for w in l.get("words", [])])
                    if "menu.date" in cat: date_val = txt
                    elif "total.total_price" in cat: total_val = txt
                    elif "total.tax_price" in cat: tax_val = txt
                    elif "store.name" in cat: merchant_val = txt
            
            if total_val == "0.00": continue

            gt = {
                "satici": merchant_val,
                "tarih": date_val,
                "toplam": total_val,
                "kdv": tax_val
            }
            
            # CORD verisini 3 kez çoğalt (1 Temiz + 2 Gürültülü)
            processed_data.append({"text": full_text, "gt": gt})
            processed_data.append({"text": inject_ocr_noise(full_text, 0.1), "gt": gt})
            processed_data.append({"text": inject_ocr_noise(full_text, 0.2), "gt": gt})
            
        except: continue
        
except Exception as e:
    print(f"⚠️ CORD hatası (Sentetik ile devam edilecek): {e}")

# ==========================================
# 4. SENTETİK VERİ EKLE
# ==========================================
# 1000 kök sentetik veri -> 2000 augment edilmiş veri olur
synthetic_samples = generate_synthetic_turkish_data(1000) 
processed_data.extend(synthetic_samples)

print(f"\n📊 TOPLAM EĞİTİM VERİSİ: {len(processed_data)} adet")

# ==========================================
# 5. UNSLOTH FORMATINA DÖNÜŞTÜR VE KAYDET
# ==========================================
final_jsonl = []

prompt_template = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
Fatura metninden satıcı adı, tarih, toplam tutar ve KDV bilgilerini JSON formatında çıkar.

### Input:
{text}

### Response:
{response}""" + "<|end_of_text|>"

for item in processed_data:
    response_str = json.dumps(item['gt'], ensure_ascii=False)
    formatted_text = prompt_template.format(text=item['text'], response=response_str)
    final_jsonl.append({"text": formatted_text})

# Karıştır
random.shuffle(final_jsonl)

output_filename = "turkish_receipt_large_dataset.jsonl"
with open(output_filename, "w", encoding="utf-8") as f:
    for entry in final_jsonl:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

print(f"💾 '{output_filename}' kaydedildi.")
print("✅ Bu dosya ile Fine-Tuning işlemini başlatabilirsiniz.")
