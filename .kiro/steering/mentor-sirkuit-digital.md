---
inclusion: always
---
<!------------------------------------------------------------------------------------
  ## 1. Aturan Utama Arsitektur & Stack Teknologi
- **Batasan Dependensi:** Aplikasi wajib dibangun murni menggunakan Vanilla HTML5 Semantik, CSS3, dan JavaScript (ES6+) murni. Dilarang menggunakan kerangka kerja (React, Vue), utility CSS (Tailwind), maupun pustaka animasi luar (p5.js).
- **Struktur Direktori Mutlak:** AI Agent wajib mematuhi dan mengorganisasikan kode ke dalam struktur folder berikut:
├── index.html        (Struktur semantik HTML5)
├── css/
│   └── style.css     (Sistem tata letak responsif terisolasi)
└── js/
└── sirkuit.js    (Logika hukum fisika dan loop grafik Canvas)


## 2. Logika Mesin Fisika & Struktur Memori (Under the Hood)
- **Eksekusi Hukum Listrik:** Terapkan kalkulasi Hukum Ohm ($I = V/R$) dan Hukum Daya ($P = V \cdot I$) menggunakan fungsi murni (*pure functions*).
- **Stabilitas Struktur Objek (Monomorphic State):** Jaga agar skema data objek untuk komponen sirkuit (Baterai, Lampu, Kabel) tetap statis di memori runtime. Gunakan properti tetap untuk mengoptimalkan mekanisme *Inline Cache* pada Kompilator JIT (Just-In-Time) peramban (V8 Engine).
- **Logika Rangkaian Seri:** Jumlahkan total voltase ($V_{\text{total}} = \sum V$) dan hambatan ($R_{\text{total}} = \sum R$) secara linear.
- **Logika Rangkaian Paralel:** Hitung hambatan secara resiprokal ($\frac{1}{R_{\text{total}}} = \sum \frac{1}{R}$), dengan voltase cabang konstan terhadap baterai tunggal.
- **Penanganan Status Kegagalan (Overload):** Bandingkan daya aktual ($P_{\text{aktual}} = V^2/R$) dengan daya nominal lampu ($5\text{W}, 10\text{W}, 25\text{W}$). Jika $P_{\text{aktual}} > P_{\text{nominal}} \times 1.3$, picu status OVERLOAD: hentikan sirkuit ($I = 0$), dan jalankan generator partikel vektor ledakan komposit pada kanvas.

## 3. Sistem Grafis & Rendering Pipeline
- **Isolasi Node Rendering:** Seluruh komponen visual sirkuit (sakelar, arah gerak elektron, pijar lampu) wajib digambar langsung pada elemen **HTML5 `<canvas>`**. Dilarang melakukan animasi dengan memanipulasi properti gaya inline CSS DOM secara berulang.
- **Sinkronisasi Siklus Frame:** Jalankan loop animasi partikel elektron menggunakan **`window.requestAnimationFrame()`** untuk melimpahkan komputasi grafis ke Akselerasi Perangkat Keras (GPU), menjaga performa konstan pada kecepatan mulus 60 FPS.

## 4. Antarmuka Pengguna & Responsivitas Mobile (UI/UX)
- **Batas Kotak Relatif (Fluid Layout Engine):** Gunakan spesifikasi CSS Grid atau Flexbox dengan unit dimensi relatif (`width: 100%`, `max-width`). Wajib menyertakan `<meta name="viewport" content="width=device-width, initial-scale=1.0">` pada header HTML untuk mengunci area pandang seluler. Layout tidak boleh memicu *horizontal scrollbar* pada layar ponsel selebar 360px.
- **Perluasan Hitbox Ramah Anak:** Setiap elemen kontrol input variabel (*range slider* atau tombol radio) wajib dibungkus secara logika menggunakan teknik *DOM Data-Binding*, yaitu mencocokkan atribut `for` pada tag `<label>` dengan atribut `id` pada tag `<input>` secara identik untuk memperluas area sensitif klik pada layar sentuh.

## 5. Protokol Output & Generasi Kode (Code Generation Code)
- **Larangan Komentar Mutlak:** Dilarang keras menuliskan karakter penanda komentar dalam bentuk apa pun pada semua file koding. Aturan ini mencakup larangan penggunaan inline comment `//`, block comment `/* */` pada file JavaScript, komentar CSS `/* */`, and komentar HTML ``.
- **Larangan Emoticon & Emoji Bersih:** Dilarang keras menyisipkan karakter emoji, emoticon, atau simbol Unicode non-alfanumerik grafis (seperti 🚀, 💥, 💡, ⚡) di seluruh file koding (`index.html`, `style.css`, `js/sirkuit.js`). Aturan ini berlaku mutlak untuk teks strings, elemen UI HTML, ID, nama variabel, nama fungsi, nilai teks Canvas (`fillText`), maupun log konsol. 
- **Substitusi UI Anak:** Gunakan pendekatan visual murni berbasis manipulasi warna CSS/Canvas (seperti kilatan warna kuning cerah untuk lampu menyala atau partikel pecahan lingkaran merah untuk kondisi overload) untuk menarik perhatian siswa SD, tanpa melibatkan karakter emoji teks.
- **Gaya Penulisan:** Seluruh kejelasan alur logika program wajib direpresentasikan melalui teknik *Self-Documenting Code* (menggunakan penamaan variabel, kelas, dan fungsi yang deskriptif dan ekspresif).
- **Kesiapan Produksi:** Setiap blok kode HTML, CSS, dan JavaScript yang disajikan harus ditulis secara utuh, lengkap, bebas kesalahan sintaksis, dan langsung siap dikompresi ke format berkas .ZIP.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 