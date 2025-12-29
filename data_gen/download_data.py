import os
import json
import glob
import zipfile
import platform
import shutil
import requests
from pathlib import Path
from datasets import Dataset
import re

# ==========================================
# 1. KAGGLE KİMLİĞİNİ DOĞRUDAN OLUŞTUR
# ==========================================
print("🔑 Kaggle kimlik dosyası oluşturuluyor...")

# Kullanıcı dizinini bul (Windows/Linux uyumlu)
home = Path.home()
kaggle_dir = home / ".kaggle"
kaggle_dir.mkdir(exist_ok=True)

kaggle_json_path = kaggle_dir / "kaggle.json"

# Senin verdiğin bilgilerle dosyayı yaz
api_token = {"username": "sametkrtl", "key": "e33534ca70d9572c012680ad68e5221f"}

with open(kaggle_json_path, 'w') as file:
    json.dump(api_token, file)

print(f"Kaggle token: {kaggle_json_path} konumuna kaydedildi.")

# ==========================================
# 2. VERİ İNDİRME
# ==========================================
print("🚀 Kaggle üzerinden CORD verisi indiriliyor...")

# Kaggle kütüphanesini import etmeye çalış, yoksa kur
try:
    import kaggle
    print("Kaggle kütüphanesi bulundu.")
except ImportError:
    print("Kaggle kütüphanesi yükleniyor...")
    os.system("pip install kaggle")
    import kaggle

# İndirme Klasörleri
download_path = Path("cord_kaggle")
extract_path = Path("cord_kaggle_extracted")
download_path.mkdir(exist_ok=True)

success = False

try:
    # Kaggle API kullanarak indir (os.system yerine doğrudan API kullanımı daha güvenli olabilir ama auth refresh gerekebilir)
    # Basitlik için os.system ile devam ediyoruz ama path sorunlarını çözüyoruz
    api_command = f"kaggle datasets download -d constantinest/cordv2 -p {download_path} --force"
    exit_code = os.system(api_command)
    
    if exit_code == 0:
        zip_file = download_path / "cordv2.zip"
        if zip_file.exists():
            print("✅ İndirme Başarılı! Dosyalar açılıyor...")
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
            json_path = extract_path
            success = True
        else:
            print("❌ İndirme komutu başarılı dedi ama dosya bulunamadı.")
    else:
         print(f"⚠️ Kaggle komutu hata kodu ile döndü: {exit_code}")
except Exception as e:
    print(f"Kaggle hatası: {e}")

if not success:
    print("⚠️ Kaggle indirmesi başarısız oldu. B PLANI (GitHub) devreye giriyor...")
    github_url = "https://github.com/gnhuy91/cord/archive/refs/heads/master.zip"
    resp = requests.get(github_url, stream=True)
    if resp.status_code == 200:
        with open("cord_github.zip", 'wb') as f:
            shutil.copyfileobj(resp.raw, f)
        
        with zipfile.ZipFile("cord_github.zip", 'r') as zip_ref:
            zip_ref.extractall("cord_github_extracted")
        json_path = Path("cord_github_extracted")
        print("✅ GitHub'dan indirildi ve açıldı.")
    else:
        print("❌ GitHub indirmesi de başarısız oldu.")
        json_path = None

# ==========================================
# 3. JSONLARI BUL VE OKU
# ==========================================
print("🕵️‍♂️ JSON dosyaları toplanıyor...")
full_data_list = []

if json_path:
    # Windows'ta glob bazen /**/ ile sorun çıkarabilir, Path.rglob kullanmak daha güvenli
    json_files = list(json_path.rglob("*.json"))
    print(f"Bulunan dosya sayısı: {len(json_files)}")

    def parse_receipt(data):
        # Format 1: valid_line
        if "valid_line" in data:
            items = data["valid_line"]
            raw_text = ""
            for line in items:
                words = line.get("words", [])
                raw_text += " ".join([w["text"] for w in words]) + "\n"
            
            total_val = "0.00"
            tax_val = "0.00"
            date_val = "2023-01-01"
            
            for line in items:
                cat = line.get("category", "")
                txt = " ".join([w["text"] for w in line.get("words", [])])
                if "total.total_price" in cat: total_val = txt
                elif "total.tax_price" in cat: tax_val = txt
                elif "menu.date" in cat: date_val = txt
            return raw_text, date_val, total_val, tax_val
        
        # Format 2: ground_truth string
        elif "ground_truth" in data:
            try: return parse_receipt(json.loads(data["ground_truth"]))
            except: return None
        return None

    success_count = 0
    for j_file in json_files:
        try:
            with open(j_file, "r", encoding="utf-8") as f:
                content = json.load(f)
                res = parse_receipt(content)
                if res:
                    txt, dt, tot, tx = res
                    full_data_list.append({"text": txt, "date": dt, "total": tot, "tax": tx})
                    success_count += 1
        except: continue
    print(f"✅ Başarıyla okunan fiş sayısı: {success_count}")

# ==========================================
# 4. VERİ ÇOĞALTMA (AUGMENTATION)
# ==========================================
# Eğer veri yoksa hata vermesin diye kontrol
if len(full_data_list) == 0:
    print("❌ Veri bulunamadı! Sentetik veri üretiliyor...")
    # Acil durum sentetik veri
    import random
    for _ in range(500):
        price = random.uniform(10, 500)
        full_data_list.append({
            "text": f"MARKET\nToplam: {price:.2f}\nTarih: 01.01.2023",
            "date": "01.01.2023",
            "total": f"{price:.2f}",
            "tax": f"{price*0.18:.2f}"
        })

aug_maps = [
    {r"(?i)Total": "TOPLAM", r"(?i)Tax": "KDV", r"(?i)Date": "TARİH"},
    {r"(?i)Total": "GENEL TOPLAM", r"(?i)Tax": "TOPLAM KDV", r"(?i)Date": "FİŞ TARİHİ"},
    {r"(?i)Total": "TUTAR", r"(?i)Tax": "VERGİ", r"(?i)Date": "TARİH"},
    {r"(?i)Total": "TOP.", r"(?i)Tax": "K.D.V.", r"(?i)Date": "TRH"},
    {} 
]

# Tokenizer placeholder if not present (script doesn't have imports for it)
# Assuming typical EOS token if using Llama/Mistral, usually </s> or <|end_of_text|>
EOS_TOKEN = "<|end_of_text|>" 

alpaca_template = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
Fatura metninden Tarih, Toplam, KDV bilgilerini JSON olarak çıkar.

### Input:
{}

### Response:
{}""" + EOS_TOKEN

final_training_data = []
print("🚀 Veriler işleniyor ve çoğaltılıyor...")

for data in full_data_list:
    base_text = data["text"]
    target_json = json.dumps({
        "satici": "Bilinmeyen Satıcı", 
        "tarih": str(data["date"]), 
        "toplam": str(data["total"]), 
        "kdv": str(data["tax"])
    }, ensure_ascii=False)
    
    for mapping in aug_maps:
        aug_text = base_text
        for eng, tr in mapping.items():
            aug_text = re.sub(eng, tr, aug_text)
        final_training_data.append(alpaca_template.format(aug_text, target_json))

try:
    dataset = Dataset.from_dict({"text": final_training_data})
    print(f"\n✅ İŞLEM TAMAM! Toplam Veri: {len(dataset)}")
    
    output_path = "data_gen/cord_augmented_dataset"
    dataset.save_to_disk(output_path)
    print(f"Dataset kaydedildi: {output_path}")

except Exception as e:
    print(f"Dataset oluşturma hatası: {e}")
