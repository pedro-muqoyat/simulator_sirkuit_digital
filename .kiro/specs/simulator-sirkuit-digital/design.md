# Design Document — Simulator Sirkuit Digital

## Overview

Simulator Sirkuit Digital adalah aplikasi web edukasi single-page yang berjalan sepenuhnya di sisi klien. Arsitektur terdiri dari tiga lapisan yang saling terpisah namun terhubung melalui satu objek state terpusat (`sim`):

1. **Physics Engine** — menghitung nilai listrik berdasarkan Hukum Ohm dan Hukum Daya
2. **Canvas Renderer + Particle System** — menggambar semua visual di `<canvas>` HTML5
3. **Control Panel + UI** — menerima input pengguna dan menampilkan hasil perhitungan

Seluruh kode berjalan dalam satu IIFE di `js/sirkuit.js` tanpa dependensi eksternal.

---

## Aturan Utama Mutlak (Wajib Dipatuhi Tanpa Pengecualian)

Aturan-aturan berikut berlaku untuk **seluruh file kode sumber** (`index.html`, `css/style.css`, `js/sirkuit.js`) dan tidak dapat dikompromikan:

1. **Zero-Comment Policy:** SELURUH file kode sumber DILARANG KERAS memuat komentar dalam bentuk apapun — termasuk `//`, `/* */`, dan komentar HTML `<!-- -->`. Kode wajib menerapkan **Self-Documenting Code** secara mutlak: nama variabel, fungsi, konstanta, dan elemen HTML harus cukup deskriptif sehingga tidak memerlukan penjelasan tambahan dalam bentuk komentar.

2. **Zero-Emoji Policy:** DILARANG KERAS menyisipkan karakter emoji, emoticon, atau simbol Unicode non-alfanumerik grafis (seperti `🔋`, `💡`, `⚡`, `🔅`, `✅`, `💥`, `🎛️`, `🔗`, `📊`, `🔄`) di seluruh file kode sumber (`index.html`, `style.css`, `js/sirkuit.js`). Larangan ini berlaku mutlak untuk teks string HTML, nilai teks Canvas `fillText()`, label UI, nama variabel, nama fungsi, ID elemen, maupun log konsol. Sebagai pengganti, gunakan manipulasi warna CSS/Canvas murni: kilatan warna kuning cerah untuk lampu menyala, partikel lingkaran merah untuk kondisi overload.

3. **Monomorphic State Object:** Objek state `sim` WAJIB dikunci sejak deklarasi awal dengan seluruh properti yang dibutuhkan seumur hidup aplikasi. Dilarang keras menambah, menghapus, atau mengubah shape objek `sim` di runtime. Setiap properti harus diinisialisasi dengan tipe data final yang benar sejak baris pertama deklarasi (string tetap string, number tetap number, boolean tetap boolean).

4. **No External Dependencies:** Dilarang menggunakan framework, library, CDN eksternal, atau NPM packages dalam bentuk apapun.

5. **RAF-Only Animation:** Dilarang menggunakan `setInterval()` atau `setTimeout()` untuk kalkulasi loop animasi fisika. Wajib menggunakan `window.requestAnimationFrame()`.

6. **No Inline Style Mutation:** Dilarang memodifikasi properti geometri layout DOM (`style.left`, `style.width`, `style.top`, dll.) di dalam loop animasi. GPU acceleration canvas wajib diterapkan via CSS (`will-change: transform`, `transform: translateZ(0)`), bukan via JavaScript.

7. **Canvas-Only Rendering:** Seluruh visualisasi sirkuit, partikel, dan animasi wajib digambar eksklusif menggunakan HTML5 Canvas 2D API. Dilarang menggunakan animasi CSS atau manipulasi DOM untuk efek visual.

---

## Architecture

### File Structure

```
simulator_sirkuit_digital/
├── index.html          ← Struktur HTML, DOM references, link ke CSS & JS
├── css/
│   └── style.css       ← Semua styling: layout, komponen, responsivitas
└── js/
    └── sirkuit.js      ← Semua logika: physics, renderer, particle, event handlers
```

### Module Boundaries (dalam sirkuit.js)

```
sirkuit.js (IIFE)
│
├── CONSTANTS           ← Nilai tetap (V_BATTERY, OVERLOAD_FACTOR, dll.)
├── sim (State Object)  ← Satu-satunya sumber kebenaran (monomorphic)
│
├── Physics Engine
│   └── runPhysics()    ← Baca sim.*, tulis sim.V_total/R_total/I/P_actual/bulbState
│
├── Canvas Renderer
│   ├── getGeometry()   ← Hitung koordinat dari ukuran canvas saat ini
│   ├── drawBackground()
│   ├── drawWires()
│   ├── drawBatteries()
│   ├── drawBulbs()     ← Delegasi ke drawNormalBulb() / drawBrokenBulb()
│   └── drawPhysicsLabels()
│
├── Particle System
│   ├── electrons[]     ← Array partikel elektron normal
│   ├── blasts[]        ← Array partikel ledakan overload
│   ├── initElectrons() / updateElectrons() / drawElectrons()
│   └── spawnBlast() / updateBlasts() / drawBlasts()
│
├── Animation Loop
│   └── loop() → render() → requestAnimationFrame(loop)
│
├── UI / Display
│   └── updateDisplay() ← Tulis ke DOM display elements
│
└── Event Handlers + init()
```

---

## Component Design

### 1. State Object (`sim`)

Objek `sim` adalah struktur monomorphic — semua key didefinisikan saat deklarasi dan tidak pernah ditambah/dihapus di runtime. Ini memastikan V8 JIT compiler dapat mengoptimalkan akses properti.

```javascript
const sim = {
  circuitType  : 'seri',
  batteryCount : 1,
  bulbCount    : 1,
  bulbWatt     : 10,
  V_total      : 0,
  R_total      : 0,
  I            : 0,
  P_actual     : 0,
  bulbState    : 'normal',
  dimAlpha     : 1.0,
  wasOverload  : false,
  blastTime    : 0,
  blastActive  : false,
};
```

### 2. Physics Engine

**Konstanta dasar:**
- `V_BATTERY = 1.5` V per unit baterai
- `OVERLOAD_FACTOR = 1.3`
- `V_nominal` untuk kalkulasi R = `V_BATTERY` (tegangan referensi satu baterai)

**Alur kalkulasi `runPhysics()`:**

```
R_bulb = V_BATTERY² / bulbWatt          ← R per lampu (dari P_nominal)

IF seri:
  V_total    = batteryCount × V_BATTERY
  R_total    = bulbCount × R_bulb
  V_per_bulb = V_total / bulbCount

IF paralel:
  V_total    = V_BATTERY                 ← tegangan konstan satu baterai
  R_total    = R_bulb / bulbCount        ← 1/R_total = Σ(1/R_bulb)
  V_per_bulb = V_BATTERY

I        = V_total / R_total
P_actual = V_per_bulb² / R_bulb

Determine bulbState:
  P_actual == 0          → dim   (dimAlpha = 0.25)
  P_actual < P_nominal   → dim   (dimAlpha = P_actual / P_nominal, min 0.25)
  P_actual ≤ P_nominal × 1.3 → normal
  P_actual > P_nominal × 1.3 → overload (I = 0, trigger blast jika transisi baru)
```

**Transisi Overload:**
- Blast hanya di-spawn saat `nowOverload && !sim.wasOverload` (transisi masuk)
- Banner overload ditampilkan/disembunyikan berdasarkan state ini
- Saat keluar dari overload, `blastActive = false` dan banner disembunyikan

### 3. Canvas Renderer

**Koordinat sistem (`getGeometry()`):**

```
Canvas dibagi dengan padding = min(cw, ch) × 0.12

wirePath (rectangular loop):
  top-left → top-right → bottom-right → bottom-left → top-left

Baterai ditempatkan di: y = top (tengah horizontal)
Lampu ditempatkan di:   y = bottom (tengah horizontal)

densePath: wirePath di-interpolasi menjadi ~200 titik untuk
           pergerakan partikel yang halus
```

**Layer rendering (urutan draw per frame):**
1. `drawBackground()` — fill solid `#0d1b2a`
2. `drawWires()` — kabel dasar + glow overlay jika I > 0
3. `drawBatteries()` — kotak hijau dengan label tegangan
4. `drawBulbs()` — delegasi ke `drawNormalBulb` atau `drawBrokenBulb`
5. `drawPhysicsLabels()` — label arus di tengah canvas
6. `drawElectrons()` — partikel biru bergerak (hanya jika I > 0)
7. `drawBlasts()` — partikel ledakan (hanya jika `blastActive`)

**GPU Acceleration:**
Canvas element menggunakan `will-change: transform` dan `transform: translateZ(0)` via CSS untuk mengaktifkan layer compositing GPU. Tidak ada modifikasi `style.*` di dalam loop animasi.

### 4. Particle System

**Elektron normal:**

```javascript
{ progress, size, r, g, b }

progress += BASE_SPEED × speedFactor
speedFactor = min(I × 8, 6)
```

**Partikel ledakan (blast):**

```javascript
{ x, y, vx, vy, size, life, decay, hue }

x += vx; y += vy
vy += 0.18
life -= decay
```

### 5. Animation Loop

```javascript
function loop(timestamp) {
  render(timestamp);
  rafId = requestAnimationFrame(loop);
}
```

Loop hanya berjalan via `requestAnimationFrame`. Tidak ada `setInterval` atau `setTimeout` untuk physics/animasi. Loop berjalan terus-menerus selama halaman aktif (termasuk saat overload — renderer tetap berjalan untuk menampilkan blast particles dan broken bulb).

### 6. Control Panel & Event Binding

| Kontrol | Element | Event | Handler |
|---|---|---|---|
| Jenis rangkaian | `input[name="circuitType"]` | `change` | `onCircuitTypeChange` |
| Jumlah baterai | `#batteryCount` (range) | `input` | `onBatterySlider` |
| Jumlah lampu | `#bulbCount` (range) | `input` | `onBulbSlider` |
| Watt nominal | `input[name="bulbWatt"]` | `change` | `onBulbWattChange` |
| Reset | `#btnReset` | `click` | `onReset` |
| Resize window | `window` | `resize` | `onResize` |

Setiap handler: update `sim.*` → `runPhysics()` → `updateDisplay()`. Canvas diperbarui otomatis oleh loop RAF pada frame berikutnya.

**Label binding:** Setiap `<label>` menggunakan atribut `for` yang cocok dengan `id` input terkait, memastikan area sentuh mencakup seluruh teks label (penting untuk pengguna anak SD di layar sentuh).

### 7. UI Display (`updateDisplay()`)

Menulis ke elemen DOM berikut setiap kali physics dijalankan:

| Element ID | Konten |
|---|---|
| `#displayVoltage` | `V_total.toFixed(2) + " V"` |
| `#displayResistance` | `R_total.toFixed(2) + " Ω"` |
| `#displayCurrent` | `I.toFixed(3) + " A"` |
| `#displayPower` | `P_actual.toFixed(2) + " W"` |
| `#displayStatus` | Teks + class CSS sesuai `bulbState` |
| `#overloadBanner` | `hidden` attribute toggle |

---

## CSS Layout Architecture

### Responsive Grid

```
Mobile (< 640px):
  grid-template-columns: 1fr
  Urutan: canvas → info → controls (vertikal)

Tablet/Desktop (≥ 640px):
  grid-template-columns: 1fr 320px
  grid-template-areas:
    "canvas  controls"
    "info    controls"

Large (≥ 960px):
  grid-template-columns: 1fr 360px
```

### Touch Target Sizing

- Slider thumb: 32×32px, padding vertikal 17px → total touch area ≥ 44px
- Radio label: `min-height: 44px`, padding horizontal
- Reset button: `min-height: 48px`

### Visual States (CSS Classes)

```
.info-value--status.status-dim      → warna biru muda (#4fc3f7)
.info-value--status.status-normal   → warna hijau (#69f0ae)
.info-value--status.status-overload → warna merah (#ff5252)

.radio-label:has(.radio-input:checked) → border + background highlight kuning
```

---

## Data Flow Diagram

```
User Input (Control Panel)
        │
        ▼
  sim.* updated
        │
        ▼
  runPhysics()
  ├── Hitung V_total, R_total, I, P_actual
  ├── Tentukan bulbState + dimAlpha
  └── Trigger blast jika transisi ke overload
        │
        ├──► updateDisplay()  ← tulis ke DOM (sekali per interaksi)
        │
        └──► sim.* siap dibaca oleh renderer
                    │
                    ▼
          requestAnimationFrame loop
          ├── getGeometry()
          ├── drawBackground / Wires / Batteries / Bulbs
          ├── drawElectrons (jika I > 0)
          └── drawBlasts (jika blastActive)
```

---

## Visual Design Decisions

### Colour Palette

| Token | Hex | Penggunaan |
|---|---|---|
| `--clr-bg` | `#0d1b2a` | Background utama (dark navy) |
| `--clr-surface` | `#1b2d45` | Card/panel background |
| `--clr-accent` | `#f7c948` | Kuning — highlight, baterai, nilai fisika |
| `--clr-accent-2` | `#4fc3f7` | Biru muda — elektron, kabel aktif |
| `--clr-success` | `#69f0ae` | Hijau — status normal, baterai |
| `--clr-danger` | `#ff5252` | Merah — overload, lampu pecah |

Palet dipilih untuk kontras tinggi di atas background gelap, sesuai untuk anak usia 9–12 tahun.

### Typography

- Font: `'Segoe UI', 'Arial Rounded MT Bold', Arial, sans-serif` — rounded, ramah anak
- Minimum font size konten: `0.875rem` (14px)
- Minimum font size label kontrol: `1rem` (16px)

### Bulb Visual States

| State | Visual |
|---|---|
| `dim` | Lingkaran kuning, `globalAlpha = dimAlpha` (0.25–<1.0), glow redup |
| `normal` | Lingkaran kuning penuh, `globalAlpha = 1.0`, glow terang |
| `overload` | Lingkaran merah gelap, garis silang merah, 3 titik percikan |

---

## Components and Interfaces

### Component: PhysicsEngine

**Fungsi publik:**

```javascript
runPhysics() → void
```

**Antarmuka dengan modul lain:**
- Dibaca oleh `render()` (Canvas Renderer) via `sim.*`
- Dibaca oleh `updateDisplay()` (UI) via `sim.*`
- Dipanggil oleh setiap event handler Control Panel

---

### Component: CanvasRenderer

**Fungsi publik:**

```javascript
getGeometry() → { cx, cy, left, right, top, bottom, wirePath, densePath, batteryY, bulbY }

render(timestamp) → void

resizeCanvas() → void
```

**Antarmuka dengan modul lain:**
- Membaca `sim.*` (read-only terhadap Physics Engine output)
- Membaca `electrons[]` dan `blasts[]` (Particle System)
- Dipanggil oleh Animation Loop setiap frame

---

### Component: ParticleSystem

**Fungsi publik:**

```javascript
initElectrons(densePath) → void

updateElectrons(densePath, speedFactor) → void

drawElectrons(densePath) → void

spawnBlast(x, y) → void

updateBlasts() → void

drawBlasts() → void
```

**Antarmuka dengan modul lain:**
- Dipanggil oleh `render()` (Canvas Renderer)
- `spawnBlast()` dipanggil oleh `runPhysics()` saat transisi ke Overload_State
- Membaca `sim.I` dan `sim.blastActive` untuk kondisi eksekusi

---

### Component: AnimationLoop

**Fungsi publik:**

```javascript
loop(timestamp) → void
```

**Antarmuka dengan modul lain:**
- Memanggil `render()` (Canvas Renderer) setiap frame
- Tidak berinteraksi langsung dengan Physics Engine atau UI

---

### Component: ControlPanel (Event Handlers)

**Fungsi publik:**

```javascript
onCircuitTypeChange(e) → void
onBatterySlider(e)    → void
onBulbSlider(e)       → void
onBulbWattChange(e)   → void
onReset()             → void
onResize()            → void
```

**Pola umum setiap handler:**
```
update sim.* → runPhysics() → updateDisplay()
```

**Antarmuka dengan modul lain:**
- Menulis ke `sim.*` (input fields)
- Memanggil `runPhysics()` (Physics Engine)
- Memanggil `updateDisplay()` (UI Display)

---

### Component: UIDisplay

**Fungsi publik:**

```javascript
updateDisplay() → void
```

**Antarmuka dengan modul lain:**
- Membaca `sim.*` (read-only)
- Memanipulasi DOM text content dan className (di luar loop RAF)

---

## Data Models

### SimState (Objek `sim`)

Satu-satunya sumber kebenaran aplikasi. Monomorphic kaku — shape dikunci sejak deklarasi awal dan tidak berubah seumur hidup aplikasi. Setiap properti diinisialisasi dengan tipe data final yang benar: string tetap string, number tetap number, boolean tetap boolean.

```typescript
interface SimState {
  circuitType  : 'seri' | 'paralel';
  batteryCount : 1 | 2 | 3 | 4;
  bulbCount    : 1 | 2 | 3 | 4;
  bulbWatt     : 5 | 10 | 25;
  V_total      : number;
  R_total      : number;
  I            : number;
  P_actual     : number;
  bulbState    : 'dim' | 'normal' | 'overload';
  dimAlpha     : number;
  wasOverload  : boolean;
  blastTime    : number;
  blastActive  : boolean;
}
```

**Nilai default (state awal dan setelah reset):**

| Field | Default |
|---|---|
| `circuitType` | `'seri'` |
| `batteryCount` | `1` |
| `bulbCount` | `1` |
| `bulbWatt` | `10` |
| `V_total` | `0` |
| `R_total` | `0` |
| `I` | `0` |
| `P_actual` | `0` |
| `bulbState` | `'normal'` |
| `dimAlpha` | `1.0` |
| `wasOverload` | `false` |
| `blastTime` | `0` |
| `blastActive` | `false` |

---

### ElectronParticle

Array `electrons[]` berisi objek monomorphic:

```typescript
interface ElectronParticle {
  progress : number;
  size     : number;
  r        : number;
  g        : number;
  b        : number;
}
```

Jumlah partikel: `ELECTRON_COUNT = 22` (konstan, tidak berubah saat runtime).

---

### BlastParticle

Array `blasts[]` berisi objek monomorphic:

```typescript
interface BlastParticle {
  x     : number;
  y     : number;
  vx    : number;
  vy    : number;
  size  : number;
  life  : number;
  decay : number;
  hue   : number;
}
```

Jumlah partikel: `BLAST_COUNT = 15` per kejadian overload.

---

### GeometryResult

Nilai kembalian `getGeometry()`, dihitung ulang setiap frame:

```typescript
interface GeometryResult {
  cx        : number;
  cy        : number;
  left      : number;
  right     : number;
  top       : number;
  bottom    : number;
  wirePath  : Array<{x: number, y: number}>;
  densePath : Array<{x: number, y: number}>;
  batteryY  : number;
  bulbY     : number;
}
```

---

### DOM Element References

Elemen DOM yang di-cache saat `init()` dan tidak pernah di-query ulang:

| Variabel | Selector | Tipe |
|---|---|---|
| `canvas` | `#circuitCanvas` | `HTMLCanvasElement` |
| `ctx` | — | `CanvasRenderingContext2D` |
| `overloadBanner` | `#overloadBanner` | `HTMLDivElement` |
| `elVoltage` | `#displayVoltage` | `HTMLSpanElement` |
| `elResistance` | `#displayResistance` | `HTMLSpanElement` |
| `elCurrent` | `#displayCurrent` | `HTMLSpanElement` |
| `elPower` | `#displayPower` | `HTMLSpanElement` |
| `elStatus` | `#displayStatus` | `HTMLSpanElement` |
| `sliderBattery` | `#batteryCount` | `HTMLInputElement` |
| `labelBattery` | `#batteryCountDisplay` | `HTMLElement` |
| `sliderBulb` | `#bulbCount` | `HTMLInputElement` |
| `labelBulb` | `#bulbCountDisplay` | `HTMLElement` |
| `radiosCircuitType` | `input[name="circuitType"]` | `NodeList` |
| `radiosBulbWatt` | `input[name="bulbWatt"]` | `NodeList` |
| `btnReset` | `#btnReset` | `HTMLButtonElement` |

---

## Correctness Properties

Properti-properti ini adalah invariant yang harus selalu terpenuhi. Dapat diverifikasi dengan property-based testing.

### Property 1: Hukum Ohm — Konsistensi I = V / R

**Validates: Requirements 2.1**

```
∀ state dengan R_total > 0 dan bulbState ≠ 'overload':
  |sim.I - (sim.V_total / sim.R_total)| < ε   (ε = 0.0001)
```

### Property 2: Hukum Daya — Konsistensi P_actual = V_per_bulb² / R_bulb

**Validates: Requirements 2.2**

```
∀ state dengan R_bulb > 0:
  P_actual = (V_per_bulb)² / R_bulb
  di mana V_per_bulb = V_total / bulbCount (seri)
                     = V_BATTERY (paralel)
```

### Property 3: Klasifikasi State Bulb Eksklusif dan Lengkap

**Validates: Requirements 2.5, 2.6, 2.7, 2.8**

```
∀ nilai P_actual yang valid:
  tepat satu dari {dim, normal, overload} aktif
  
  dim      ↔ P_actual < P_nominal
  normal   ↔ P_nominal ≤ P_actual ≤ P_nominal × 1.3
  overload ↔ P_actual > P_nominal × 1.3
```

### Property 4: Overload Memutus Arus

**Validates: Requirements 2.8**

```
∀ state dengan bulbState = 'overload':
  sim.I = 0
```

### Property 5: Rangkaian Seri — Tegangan Proporsional Baterai

**Validates: Requirements 2.3**

```
∀ state dengan circuitType = 'seri':
  sim.V_total = sim.batteryCount × V_BATTERY
  sim.R_total = sim.bulbCount × R_bulb
```

### Property 6: Rangkaian Paralel — Tegangan Konstan

**Validates: Requirements 2.4**

```
∀ state dengan circuitType = 'paralel':
  sim.V_total = V_BATTERY   (tidak bergantung batteryCount)
  sim.R_total = R_bulb / sim.bulbCount
```

### Property 7: dimAlpha Proporsional dan Terbatas

**Validates: Requirements 5.2**

```
∀ state dengan bulbState = 'dim' dan P_actual > 0:
  0.25 ≤ sim.dimAlpha < 1.0
  sim.dimAlpha = max(0.25, P_actual / P_nominal)

∀ state dengan bulbState = 'dim' dan P_actual = 0:
  sim.dimAlpha = 0.25
```

### Property 8: Kecepatan Elektron Proporsional Arus

**Validates: Requirements 4.2, 4.3**

```
∀ frame dengan sim.I > 0:
  speedFactor = min(sim.I × 8, 6)
  speedFactor > 0   (partikel tidak boleh diam)

∀ frame dengan sim.I = 0:
  partikel elektron tidak bergerak (progress tidak berubah)
```

### Property 9: Blast Hanya Terpicu Satu Kali per Transisi Overload

**Validates: Requirements 4.5**

```
∀ urutan state [s1, s2]:
  s1.bulbState ≠ 'overload' ∧ s2.bulbState = 'overload'
  → spawnBlast() dipanggil tepat satu kali

  s1.bulbState = 'overload' ∧ s2.bulbState = 'overload'
  → spawnBlast() TIDAK dipanggil
```

### Property 10: R_bulb Selalu Positif

**Validates: Requirements 2.9**

```
∀ nilai bulbWatt ∈ {5, 10, 25}:
  R_bulb = V_BATTERY² / bulbWatt > 0
```

---

## Error Handling

### E1 — Canvas Context Tidak Tersedia

**Kondisi:** `canvas.getContext('2d')` mengembalikan `null` (browser sangat lama atau mode privat tertentu).

**Penanganan:** Saat ini tidak ada fallback eksplisit. Jika `ctx` adalah `null`, semua pemanggilan `ctx.*` akan melempar `TypeError`. Mitigasi: tambahkan guard di `init()`:

```javascript
if (!ctx) {
  canvas.parentElement.innerHTML =
    '<p style="color:#ff5252;padding:1rem">Browser Anda tidak mendukung Canvas HTML5.</p>';
  return;
}
```

**Kondisi:** Error tak terduga saat menggambar visual broken bulb (misalnya state canvas korup).

---

### E2 — `drawBrokenBulb` Gagal Render

**Kondisi:** Error tak terduga saat menggambar visual broken bulb (misalnya state canvas korup).

**Penanganan (sesuai R5.3):** Jika `drawBrokenBulb()` melempar error, Canvas_Renderer menampilkan fallback indikator error state via try-catch:

```javascript
try {
  drawBrokenBulb(bx, by, radius);
} catch (renderError) {
  ctx.fillStyle = '#ff5252';
  ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2);
}
```

---

### E3 — Resize Saat Canvas Belum Siap

**Kondisi:** Event `resize` terpicu sebelum `init()` selesai atau saat `canvas` belum terpasang di DOM.

**Penanganan:** `resizeCanvas()` menggunakan `canvas.getBoundingClientRect()` dengan fallback ke `canvas.parentElement.clientWidth || 400`. Jika parent belum ada, nilai default 400×300 digunakan sehingga renderer tetap berfungsi.

---

### E4 — Nilai Input di Luar Rentang

**Kondisi:** Nilai slider atau radio button di luar rentang yang diharapkan (misalnya manipulasi DOM manual).

**Penanganan:** `runPhysics()` menggunakan nilai dari `sim.*` yang di-set oleh handler. Handler menggunakan `parseInt(e.target.value, 10)` — jika hasilnya `NaN`, kalkulasi akan menghasilkan `NaN` yang menyebar ke display. Mitigasi: tambahkan validasi di handler:

```javascript
const val = parseInt(e.target.value, 10);
if (isNaN(val) || val < 1 || val > 4) return;
```

---

### E5 — Division by Zero di Physics Engine

**Kondisi:** `R_total = 0` (tidak mungkin dengan input valid karena `R_bulb > 0` selalu), atau `bulbWatt = 0` (tidak mungkin karena pilihan hanya 5/10/25).

**Penanganan:** Guard sudah ada: `R_total > 0 ? V_total / R_total : 0`. Properti P10 menjamin `R_bulb > 0` selama `bulbWatt ∈ {5, 10, 25}`.

---

## Testing Strategy

### Pendekatan Umum

Karena proyek ini adalah pure vanilla JS tanpa build system, strategi testing menggunakan:
1. **Property-Based Testing (PBT)** untuk Physics Engine — verifikasi invariant matematika, dipendam langsung di dalam `js/sirkuit.js` sebagai fungsi `runSelfTests()` yang dipanggil saat `init()`
2. **Unit Testing** untuk fungsi-fungsi murni (pure functions), juga dipendam di `js/sirkuit.js`
3. **Visual regression testing** manual di browser untuk Canvas Renderer
4. **Responsive testing** di DevTools untuk breakpoint mobile

Seluruh kode pengujian ditulis tanpa komentar dan mengikuti Zero-Comment Policy yang sama dengan kode produksi.

---

### Property-Based Tests (Physics Engine)

Diimplementasikan sebagai fungsi `runSelfTests()` di dalam `js/sirkuit.js` menggunakan generator sederhana tanpa library eksternal:

```javascript
function runSelfTests() {
  const batteryOptions  = [1, 2, 3, 4];
  const bulbOptions     = [1, 2, 3, 4];
  const wattOptions     = [5, 10, 25];
  const typeOptions     = ['seri', 'paralel'];

  for (const batteries of batteryOptions) {
    for (const bulbs of bulbOptions) {
      for (const watt of wattOptions) {
        for (const type of typeOptions) {
          const result = computePhysicsSnapshot(type, batteries, bulbs, watt);
          assertOhmLaw(result);
          assertPowerLaw(result);
          assertBulbStateExclusive(result);
          assertOverloadBreaksCurrent(result);
          assertDimAlphaRange(result);
          assertRbulbPositive(watt);
        }
      }
    }
  }
}
```

---

### Unit Tests (Fungsi Murni)

**Test cases kritis untuk `runPhysics()`:**

| Skenario | Input | Expected Output |
|---|---|---|
| Seri 1 baterai 1 lampu 10W | seri, 1, 1, 10 | V=1.5, R=0.225, I=6.67, P=10, state=normal |
| Seri 4 baterai 1 lampu 5W | seri, 4, 1, 5 | P_actual >> 5W×1.3 → overload, I=0 |
| Paralel 4 baterai 4 lampu 10W | paralel, 4, 4, 10 | V=1.5, P=10, state=normal |
| Seri 1 baterai 4 lampu 25W | seri, 1, 4, 25 | P_actual << 25W → dim |
| Transisi ke overload | state berubah ke overload | `wasOverload` false→true, blast terpicu |
| Keluar dari overload | state berubah dari overload | `blastActive = false`, banner hidden |

---

### Visual / Manual Tests

**Checklist browser testing:**

- [ ] Halaman dimuat tanpa error di console (Chrome, Firefox, Safari mobile)
- [ ] Canvas menampilkan sirkuit default (seri, 1 baterai, 1 lampu 10W) saat load
- [ ] Elektron bergerak saat I > 0, berhenti saat I = 0
- [ ] Lampu berubah kecerahan saat slider digeser
- [ ] Efek ledakan muncul saat overload, menghilang setelah ~1.8 detik
- [ ] Banner "OVERLOAD" muncul dan hilang dengan benar
- [ ] Nilai fisika di panel info berubah real-time saat slider digeser
- [ ] Tombol Reset mengembalikan semua ke kondisi awal
- [ ] Tidak ada horizontal scroll di lebar 320px (portrait)
- [ ] Layout berfungsi di landscape phone (640px × 360px)
- [ ] Semua kontrol dapat disentuh dengan jari di layar sentuh

---

### Responsive Breakpoint Tests

| Breakpoint | Lebar | Orientasi | Expected Layout |
|---|---|---|---|
| Mobile kecil | 320px | Portrait | 1 kolom, canvas di atas |
| Mobile standar | 375px | Portrait | 1 kolom, canvas di atas |
| Mobile landscape | 640px | Landscape | 2 kolom (canvas+info / controls) |
| Tablet | 768px | Portrait | 2 kolom (canvas+info / controls) |
| Desktop | 1024px | Landscape | 2 kolom lebar |

---

## Requirements Traceability

| Requirement | Komponen yang Mengimplementasikan |
|---|---|
| R1: Struktur 3 file, client-side, viewport meta | `index.html`, `css/style.css`, `js/sirkuit.js` |
| R2: Physics Engine (Ohm, Daya, seri/paralel, state) | `runPhysics()` di `sirkuit.js` |
| R3: Canvas rendering, RAF loop, GPU accel, resize | `render()`, `loop()`, CSS `will-change`, `onResize()` |
| R4: Particle System elektron, kecepatan proporsional | `electrons[]`, `updateElectrons()`, `drawElectrons()` |
| R5: Visual bulb 3 state (dim/normal/overload) | `drawNormalBulb()`, `drawBrokenBulb()` |
| R6: Control Panel (slider, radio, label binding) | HTML `<input>` + event handlers |
| R7: Display fisika real-time, pesan overload | `updateDisplay()`, `#overloadBanner` |
| R8: Responsivitas mobile, touch target, tipografi | CSS Grid, media queries, `min-height: 44px` |
