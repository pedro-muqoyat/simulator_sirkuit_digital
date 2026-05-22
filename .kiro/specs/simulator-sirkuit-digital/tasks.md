# Implementation Plan: Simulator Sirkuit Digital

## Aturan Utama Mutlak (Wajib Dipatuhi di Setiap Task)

Aturan-aturan berikut berlaku untuk **seluruh file kode sumber** (`index.html`, `css/style.css`, `js/sirkuit.js`) dan tidak dapat dikompromikan dalam task apapun:

1. **Zero-Comment Policy:** SELURUH file kode sumber DILARANG KERAS memuat komentar dalam bentuk apapun — termasuk `//`, `/* */`, dan komentar HTML `<!-- -->`. Wajib menerapkan **Self-Documenting Code** secara mutlak: nama variabel, fungsi, konstanta, dan elemen HTML harus cukup deskriptif sehingga tidak memerlukan penjelasan tambahan.

2. **Zero-Emoji Policy:** DILARANG KERAS menyisipkan karakter emoji, emoticon, atau simbol Unicode non-alfanumerik grafis di seluruh file kode sumber. Larangan berlaku mutlak untuk teks string HTML, nilai teks Canvas `fillText()`, label UI, nama variabel, nama fungsi, ID elemen, dan log konsol. Gunakan manipulasi warna CSS/Canvas murni sebagai pengganti visual.

3. **Monomorphic State Object Kaku:** Objek state `sim` WAJIB dikunci sejak deklarasi awal dengan seluruh properti yang dibutuhkan seumur hidup aplikasi. Dilarang keras menambah, menghapus, atau mengubah shape objek `sim` di runtime. Setiap properti diinisialisasi dengan tipe data final yang benar sejak baris pertama deklarasi.

4. **No External Dependencies:** Dilarang menggunakan framework, library, CDN eksternal, atau NPM packages.

5. **RAF-Only Animation:** Dilarang `setInterval()` atau `setTimeout()` untuk loop animasi fisika.

6. **No Inline Style Mutation:** Dilarang memodifikasi `style.*` di dalam loop animasi.

7. **No New Files:** Seluruh kode pengujian (property tests, unit tests) WAJIB dipendam langsung di dalam `js/sirkuit.js` sebagai fungsi `runSelfTests()`. Dilarang membuat file baru seperti `physics.test.js`, `*.spec.js`, `test.html`, atau file test terpisah apapun. Arsitektur proyek terkunci pada 3 berkas utama: `index.html`, `css/style.css`, dan `js/sirkuit.js`.

8. **No Terminal Commands:** Dilarang keras mengeksekusi perintah terminal atau CLI dalam bentuk apapun — termasuk bash, sh, npm install, touch, git, atau npx. Seluruh instruksi wajib diselesaikan murni melalui pembaruan kode sumber di dalam editor.

---

## Overview

Rencana implementasi ini mengonversi desain Simulator Sirkuit Digital menjadi langkah-langkah koding inkremental. Karena file `index.html`, `css/style.css`, dan `js/sirkuit.js` sudah ada, setiap task berfokus pada **verifikasi, perbaikan, dan penyempurnaan** implementasi yang ada agar memenuhi semua acceptance criteria di requirements.md dan invariant di design.md.

Urutan task: struktur HTML → CSS responsif → Physics Engine → Canvas Renderer → Particle System → Control Panel → UI Display → integrasi akhir.

---

## Tasks

- [x] 1. Verifikasi dan perbaiki struktur HTML (`index.html`)
  - Pastikan tag `<meta name="viewport" content="width=device-width, initial-scale=1.0">` ada di `<head>`
  - Pastikan setiap pasangan `<label for="...">` dan `<input id="...">` sudah terikat dengan benar (for/id binding) untuk semua kontrol: `batteryCount`, `bulbCount`, `typeSeri`, `typeParalel`, `watt5`, `watt10`, `watt25`
  - Pastikan `<canvas id="circuitCanvas">` memiliki atribut `role="img"` dan `aria-label` yang deskriptif
  - Pastikan `#overloadBanner` memiliki atribut `aria-live="assertive"` dan `aria-atomic="true"`
  - Pastikan elemen `<script src="js/sirkuit.js">` berada di akhir `<body>`
  - Hapus semua karakter emoji dari teks HTML (judul, label, teks tombol, teks banner) — ganti dengan teks alfanumerik deskriptif
  - _Requirements: 1.1, 1.2, 1.3, 6.5, 8.3_

- [x] 2. Verifikasi dan perbaiki CSS responsif (`css/style.css`)
  - [x] 2.1 Verifikasi CSS Grid layout dan breakpoint responsif
    - Pastikan layout 1-kolom di `< 640px` (portrait mobile) tanpa horizontal scroll pada lebar 320px
    - Pastikan layout 2-kolom (`canvas+info / controls`) di `≥ 640px`
    - Pastikan layout landscape phone (`≤ 639px` + `orientation: landscape`) menggunakan 2-kolom
    - Pastikan tidak ada `style.*` yang diinjeksi dari JavaScript ke dalam elemen layout
    - _Requirements: 8.1, 8.2_

  - [x] 2.2 Verifikasi touch target dan tipografi
    - Pastikan slider thumb memiliki ukuran ≥ 32×32px dengan padding vertikal sehingga total touch area ≥ 44px
    - Pastikan setiap `.radio-label` memiliki `min-height: 44px`
    - Pastikan `#btnReset` memiliki `min-height: 48px`
    - Pastikan font size teks konten minimal `0.875rem` (14px) dan label kontrol minimal `1rem` (16px)
    - _Requirements: 8.3, 8.5_

  - [x] 2.3 Verifikasi GPU acceleration canvas
    - Pastikan `#circuitCanvas` memiliki `will-change: transform` dan `transform: translateZ(0)` di CSS
    - Pastikan tidak ada modifikasi `style.*` pada elemen canvas di dalam animation loop
    - _Requirements: 3.3, 3.6_

- [x] 3. Implementasi dan verifikasi Physics Engine (`js/sirkuit.js`)
  - [x] 3.1 Verifikasi struktur monomorphic objek `sim`
    - Pastikan semua key `sim` didefinisikan saat deklarasi: `circuitType`, `batteryCount`, `bulbCount`, `bulbWatt`, `V_total`, `R_total`, `I`, `P_actual`, `bulbState`, `dimAlpha`, `wasOverload`, `blastTime`, `blastActive`
    - Pastikan tidak ada penambahan atau penghapusan key `sim` di runtime
    - _Requirements: 1.4_

  - [x] 3.2 Verifikasi kalkulasi Hukum Ohm dan Hukum Daya
    - Pastikan `R_bulb = V_BATTERY² / bulbWatt` dihitung dengan benar untuk setiap nilai `bulbWatt ∈ {5, 10, 25}`
    - Pastikan `I = V_total / R_total` (saat tidak overload dan `R_total > 0`)
    - Pastikan `P_actual = V_per_bulb² / R_bulb`
    - Tambahkan guard `R_total > 0 ? V_total / R_total : 0` jika belum ada
    - _Requirements: 2.1, 2.2, 2.9_

  - [x]* 3.3 Tulis property test untuk Hukum Ohm (Property 1)
    - **Property 1: Hukum Ohm — Konsistensi I = V / R**
    - **Validates: Requirements 2.1**
    - Implementasikan fungsi `assertOhmLaw(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Untuk setiap kombinasi `(batteryCount ∈ {1..4}, bulbCount ∈ {1..4}, bulbWatt ∈ {5,10,25}, circuitType ∈ {'seri','paralel'})`, verifikasi `|I - V_total/R_total| < 0.0001` saat `bulbState ≠ 'overload'`

  - [x]* 3.4 Tulis property test untuk Hukum Daya (Property 2)
    - **Property 2: Hukum Daya — Konsistensi P_actual = V_per_bulb² / R_bulb**
    - **Validates: Requirements 2.2**
    - Implementasikan fungsi `assertPowerLaw(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `P_actual = V_per_bulb² / R_bulb` untuk semua kombinasi input valid
    - `V_per_bulb = V_total / bulbCount` (seri) atau `V_BATTERY` (paralel)

  - [x] 3.5 Verifikasi kalkulasi rangkaian seri
    - Pastikan `V_total = batteryCount × V_BATTERY` untuk `circuitType = 'seri'`
    - Pastikan `R_total = bulbCount × R_bulb` untuk `circuitType = 'seri'`
    - Pastikan `V_per_bulb = V_total / bulbCount`
    - _Requirements: 2.3_

  - [x]* 3.6 Tulis property test untuk rangkaian seri (Property 5)
    - **Property 5: Rangkaian Seri — Tegangan Proporsional Baterai**
    - **Validates: Requirements 2.3**
    - Implementasikan fungsi `assertSeriesCircuitLaw(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `V_total = batteryCount × V_BATTERY` dan `R_total = bulbCount × R_bulb` untuk semua kombinasi seri

  - [x] 3.7 Verifikasi kalkulasi rangkaian paralel
    - Pastikan `V_total = V_BATTERY` (konstan, tidak bergantung `batteryCount`) untuk `circuitType = 'paralel'`
    - Pastikan `R_total = R_bulb / bulbCount` untuk `circuitType = 'paralel'`
    - Pastikan `V_per_bulb = V_BATTERY`
    - _Requirements: 2.4_

  - [x]* 3.8 Tulis property test untuk rangkaian paralel (Property 6)
    - **Property 6: Rangkaian Paralel — Tegangan Konstan**
    - **Validates: Requirements 2.4**
    - Implementasikan fungsi `assertParallelCircuitLaw(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `V_total = V_BATTERY` dan `R_total = R_bulb / bulbCount` untuk semua kombinasi paralel

  - [x] 3.9 Verifikasi klasifikasi bulb state
    - Pastikan `P_actual == 0` → `bulbState = 'dim'`, `dimAlpha = 0.25`
    - Pastikan `0 < P_actual < P_nominal` → `bulbState = 'dim'`, `dimAlpha = max(0.25, P_actual / P_nominal)`
    - Pastikan `P_nominal ≤ P_actual ≤ P_nominal × 1.3` → `bulbState = 'normal'`, `dimAlpha = 1.0`
    - Pastikan `P_actual > P_nominal × 1.3` → `bulbState = 'overload'`, `I = 0`
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [x]* 3.10 Tulis property test untuk klasifikasi state eksklusif (Property 3)
    - **Property 3: Klasifikasi State Bulb Eksklusif dan Lengkap**
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.8**
    - Implementasikan fungsi `assertBulbStateExclusive(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi tepat satu state aktif dari `{dim, normal, overload}` untuk setiap kombinasi input valid

  - [x]* 3.11 Tulis property test untuk overload memutus arus (Property 4)
    - **Property 4: Overload Memutus Arus**
    - **Validates: Requirements 2.8**
    - Implementasikan fungsi `assertOverloadBreaksCurrent(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `I = 0` untuk setiap state dengan `bulbState = 'overload'`

  - [x]* 3.12 Tulis property test untuk dimAlpha (Property 7)
    - **Property 7: dimAlpha Proporsional dan Terbatas**
    - **Validates: Requirements 5.2**
    - Implementasikan fungsi `assertDimAlphaRange(result)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `0.25 ≤ dimAlpha < 1.0` saat `bulbState = 'dim'` dan `P_actual > 0`
    - Verifikasi `dimAlpha = 0.25` saat `bulbState = 'dim'` dan `P_actual = 0`

  - [x]* 3.13 Tulis property test untuk R_bulb selalu positif (Property 10)
    - **Property 10: R_bulb Selalu Positif**
    - **Validates: Requirements 2.9**
    - Implementasikan fungsi `assertRbulbPositive(watt)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `R_bulb = V_BATTERY² / bulbWatt > 0` untuk setiap `bulbWatt ∈ {5, 10, 25}`

- [x] 4. Checkpoint — Verifikasi Physics Engine
  - Pastikan semua property tests di task 3 lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 5. Implementasi dan verifikasi Canvas Renderer (`js/sirkuit.js`)
  - [x] 5.1 Verifikasi `resizeCanvas()` dan DPI scaling
    - Pastikan `canvas.width = Math.round(cw * dpr)` dan `canvas.height = Math.round(ch * dpr)`
    - Pastikan `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` dipanggil setelah resize
    - Pastikan fallback `|| 400` / `|| 300` ada jika `getBoundingClientRect()` mengembalikan 0
    - _Requirements: 3.7_

  - [x] 5.2 Verifikasi `getGeometry()` dan `densePath`
    - Pastikan `wirePath` membentuk loop persegi panjang: `top-left → top-right → bottom-right → bottom-left → top-left`
    - Pastikan `densePath` diinterpolasi dari `wirePath` dengan `STEPS_PER_SEGMENT = 40` (total ~200 titik)
    - Pastikan `batteryY = top` dan `bulbY = bottom`
    - _Requirements: 3.1_

  - [x] 5.3 Verifikasi urutan layer rendering
    - Pastikan urutan draw per frame: `drawBackground → drawWires → drawBatteries → drawBulbs → drawPhysicsLabels → drawElectrons → drawBlasts`
    - Pastikan `drawElectrons` hanya dipanggil saat `sim.I > 0`
    - Pastikan `drawBlasts` hanya dipanggil saat `sim.blastActive = true`
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 5.4 Verifikasi rendering visual tiga state Bulb
    - Pastikan `drawNormalBulb(x, y, radius, alpha)` menggambar lingkaran kuning dengan `globalAlpha = alpha` dan efek glow saat `alpha > 0.3`
    - Pastikan `drawBrokenBulb(x, y, radius)` menggambar lingkaran merah gelap dengan garis silang dan 3 titik percikan
    - Tambahkan try-catch di `drawBulbs()` untuk fallback jika `drawBrokenBulb()` gagal: gambar kotak merah sederhana `ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.5 Tambahkan guard Canvas Context di `init()`
    - Tambahkan pengecekan `if (!ctx)` di awal `init()` dengan fallback pesan error di dalam `canvas.parentElement`
    - _Requirements: 1.5_

- [x] 6. Implementasi dan verifikasi Particle System (`js/sirkuit.js`)
  - [x] 6.1 Verifikasi struktur monomorphic `ElectronParticle` dan `BlastParticle`
    - Pastikan setiap objek elektron memiliki shape tetap: `{ progress, size, r, g, b }`
    - Pastikan setiap objek blast memiliki shape tetap: `{ x, y, vx, vy, size, life, decay, hue }`
    - Pastikan tidak ada penambahan/penghapusan key di runtime
    - _Requirements: 4.1_

  - [x] 6.2 Verifikasi kecepatan elektron proporsional arus
    - Pastikan `speedFactor = Math.min(sim.I * 8, 6)` digunakan di `updateElectrons()`
    - Pastikan `progress += BASE_SPEED * speedFactor` per frame
    - Pastikan elektron tidak bergerak saat `sim.I = 0` (blok `if (sim.I > 0)` di `render()`)
    - _Requirements: 4.2, 4.3_

  - [x]* 6.3 Tulis property test untuk kecepatan elektron (Property 8)
    - **Property 8: Kecepatan Elektron Proporsional Arus**
    - **Validates: Requirements 4.2, 4.3**
    - Implementasikan fungsi `assertElectronSpeedProportional(current)` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Verifikasi `speedFactor > 0` saat `sim.I > 0`
    - Verifikasi `speedFactor = 0` (atau elektron tidak diupdate) saat `sim.I = 0`
    - Verifikasi `speedFactor ≤ 6` (batas maksimum) untuk semua nilai I

  - [x] 6.4 Verifikasi `spawnBlast()` dan transisi overload
    - Pastikan `spawnBlast()` menghasilkan tepat `BLAST_COUNT = 15` partikel (≥ 10 sesuai requirement)
    - Pastikan `spawnBlast()` hanya dipanggil saat `nowOverload && !sim.wasOverload` (transisi masuk)
    - Pastikan `blastActive = false` dan banner disembunyikan saat keluar dari overload
    - Pastikan blast berhenti setelah `BLAST_DURATION_MS = 1800ms`
    - _Requirements: 4.5, 3.5_

  - [x]* 6.5 Tulis property test untuk blast satu kali per transisi (Property 9)
    - **Property 9: Blast Hanya Terpicu Satu Kali per Transisi Overload**
    - **Validates: Requirements 4.5**
    - Implementasikan fungsi `assertBlastTriggeredOncePerTransition()` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Simulasikan urutan state `[non-overload → overload]`: verifikasi `spawnBlast` dipanggil tepat 1 kali
    - Simulasikan urutan state `[overload → overload]`: verifikasi `spawnBlast` TIDAK dipanggil

- [x] 7. Checkpoint — Verifikasi Particle System dan Canvas Renderer
  - Pastikan semua property tests di task 6 lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [x] 8. Implementasi dan verifikasi Control Panel & Event Handlers (`js/sirkuit.js`)
  - [x] 8.1 Verifikasi semua event handler terdaftar di `init()`
    - Pastikan `radiosCircuitType.forEach(r => r.addEventListener('change', onCircuitTypeChange))` ada
    - Pastikan `radiosBulbWatt.forEach(r => r.addEventListener('change', onBulbWattChange))` ada
    - Pastikan `sliderBattery.addEventListener('input', onBatterySlider)` ada
    - Pastikan `sliderBulb.addEventListener('input', onBulbSlider)` ada
    - Pastikan `btnReset.addEventListener('click', onReset)` ada
    - Pastikan `window.addEventListener('resize', onResize)` ada
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 8.2 Tambahkan validasi input di event handlers
    - Di `onBatterySlider` dan `onBulbSlider`: tambahkan guard `if (isNaN(val) || val < 1 || val > 4) return;`
    - Pastikan `aria-valuenow` diperbarui di setiap slider handler
    - _Requirements: 6.6_

  - [x] 8.3 Verifikasi fungsi `onReset()`
    - Pastikan semua field `sim.*` dikembalikan ke nilai default: `circuitType='seri'`, `batteryCount=1`, `bulbCount=1`, `bulbWatt=10`, `wasOverload=false`, `blastActive=false`
    - Pastikan semua elemen DOM kontrol dikembalikan ke posisi default: `typeSeri.checked=true`, `sliderBattery.value=1`, `sliderBulb.value=1`, `watt10.checked=true`
    - Pastikan `overloadBanner.hidden = true` di `onReset()`
    - Pastikan `blasts.length = 0` di `onReset()`
    - _Requirements: 1.4_

- [x] 9. Implementasi dan verifikasi UI Display (`js/sirkuit.js`)
  - [x] 9.1 Verifikasi `updateDisplay()` menulis semua nilai fisika
    - Pastikan `#displayVoltage` menampilkan `V_total.toFixed(2) + " V"`
    - Pastikan `#displayResistance` menampilkan `R_total.toFixed(2) + " Ω"`
    - Pastikan `#displayCurrent` menampilkan `I.toFixed(3) + " A"`
    - Pastikan `#displayPower` menampilkan `P_actual.toFixed(2) + " W"`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Verifikasi tampilan status Bulb dan pesan overload
    - Pastikan `#displayStatus` menampilkan teks `'Redup'` dengan class `status-dim` saat `bulbState = 'dim'` — tanpa emoji
    - Pastikan `#displayStatus` menampilkan teks `'Normal'` dengan class `status-normal` saat `bulbState = 'normal'` — tanpa emoji
    - Pastikan `#displayStatus` menampilkan teks `'OVERLOAD!'` dengan class `status-overload` saat `bulbState = 'overload'` — tanpa emoji
    - Pastikan `#overloadBanner` menampilkan teks `'OVERLOAD! Lampu Putus!'` tanpa karakter emoji
    - Pastikan `#overloadBanner` muncul (`hidden = false`) saat overload dan hilang (`hidden = true`) saat kembali normal
    - _Requirements: 7.5, 7.6_

- [x] 10. Integrasi akhir dan wiring (`js/sirkuit.js`)
  - [x] 10.1 Verifikasi Animation Loop menggunakan `requestAnimationFrame` saja
    - Pastikan `loop()` hanya memanggil `render()` dan `requestAnimationFrame(loop)`
    - Pastikan tidak ada `setInterval()` atau `setTimeout()` di seluruh file `sirkuit.js`
    - _Requirements: 3.2_

  - [x] 10.2 Verifikasi alur data end-to-end
    - Pastikan setiap event handler mengikuti pola: `update sim.* → runPhysics() → updateDisplay()`
    - Pastikan `render()` membaca `sim.*` secara read-only (tidak menulis ke `sim.*`)
    - Pastikan `updateDisplay()` dipanggil di luar loop RAF (hanya saat ada interaksi pengguna)
    - _Requirements: 6.6, 3.6_

  - [x] 10.3 Verifikasi inisialisasi default saat halaman dimuat
    - Pastikan `init()` memanggil `resizeCanvas()`, `initElectrons()`, `runPhysics()`, `updateDisplay()`, dan `requestAnimationFrame(loop)` secara berurutan
    - Pastikan state default menampilkan rangkaian seri, 1 baterai, 1 lampu 10W dalam keadaan aktif
    - _Requirements: 1.4_

  - [x]* 10.4 Tulis unit tests untuk skenario kritis `runPhysics()`
    - Implementasikan fungsi `assertCriticalScenarios()` di dalam `runSelfTests()` di `js/sirkuit.js`
    - Test: seri 1 baterai 1 lampu 10W → `V=1.5, R≈0.225, I≈6.67, P≈10, state=normal`
    - Test: seri 4 baterai 1 lampu 5W → `P_actual >> 5W×1.3` → `state=overload, I=0`
    - Test: paralel 4 baterai 4 lampu 10W → `V=1.5, P=10, state=normal`
    - Test: seri 1 baterai 4 lampu 25W → `P_actual << 25W` → `state=dim`
    - Test: transisi ke overload → `wasOverload` berubah `false→true`
    - Test: keluar dari overload → `blastActive=false`, banner hidden
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 11. Checkpoint akhir — Verifikasi integrasi penuh
  - Pastikan semua property tests dan unit tests lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [ ] 12. Tambahkan `isKabelPutus` dan `activeR_total` ke state object `sim` di `js/sirkuit.js`
  - Tambahkan properti `isKabelPutus : false` dan `activeR_total : 0` ke deklarasi literal objek `sim` yang sudah ada
  - Tipe `isKabelPutus` harus `boolean` dengan nilai default `false`
  - Tipe `activeR_total` harus `number` dengan nilai default `0`
  - Shape objek `sim` menjadi 17 properti; tidak ada properti lain yang ditambah
  - _Requirements: 7.1, 7.2_

- [ ] 13. Tambahkan array `bulbs[]` monomorphic di `js/sirkuit.js`
  - [ ] 13.1 Deklarasikan array `bulbs` dan fungsi `rebuildBulbs(count)` di `js/sirkuit.js`
    - `bulbs` adalah array yang selalu memiliki panjang sama dengan `sim.bulbCount`
    - Setiap elemen memiliki shape tetap: `{ isDetached: false, isBurnt: false }`
    - `rebuildBulbs(count)` mengisi ulang array dengan objek baru saat `bulbCount` berubah; Bulb yang sudah ada dipertahankan jika count bertambah, Bulb terakhir dihapus jika count berkurang
    - _Requirements: 4.1, 4.3_

  - [ ] 13.2 Panggil `rebuildBulbs()` di semua titik yang mengubah `sim.bulbCount`
    - Panggil `rebuildBulbs(sim.bulbCount)` di `onBulbSlider()` setelah `sim.bulbCount` diperbarui
    - Panggil `rebuildBulbs(sim.bulbCount)` di `onReset()` setelah `sim.bulbCount` dikembalikan ke default
    - Panggil `rebuildBulbs(1)` di `init()` untuk inisialisasi awal
    - _Requirements: 4.1_

- [ ] 14. Modifikasi `runPhysics()` — tambahkan logika isKabelPutus, isDetached seri, dan isDetached paralel
  - [ ] 14.1 Tambahkan early-return `isKabelPutus` di `runPhysics()`
    - Tempatkan blok tepat setelah blok early-return `isSakelarTertutup` yang sudah ada
    - Blok menetapkan `sim.V_total`, `sim.R_total`, `sim.I = 0`, `sim.P_actual = 0`, `sim.bulbState = 'dim'`, `sim.dimAlpha = 0.25`, lalu `return`
    - `sim.wasOverload` dan `sim.blastActive` tidak disentuh
    - _Requirements: 7.2, 7.4_

  - [ ] 14.2 Tambahkan early-return seri dengan Bulb dicabut/terbakar di `runPhysics()`
    - Tempatkan blok di dalam cabang `circuitType === 'seri'`, setelah kalkulasi `V_total` dan `R_total`
    - Cek `bulbs.some(b => b.isDetached || b.isBurnt)` — jika true, paksa `sim.I = 0`, `sim.P_actual = 0`, `sim.bulbState = 'dim'`, `sim.dimAlpha = 0.25`, lalu `return`
    - _Requirements: 5.1, 5.2_

  - [ ] 14.3 Modifikasi kalkulasi paralel untuk filter cabang aktif di `runPhysics()`
    - Hitung `activeBulbs = bulbs.filter(b => !b.isDetached && !b.isBurnt)`
    - Jika `activeBulbs.length === 0`, paksa `sim.I = 0`, `sim.P_actual = 0`, `sim.bulbState = 'dim'`, `sim.dimAlpha = 0.25`, lalu `return`
    - Gunakan `activeBulbs.length` sebagai pengganti `sim.bulbCount` dalam kalkulasi `R_total = R_bulb / activeBulbs.length`
    - Simpan hasil ke `sim.activeR_total`
    - _Requirements: 6.1, 6.3_

- [ ] 15. Implementasikan `onCanvasClick(e)` — Hit Detection Pythagoras di `js/sirkuit.js`
  - [ ] 15.1 Implementasikan fungsi `onCanvasClick(e)` di `js/sirkuit.js`
    - Konversi koordinat klik dari layar ke canvas: `rect = canvas.getBoundingClientRect()`, `scaleX = canvas.width / rect.width`, `scaleY = canvas.height / rect.height`, `clickX = (e.clientX - rect.left) * scaleX`, `clickY = (e.clientY - rect.top) * scaleY`
    - Iterasi `bulbs[]` dan hitung jarak Pythagoras: `dist = Math.sqrt(dx*dx + dy*dy)` di mana `dx = clickX - bulbX`, `dy = clickY - bulbY`
    - Jika `dist <= hitRadius` dan `bulbs[i].isBurnt === false`, toggle `bulbs[i].isDetached`, panggil `runPhysics()` dan `updateDisplay()`, lalu `return`
    - `hitRadius = geo.bulbRadius * 1.4` untuk kemudahan sentuh
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 15.2 Daftarkan `onCanvasClick` sebagai event listener di `init()`
    - Tambahkan `canvas.addEventListener('click', onCanvasClick)` di blok event binding yang sudah ada
    - _Requirements: 4.1_

- [ ] 16. Implementasikan `drawDetachedBulb(x, y, radius)` dan modifikasi `drawBulbs()` di `js/sirkuit.js`
  - [ ] 16.1 Implementasikan fungsi `drawDetachedBulb(x, y, radius)` di `js/sirkuit.js`
    - Gambar lingkaran dengan `strokeStyle = '#555555'`, `fillStyle = '#333333'`, `lineWidth = 2`
    - Posisi `y` sudah digeser `DETACH_OFFSET` (20px) ke bawah oleh pemanggil
    - Gambar dua garis pendek vertikal di atas lingkaran untuk menunjukkan konektor yang terlepas
    - _Requirements: 4.6, 10.4_

  - [ ] 16.2 Modifikasi `drawBulbs()` untuk iterasi `bulbs[]` dan delegasi ke fungsi yang sesuai
    - Ganti logika draw Bulb tunggal dengan loop `for (let i = 0; i < bulbs.length; i++)`
    - Hitung `bulbX` untuk setiap Bulb berdasarkan indeks dan jumlah Bulb aktif
    - Jika `bulbs[i].isDetached === true`: panggil `drawDetachedBulb(bulbX, bulbY + DETACH_OFFSET, radius)`
    - Jika `bulbs[i].isBurnt === true` atau `sim.bulbState === 'overload'`: panggil `drawBrokenBulb(bulbX, bulbY, radius)`
    - Selain itu: panggil `drawNormalBulb(bulbX, bulbY, radius, sim.dimAlpha)`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 17. Perbarui `updateDisplay()` — teks status ramah anak dan cabang isKabelPutus
  - Perbarui teks status `'Normal'` menjadi `'Menyala Normal'` menggunakan `element.textContent`
  - Perbarui teks status `'OVERLOAD!'` menjadi `'Lampu Putus'` menggunakan `element.textContent`
  - Tambahkan cabang `isKabelPutus` yang menampilkan `elStatus.textContent = 'Sirkuit Terbuka'` dan `elCurrent.textContent = '0.000 A'`
  - Pastikan semua penulisan teks status menggunakan `element.textContent` — tidak ada `innerHTML`
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 13.7_

- [ ] 18. Perbarui `onReset()` — reset `isKabelPutus` dan `bulbs[]`
  - Tambahkan `sim.isKabelPutus = false` di blok reset `sim.*`
  - Tambahkan `sim.activeR_total = 0` di blok reset `sim.*`
  - Panggil `rebuildBulbs(1)` untuk mereset semua `isDetached` dan `isBurnt` ke `false`
  - _Requirements: 7.5, 4.5_

- [ ] 19. Perbarui `assertSimMonomorphic()` dan `snapshotSim()` / `restoreSim()` untuk 17 properti
  - [ ] 19.1 Perbarui `assertSimMonomorphic()` untuk 17 properti
    - Tambahkan `'isKabelPutus'` dan `'activeR_total'` ke array `requiredKeys`
    - Perbarui pengecekan jumlah key dari 15 menjadi 17
    - Tambahkan pengecekan tipe: `typeof sim.isKabelPutus !== 'boolean'` dan `typeof sim.activeR_total !== 'number'`
    - _Requirements: 1.7_

  - [ ] 19.2 Perbarui `snapshotSim()` dan `restoreSim()` untuk menyertakan `isKabelPutus` dan `activeR_total`
    - Di `snapshotSim()`: tambahkan `isKabelPutus: sim.isKabelPutus` dan `activeR_total: sim.activeR_total`
    - Di `restoreSim()`: tambahkan `sim.isKabelPutus = snapshot.isKabelPutus` dan `sim.activeR_total = snapshot.activeR_total`
    - _Requirements: 1.7_

- [ ] 20. Tulis property tests baru untuk fitur Bulb Detachment dan Wire di `runSelfTests()`
  - [ ]* 20.1 Tulis property test untuk Property 12: Seri — Bulb dicabut memutus sirkuit
    - Implementasikan `assertSeriesDetachedForcesZeroCurrent()` di `js/sirkuit.js`
    - Iterasi semua kombinasi: `circuitType='seri'` × `batteryCount` × `bulbCount` × `bulbWatt`
    - Setiap iterasi: set `bulbs[0].isDetached = true`, panggil `runPhysics()`, assert `sim.I === 0`
    - _Requirements: 5.1_

  - [ ]* 20.2 Tulis property test untuk Property 13: Paralel — Bulb dicabut hanya mematikan cabang
    - Implementasikan `assertParallelDetachedReducesR()` di `js/sirkuit.js`
    - Untuk `bulbCount >= 2`: set `bulbs[0].isDetached = true`, panggil `runPhysics()`, assert `sim.I > 0` dan `sim.R_total === R_bulb / (bulbCount - 1)`
    - _Requirements: 6.1, 6.2_

  - [ ]* 20.3 Tulis property test untuk Property 11: Wire putus memaksa I = 0
    - Implementasikan `assertKabelPutusZeroCurrent()` di `js/sirkuit.js`
    - Iterasi semua 96 kombinasi: set `sim.isKabelPutus = true`, panggil `runPhysics()`, assert `sim.I === 0`
    - _Requirements: 7.2_

  - [ ] 20.4 Integrasikan ketiga property test baru ke `runSelfTests()`
    - Tambahkan pemanggilan `assertSeriesDetachedForcesZeroCurrent()`, `assertParallelDetachedReducesR()`, dan `assertKabelPutusZeroCurrent()` di dalam blok `try` pada `runSelfTests()`, setelah `assertSakelarDimState()`
    - _Requirements: 1.7_

- [ ] 21. Checkpoint akhir fitur interaktif — Verifikasi seluruh fitur baru
  - Pastikan semua property tests baru (task 20) lulus
  - Verifikasi visual: klik Bulb di canvas mengubah tampilan Bulb menjadi detached
  - Verifikasi fisika: seri dengan Bulb dicabut → I = 0, semua Bulb lain redup
  - Verifikasi fisika: paralel dengan 1 Bulb dicabut → I > 0, Bulb lain tetap menyala
  - Verifikasi teks status: "Menyala Normal", "Redup", "Lampu Putus", "Sirkuit Terbuka" tampil dengan benar
  - Tanyakan kepada pengguna jika ada pertanyaan.

---

## Notes

- Task bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- Karena implementasi sudah ada, fokus task adalah **verifikasi + perbaikan** bukan menulis dari nol
- Seluruh property tests dan unit tests (task 3.3–3.13, 6.3, 6.5, 10.4) WAJIB dipendam langsung di dalam `js/sirkuit.js` sebagai fungsi `runSelfTests()` yang dipanggil dari `init()`. Dilarang membuat file test terpisah (`*.test.js`, `*.spec.js`, `test.html`)
- Aturan arsitektur wajib dipatuhi di setiap task: no `setInterval`/`setTimeout`, no `style.*` di animation loop, monomorphic state kaku, `will-change: transform` pada canvas, Zero-Comment Policy mutlak
- Dilarang mengeksekusi perintah terminal atau CLI (bash, npm, git, npx) — semua perubahan dilakukan murni via pembaruan kode sumber

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.1", "5.1", "5.5"] },
    { "id": 1, "tasks": ["3.2", "3.5", "3.7", "3.9", "5.2", "6.1"] },
    { "id": 2, "tasks": ["3.3", "3.4", "3.6", "3.8", "3.10", "3.11", "3.12", "3.13", "5.3", "6.2"] },
    { "id": 3, "tasks": ["5.4", "6.3", "6.4", "8.1", "8.2", "8.3", "9.1", "9.2"] },
    { "id": 4, "tasks": ["2.1", "2.2", "2.3", "6.5", "10.1", "10.2", "10.3"] },
    { "id": 5, "tasks": ["10.4"] },
    { "id": 6, "tasks": ["12", "13.1"] },
    { "id": 7, "tasks": ["13.2", "14.1"] },
    { "id": 8, "tasks": ["14.2", "14.3", "15.1", "16.1"] },
    { "id": 9, "tasks": ["15.2", "16.2", "17", "18"] },
    { "id": 10, "tasks": ["19.1", "19.2"] },
    { "id": 11, "tasks": ["20.1", "20.2", "20.3"] },
    { "id": 12, "tasks": ["20.4"] }
  ]
}
```
