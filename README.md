# Simulator Sirkuit Digital: Petualangan Arus Elektron

Simulator Sirkuit Digital adalah aplikasi berbasis web yang dikembangkan sebagai alat bantu visual interaktif untuk mempelajari konsep dasar kelistrikan. Dirancang khusus sebagai media pembelajaran bermakna, aplikasi ini membantu siswa memahami fenomena abstrak fisika melalui simulasi yang aman, intuitif dan akurat secara ilmiah.

---

## Standar Kesesuaian Edukasi

Aplikasi ini dirancang secara spesifik untuk memenuhi parameter media edukasi berkualitas tinggi, mengacu pada standar pedagogi modern dan meminimalisir miskonsepsi kelistrikan pada anak:

| Kriteria Edukasi | Implementasi dalam Simulator |
| :--- | :--- |
| **Target Spesifik** | Ditujukan untuk siswa SD Fase C (usia 9-12 tahun) dengan antarmuka ramah anak, tombol interaktif besar dan copywriting fungsional yang mudah dicerna. |
| **Fokus Topik** | Membatasi ruang lingkup hanya pada eksplorasi fenomena dasar listrik serta perbedaan karakteristik tata letak rangkaian Seri dan Paralel. |
| **Akurasi Fakta** | Kalkulasi mesin fisika beroperasi mutlak mematuhi realita dunia nyata melalui Hukum Ohm (V = I x R) dan Hukum Daya (P = V x I). |
| **Interaksi Bermakna** | Menggunakan pendekatan Sandbox Environment. Siswa bebas bereksperimen secara ekstrem hingga menciptakan kondisi overload, memicu respons visual dan teks reflektif agar siswa menarik kesimpulan secara mandiri. |

---

## Fitur dan Inovasi Utama

* **Pengaturan Variabel Dinamis**
  Pengguna dapat memanipulasi jumlah baterai (tegangan), jumlah lampu dan spesifikasi hambat daya (Watt) secara fleksibel untuk menguji perilaku sirkuit.
* **Manipulasi Komponen Interaktif (Direct Touch)**
  Komponen seperti lampu dan sakelar dapat diketuk/diklik langsung dari dalam gambar kanvas untuk memutus atau menyambung arus, didukung kalibrasi koordinat presisi untuk layar smartphone (DPR adaptif).
* **Procedural Web Audio (SFX)**
  Umpan balik audio berupa bunyi klik mekanis sakelar dan suara sengatan korsleting listrik disintesis secara murni menggunakan gelombang matematika bawaan peramban (tanpa berkas eksternal mp3), menjaga ukuran aplikasi tetap nol-aset.
* **Visualisasi Aliran Arus Real-Time**
  Pergerakan butiran elektron direpresentasikan secara visual dengan kecepatan yang sebanding lurus terhadap fluktuasi nilai Kuat Arus (Ampere) aktual.
* **Indikator Kondisi Kontekstual**
  Sistem memberikan peringatan instan berupa teks edukasi untuk menjelaskan status rangkaian, seperti visualisasi proteksi dan ledakan partikel saat batas toleransi daya terlampaui.

---

## Arsitektur Teknis

Simulator ini dibangun menggunakan teknologi web murni (Vanilla Web). Pendekatan tanpa pustaka eksternal ini menjamin aplikasi menjadi sangat ringan, langsung memuat secara instan dan mampu menyajikan animasi yang mulus (60 FPS) di berbagai perangkat:

1. **Engine Rendering HTML5 Canvas**
   Mengolah visualisasi grafis performa tinggi dengan pemisahan beban kerja yang jelas antara manipulasi DOM konvensional dan kalkulasi koordinat di dalam kanvas.
2. **Logika Fisika JIT-Friendly**
   Kalkulasi dieksekusi menggunakan JavaScript murni (Vanilla JS). Status aplikasi dikelola dalam Monomorphic State tunggal untuk mencegah kebocoran memori (Memory Leak) dan ramah terhadap Just-In-Time Compiler peramban.
3. **Optimasi Algoritma Interaksi**
   Aplikasi ini menggunakan cara perhitungan yang sangat ringan untuk mengenali sentuhan jari pengguna pada gambar komponen (seperti saat menekan lampu atau sakelar). Hasilnya, layar akan merespons seketika tanpa jeda (lag) dan simulasi tetap berjalan sangat lancar meskipun dimainkan di smartphone berspesifikasi rendah.
4. **Tata Letak CSS3 Modern**
   Memanfaatkan flexbox dan grid untuk mengunci presisi rasio komponen di berbagai orientasi layar. Dilengkapi dengan lapisan Mobile Safe Zone khusus untuk mematikan efek scroll-trapping saat diakses melalui smartphone.

---

## Panduan Penggunaan

Aplikasi berjalan sepenuhnya di sisi klien (Client-Side) dan tidak membutuhkan instalasi server, build tools, maupun koneksi internet aktif setelah dimuat:

1. Ekstrak folder proyek dan buka berkas `index.html` pada peramban web modern (Chrome, Firefox, Safari, atau Edge).
2. Gunakan panel kontrol slider untuk menambah atau mengurangi komponen sirkuit sesuai skenario yang ingin diuji.
3. Tekan sakelar kendali utama (melalui panel kontrol maupun dengan menyentuhnya langsung di kanvas) untuk menghidupkan aliran listrik.
4. Amati hasil kalkulasi parameter fisika pada panel informasi bersamaan dengan perubahan visual pendaran lampu, kecepatan elektron dan umpan balik audio.

---

## Catatan Pengembangan

Siklus pengembangan aplikasi ini berfokus sepenuhnya pada kebersihan kode (clean code), optimalisasi performa rendering dan efektivitas pembelajaran. Proyek ini membuktikan bahwa simulasi sains berkinerja tinggi dapat diwujudkan melalui arsitektur fundamental web tanpa membebani ekosistem dengan dependensi yang berlebihan.