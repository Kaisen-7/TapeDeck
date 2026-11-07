# 📼 TapeDeck M-88 (Precision Stereo Cassette Deck)

Aplikasi web pemutar dan pembuat *mixtape* kaset pita analog yang taktil, interaktif, bernuansa skeuomorfik *Hi-Fi Titanium*, dan beroperasi **100% tanpa database (Zero-DB)** menggunakan serialisasi URL Base64 yang aman.

---

## ✨ Fitur Utama

1. **Tombol Fisik Mekanis Berpengait (*Latching Push Buttons*):**
   * Tombol **PLAY** amblas dan terkunci di bawah dengan bayangan kedalaman saat musik berputar.
   * Tombol baru memantul naik kembali saat tombol **STOP** ditekan atau saat pita kaset habis (*auto-stop*).
   * Efek suara mekanis tombol *"ceklek"* (*button-down*) dan pegas lepas (*button-up*).

2. **Tanpa Seekbar Modern (*Authentic Mechanical Friction*):**
   * Tidak ada timeline modern yang instan digeser.
   * Gunakan tombol **FAST FORWARD (FF)** atau **REWIND (RW)** untuk memajukan/memundurkan lagu dengan suara putaran motor kaset (*whirring*) dan putaran roda kaset 4x lebih cepat.

3. **Dua Sisi Kaset (Side A & Side B) dengan Animasi 3D Flip 180°:**
   * Kaset memiliki dua sisi nyata dengan label stiker terpisah.
   * Tombol **FLIP SIDE** memicu animasi CSS 3D kaset terangkat dan berputar $180^\circ$ sumbu Y, disertai efek suara mekanis buka/tutup kompartemen kaset.

4. **Detail Skeuomorfik & Fisika Kaset Realistis:**
   * **Roda Gigi Kaset Berputar (*Rotating Spools*):** 6 gerigi berputar sinkron saat playback, cepat saat FF, dan mundur saat RW.
   * **Ketebalan Gulungan Pita Dinamis (*Dynamic Tape Pack Ribbon*):** Lingkaran pita magnetik di spul kiri menyusut dan spul kanan mengembang secara halus seiring durasi lagu.
   * **Dual VU Meter Analog:** Jarum ganda L/R bergoyang dinamis dengan inersia dan balistik realistis mengikuti irama lagu.
   * **Mechanical Tape Counter:** Digit rol analog 3 angka (000–999) yang berputar saat tape berjalan, lengkap dengan tombol reset.
   * **Analog Tape Hiss:** Desis statis pita kaset khas analog bersuara halus di latar belakang (dapat diaktifkan/dinonaktifkan lewat tombol toggle).
   * **Auto-Stop Mekanis:** Ketika lagu terakhir di satu sisi selesai, dek kaset secara otomatis melakukan *auto-stop* dengan bunyi "KLAK", tombol Play terlepas, dan lampu indikator *TAPE END* berkedip meminta kaset dibalik!

5. **Dukungan Multi-Source Audio (YouTube + Direct MP3/WAV/Audio Streams):**
   * **YouTube Links / IDs:** Memutar musik dari video YouTube secara instan tanpa perlu akun/login.
   * **Direct Audio Links:** Memasukkan link berkas audio langsung (`.mp3`, `.wav`, `.m4a`, `.ogg`, atau URL streaming seperti Internet Archive, Discord CDN, web podcast, dsb).
   * **Real Waveform Analyser:** Saat memutar direct MP3, jarum analog VU meter membaca frekuensi gelombang nyata menggunakan Web Audio API `AnalyserNode`!

6. **Keyboard Shortcuts (Kontrol Cepat Seperti Remote Hi-Fi Fisik):**
   * `Space`: Play / Stop
   * `F` atau `ArrowRight`: Fast Forward (Maju cepat)
   * `R` atau `ArrowLeft`: Rewind (Mundur cepat)
   * `X` atau `B`: Flip Cassette (Balik sisi kaset A/B)
   * `M`: Toggle Desis Pita (Tape Hiss On/Off)
   * `N`: Buka Studio Perekaman Kaset Baru
   * `C`: Reset Tape Counter ke `000`

7. **Fitur-Fitur Mega & Nostalgia Taktil:**
   * ✏️ **Pensil Pemutar Kaset Manual (*The Legendary Pencil Trick*):** Klik roda gigi kaset (atau tekan `P`) untuk memasang pensil Faber 2B realistis dan memutarnya secara manual dengan animasi crank orbital dan efek suara *ratchet click* mekanis. Mendukung *click & hold* untuk memutar pita terus-menerus.
   * 🎚️ **Knob Pitch / Speed Control ($\pm 15\%$):** Sesuaikan kecepatan putaran kaset dan audio secara dinamis (0.85x hingga 1.15x) untuk nuansa *Vaporwave / Slowed & Reverb*. Putaran roda kaset juga ikut melambat/mempercepat secara sinkron!
   * 📻 **Sakelar Dolby Noise Reduction (Dolby B-C NR):** Meredam suara desis analog pita (*tape hiss*) dengan sakelar toggle mekanis.
   * 🔁 **Auto-Reverse Otomatis:** Saat lagu terakhir di Side A habis, dek kaset secara otomatis membalik kaset ke Side B secara 3D dan langsung memutar Track 1 Side B!
   * 🌙 **Mode Suasana Pencahayaan (*Night Atmosphere* vs *Studio Hi-Fi*):** Tombol suasana di bar atas untuk mengubah tata pencahayaan hangat.
   * 🗄️ **Rak Kaset Virtual (*My Tape Rack Collection*):** Menyimpan semua kaset yang pernah dibuat/didengar di browser (`localStorage`). Klik kaset di rak untuk langsung memasukkannya ke dek pemutar!
   * 🏷️ **Koleksi Stiker Kaset Retro:** Tempelkan stiker seperti *⭐ Mix Vol. 1*, *❤️ For You*, *🚫 Do Not Erase*, *🌙 Late Night*, atau *🔥 Best Hits* pada stiker label kaset.
   * 🎙️ **Perekam Pesan Suara Pembuka (*Voice Note Intro*):** Rekam suara langsung via mic HP/laptop hingga 15 detik yang akan diputar sebagai intro kaset sebelum lagu pertama dimulai!

8. **Arsitektur Zero-Database (100% Client-Side URL Sharing):**
   * Seluruh isi mixtape dikompresi ke JSON ringkas dan di-encode menjadi string Base64 yang aman untuk URL (`?tape=...`).
   * Tombol **Salin Tautan** untuk berbagi ke teman.
   * Tombol **Bagikan ke WhatsApp**.
   * **QR Code Generator:** Dapat langsung di-scan menggunakan kamera smartphone untuk memutar mixtape di HP.

6. **Studio Perekam Kaset (*Mixtape Creator Studio*):**
   * Masukkan Judul Mixtape & Pesan Dedikasi.
   * Pilih dari 6 tema warna kaset:
     * *Retro Orange* (Maxell/TDK warmth)
     * *Smoked Clear Black* (Akrilik transparan beraksen emas)
     * *Pastel Sky* (Biru aesthetic 90an)
     * *Cyber Neon* (Synthwave ungu & cyan)
     * *Vintage Ivory* (Gading klasik 70an)
     * *Crimson Rock* (Merah cabai rock/metal)
   * Dukungan tautan YouTube fleksibel (URL biasa, youtu.be, embed, shorts, atau langsung video ID 11 karakter).
   * Maksimal 3 lagu di Side A dan 3 lagu di Side B.

---

## 🚀 Cara Menjalankan

### Mode Pengembangan (Development Server)
```bash
npm run dev
```
Buka browser pada alamat yang muncul (biasanya `http://localhost:5173`).

### Mode Produksi (Build)
```bash
npm run build
npm run preview
```
Folder `dist/` siap diunggah ke Vercel, Netlify, atau GitHub Pages tanpa memerlukan backend atau database server apa pun!

---

## 📁 Struktur Berkas

```text
dek-kaset/
├── index.html                   # Antarmuka utama (Dek Pemutar, J-Card, & Modal Studio)
├── style.css                    # Styling skeuomorfik, animasi roda, bayangan & 3D flip
├── app.js                       # Controller utama, event listeners, VU meter loop
├── soundEngine.js               # Mesin SFX (file audio & sintesis Web Audio API)
├── youtubeManager.js            # YouTube IFrame Player API wrapper & auto-advance
├── stateMachine.js              # State machine mekanis (IDLE, PLAYING, FF, RW, FLIPPING)
├── mixtapeData.js               # Skema JSON, Base64 parser URL, tema warna
├── public/assets/sfx/           # Berkas audio mikro (btn-down, btn-up, tape-ff, tape-flip, tape-hiss)
├── scripts/generate-sfx.js      # Generator WAV procedural audio sintetis
├── package.json                 # Konfigurasi dependensi dan scripts Vite
└── rancangan_proyek_dek_kaset_mekanis.md # Dokumen blueprint perancangan proyek
```
