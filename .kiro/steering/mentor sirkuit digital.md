---
inclusion: always
---
<!------------------------------------------------------------------------------------
   # Steering: Simulator Sirkuit Digital (Sains & Kelistrikan SD)

   ## 1. Standar Arsitektur & Aturan Utama (Tech Stack)
   - **Batasan Teknologi:** Proyek wajib dibangun menggunakan Vanilla HTML5, CSS3, dan JavaScript (ES6+) murni. Dilarang keras menggunakan pustaka pihak ketiga, NPM packages, kerangka kerja (React/Vue), atau CDN eksternal (seperti p5.js atau Tailwind).
   - **Mesin Grafis (Graphics Engine):** Seluruh visualisasi tata letak sirkuit, kabel, baterai, sakelar, sakelar seri/paralel, dan visual aliran partikel elektron wajib digambar langsung di dalam array piksel elemen **HTML5 Canvas API**.
   - **Mesin Animasi (Physics Game Loop):** Pembaruan animasi fisika wajib menggunakan siklus asinkron **`window.requestAnimationFrame()`**. Penggunaan `setInterval()` atau `setTimeout()` untuk kalkulasi loop animasi fisika dilarang keras guna mencegah penumpukan antrean memori (*memory leak*) dan penyumbatan utas utama peramban.

   ## 2. Logika Matematika & Hukum Fisika (Under the Hood)
   - **Eksekusi Hukum Ohm & Daya:** Mesin logika harus menghitung nilai sirkuit secara waktu nyata menggunakan rumus $I = V/R$ dan $P = V \cdot I$.
   - **Aturan Rangkaian Seri:** Ketika bertipe Seri, hitung total tegangan dengan $V_{\text{total}} = \sum V$ dan total hambatan dengan $R_{\text{total}} = \sum R$. Arus ($I$) mengalir sama besar di setiap komponen.
   - **Aturan Rangkaian Paralel:** Ketika bertipe Paralel, tegangan tiap cabang konstan mengikuti baterai tunggal ($V_{\text{total}} = V_{\text{baterai}}$), sedangkan hambatan total dihitung secara resiprokal dengan $\frac{1}{R_{\text{total}}} = \sum \frac{1}{R}$.
   - **Penanganan Kelebihan Beban (Overload):** Bandingkan Daya Aktual ($P_{\text{aktual}} = V^2/R$) dengan daya nominal lampu ($5\text{W}, 10\text{W}, 25\text{W}$). Jika Daya Aktual melebihi 1.3x daya nominal, picu status kegagalan sirkuit secara instan: putus aliran listrik ($I = 0$), render animasi kawat putus, dan munculkan efek partikel ledakan komposit kecil pada Canvas.

   ## 3. Optimalisasi Antarmuka & Layar Sentuh Seluler (UI/UX)
   - **Target Klik Sensitif (Hitbox Bounding):** Karena target pengguna adalah anak SD, perluas area klik fungsional dengan mengikat elemen input parameter sirkuit murni menggunakan teknik DOM Data-Binding (pasangkan atribut `for` pada tag `<label>` dengan atribut `id` pada tag `<input>`). Menyentuh teks label harus otomatis mengaktifkan input terkait.
   - **Anti-Horizontal Scroll & Viewport Locking:** Wajib menyuntikkan protokol `<meta name="viewport" content="width=device-width, initial-scale=1.0">` pada komponen `<head>`. 
   - **Fluiditas Tata Letak:** Gunakan arsitektur **CSS Grid** atau **Flexbox** dengan unit dimensi relatif (`width: 100%`). Tata letak harus beradaptasi mulus dari mode *portrait* ke *landscape* tanpa memicu batang geser horizontal (*horizontal scrollbar*) pada peramban ponsel selebar 360px.

   ## 4. Pola Pengkodean (Preferred Patterns vs Anti-Patterns)
   - **Pola yang Direkomendasikan (Preferred):** Pertahankan struktur data objek komponen sirkuit agar tetap statis di memori runtime (*monomorphic structures*) untuk mengoptimalkan mekanisme cache internal milik Kompilator JIT (Just-In-Time) pada peramban (V8 Engine).
   - **Anti-Pola yang Harus Dihindari (Anti-Patterns):** Dilarang memodifikasi properti geometri layout kaku dokumen HTML (seperti menginjeksi urutan `.style.left` atau `.style.width` secara sekuensial) di dalam loop fungsi animasi untuk menghindari bencana penurunan performa akibat badai proses *Layout Reflow* dan *Repaint* pada mesin peramban.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 