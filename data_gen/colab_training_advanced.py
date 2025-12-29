# ==========================================================
# 5. ADIM: A100 İÇİN GELİŞMİŞ EĞİTİM AYARLARI (High-Performance)
# ==========================================================
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bfloat16_supported

# A100 GPU'nun gücünden tam faydalanmak için batch size'ı artırıyoruz.
# Epoch bazlı eğitim yaparak verinin tamamını görmesini sağlıyoruz.

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False, 
    args = TrainingArguments(
        per_device_train_batch_size = 16,  # A100 için 4 -> 16 artırıldı
        gradient_accumulation_steps = 2,
        warmup_steps = 10,
        # max_steps yerine num_train_epochs kullanıyoruz
        num_train_epochs = 3, # Tüm veriyi 3 kez dönecek (daha iyi öğrenme)
        
        learning_rate = 2e-4,
        fp16 = not is_bfloat16_supported(),
        bf16 = is_bfloat16_supported(), # A100 BF16 destekler, çok daha stabil.
        logging_steps = 10,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs_a100",
    ),
)

print("🚀 A100 Gücüyle Eğitim Başlıyor... (Bu işlem veri boyutuna göre zaman alabilir)")
trainer_stats = trainer.train()
print("✅ Eğitim tamamlandı!")

# Modeli Kaydet
model.save_pretrained("model_a100_final")
tokenizer.save_pretrained("model_a100_final")

# GGUF Dönüşümü (İsteğe bağlı, backend için gerekli)
model.save_pretrained_gguf("model_fatura_gguf", tokenizer, quantization_method = "q4_k_m")
print("💾 Model ve GGUF dosyaları kaydedildi.")

# ==========================================================
# 6. ADIM: TEST VE DOĞRULAMA (INFERENCE)
# ==========================================================
print("\n🔍 Test Aşaması Başlıyor...")

# Test için hızlıca inference yapalım
FastLanguageModel.for_inference(model) # Inference moduna al (Daha hızlı)

# Örnek bir Türkçe fiş metni (OCR'dan gelmiş gibi)
test_text = """
*** TEKEL SHOP ***
Tarih: 24.12.2023 Saat: 14:30
--------------------
MARLBORO TOUCH x2   110.00
EFES PILSEN 50CL x4 180.00
CIPS                 35.00
--------------------
TOPLAM: 325.00
KDV %18: 49.57
KREDİ KARTI
"""

prompt = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
Fatura metninden satıcı adı, tarih, toplam tutar ve KDV bilgilerini JSON formatında çıkar.

### Input:
{}

### Response:
""".format(test_text)

inputs = tokenizer([prompt], return_tensors = "pt").to("cuda")

# Üretim Yap
outputs = model.generate(**inputs, max_new_tokens = 128, use_cache = True)
result = tokenizer.batch_decode(outputs)[0]

# Prompt kısmını temizleyip sadece cevabı göster
response_text = result.split("### Response:\n")[1].strip()
print("\n🤖 MODELİN TAHMİNİ:\n")
print(response_text)
