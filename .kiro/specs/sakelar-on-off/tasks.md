# Implementation Plan: Sakelar On/Off

## Overview

Implementasi fitur Sakelar On/Off secara inkremental di tiga file inti: `js/sirkuit.js`,
`index.html`, dan `css/style.css`. Urutan pengerjaan dimulai dari state object (fondasi
monomorphic), lalu physics engine, lalu UI/display, lalu canvas renderer, lalu event
handler dan wiring, dan diakhiri dengan pembaruan self-tests. Tidak ada file baru yang
dibuat.

## Tasks

- [x] 1. Tambahkan `isSakelarTertutup` ke state object `sim` di `js/sirkuit.js`
  - Tambahkan properti `isSakelarTertutup : true` sebagai properti terakhir pada deklarasi
    literal objek `sim` yang sudah ada
  - Tipe harus `boolean` dengan nilai default `true` agar sirkuit aktif saat halaman dimuat
  - Shape objek `sim` menjadi 15 properti; tidak ada properti lain yang ditambah
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Modifikasi `runPhysics()` — tambahkan blok sakelar OFF
  - [x] 2.1 Sisipkan blok early-return sakelar OFF di `runPhysics()` dalam `js/sirkuit.js`
    - Tempatkan blok tepat setelah kalkulasi `V_total` dan `R_total` selesai, sebelum
      kalkulasi `I` dan pengecekan overload
    - Blok menetapkan `sim.V_total`, `sim.R_total`, `sim.I = 0`, `sim.P_actual = 0`,
      `sim.bulbState = 'dim'`, `sim.dimAlpha = 0.25`, lalu `return`
    - `sim.wasOverload` dan `sim.blastActive` tidak disentuh oleh blok ini
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Tulis property test untuk Property 1: Sakelar OFF Memaksa I = 0
    - **Property 1: Sakelar OFF Memaksa I = 0**
    - **Validates: Requirements 2.1**
    - Implementasikan fungsi `assertSakelarForcesZeroCurrent()` di `js/sirkuit.js`
    - Iterasi semua kombinasi: `circuitType` × `batteryCount` × `bulbCount` × `bulbWatt`
      (2 × 4 × 4 × 3 = 96 kombinasi)
    - Setiap iterasi: set `sim.isSakelarTertutup = false`, panggil `runPhysics()`,
      assert `sim.I === 0`

  - [ ]* 2.3 Tulis property test untuk Property 2: Sakelar OFF Menghasilkan Dim_State
    - **Property 2: Sakelar OFF Menghasilkan Dim_State dengan dimAlpha = 0.25**
    - **Validates: Requirements 2.2**
    - Implementasikan fungsi `assertSakelarDimState()` di `js/sirkuit.js`
    - Iterasi semua 96 kombinasi yang sama dengan 2.2
    - Setiap iterasi: set `sim.isSakelarTertutup = false`, panggil `runPhysics()`,
      assert `sim.bulbState === 'dim'` dan `sim.dimAlpha === 0.25`

- [ ] 3. Checkpoint — Verifikasi physics engine
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Modifikasi `updateDisplay()` — tambahkan cabang sakelar OFF
  - [x] 4.1 Sisipkan cabang `isSakelarTertutup = false` di awal `updateDisplay()` dalam `js/sirkuit.js`
    - Tempatkan setelah tiga baris pertama yang menulis `elVoltage`, `elResistance`,
      `elPower` (agar V_total dan R_total tetap ditampilkan)
    - Cabang menetapkan: `elLabelCurrent.textContent = 'Arus (I)'`,
      `elCurrent.textContent = '0.000 A'`, `elItemCurrentPerBulb.hidden = true`,
      `elItemCurrentPeak.hidden = true`,
      `elStatus.className = 'info-value info-value--status status-open'`,
      `elStatus.textContent = 'Sirkuit Terbuka'` (via `textContent`),
      `elBatteryLife.textContent = '-'`, lalu `return`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Tambahkan `#btnSakelar` ke `index.html`
  - [x] 5.1 Sisipkan elemen `<button>` Switch_Button di dalam `.control-panel` pada `index.html`
    - Tempatkan di dalam `<div class="control-group">` baru, setelah fieldset Daya Nominal
      Lampu dan sebelum `#btnReset`
    - Atribut wajib: `class="btn-sakelar btn-sakelar--on"`, `id="btnSakelar"`,
      `type="button"`, `aria-label="Toggle sakelar: saat ini ON (tertutup), tekan untuk membuka sirkuit"`,
      `aria-pressed="true"`
    - Teks konten awal: `ON (Tertutup)` — tanpa emoji, via `textContent` saat runtime
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

- [x] 6. Tambahkan CSS classes sakelar ke `css/style.css`
  - [x] 6.1 Tambahkan `.btn-sakelar`, `.btn-sakelar--on`, `.btn-sakelar--off` ke `css/style.css`
    - `.btn-sakelar`: base styles — `display: flex`, `width: 100%`, `min-height: 48px`,
      `border-radius: var(--radius-md)`, `cursor: pointer`, `transition`, `border: 2px solid transparent`
    - `.btn-sakelar--on`: background hijau gelap, `color: #69f0ae`, `border-color: #00AA00`
    - `.btn-sakelar--on:hover`: box-shadow hijau
    - `.btn-sakelar--off`: background merah gelap, `color: #ff8a80`, `border-color: #CC0000`
    - `.btn-sakelar--off:hover`: box-shadow merah
    - `.btn-sakelar:active`: `transform: scale(0.97)`
    - `.btn-sakelar:focus-visible`: `outline: 3px solid var(--clr-accent)`
    - _Requirements: 1.1, 1.5_

- [x] 7. Tambahkan fungsi `drawSwitch(geo)` dan modifikasi `drawWires()` di `js/sirkuit.js`
  - [x] 7.1 Implementasikan fungsi baru `drawSwitch(geo)` di `js/sirkuit.js`
    - Hitung `switchX = geo.left`, `switchMidY = (geo.top + geo.bottom) / 2`,
      `halfLen = Math.min(cw, ch) * 0.06`
    - Saat ON (`sim.isSakelarTertutup = true`): gambar garis penuh dari
      `(switchX, switchMidY - halfLen)` ke `(switchX, switchMidY + halfLen)`,
      `strokeStyle = '#00AA00'`, `lineWidth = 6`
    - Saat OFF: gambar dua segmen terpisah dengan celah minimal 8px di tengah,
      `strokeStyle = '#CC0000'`, `lineWidth = 6`
    - Gambar label teks `'ON'` atau `'OFF'` di sebelah kiri titik tengah menggunakan
      `ctx.fillText`, `textAlign = 'right'`, `textBaseline = 'middle'`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Modifikasi `drawWires(geo)` — tambahkan pemanggilan `drawSwitch(geo)` di akhir
    - Tambahkan satu baris `drawSwitch(geo)` setelah seluruh kode existing `drawWires()`
      (setelah blok glow overlay)
    - _Requirements: 3.1_

- [x] 8. Tambahkan `onSakelarToggle()`, cache `btnSakelar`, dan wire event di `js/sirkuit.js`
  - [x] 8.1 Cache referensi DOM `btnSakelar` bersama referensi DOM lainnya
    - Tambahkan `const btnSakelar = document.getElementById('btnSakelar')` di blok
      deklarasi DOM references yang sudah ada
    - _Requirements: 6.2_

  - [x] 8.2 Implementasikan fungsi `onSakelarToggle()` di `js/sirkuit.js`
    - Toggle `sim.isSakelarTertutup = !sim.isSakelarTertutup`
    - Perbarui `btnSakelar.textContent` ke `'ON (Tertutup)'` atau `'OFF (Terbuka)'`
    - Perbarui `btnSakelar.setAttribute('aria-pressed', ...)` sesuai posisi baru
    - Ganti class `btn-sakelar--on` / `btn-sakelar--off` pada `btnSakelar`
    - Panggil `runPhysics()` lalu `updateDisplay()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 8.3 Modifikasi `onReset()` — tambahkan reset `isSakelarTertutup` dan label
    - Tambahkan `sim.isSakelarTertutup = true` di blok reset `sim.*`
    - Tambahkan `btnSakelar.textContent = 'ON (Tertutup)'`
    - Tambahkan reset class: hapus `btn-sakelar--off`, tambahkan `btn-sakelar--on`
    - Tambahkan `btnSakelar.setAttribute('aria-pressed', 'true')`
    - _Requirements: 1.6, 6.4_

  - [x] 8.4 Tambahkan guard `btnSakelar` dan wire event listener di `init()`
    - Tambahkan guard: `if (!btnSakelar) throw new Error('btnSakelar element not found')`
      sebelum event binding
    - Tambahkan `btnSakelar.addEventListener('click', onSakelarToggle)` di blok
      event binding yang sudah ada
    - _Requirements: 1.1_

- [ ] 9. Checkpoint — Verifikasi integrasi UI dan canvas
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Perbarui `runSelfTests()` — assertSimMonomorphic, snapshotSim, restoreSim, dan property tests
  - [x] 10.1 Perbarui `assertSimMonomorphic()` untuk 15 properti
    - Tambahkan `'isSakelarTertutup'` ke array `requiredKeys`
    - Perbarui pengecekan jumlah key dari 14 menjadi 15
    - Tambahkan pengecekan tipe: `if (typeof sim.isSakelarTertutup !== 'boolean') throw ...`
    - _Requirements: 6.1, 6.5_

  - [x] 10.2 Perbarui `snapshotSim()` dan `restoreSim()` untuk menyertakan `isSakelarTertutup`
    - Di `snapshotSim()`: tambahkan `isSakelarTertutup : sim.isSakelarTertutup` ke objek return
    - Di `restoreSim()`: tambahkan `sim.isSakelarTertutup = snapshot.isSakelarTertutup`
    - _Requirements: 6.5_

  - [x] 10.3 Integrasikan `assertSakelarForcesZeroCurrent()` dan `assertSakelarDimState()` ke `runSelfTests()`
    - Tambahkan pemanggilan `assertSakelarForcesZeroCurrent()` dan `assertSakelarDimState()`
      di dalam blok `try` pada `runSelfTests()`, setelah `assertRenderLayerOrder()` dan
      sebelum loop property test existing
    - _Requirements: 6.5_

- [ ] 11. Final checkpoint — Verifikasi seluruh fitur
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Urutan task dirancang inkremental: setiap task bergantung pada task sebelumnya
- Task 2.2 dan 2.3 (fungsi `assertSakelarForcesZeroCurrent` dan `assertSakelarDimState`)
  ditulis di task 2 agar dapat diuji segera setelah physics engine dimodifikasi, namun
  baru diintegrasikan ke `runSelfTests()` di task 10.3
- Zero-Comment Policy dan Zero-Emoji Policy berlaku mutlak di semua file
- Tidak ada file baru yang dibuat; semua perubahan terbatas pada tiga file inti

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "4.1"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["7.1", "8.1"] },
    { "id": 5, "tasks": ["7.2", "8.2", "8.3"] },
    { "id": 6, "tasks": ["8.4"] },
    { "id": 7, "tasks": ["10.1", "10.2"] },
    { "id": 8, "tasks": ["10.3"] }
  ]
}
```
