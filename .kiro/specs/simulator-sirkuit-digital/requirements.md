# Requirements Document

## Introduction

Simulator Sirkuit Digital (Petualangan Arus Elektron) adalah aplikasi web edukasi berbasis sandbox yang ditujukan untuk siswa Sekolah Dasar kelas 4–6 (usia 9–12 tahun). Aplikasi ini memungkinkan siswa memanipulasi variabel rangkaian listrik — jenis rangkaian (seri/paralel), jumlah baterai, watt nominal lampu, posisi sakelar, dan kondisi komponen (lampu dicabut/kabel putus) — secara bebas, lalu mengamati efek visual yang dihasilkan: lampu meredup, menyala normal, atau meledak akibat overload. Seluruh logika fisika (Hukum Ohm, Hukum Daya) dijalankan 100% di sisi klien menggunakan vanilla HTML5/CSS3/JavaScript tanpa framework atau library eksternal.

---

## Glossary

- **Simulator**: Aplikasi web keseluruhan yang menjalankan simulasi rangkaian listrik.
- **Physics_Engine**: Modul JavaScript yang menghitung nilai arus (I), tegangan (V), hambatan (R), dan daya (P) berdasarkan Hukum Ohm dan Hukum Daya.
- **Canvas_Renderer**: Modul yang menggambar elemen sirkuit (kabel, baterai, lampu, sakelar, partikel elektron) pada elemen `<canvas>` HTML5.
- **Particle_System**: Sub-modul dari Canvas_Renderer yang mengelola animasi titik-titik elektron bergerak di sepanjang kabel.
- **Bulb**: Komponen lampu dalam simulasi dengan watt nominal yang dapat dipilih (5W, 10W, 25W); setiap Bulb memiliki status `isDetached` (dicabut) dan `isBurnt` (terbakar/overload).
- **Battery**: Komponen sumber tegangan dalam simulasi; setiap unit menyumbang tegangan tetap.
- **Switch**: Komponen sakelar yang dapat membuka (OFF) atau menutup (ON) jalur arus listrik; direpresentasikan oleh properti `isSakelarTertutup` pada objek `sim`.
- **Wire**: Komponen penghantar arus; dapat diputus secara interaktif melalui properti `isKabelPutus` pada objek `sim`.
- **Circuit**: Konfigurasi rangkaian yang terdiri dari satu atau lebih Battery, satu atau lebih Bulb, satu Switch, dan jalur Wire.
- **Series_Circuit**: Rangkaian di mana semua komponen terhubung dalam satu jalur; V_total = jumlah semua V, R_total = jumlah semua R aktif.
- **Parallel_Circuit**: Rangkaian di mana semua komponen terhubung pada dua titik yang sama; tegangan tiap cabang = tegangan satu baterai, 1/R_total = jumlah semua 1/R cabang aktif.
- **P_actual**: Daya aktual yang diterima Bulb, dihitung sebagai V_per_bulb² / R_bulb.
- **P_nominal**: Watt nominal Bulb yang dipilih pengguna (5W, 10W, atau 25W).
- **Overload_State**: Kondisi ketika P_actual > P_nominal × 1.3; menyebabkan Bulb rusak (`isBurnt = true`) dan arus berhenti (I = 0).
- **Dim_State**: Kondisi ketika P_actual < P_nominal atau P_actual = 0; Bulb menyala redup atau mati.
- **Normal_State**: Kondisi ketika P_actual berada dalam rentang P_nominal hingga P_nominal × 1.3.
- **Open_Circuit**: Kondisi ketika Switch dalam posisi OFF (`isSakelarTertutup = false`) atau Wire putus (`isKabelPutus = true`); arus tidak dapat mengalir sehingga I = 0 di seluruh sirkuit.
- **Closed_Circuit**: Kondisi ketika Switch dalam posisi ON (`isSakelarTertutup = true`) dan Wire tidak putus; arus mengalir dari kutub positif ke negatif sesuai konfigurasi komponen.
- **Animation_Loop**: Siklus `window.requestAnimationFrame()` yang memperbarui dan menggambar ulang Canvas_Renderer pada 60 FPS.
- **Control_Panel**: Area antarmuka pengguna yang berisi slider, radio button, dan tombol untuk memanipulasi variabel sirkuit.
- **Hit_Detection**: Mekanisme deteksi klik/sentuh pada elemen Canvas menggunakan koordinat yang diskalakan dari `canvas.getBoundingClientRect()` dan perhitungan jarak Pythagoras.
- **UI**: Antarmuka pengguna keseluruhan yang mencakup Control_Panel, panel informasi fisika, dan Canvas.

---

## Requirements

### Requirement 1: Inisialisasi dan Struktur Aplikasi

**User Story:** Sebagai siswa SD, saya ingin membuka aplikasi di browser tanpa instalasi apapun, sehingga saya dapat langsung menggunakan simulator tanpa hambatan teknis.

#### Acceptance Criteria

1. THE Simulator SHALL berjalan sepenuhnya di sisi klien (client-side) tanpa memerlukan server, framework JavaScript, atau library eksternal.
2. THE Simulator SHALL terdiri dari tepat tiga file inti: `index.html`, `css/style.css`, dan `js/sirkuit.js`.
3. THE Simulator SHALL menyertakan tag `<meta name="viewport" content="width=device-width, initial-scale=1.0">` di dalam `<head>` untuk mendukung tampilan mobile.
4. WHEN halaman pertama kali dimuat, THE Simulator SHALL menampilkan Circuit default (rangkaian seri, 1 baterai, Bulb 10W, Switch ON) dalam keadaan aktif; THE Animation_Loop SHALL berjalan hanya ketika Circuit dalam keadaan aktif sehingga animasi dan status aktif Circuit selalu tersinkronisasi.
5. THE Simulator SHALL menggunakan elemen `<canvas>` HTML5 sebagai satu-satunya media rendering untuk kabel, Battery, Bulb, Switch, dan Particle_System.
6. THE Simulator SHALL memperbolehkan keberadaan file tambahan (seperti dokumentasi atau aset gambar) di luar tiga file inti, selama tiga file inti tetap ada dan berfungsi.
7. THE Simulator SHALL TIDAK memiliki file testing terpisah; seluruh kode pengujian WAJIB dipendam di dalam `js/sirkuit.js` sebagai fungsi `runSelfTests()` yang dipanggil saat inisialisasi.

---

### Requirement 2: Physics Engine — Hukum Ohm dan Hukum Daya

**User Story:** Sebagai siswa SD, saya ingin simulator menghitung fisika listrik secara akurat, sehingga hasil yang saya lihat mencerminkan konsep nyata yang diajarkan di sekolah.

#### Acceptance Criteria

1. THE Physics_Engine SHALL menghitung arus menggunakan formula I = V / R.
2. THE Physics_Engine SHALL menghitung daya aktual menggunakan formula P_actual = V_per_bulb² / R_bulb.
3. WHEN Circuit dikonfigurasi sebagai Series_Circuit, THE Physics_Engine SHALL menghitung V_total sebagai jumlah tegangan semua Battery dan R_total sebagai jumlah hambatan semua Bulb yang aktif (tidak dicabut dan tidak terbakar).
4. WHEN Circuit dikonfigurasi sebagai Parallel_Circuit, THE Physics_Engine SHALL menggunakan tegangan satu Battery sebagai tegangan tiap cabang aktif dan menghitung R_total menggunakan formula 1/R_total = jumlah semua (1/R_bulb) untuk cabang yang aktif saja.
5. WHEN P_actual sama dengan nol (I = 0 atau tidak ada tegangan), THE Physics_Engine SHALL menetapkan status Bulb sebagai Dim_State.
6. WHEN P_actual lebih kecil dari P_nominal dan lebih besar dari nol, THE Physics_Engine SHALL menetapkan status Bulb sebagai Dim_State.
7. WHEN P_actual berada dalam rentang P_nominal hingga P_nominal × 1.3 (inklusif), THE Physics_Engine SHALL menetapkan status Bulb sebagai Normal_State.
8. WHEN P_actual lebih besar dari P_nominal × 1.3, THE Physics_Engine SHALL menetapkan status Bulb sebagai Overload_State, mengatur nilai I menjadi 0, dan menandai Bulb sebagai `isBurnt = true`.
9. THE Physics_Engine SHALL menghitung hambatan (R) setiap Bulb dari P_nominal menggunakan formula R = V_nominal² / P_nominal, di mana V_nominal adalah tegangan referensi satu Battery.

---

### Requirement 3: Sakelar (Switch) — Open dan Closed Circuit

**User Story:** Sebagai siswa SD, saya ingin menekan tombol sakelar untuk memutus dan menyambung arus listrik, sehingga saya dapat mengamati perbedaan antara sirkuit terbuka dan sirkuit tertutup secara langsung.

#### Acceptance Criteria

1. THE Control_Panel SHALL menyediakan Switch_Button yang dapat ditekan pengguna untuk mengubah posisi Switch antara ON (tertutup) dan OFF (terbuka).
2. WHEN Switch_Button ditekan dan posisi Switch saat ini adalah ON, THE Switch SHALL berpindah ke posisi OFF dan THE Physics_Engine SHALL memaksa I = 0 di seluruh sirkuit tanpa memandang konfigurasi komponen lainnya.
3. WHEN Switch_Button ditekan dan posisi Switch saat ini adalah OFF, THE Switch SHALL berpindah ke posisi ON dan THE Physics_Engine SHALL menghitung ulang seluruh nilai sirkuit sesuai konfigurasi komponen yang aktif.
4. WHILE isSakelarTertutup bernilai false (Open_Circuit), THE Physics_Engine SHALL tetap menghitung dan menyimpan nilai V_total dan R_total sesuai konfigurasi aktif, sehingga nilai tersebut langsung tersedia ketika Switch dikembalikan ke posisi ON.
5. WHILE isSakelarTertutup bernilai false, THE Physics_Engine SHALL TIDAK memicu transisi ke Overload_State dan TIDAK memanggil animasi ledakan; pemaksaan I = 0 oleh Switch bersifat independen dari jalur overload.
6. WHEN halaman pertama kali dimuat, THE Switch SHALL berada dalam posisi ON (tertutup) sehingga sirkuit default langsung aktif.
7. WHEN Switch_Button ditekan, THE Switch_Button SHALL memperbarui label teks menjadi "ON (Tertutup)" atau "OFF (Terbuka)" menggunakan `textContent`; label SHALL menggunakan teks deskriptif tanpa karakter emoji.
8. THE Switch_Button SHALL memiliki area sentuh minimal 44×44 piksel CSS untuk penggunaan jari pada layar sentuh.

---

### Requirement 4: Interaksi Pencabutan Lampu (Bulb Detachment)

**User Story:** Sebagai siswa SD, saya ingin mengklik lampu di dalam gambar rangkaian untuk mencabut atau memasang kembali lampu tersebut, sehingga saya dapat mengamati apa yang terjadi pada sirkuit ketika satu lampu dilepas.

#### Acceptance Criteria

1. THE Canvas_Renderer SHALL mendeteksi klik atau sentuh pada area Bulb menggunakan Hit_Detection berbasis jarak Pythagoras: `distance = sqrt((clickX - bulbX)² + (clickY - bulbY)²)`; IF `distance <= hitRadius`, THEN klik dianggap mengenai Bulb tersebut.
2. THE Hit_Detection SHALL mengonversi koordinat klik/sentuh dari koordinat layar ke koordinat canvas menggunakan `canvas.getBoundingClientRect()` dan faktor skala DPI: `canvasX = (clientX - rect.left) * (canvas.width / rect.width)`.
3. WHEN pengguna mengklik Bulb yang sedang terpasang (`isDetached = false`), THE Simulator SHALL mengubah `isDetached` menjadi `true` dan THE Physics_Engine SHALL segera menghitung ulang nilai sirkuit.
4. WHEN pengguna mengklik Bulb yang sedang dicabut (`isDetached = true`), THE Simulator SHALL mengubah `isDetached` menjadi `false` dan THE Physics_Engine SHALL segera menghitung ulang nilai sirkuit.
5. WHEN Bulb dalam kondisi `isBurnt = true` (terbakar akibat overload), THE Simulator SHALL TIDAK mengizinkan pemasangan kembali Bulb tersebut melalui klik; Bulb yang terbakar hanya dapat direset melalui tombol Reset.
6. THE Canvas_Renderer SHALL menggambar Bulb yang dicabut (`isDetached = true`) dengan visual berbeda (misalnya posisi sedikit tergeser atau warna abu-abu) untuk membedakannya dari Bulb yang terpasang.

---

### Requirement 5: Perilaku Sirkuit Seri saat Komponen Dilepas

**User Story:** Sebagai siswa SD, saya ingin melihat bahwa mencabut satu lampu di rangkaian seri mematikan semua lampu lainnya, sehingga saya dapat memahami kelemahan rangkaian seri dalam kehidupan nyata.

#### Acceptance Criteria

1. WHEN salah satu Bulb dalam Series_Circuit memiliki `isDetached = true` atau `isBurnt = true`, THE Physics_Engine SHALL menetapkan I = 0 untuk seluruh sirkuit karena jalur tunggal terputus.
2. WHEN I = 0 akibat Bulb dicabut di Series_Circuit, THE Canvas_Renderer SHALL menampilkan semua Bulb lainnya dalam Dim_State (tidak menyala) untuk memvisualisasikan bahwa seluruh sirkuit mati.
3. WHEN I = 0 akibat Bulb dicabut di Series_Circuit, THE Particle_System SHALL menghentikan pergerakan seluruh partikel elektron.
4. THE UI SHALL menampilkan nilai I = "0.000 A" dan status "Sirkuit Terbuka" saat kondisi ini berlaku.
5. WHEN Bulb yang dicabut dipasang kembali di Series_Circuit, THE Physics_Engine SHALL segera menghitung ulang dan memulihkan aliran arus normal jika tidak ada kondisi lain yang memutus sirkuit.

---

### Requirement 6: Perilaku Sirkuit Paralel saat Komponen Dilepas

**User Story:** Sebagai siswa SD, saya ingin melihat bahwa mencabut satu lampu di rangkaian paralel tidak mematikan lampu lainnya, sehingga saya dapat memahami keunggulan rangkaian paralel dibandingkan rangkaian seri.

#### Acceptance Criteria

1. WHEN salah satu Bulb dalam Parallel_Circuit memiliki `isDetached = true`, THE Physics_Engine SHALL menghitung ulang R_total hanya dari cabang-cabang yang aktif menggunakan formula 1/R_total = jumlah semua (1/R_bulb) untuk Bulb dengan `isDetached = false` dan `isBurnt = false`.
2. WHEN salah satu Bulb dalam Parallel_Circuit memiliki `isDetached = true`, THE Canvas_Renderer SHALL menampilkan Bulb yang dicabut dalam kondisi mati (Dim_State dengan alpha minimum) sementara Bulb lainnya tetap menyala sesuai nilai P_actual masing-masing.
3. WHEN semua Bulb dalam Parallel_Circuit memiliki `isDetached = true`, THE Physics_Engine SHALL menetapkan I = 0 karena tidak ada cabang aktif.
4. WHEN Bulb yang dicabut dipasang kembali di Parallel_Circuit, THE Physics_Engine SHALL segera menghitung ulang R_total dengan menyertakan kembali cabang tersebut.
5. THE UI SHALL menampilkan nilai I total yang diperbarui secara real-time setiap kali status `isDetached` berubah pada Parallel_Circuit.

---

### Requirement 7: Pemutusan Kabel (Wire Continuity)

**User Story:** Sebagai siswa SD, saya ingin melihat apa yang terjadi ketika kabel dalam rangkaian dipotong, sehingga saya dapat memahami bahwa kabel yang putus menghentikan seluruh aliran arus.

#### Acceptance Criteria

1. THE Simulator SHALL menyediakan mekanisme untuk mengubah status `isKabelPutus` menjadi `true` atau `false`, baik melalui tombol di Control_Panel maupun interaksi langsung pada Canvas.
2. WHILE isKabelPutus bernilai true, THE Physics_Engine SHALL memaksa I = 0 di seluruh sirkuit tanpa memandang konfigurasi komponen lainnya.
3. WHILE isKabelPutus bernilai true, THE Canvas_Renderer SHALL menampilkan visual kabel terputus (celah atau warna berbeda) pada segmen kabel yang putus.
4. WHILE isKabelPutus bernilai true, THE Physics_Engine SHALL TIDAK memicu transisi ke Overload_State; pemaksaan I = 0 oleh kabel putus bersifat independen dari jalur overload.
5. WHEN isKabelPutus berubah dari true menjadi false, THE Physics_Engine SHALL menghitung ulang seluruh nilai sirkuit sesuai konfigurasi komponen yang aktif.

---

### Requirement 8: Rendering Canvas dan Animation Loop

**User Story:** Sebagai siswa SD, saya ingin melihat animasi sirkuit yang menarik dan bergerak, sehingga saya dapat memahami aliran listrik secara visual.

#### Acceptance Criteria

1. THE Canvas_Renderer SHALL menggambar semua elemen sirkuit (kabel, Battery, Bulb, Switch, partikel) secara eksklusif menggunakan HTML5 Canvas 2D API.
2. WHEN Animation_Loop sedang berjalan, THE Animation_Loop SHALL menggunakan `window.requestAnimationFrame()` untuk memperbarui dan menggambar ulang Canvas_Renderer pada target 60 FPS; THE Simulator SHALL TIDAK menggunakan `setInterval()` atau `setTimeout()` untuk kalkulasi loop animasi fisika.
3. WHEN Canvas_Renderer sedang aktif merender, THE Canvas_Renderer SHALL menerapkan transformasi CSS `transform: translateZ(0)` atau `will-change: transform` pada elemen `<canvas>` untuk mengaktifkan akselerasi hardware GPU.
4. WHEN Circuit dalam keadaan aktif (I > 0), THE Particle_System SHALL menampilkan titik-titik elektron bergerak di sepanjang jalur kabel sesuai arah arus.
5. WHEN Circuit dalam Overload_State, THE Particle_System SHALL menampilkan animasi partikel ledakan yang memancar dari posisi Bulb yang overload.
6. THE Canvas_Renderer SHALL TIDAK menggunakan properti `style` DOM inline atau animasi CSS untuk efek visual apapun; semua animasi dijalankan melalui Animation_Loop.
7. WHEN ukuran jendela browser berubah, THE Canvas_Renderer SHALL menyesuaikan dimensi `<canvas>` agar sesuai dengan area tampilan yang tersedia dan Switch_Visual tetap proporsional.

---

### Requirement 9: Sistem Partikel Elektron

**User Story:** Sebagai siswa SD, saya ingin melihat "elektron" bergerak di dalam kabel, sehingga saya dapat memvisualisasikan konsep aliran arus listrik dari kutub positif ke kutub negatif.

#### Acceptance Criteria

1. THE Particle_System SHALL menghasilkan partikel elektron yang bergerak sepanjang jalur kabel yang telah didefinisikan di Canvas_Renderer.
2. WHEN I > 0, THE Particle_System SHALL menggerakkan partikel elektron dengan kecepatan yang proporsional terhadap nilai I; partikel TIDAK diperbolehkan diam selama I bernilai positif.
3. WHEN I = 0 (Open_Circuit, Overload_State, atau semua Bulb dicabut), THE Particle_System SHALL menghentikan pergerakan partikel elektron normal.
4. THE Particle_System SHALL menampilkan partikel elektron sebagai titik-titik berwarna dengan ukuran yang terlihat jelas di layar mobile.
5. WHEN Overload_State terjadi, THE Particle_System SHALL menampilkan minimal 10 partikel ledakan yang memancar ke arah acak dari posisi Bulb yang rusak selama durasi animasi yang terbatas.

---

### Requirement 10: Rendering Visual Bulb (Lampu)

**User Story:** Sebagai siswa SD, saya ingin melihat lampu berubah tampilannya sesuai kondisi, sehingga saya dapat langsung memahami apakah lampu menyala normal, redup, dicabut, atau rusak.

#### Acceptance Criteria

1. WHEN Bulb dalam Normal_State dan `isDetached = false`, THE Canvas_Renderer SHALL menggambar Bulb dengan kecerahan penuh (alpha = 1.0) dan efek cahaya (glow) yang jelas.
2. WHEN Bulb dalam Dim_State dan `isDetached = false`, THE Canvas_Renderer SHALL menggambar Bulb dengan nilai alpha yang lebih rendah, proporsional terhadap rasio P_actual / P_nominal.
3. WHEN Bulb dalam Overload_State atau `isBurnt = true`, THE Canvas_Renderer SHALL menggambar Bulb dengan visual "lampu pecah" yang berbeda dari tampilan normal.
4. WHEN Bulb memiliki `isDetached = true`, THE Canvas_Renderer SHALL menggambar Bulb dengan visual terpisah dari jalur kabel (misalnya posisi sedikit tergeser ke bawah) dan warna abu-abu untuk menunjukkan bahwa Bulb tidak terhubung ke sirkuit.
5. THE Canvas_Renderer SHALL menampilkan representasi visual yang berbeda untuk setiap empat kondisi Bulb (Dim_State, Normal_State, Overload/Burnt, Detached) sehingga dapat dibedakan tanpa teks tambahan.

---

### Requirement 11: Teks Status Ramah Anak (Child-Friendly Status)

**User Story:** Sebagai siswa SD kelas 4–6, saya ingin membaca penjelasan kondisi lampu dalam bahasa yang mudah saya mengerti, sehingga saya dapat belajar konsep listrik tanpa merasa bingung dengan istilah teknis.

#### Acceptance Criteria

1. WHEN Bulb dalam Normal_State, THE UI SHALL menampilkan teks status "Menyala Normal" menggunakan `element.textContent`; teks ini SHALL menggunakan bahasa Indonesia sederhana yang dapat dipahami siswa kelas 4 SD tanpa penjelasan tambahan.
2. WHEN Bulb dalam Dim_State, THE UI SHALL menampilkan teks status "Redup" menggunakan `element.textContent`; teks ini SHALL menggunakan bahasa Indonesia sederhana tanpa istilah teknis seperti "daya" atau "watt".
3. WHEN Bulb dalam Overload_State atau `isBurnt = true`, THE UI SHALL menampilkan teks status "Lampu Putus" menggunakan `element.textContent`; teks ini SHALL menggunakan bahasa Indonesia sederhana yang menggambarkan kondisi lampu rusak tanpa istilah teknis seperti "overload" atau "P_actual".
4. WHEN Switch dalam posisi OFF (Open_Circuit), THE UI SHALL menampilkan teks status "Sirkuit Terbuka" menggunakan `element.textContent`.
5. THE UI SHALL TIDAK menggunakan karakter emoji, emoticon, atau simbol Unicode non-alfanumerik grafis dalam teks status apapun; semua teks status wajib menggunakan karakter alfanumerik dan tanda baca standar.
6. WHEN Overload_State terjadi, THE UI SHALL menampilkan pesan banner "OVERLOAD! Lampu Putus!" menggunakan `element.textContent` tanpa karakter emoji.

---

### Requirement 12: Control Panel — Manipulasi Variabel

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

### Requirement 13: Tampilan Informasi Fisika Real-Time

**User Story:** Sebagai siswa SD, saya ingin melihat angka-angka fisika yang berubah saat saya menggeser slider atau mengklik komponen, sehingga saya dapat menghubungkan perubahan variabel dengan hasil perhitungan.

#### Acceptance Criteria

1. THE UI SHALL menampilkan nilai V_total (tegangan total) dalam satuan Volt (V) secara real-time.
2. THE UI SHALL menampilkan nilai I (arus) dalam satuan Ampere (A) secara real-time.
3. THE UI SHALL menampilkan nilai R_total (hambatan total) dalam satuan Ohm secara real-time.
4. THE UI SHALL menampilkan nilai P_actual (daya aktual per lampu) dalam satuan Watt (W) secara real-time.
5. WHEN Overload_State terjadi, THE UI SHALL menampilkan pesan peringatan yang jelas dan ramah anak tanpa karakter emoji atau simbol Unicode non-alfanumerik grafis.
6. WHEN Circuit kembali ke kondisi normal setelah Overload_State, THE UI SHALL menghapus pesan peringatan dan menampilkan nilai fisika yang diperbarui.
7. WHEN Switch dalam posisi OFF atau Wire putus, THE UI SHALL menampilkan I = "0.000 A" dan V_total serta R_total tetap ditampilkan sesuai konfigurasi aktif.

---

### Requirement 14: Responsivitas Mobile dan Aksesibilitas UI

**User Story:** Sebagai siswa SD yang menggunakan tablet atau smartphone, saya ingin tampilan aplikasi menyesuaikan layar saya, sehingga saya dapat menggunakan simulator dengan nyaman di perangkat apapun.

#### Acceptance Criteria

1. THE UI SHALL menggunakan CSS Grid atau Flexbox dengan satuan relatif untuk tata letak, sehingga tidak ada horizontal scroll pada layar dengan lebar minimal 320px.
2. THE UI SHALL menampilkan tata letak yang bersih dan fungsional baik dalam orientasi portrait maupun landscape tanpa memerlukan zoom manual.
3. THE Control_Panel SHALL memiliki elemen input dengan area sentuh minimal yang memadai untuk penggunaan jari pada layar sentuh.
4. THE UI SHALL menggunakan palet warna yang cerah dan kontras tinggi yang sesuai untuk audiens anak-anak usia 9–12 tahun.
5. THE UI SHALL menggunakan tipografi yang mudah dibaca dengan ukuran font minimal 14px untuk teks konten dan minimal 16px untuk label kontrol.
6. WHERE perangkat mendukung layar sentuh, THE UI SHALL merespons interaksi sentuh pada semua elemen Control_Panel dan Canvas tanpa memerlukan mouse.

---

## Correctness Properties

Properti-properti berikut adalah invariant yang harus selalu terpenuhi dan dapat diverifikasi melalui property-based testing di dalam `runSelfTests()`.

### Property 1: Hukum Ohm — Konsistensi I = V / R

```
UNTUK SEMUA state dengan R_total > 0 dan bulbState != 'overload' dan isSakelarTertutup = true dan isKabelPutus = false:
  |sim.I - (sim.V_total / sim.R_total)| < 0.0001
```

### Property 2: Klasifikasi State Bulb Eksklusif

```
UNTUK SEMUA nilai P_actual yang valid:
  tepat satu dari {dim, normal, overload} aktif
  dim      iff P_actual < P_nominal
  normal   iff P_nominal <= P_actual <= P_nominal * 1.3
  overload iff P_actual > P_nominal * 1.3
```

### Property 3: Open_Circuit Memaksa I = 0

```
JIKA isSakelarTertutup = false ATAU isKabelPutus = true:
  sim.I = 0
  sim.blastActive tidak berubah menjadi true
```

### Property 4: Seri — Satu Bulb Dicabut Memutus Seluruh Sirkuit

```
JIKA circuitType = 'seri' DAN ada minimal satu Bulb dengan isDetached = true:
  sim.I = 0
```

### Property 5: Paralel — Bulb Dicabut Hanya Mematikan Cabang Tersebut

```
JIKA circuitType = 'paralel' DAN ada Bulb dengan isDetached = true DAN ada Bulb lain dengan isDetached = false:
  sim.I > 0
  R_total dihitung hanya dari cabang aktif
```

### Property 6: Overload Memutus Arus dan Menandai isBurnt

```
JIKA bulbState = 'overload':
  sim.I = 0
  Bulb yang overload memiliki isBurnt = true
```

### Property 7: dimAlpha Proporsional dan Terbatas

```
JIKA bulbState = 'dim' DAN P_actual > 0:
  0.25 <= sim.dimAlpha < 1.0
JIKA bulbState = 'dim' DAN P_actual = 0:
  sim.dimAlpha = 0.25
```
