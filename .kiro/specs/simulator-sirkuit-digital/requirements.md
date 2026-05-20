# Requirements Document

## Introduction

Simulator Sirkuit Digital (Petualangan Arus Elektron) adalah aplikasi web edukasi berbasis sandbox yang ditujukan untuk siswa Sekolah Dasar kelas 4–6 (usia 9–12 tahun). Aplikasi ini memungkinkan siswa memanipulasi variabel rangkaian listrik — jenis rangkaian (seri/paralel), jumlah baterai, dan watt nominal lampu — secara bebas, lalu mengamati efek visual yang dihasilkan: lampu meredup, menyala normal, atau meledak akibat overload. Seluruh logika fisika (Hukum Ohm, Hukum Daya) dijalankan 100% di sisi klien menggunakan vanilla HTML5/CSS3/JavaScript tanpa framework atau library eksternal.

---

## Glossary

- **Simulator**: Aplikasi web keseluruhan yang menjalankan simulasi rangkaian listrik.
- **Physics_Engine**: Modul JavaScript yang menghitung nilai arus (I), tegangan (V), hambatan (R), dan daya (P) berdasarkan Hukum Ohm dan Hukum Daya.
- **Canvas_Renderer**: Modul yang menggambar elemen sirkuit (kabel, baterai, lampu, partikel elektron) pada elemen `<canvas>` HTML5.
- **Particle_System**: Sub-modul dari Canvas_Renderer yang mengelola animasi titik-titik elektron bergerak di sepanjang kabel.
- **Bulb**: Komponen lampu dalam simulasi dengan watt nominal yang dapat dipilih (5W, 10W, 25W).
- **Battery**: Komponen sumber tegangan dalam simulasi; setiap unit menyumbang tegangan tetap.
- **Circuit**: Konfigurasi rangkaian yang terdiri dari satu atau lebih Battery dan satu atau lebih Bulb.
- **Series_Circuit**: Rangkaian di mana semua komponen terhubung dalam satu jalur; V_total = jumlah semua V, R_total = jumlah semua R.
- **Parallel_Circuit**: Rangkaian di mana semua komponen terhubung pada dua titik yang sama; tegangan tiap cabang = tegangan satu baterai, 1/R_total = jumlah semua 1/R.
- **P_actual**: Daya aktual yang diterima Bulb, dihitung sebagai V² / R.
- **P_nominal**: Watt nominal Bulb yang dipilih pengguna (5W, 10W, atau 25W).
- **Overload_State**: Kondisi ketika P_actual > P_nominal × 1.3; menyebabkan Bulb rusak dan arus berhenti (I = 0).
- **Dim_State**: Kondisi ketika P_actual < P_nominal; Bulb menyala dengan kecerahan lebih rendah.
- **Normal_State**: Kondisi ketika P_actual berada dalam rentang P_nominal hingga P_nominal × 1.3.
- **Animation_Loop**: Siklus `window.requestAnimationFrame()` yang memperbarui dan menggambar ulang Canvas_Renderer pada 60 FPS.
- **Control_Panel**: Area antarmuka pengguna yang berisi slider dan radio button untuk memanipulasi variabel sirkuit.
- **UI**: Antarmuka pengguna keseluruhan yang mencakup Control_Panel dan Canvas.

---

## Requirements

### Requirement 1: Inisialisasi dan Struktur Aplikasi

**User Story:** Sebagai siswa SD, saya ingin membuka aplikasi di browser tanpa instalasi apapun, sehingga saya dapat langsung menggunakan simulator tanpa hambatan teknis.

#### Acceptance Criteria

1. THE Simulator SHALL berjalan sepenuhnya di sisi klien (client-side) tanpa memerlukan server, framework JavaScript, atau library eksternal.
2. THE Simulator SHALL terdiri dari tepat tiga file: `index.html`, `css/style.css`, dan `js/sirkuit.js`.
3. THE Simulator SHALL menyertakan tag `<meta name="viewport" content="width=device-width, initial-scale=1.0">` di dalam `<head>` untuk mendukung tampilan mobile.
4. WHEN halaman pertama kali dimuat, THE Simulator SHALL menampilkan Circuit default (rangkaian seri, 1 baterai, Bulb 10W) dalam keadaan aktif; THE Animation_Loop SHALL berjalan hanya ketika Circuit dalam keadaan aktif sehingga animasi dan status aktif Circuit selalu tersinkronisasi.
5. THE Simulator SHALL menggunakan elemen `<canvas>` HTML5 sebagai satu-satunya media rendering untuk kabel, Battery, Bulb, dan Particle_System.
6. THE Simulator SHALL memperbolehkan keberadaan file tambahan (seperti dokumentasi atau aset gambar) di luar tiga file inti, selama tiga file inti (`index.html`, `css/style.css`, `js/sirkuit.js`) tetap ada dan berfungsi.
7. THE Simulator SHALL TIDAK memiliki file testing terpisah (seperti `*.test.js`, `*.spec.js`, atau `test.html`); seluruh kode pengujian WAJIB dipendam di dalam `js/sirkuit.js` sebagai fungsi `runSelfTests()` yang dipanggil saat inisialisasi.

---

### Requirement 2: Physics Engine — Hukum Ohm dan Hukum Daya

**User Story:** Sebagai siswa SD, saya ingin simulator menghitung fisika listrik secara akurat, sehingga hasil yang saya lihat mencerminkan konsep nyata yang diajarkan di sekolah.

#### Acceptance Criteria

1. THE Physics_Engine SHALL menghitung arus menggunakan formula I = V / R.
2. THE Physics_Engine SHALL menghitung daya aktual menggunakan formula P_actual = V² / R.
3. WHEN Circuit dikonfigurasi sebagai Series_Circuit, THE Physics_Engine SHALL menghitung V_total sebagai jumlah tegangan semua Battery dan R_total sebagai jumlah hambatan semua Bulb.
4. WHEN Circuit dikonfigurasi sebagai Parallel_Circuit, THE Physics_Engine SHALL menggunakan tegangan satu Battery sebagai tegangan tiap cabang dan menghitung R_total menggunakan formula 1/R_total = jumlah semua (1/R_bulb).
5. WHEN P_actual sama dengan nol (I = 0 atau tidak ada tegangan), THE Physics_Engine SHALL menetapkan status Bulb sebagai Dim_State.
6. WHEN P_actual lebih kecil dari P_nominal dan lebih besar dari nol, THE Physics_Engine SHALL menetapkan status Bulb sebagai Dim_State.
7. WHEN P_actual berada dalam rentang P_nominal hingga P_nominal × 1.3 (inklusif), THE Physics_Engine SHALL menetapkan status Bulb sebagai Normal_State.
8. WHEN P_actual lebih besar dari P_nominal × 1.3, THE Physics_Engine SHALL menetapkan status Bulb sebagai Overload_State dan mengatur nilai I menjadi 0.
9. THE Physics_Engine SHALL menghitung hambatan (R) setiap Bulb dari P_nominal menggunakan formula R = V_nominal² / P_nominal, di mana V_nominal adalah tegangan referensi satu Battery.

---

### Requirement 3: Rendering Canvas dan Animation Loop

**User Story:** Sebagai siswa SD, saya ingin melihat animasi sirkuit yang menarik dan bergerak, sehingga saya dapat memahami aliran listrik secara visual.

#### Acceptance Criteria

1. THE Canvas_Renderer SHALL menggambar semua elemen sirkuit (kabel, Battery, Bulb, partikel) secara eksklusif menggunakan HTML5 Canvas 2D API.
2. WHEN Animation_Loop sedang berjalan, THE Animation_Loop SHALL menggunakan `window.requestAnimationFrame()` untuk memperbarui dan menggambar ulang Canvas_Renderer pada target 60 FPS; THE Simulator SHALL TIDAK menggunakan `setInterval()` atau `setTimeout()` untuk kalkulasi loop animasi fisika.
3. WHEN Canvas_Renderer sedang aktif merender, THE Canvas_Renderer SHALL menerapkan transformasi CSS `transform: translateZ(0)` atau `will-change: transform` pada elemen `<canvas>` untuk mengaktifkan akselerasi hardware GPU.
4. WHEN Circuit dalam keadaan aktif (I > 0), THE Particle_System SHALL menampilkan titik-titik elektron bergerak di sepanjang jalur kabel sesuai arah arus.
5. WHEN Circuit dalam Overload_State, THE Particle_System SHALL menampilkan animasi partikel ledakan (blast particle vectors) yang memancar dari posisi Bulb yang overload.
6. THE Canvas_Renderer SHALL TIDAK menggunakan properti `style` DOM inline atau animasi CSS untuk efek visual apapun; semua animasi dijalankan melalui Animation_Loop.
7. WHEN ukuran jendela browser berubah, THE Canvas_Renderer SHALL menyesuaikan dimensi `<canvas>` agar sesuai dengan area tampilan yang tersedia.

---

### Requirement 4: Sistem Partikel Elektron

**User Story:** Sebagai siswa SD, saya ingin melihat "elektron" bergerak di dalam kabel, sehingga saya dapat memvisualisasikan konsep aliran arus listrik.

#### Acceptance Criteria

1. THE Particle_System SHALL menghasilkan partikel elektron yang bergerak sepanjang jalur kabel yang telah didefinisikan di Canvas_Renderer.
2. WHEN I > 0, THE Particle_System SHALL menggerakkan partikel elektron dengan kecepatan yang proporsional terhadap nilai I (arus lebih besar = partikel lebih cepat); partikel TIDAK diperbolehkan diam selama I bernilai positif.
3. WHEN I = 0 (Circuit terbuka atau Overload_State), THE Particle_System SHALL menghentikan pergerakan partikel elektron normal.
4. THE Particle_System SHALL menampilkan partikel elektron sebagai titik-titik berwarna (misalnya biru atau kuning) dengan ukuran yang terlihat jelas di layar mobile.
5. WHEN Overload_State terjadi, THE Particle_System SHALL menampilkan minimal 10 partikel ledakan yang memancar ke arah acak dari posisi Bulb yang rusak selama durasi animasi yang terbatas.

---

### Requirement 5: Rendering Visual Bulb (Lampu)

**User Story:** Sebagai siswa SD, saya ingin melihat lampu berubah tampilannya sesuai kondisi, sehingga saya dapat langsung memahami apakah lampu menyala normal, redup, atau rusak.

#### Acceptance Criteria

1. WHEN Bulb dalam Normal_State, THE Canvas_Renderer SHALL menggambar Bulb dengan kecerahan penuh (alpha = 1.0) dan efek cahaya (glow) yang jelas.
2. WHEN Bulb dalam Dim_State, THE Canvas_Renderer SHALL menggambar Bulb dengan nilai alpha yang lebih rendah, proporsional terhadap rasio P_actual / P_nominal, sehingga tampak lebih redup.
3. WHEN Bulb dalam Overload_State, THE Canvas_Renderer SHALL menggambar Bulb dengan visual "lampu pecah" (broken bulb) yang berbeda dari tampilan normal; IF visual broken bulb gagal dirender, THEN THE Canvas_Renderer SHALL menampilkan indikator error state yang jelas sebagai fallback.
4. THE Canvas_Renderer SHALL menampilkan representasi visual yang berbeda untuk setiap tiga kondisi Bulb (Dim_State, Normal_State, Overload_State) sehingga dapat dibedakan tanpa teks tambahan.

---

### Requirement 6: Control Panel — Manipulasi Variabel

**User Story:** Sebagai siswa SD, saya ingin mengubah variabel rangkaian dengan mudah menggunakan kontrol yang besar dan ramah sentuhan, sehingga saya dapat bereksperimen tanpa kesulitan teknis.

#### Acceptance Criteria

1. THE Control_Panel SHALL menyediakan range slider untuk mengatur jumlah Battery dalam Circuit.
2. THE Control_Panel SHALL menyediakan range slider untuk mengatur jumlah Bulb dalam Circuit.
3. THE Control_Panel SHALL menyediakan radio button untuk memilih jenis Circuit: Series_Circuit atau Parallel_Circuit.
4. THE Control_Panel SHALL menyediakan radio button untuk memilih P_nominal setiap Bulb dengan pilihan: 5W, 10W, atau 25W.
5. THE Control_Panel SHALL menggunakan atribut `for` dan `id` yang sesuai pada setiap pasangan `<label>` dan elemen input untuk memastikan area sentuh yang besar.
6. WHEN pengguna mengubah nilai apapun di Control_Panel, THE Physics_Engine SHALL segera menghitung ulang nilai I, V, R, dan P_actual, dan THE Canvas_Renderer SHALL memperbarui tampilan Circuit pada frame berikutnya.
7. THE Control_Panel SHALL menampilkan nilai hasil perhitungan Physics_Engine (V_total, I, R_total, P_actual) secara real-time agar siswa dapat mengamati perubahan angka.

---

### Requirement 7: Tampilan Informasi Fisika Real-Time

**User Story:** Sebagai siswa SD, saya ingin melihat angka-angka fisika yang berubah saat saya menggeser slider, sehingga saya dapat menghubungkan perubahan variabel dengan hasil perhitungan.

#### Acceptance Criteria

1. THE UI SHALL menampilkan nilai V_total (tegangan total) dalam satuan Volt (V) secara real-time.
2. THE UI SHALL menampilkan nilai I (arus) dalam satuan Ampere (A) secara real-time.
3. THE UI SHALL menampilkan nilai R_total (hambatan total) dalam satuan Ohm (Ω) secara real-time.
4. THE UI SHALL menampilkan nilai P_actual (daya aktual per lampu) dalam satuan Watt (W) secara real-time.
5. WHEN Overload_State terjadi, THE UI SHALL menampilkan pesan peringatan yang jelas dan ramah anak (misalnya "OVERLOAD! Lampu Putus!") untuk memberikan umpan balik edukatif; THE UI SHALL TIDAK menggunakan karakter emoji atau simbol Unicode non-alfanumerik grafis dalam teks pesan tersebut.
6. WHEN Circuit kembali ke kondisi normal setelah Overload_State (pengguna mengubah variabel), THE UI SHALL menghapus pesan peringatan dan menampilkan nilai fisika yang diperbarui.

---

### Requirement 8: Responsivitas Mobile dan Aksesibilitas UI

**User Story:** Sebagai siswa SD yang menggunakan tablet atau smartphone, saya ingin tampilan aplikasi menyesuaikan layar saya, sehingga saya dapat menggunakan simulator dengan nyaman di perangkat apapun.

#### Acceptance Criteria

1. THE UI SHALL menggunakan CSS Grid atau Flexbox dengan satuan relatif (`%`, `vw`, `vh`, `rem`) untuk tata letak, sehingga tidak ada horizontal scroll pada layar dengan lebar minimal 320px dan tata letak tetap fungsional serta dapat digunakan tanpa zoom manual pada lebar tersebut.
2. THE UI SHALL menampilkan tata letak yang bersih dan fungsional baik dalam orientasi portrait maupun landscape tanpa memerlukan zoom manual.
3. THE Control_Panel SHALL memiliki elemen input (slider, radio button) dengan area sentuh minimal yang memadai untuk penggunaan jari pada layar sentuh.
4. THE UI SHALL menggunakan palet warna yang cerah dan kontras tinggi yang sesuai untuk audiens anak-anak usia 9–12 tahun.
5. THE UI SHALL menggunakan tipografi yang mudah dibaca dengan ukuran font minimal 14px untuk teks konten dan minimal 16px untuk label kontrol.
6. WHERE perangkat mendukung layar sentuh, THE UI SHALL merespons interaksi sentuh pada semua elemen Control_Panel tanpa memerlukan mouse; THE UI SHALL TIDAK memiliki ketergantungan pada mouse ketika perangkat mendukung layar sentuh.
```
