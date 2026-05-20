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
- **Isolasi Berkas Pengujian:** Dilarang keras menghasilkan file HTML atau JavaScript tambahan untuk keperluan testing (seperti *.test.js, *.spec.js, test.html). Seluruh arsitektur proyek wajib terkunci pada 3 berkas utama: index.html, css/style.css, dan js/sirkuit.js.
- **Batasan Hak Akses Terminal:** Agen AI dilarang keras mengeksekusi perintah terminal atau CLI dalam bentuk apa pun (termasuk perintah bash, sh, npm install, touch, git, atau npx). Seluruh instruksi harus diselesaikan murni melalui pembaruan kode sumber di dalam editor.

## 6. Hardened Rate-Limit Guardrails & Token Footprint Control
- **Zero-Overhead Reasoning:** The AI Agent is strictly forbidden from outputting conversational chatter, long explanations, or verbose inner thoughts before generating code. Go straight to the code block execution to minimize output token consumption.
- **Strict Single-File Context Isolation:** When executing tasks inside `js/sirkuit.js`, the AI MUST NOT issue automated tool calls to read `index.html` or `css/style.css` unless explicitly commanded by the human engineer. Keep the context window bounded strictly to the file being edited.
- **Atomic Modification (No Rewrite Storms):** To save TPM (Tokens Per Minute), do not rewrite the entire 500+ lines of code if you only need to modify a single function. Output only the targeted function or use localized search-and-replace patches, while ensuring no code is truncated within that specific targeted function.
- **One-Shot Tool Call Restriction:** Prevent inner reflection storms. The AI must compute the physics formulas and canvas draw paths entirely in memory before executing a write action. Multi-turn inner loops or self-correction call chaining within a single prompt turn are strictly prohibited to avoid hitting RPM limits.
- **Repetitive Indexing Denial:** Do not execute blanket directory scans, regex file searching (`grep`), or read architectural documents (`design.md`, `requirements.md`) repetitively once they have been loaded into the session cache.

## 7. Aturan Fungsional Fitur Sakelar & Interaksi Komponen
- **State Sirkuit Terbuka:** Implementasikan variabel status `isSakelarTertutup` dan `isKabelPutus` sebagai kontrol mutlak atas jalannya arus listrik. Jika salah satu bernilai tidak aktif, paksa nilai arus global menjadi nol secara instan.
- **Logika Mutasi Rangkaian Seri vs Paralel:** Logika pencabutan komponen wajib merefleksikan karakteristik fisik asli sirkuit. Pada rangkaian seri, satu komponen dicabut harus memutuskan seluruh sirkuit. Pada rangkaian paralel, komponen dicabut hanya mematikan cabang terkait melalui penyesuaian resiprokal hambatan aktif.
- **UI Update via textContent:** Teks penjelasan status (Overload, Normal, Redup, Sirkuit Terbuka) wajib disuntikkan ke elemen HTML menggunakan properti `textContent` terisolasi untuk menghindari bencana penurunan performa akibat Layout Thrashing pada mesin peramban.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 