# Simulator Sirkuit Digital: Petualangan Arus Elektron

Simulator Sirkuit Digital adalah aplikasi berbasis web yang dikembangkan sebagai alat bantu visual interaktif untuk mempelajari konsep dasar kelistrikan. Dirancang khusus sebagai media pembelajaran bermakna, aplikasi ini membantu siswa memahami fenomena abstrak fisika melalui simulasi yang aman, intuitif, dan akurat secara ilmiah.

---

## Target Pembelajaran dan Filosofi

Aplikasi ini ditujukan bagi siswa Sekolah Dasar tingkat fase C (Kelas 4 hingga 6 atau rentang usia 9 hingga 12 tahun). 

Mengusung model *Sandbox Environment*, simulator ini memberikan kebebasan penuh bagi siswa untuk memanipulasi berbagai variabel kelistrikan secara ekstrem. Pendekatan eksploratif ini dirancang untuk memicu pemahaman hubungan sebab-akibat secara mandiri, seperti melihat lampu yang meredup, menyala normal, hingga mengalami putus atau malfungsi akibat beban berlebih.

Tujuan utama dari pengembangan simulator ini adalah mengeliminasi miskonsepsi umum di tingkat sekolah dasar bahwa penambahan kuantitas sumber daya baterai akan selalu meningkatkan intensitas cahaya lampu secara linear. Melalui pemanfaatan teknologi *sandbox* yang edukatif, siswa dapat menyimpulkan sendiri batasan fisik sirkuit secara objektif.

---

## Fungsi dan Fitur Utama

* **Pengaturan Variabel Dinamis**
  Pengguna dapat memodifikasi jumlah baterai, jumlah lampu, dan daya hambat lampu dalam satuan Watt secara fleksibel untuk menguji perilaku sirkuit.

* **Manipulasi Komponen Interaktif**
  Mendukung interaksi langsung dengan komponen di dalam kanvas, di mana pengguna dapat mencabut lampu dari rangkaian hanya dengan melakukan klik *mouse* (baik di PC maupun laptop).
  
* **Layout Adaptif Otomatis**
  Antarmuka UI menyesuaikan tata letak komponen secara responsif berdasarkan orientasi perangkat, memberikan kenyamanan operasional yang konsisten baik pada layar desktop maupun seluler.
  
* **Visualisasi Aliran Arus**
  Pergerakan butiran elektron di sepanjang lintasan kawat direpresentasikan secara visual guna mempermudah pemahaman arah arus listrik serta membedakan fase sirkuit terbuka dan tertutup.
  
* **Indikator Kondisi Kontekstual**
  Sistem memberikan umpan balik instan berupa keterangan teks edukasi terintegrasi untuk menjelaskan status aktual rangkaian, termasuk visualisasi proteksi saat terjadi kondisi *overload*.

---

## Arsitektur Teknis

Simulator ini dibangun menggunakan standar teknologi web modern untuk menjamin tingkat portabilitas tinggi, kecepatan muat instan, dan kemudahan akses tanpa membutuhkan instalasi perangkat lunak tambahan maupun dependensi dari pustaka pihak ketiga:

1. **Engine Rendering**
   Menggunakan HTML5 Canvas API untuk mengolah visualisasi grafis performa tinggi dan merender pembaruan komponen sirkuit secara *real-time*.
   
2. **Logika Fisika**
   Diimplementasikan menggunakan JavaScript murni (*Vanilla JS*) dengan algoritma kalkulasi *non-blocking* untuk memproses perhitungan nilai tegangan, hambatan total, dan kuat arus secara simultan.
   
3. **Tata Letak Antarmuka**
   Memanfaatkan arsitektur CSS3 Modern melalui kombinasi *flexbox*, *grid*, dan *media queries* guna mengunci presisi komponen di berbagai resolusi layar.

---

## Panduan Penggunaan

Aplikasi dijalankan langsung melalui peramban web modern dengan langkah operasional sebagai berikut:

1. Buka file `index.html` pada peramban web pilihan Anda.
2. Gunakan panel kontrol di sisi antarmuka untuk menambah atau mengurangi komponen sirkuit sesuai skenario eksperimen.
3. Tekan sakelar kendali utama untuk mengubah status rangkaian antara terbuka (OFF) atau tertutup (ON).
4. Amati hasil kalkulasi hukum fisika yang diperbarui secara otomatis pada panel informasi bersamaan dengan perubahan visual pendaran lampu serta kecepatan arus elektron.

---

## Catatan Pengembangan

Siklus pengembangan aplikasi ini berfokus sepenuhnya pada kebersihan kode dan optimalisasi performa *rendering* di tingkat dasar. Pemisahan beban kerja visual antara manipulasi DOM konvensional dan kalkulasi koordinat *canvas* dilakukan dengan efisiensi tinggi. 

Hal ini memastikan *engine* animasi tetap beroperasi stabil pada kecepatan optimal dengan *footprint* memori yang sangat kecil, menjadikannya sangat ramah untuk diakses oleh perangkat seluler berspesifikasi terbatas dalam lingkungan pendidikan.
