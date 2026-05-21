# Requirements Document

## Introduction

Fitur Sakelar On/Off menambahkan komponen sakelar (switch) interaktif ke dalam Simulator Sirkuit Digital. Sakelar memungkinkan siswa SD kelas 4–6 memutus dan menyambung arus listrik secara manual, sehingga mereka dapat mengamati secara langsung bagaimana sirkuit terbuka menghentikan aliran elektron dan mematikan lampu. Fitur ini diimplementasikan sepenuhnya dalam tiga file inti yang sudah ada (`index.html`, `css/style.css`, `js/sirkuit.js`) tanpa dependensi eksternal, mengikuti seluruh aturan arsitektur yang berlaku.

---

## Glossary

- **Sakelar**: Komponen sirkuit yang dapat membuka (OFF) atau menutup (ON) jalur arus listrik secara manual oleh pengguna.
- **Sirkuit_Terbuka**: Kondisi ketika Sakelar dalam posisi OFF (terbuka); arus tidak dapat mengalir sehingga I = 0 di seluruh sirkuit.
- **Sirkuit_Tertutup**: Kondisi ketika Sakelar dalam posisi ON (tertutup); arus mengalir normal sesuai konfigurasi komponen.
- **isSakelarTertutup**: Properti boolean pada objek `sim` yang merepresentasikan posisi Sakelar; `true` berarti tertutup (ON), `false` berarti terbuka (OFF).
- **Switch_Button**: Elemen tombol HTML di Control_Panel yang digunakan pengguna untuk mengubah posisi Sakelar.
- **Switch_Visual**: Representasi grafis Sakelar yang digambar pada elemen `<canvas>` sebagai bagian dari jalur kabel sirkuit.
- **Physics_Engine**: Modul `runPhysics()` yang menghitung nilai arus, tegangan, hambatan, dan daya; satu-satunya fungsi yang boleh memodifikasi `sim.*`.
- **Control_Panel**: Area antarmuka pengguna yang berisi semua kontrol input, termasuk Switch_Button.
- **Canvas_Renderer**: Modul yang menggambar semua elemen sirkuit pada `<canvas>` HTML5, termasuk Switch_Visual.
- **UI**: Antarmuka pengguna keseluruhan yang mencakup Control_Panel, panel informasi fisika, dan Canvas.
- **Overload_State**: Kondisi ketika P_actual > P_nominal × 1.3; menyebabkan Bulb rusak dan arus berhenti (I = 0) melalui jalur overload, berbeda dari Sirkuit_Terbuka.
- **Dim_State**: Kondisi ketika P_actual < P_nominal atau P_actual = 0; Bulb menyala redup atau mati.

---

## Requirements

### Requirement 1: Kontrol Sakelar di Control Panel

**User Story:** Sebagai siswa SD, saya ingin menekan tombol sakelar untuk memutus dan menyambung arus listrik, sehingga saya dapat mengamati apa yang terjadi pada lampu dan elektron ketika sirkuit dibuka dan ditutup.

#### Acceptance Criteria

1. THE Control_Panel SHALL menyediakan Switch_Button yang dapat ditekan pengguna untuk mengubah posisi Sakelar antara ON (tertutup) dan OFF (terbuka).
2. WHEN Switch_Button ditekan dan posisi Sakelar saat ini adalah ON, THE Sakelar SHALL berpindah ke posisi OFF dalam satu frame animasi (≤ 16ms) dan THE Physics_Engine SHALL menghitung ulang seluruh nilai sirkuit dengan memaksa I = 0; IF pembaruan tidak selesai dalam 16ms, THEN THE UI SHALL tetap menampilkan nilai terakhir yang valid hingga frame berikutnya selesai.
3. WHEN Switch_Button ditekan dan posisi Sakelar saat ini adalah OFF, THE Sakelar SHALL berpindah ke posisi ON dalam satu frame animasi (≤ 16ms) dan THE Physics_Engine SHALL menghitung ulang seluruh nilai sirkuit sesuai konfigurasi komponen yang aktif; IF pembaruan tidak selesai dalam 16ms, THEN THE UI SHALL tetap menampilkan nilai terakhir yang valid hingga frame berikutnya selesai.
4. WHEN Switch_Button ditekan dan posisi Sakelar berubah, THE Switch_Button SHALL memperbarui label teks menjadi "ON (Tertutup)" ketika Sakelar berpindah ke posisi ON, dan menjadi "OFF (Terbuka)" ketika Sakelar berpindah ke posisi OFF; label SHALL menggunakan teks deskriptif tanpa karakter emoji atau simbol Unicode non-alfanumerik grafis.
5. THE Switch_Button SHALL memiliki area sentuh minimal 44×44 piksel CSS untuk penggunaan jari pada layar sentuh.
6. WHEN halaman pertama kali dimuat, THE Sakelar SHALL berada dalam posisi ON (tertutup) sehingga sirkuit default langsung aktif.

---

### Requirement 2: Perilaku Physics Engine saat Sakelar OFF

**User Story:** Sebagai siswa SD, saya ingin melihat arus berhenti mengalir ketika sakelar dibuka, sehingga saya dapat memahami konsep sirkuit terbuka secara visual dan numerik.

#### Acceptance Criteria

1. WHILE isSakelarTertutup bernilai false, THE Physics_Engine SHALL menetapkan nilai I menjadi 0 tanpa memandang nilai circuitType, batteryCount, bulbCount, atau bulbWatt yang sedang aktif.
2. WHILE isSakelarTertutup bernilai false, THE Physics_Engine SHALL menetapkan bulbState menjadi Dim_State dengan dimAlpha = 0.25, karena P_actual = 0 ketika I = 0.
3. WHILE isSakelarTertutup bernilai false, THE Physics_Engine SHALL tetap menghitung dan menyimpan nilai V_total = (batteryCount × voltasePerBaterai) dan R_total sesuai formula konfigurasi aktif (seri: R_total = Σ R_bulb; paralel: 1/R_total = Σ 1/R_bulb), sehingga nilai tersebut langsung tersedia ketika Sakelar dikembalikan ke posisi ON.
4. IF isSakelarTertutup bernilai false dan kondisi daya komponen aktif memenuhi P_actual > 0.0 yang seharusnya menghasilkan Overload_State (yaitu P_actual > P_nominal × 1.3), THEN THE Physics_Engine SHALL TIDAK memicu transisi ke Overload_State, TIDAK memanggil spawnBlast(), dan TIDAK menampilkan overload banner; pemaksaan I = 0 oleh Sakelar bersifat independen dari jalur overload.
5. WHEN isSakelarTertutup berubah dari false menjadi true, THE Physics_Engine SHALL menghitung ulang seluruh nilai sirkuit (I, P_actual, bulbState, dimAlpha) berdasarkan konfigurasi komponen yang aktif; nilai I yang dihasilkan SHALL identik dengan nilai yang dikalkulasi Physics_Engine tanpa intervensi Sakelar pada konfigurasi yang sama.

---

### Requirement 3: Tampilan Visual Sakelar di Canvas

**User Story:** Sebagai siswa SD, saya ingin melihat gambar sakelar di dalam rangkaian, sehingga saya dapat memahami posisi sakelar dalam sirkuit secara visual seperti pada diagram listrik nyata.

#### Acceptance Criteria

1. THE Canvas_Renderer SHALL menggambar Switch_Visual sebagai bagian dari jalur kabel sirkuit pada posisi yang konsisten di setiap frame, menggunakan HTML5 Canvas 2D API secara eksklusif.
2. WHEN Sakelar dalam posisi ON (tertutup), THE Canvas_Renderer SHALL menggambar Switch_Visual dengan representasi visual jalur terhubung (kabel tersambung) yang dapat dibedakan dari posisi OFF.
3. WHEN Sakelar dalam posisi OFF (terbuka), THE Canvas_Renderer SHALL menggambar Switch_Visual dengan representasi visual jalur terputus berupa celah minimal 8 piksel CSS pada jalur kabel yang dapat dibedakan dari posisi ON.
4. THE Canvas_Renderer SHALL menggunakan warna berbeda sebagai metode utama untuk membedakan kedua posisi Sakelar: warna hijau (#00AA00 atau setara) untuk posisi ON dan warna merah (#CC0000 atau setara) untuk posisi OFF; IF manipulasi warna tidak tersedia atau gagal, THEN THE Canvas_Renderer SHALL menampilkan error state yang jelas; penggunaan karakter emoji atau simbol Unicode non-alfanumerik grafis sebagai pengganti warna TIDAK diizinkan.
5. WHEN ukuran jendela browser berubah, THE Canvas_Renderer SHALL menyesuaikan posisi dan ukuran Switch_Visual secara proporsional bersama elemen sirkuit lainnya; dimensi Switch_Visual SHALL diskalakan dengan faktor yang sama dengan faktor skala canvas sehingga rasio ukuran Switch_Visual terhadap lebar canvas tetap konstan.

---

### Requirement 4: Perilaku Partikel Elektron saat Sakelar OFF

**User Story:** Sebagai siswa SD, saya ingin melihat elektron berhenti bergerak ketika sakelar dibuka, sehingga saya dapat memvisualisasikan bahwa tidak ada arus yang mengalir dalam sirkuit terbuka.

#### Acceptance Criteria

1. WHILE isSakelarTertutup bernilai false, THE Particle_System SHALL menghentikan pergerakan seluruh partikel elektron normal; nilai progress setiap partikel SHALL TIDAK berubah selama kondisi ini berlaku.
2. WHILE isSakelarTertutup bernilai false, THE Canvas_Renderer SHALL TIDAK menggambar partikel elektron bergerak pada jalur kabel, konsisten dengan kondisi I = 0.
3. WHEN isSakelarTertutup berubah dari false menjadi true dan I kembali bernilai positif, THE Particle_System SHALL melanjutkan pergerakan partikel elektron dengan speedFactor = min(I × 8, 6), sehingga kecepatan partikel proporsional terhadap nilai I yang baru hingga batas maksimum 6.
4. WHEN isSakelarTertutup berubah dari false menjadi true dan kondisi Overload_State aktif (P_actual > P_nominal × 1.3), THE Particle_System SHALL TIDAK melanjutkan pergerakan partikel elektron normal; THE Physics_Engine SHALL memaksa I = 0 melalui jalur overload sehingga speedFactor = 0.

---

### Requirement 5: Tampilan Informasi Fisika saat Sakelar OFF

**User Story:** Sebagai siswa SD, saya ingin melihat angka-angka fisika yang berubah ketika sakelar dibuka, sehingga saya dapat menghubungkan posisi sakelar dengan nilai arus nol yang ditampilkan.

#### Acceptance Criteria

1. WHEN isSakelarTertutup berubah menjadi false, THE UI SHALL memperbarui tampilan nilai I menjadi "0.000 A" pada frame animasi yang sama atau dalam 16ms; THE UI SHALL memastikan nilai I yang ditampilkan selalu nol selama isSakelarTertutup bernilai false, tanpa memandang nilai I yang dihitung sebelumnya.
2. WHEN isSakelarTertutup berubah menjadi false, THE UI SHALL menampilkan status Bulb sebagai teks "Sirkuit Terbuka" menggunakan properti `textContent`; teks ini SHALL berbeda dari teks status Overload_State, tanpa karakter emoji atau simbol Unicode non-alfanumerik grafis.
3. WHILE isSakelarTertutup bernilai false, THE UI SHALL tetap menampilkan nilai V_total dan R_total yang identik dengan nilai yang dikalkulasi Physics_Engine untuk konfigurasi komponen aktif, sehingga siswa dapat melihat bahwa tegangan dan hambatan masih terdefinisi meskipun arus nol.
4. WHEN isSakelarTertutup berubah menjadi true, THE UI SHALL memperbarui seluruh tampilan nilai fisika (I, V_total, R_total, P_actual, status) pada frame animasi yang sama atau dalam 16ms sesuai hasil kalkulasi Physics_Engine yang baru.

---

### Requirement 6: Integrasi State Monomorphic

**User Story:** Sebagai pengembang, saya ingin properti sakelar terintegrasi ke dalam objek sim yang sudah ada tanpa mengubah shape-nya, sehingga performa JIT compiler V8 tetap optimal.

#### Acceptance Criteria

1. THE Simulator SHALL menambahkan properti `isSakelarTertutup` bertipe boolean ke dalam objek `sim` pada saat deklarasi awal, dengan nilai default `true`, sehingga shape objek `sim` tetap monomorphic dan tidak berubah di runtime.
2. THE Physics_Engine SHALL membaca nilai `sim.isSakelarTertutup` sebagai satu-satunya sumber kebenaran untuk menentukan apakah Sakelar dalam posisi ON atau OFF; tidak ada variabel state Sakelar di luar objek `sim`.
3. THE Simulator SHALL memastikan bahwa `isSakelarTertutup` adalah satu-satunya properti baru yang ditambahkan ke `sim` untuk fitur ini; tidak ada properti tambahan lain yang diizinkan.
4. WHEN fungsi `onReset()` dipanggil, THE Simulator SHALL mengatur `sim.isSakelarTertutup` kembali ke nilai `true` (posisi ON) bersama dengan reset seluruh properti `sim` lainnya ke nilai default.
5. THE Simulator SHALL memperbarui fungsi `runSelfTests()` untuk memverifikasi keberadaan dan tipe data properti `isSakelarTertutup` dalam `assertSimMonomorphic()`, serta menambahkan property test yang memverifikasi bahwa I = 0 untuk semua kombinasi input dalam rentang V_total 1–12 V dan R_total 1–1000 Ω ketika `isSakelarTertutup = false`; verifikasi ini SHALL mencakup dua sub-check: (a) sim.I = 0 untuk semua kombinasi dalam rentang tersebut, dan (b) sim.bulbState = 'dim' dengan sim.dimAlpha = 0.25 untuk semua kombinasi dalam rentang tersebut; verifikasi ini SHALL hanya dijalankan ketika `runSelfTests()` dipanggil secara eksplisit dari `init()`, bukan selama operasi normal aplikasi.

---

## Correctness Properties

Properti-properti berikut adalah invariant yang harus selalu terpenuhi dan dapat diverifikasi melalui property-based testing di dalam `runSelfTests()`.

### Property S1: Sakelar OFF Memaksa I = 0 untuk Semua Konfigurasi

**Memvalidasi: Requirement 2.1**

```
UNTUK SEMUA circuitType IN {'seri', 'paralel'},
UNTUK SEMUA batteryCount IN {1, 2, 3, 4},
UNTUK SEMUA bulbCount IN {1, 2, 3, 4},
UNTUK SEMUA bulbWatt IN {5, 10, 25}:
  JIKA isSakelarTertutup = false
  MAKA sim.I = 0
```

### Property S2: Sakelar OFF Menghasilkan Dim_State dengan dimAlpha = 0.25

**Memvalidasi: Requirement 2.2**

```
UNTUK SEMUA kombinasi input yang valid:
  JIKA isSakelarTertutup = false
  MAKA sim.bulbState = 'dim' DAN sim.dimAlpha = 0.25
```

### Property S3: Round-Trip ON → OFF → ON Menghasilkan Nilai Identik

**Memvalidasi: Requirement 2.3, 2.5**

```
UNTUK SEMUA kombinasi input yang valid:
  snapshot_sebelum = computePhysicsSnapshot(type, batteries, bulbs, watt)
  SET isSakelarTertutup = false → runPhysics()
  SET isSakelarTertutup = true  → runPhysics()
  snapshot_sesudah = {sim.I, sim.V_total, sim.R_total, sim.P_actual, sim.bulbState}

  MAKA snapshot_sesudah.I        = snapshot_sebelum.I
  DAN  snapshot_sesudah.V_total  = snapshot_sebelum.V_total
  DAN  snapshot_sesudah.R_total  = snapshot_sebelum.R_total
  DAN  snapshot_sesudah.P_actual = snapshot_sebelum.P_actual
  DAN  snapshot_sesudah.bulbState = snapshot_sebelum.bulbState
```

### Property S4: Sakelar OFF Tidak Memicu Overload Blast

**Memvalidasi: Requirement 2.4**

```
UNTUK SEMUA kombinasi input yang menghasilkan Overload_State ketika isSakelarTertutup = true:
  SET sim.wasOverload = false
  SET isSakelarTertutup = false
  runPhysics()
  MAKA sim.blastActive = false (tidak berubah dari false)
  DAN  sim.wasOverload = false (tidak berubah)
```

### Property S5: Elektron Tidak Bergerak saat Sakelar OFF

**Memvalidasi: Requirement 4.1**

```
UNTUK SEMUA partikel elektron p IN electrons[]:
  JIKA isSakelarTertutup = false (sehingga sim.I = 0)
  MAKA p.progress setelah satu frame = p.progress sebelum frame
       (speedFactor = 0, delta progress = BASE_SPEED * 0 = 0)
```
