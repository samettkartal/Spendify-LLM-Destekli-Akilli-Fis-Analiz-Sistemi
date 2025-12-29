# Spendify - Akıllı Fiş Tarayıcı

Spendify, yapay zeka destekli bir fiş tarama ve yönetim uygulamasıdır. Fiş görüntülerinden yapılandırılmış verileri otomatik olarak çıkarmak için yerel Büyük Dil Modelleri (LLM) ve Optik Karakter Tanıma (OCR) teknolojilerinden yararlanır, böylece harcama takibi ve kategorizasyonu kolaylaştırır.

## Özellikler

*   **Akıllı Veri Çıkarma:** Fiş görüntülerinden Satıcı Adı, Tarih, Toplam Tutar, Vergi ve Para Birimi bilgilerini çıkarmak için en son teknoloji LLM'leri (llama.cpp üzerinden ince ayar yapılmış Llama 3) kullanır.
*   **Yerel İşleme:** Tüm yapay zeka çıkarım işlemleri yerel cihazınızda gerçekleşir, bu sayede veri gizliliği sağlanır ve herhangi bir API maliyeti oluşmaz.
*   **Etkileşimli Gösterge Paneli:** Harcama alışkanlıklarınızı grafikler ve şemalarla görselleştirmenizi sağlar.
*   **Fiş Yönetimi:** Fişleri sisteme yükleyebilir, görüntüleyebilir, düzenleyebilir ve silebilirsiniz.
*   **Arama ve Filtreleme:** Geçmiş işlemleriniz arasında kolayca arama yapabilir ve filtreleyebilirsiniz.
*   **Modern Kullanıcı Arayüzü:** Duyarlı ve temiz bir kullanıcı deneyimi için React ve Tailwind CSS ile geliştirilmiştir.

### Ekran Görüntüleri

**Fiş Tarama ve Analiz Ekranı:**
Kullanıcılar fiş fotoğrafını yükler ve yapay zeka tarafından çıkarılan verileri anında görür.
![Fiş Tarama Ekranı](docs/images/frontend_scanner_screen.png)

**Gösterge Paneli (Dashboard):**
Harcamaların kategori bazlı dağılımı ve aylık özetleri.
![Dashboard](docs/images/frontend_dashboard_top.png)
![Dashboard Alt](docs/images/frontend_dashboard_bottom.png)

## Model Performansı ve Başarımı

Bu projede kullanılan Llama-3 modeli, fiş verilerini ayrıştırmak üzere özel olarak eğitilmiştir (Fine-Tuning).

**Eğitim Başarısı (Loss Curve):**
Modelin eğitim sürecindeki hata oranının düşüşü, kararlı bir öğrenme sürecini gösterir.
![Eğitim Kayıp Grafiği](docs/images/Spendify_1_Loss_Curve.png)

**Doğruluk Analizi:**
Model, OCR hatalarına karşı dayanıklıdır. Aşağıda gerçek bir fiş ve modelin bu fişten çıkardığı veriler görülmektedir:

*Girdi (Eski ve Yıpranmış Fiş):*
![Orijinal Fiş](docs/images/demo_receipt_swc.jpg)

*Model Çıktısı (Başarılı Ayrıştırma):*
![Analiz Sonucu](docs/images/demo_result_swc.png)

## Teknoloji Yığını

### Backend (Sunucu Tarafı)
*   **FastAPI:** Python ile API geliştirmek için kullanılan yüksek performanslı web çatısı.
*   **Llama-cpp-python:** GGUF formatındaki modelleri yerel olarak çalıştırmak için llama.cpp'nin Python bağlayıcısı.
*   **Pytesseract:** Google'ın Tesseract-OCR Motoru için Python sarmalayıcısı.
*   **SQLite:** Fiş verilerini saklamak için kullanılan hafif, disk tabanlı veritabanı.
*   **Pydantic:** Python tip notasyonlarını kullanarak veri doğrulama ve ayar yönetimi sağlar.

**Backend API Dokümantasyonu (Swagger):**
![Swagger UI](docs/images/backend_swagger_ui.png)

### Frontend (İstemci Tarafı)
*   **React:** Kullanıcı arayüzleri oluşturmak için kullanılan Javascript kütüphanesi (Vite altyapısı ile).
*   **Tailwind CSS:** Hızlı UI geliştirme için kullanılan, sınıf tabanlı CSS çatısı.
*   **Lucide React:** Estetik ve tutarlı ikon seti.
*   **Chart.js / Recharts:** Veri görselleştirme ve grafik kütüphanesi.

## Ön Koşullar

Başlamadan önce bilgisayarınızda aşağıdaki gereksinimlerin kurulu olduğundan emin olun:

*   **Python:** Sürüm 3.9 veya üzeri.
*   **Node.js:** Sürüm 18 veya üzeri.
*   **Tesseract OCR:** Sisteminizde Tesseract OCR yazılımının kurulu olması zorunludur.
    *   **Windows:** [Buradan yükleyiciyi indirin](https://github.com/UB-Mannheim/tesseract/wiki). Kurulum sırasında Tesseract'ı PATH'e ekleyin veya standart kurulum yollarını kullandığınızdan emin olun (Kontrol edilen yol: `C:\Program Files\Tesseract-OCR\tesseract.exe`).
    *   **Linux/Mac:** Paket yöneticiniz üzerinden `tesseract-ocr` paketini yükleyin.

## Kurulum ve Yapılandırma

Projeyi çalıştırmak için aşağıdaki adımları sırasıyla takip edin.

### 1. Proje Dosyalarını İndirme (Klonlama)
İlk olarak projeyi bilgisayarınıza indirmek için terminal veya komut satırını açın ve aşağıdaki komutu girin:

```bash
git clone https://github.com/kullaniciadiniz/spendify.git
cd spendify
```

### 2. Backend Kurulumu
Backend klasörüne gidin ve gerekli Python sanal ortamını hazırlayın.

**Adım 2.1: Klasöre gitme ve sanal ortam oluşturma**

```bash
cd backend
python -m venv venv
```

**Adım 2.2: Sanal ortamı aktif etme**

*   **Windows için:**
    ```bash
    .\venv\Scripts\activate
    ```
*   **Linux veya Mac için:**
    ```bash
    source venv/bin/activate
    ```

**Adım 2.3: Gerekli kütüphanelerin yüklenmesi**

Sanal ortam aktifken (satır başında `(venv)` yazar), bağımlılıkları yükleyin:

```bash
pip install -r requirements.txt
```

**Adım 2.4: Model Dosyasının Yerleştirilmesi**

Yapay zeka model dosyasını manuel olarak ilgili klasöre koymanız gerekmektedir.
*   Model dosyasının adı: `spendify_model_unsloth_q4_k_m.gguf` olmalıdır.
*   Dosyayı şu dizine taşıyın: `backend/models/Spendify/`
*   Tam yol şu şekilde olmalıdır: `backend/models/Spendify/spendify_model_unsloth_q4_k_m.gguf`

### 3. Frontend Kurulumu
Yeni bir terminal penceresi açın (Backend terminalini kapatmayın), frontend klasörüne gidin ve gerekli paketleri yükleyin.

```bash
cd frontend
npm install
```

## Kullanım

Uygulamayı çalıştırmak için iki ayrı terminalde aşağıdaki komutları çalıştırmanız gerekmektedir.

### Backend Sunucusunu Başlatma
Backend terminalinde (sanal ortamın aktif olduğundan emin olun) şu komutu çalıştırın:

```bash
cd backend
uvicorn main:app --reload --port 8000
```
Backend API sunucusu `http://localhost:8000` adresinde çalışmaya başlayacaktır.

### Frontend Uygulamasını Başlatma
Frontend terminalinde şu komutu çalıştırın:

```bash
cd frontend
npm run dev
```
Uygulama tarayıcınızda `http://localhost:5173` adresinde açılacaktır.

## Proje Yapısı

Projenin dosya ve klasör düzeni aşağıdaki gibidir:

```
spendify/
├── backend/                # FastAPI Backend Uygulaması
│   ├── main.py             # Uygulama başlangıç noktası ve temel mantık
│   ├── models/             # GGUF model dosyalarının bulunduğu klasör
│   ├── uploads/            # Yüklenen fiş resimleri için geçici depolama alanı
│   ├── receipts.db         # SQLite Veritabanı dosyası
│   └── requirements.txt    # Gerekli Python kütüphaneleri listesi
├── frontend/               # React Frontend Uygulaması
│   ├── src/                # Kaynak kodlar (Bileşenler ve Sayfalar)
│   ├── public/             # Statik dosyalar
│   └── package.json        # Node.js bağımlılık listesi
├── docs/                   # Dokümantasyon ve görseller
│   └── images/             # README ve Rapor resimleri
├── data_gen/               # Sentetik veri üretimi için kullanılan scriptler
└── LLMModelFineTuning.ipynb # Model eğitimi ve ince ayar (fine-tuning) için not defteri
```

## Katkıda Bulunma

Projeye katkıda bulunmak, hataları bildirmek veya yeni özellikler önermek isterseniz lütfen GitHub üzerinden bir "Issue" açın veya "Pull Request" gönderin.

## Lisans

Bu proje MIT Lisansı ile dağıtılmaktadır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.
