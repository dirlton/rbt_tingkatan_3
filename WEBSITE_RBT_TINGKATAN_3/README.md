# Ruang Cipta — Portal Pembelajaran RBT Tingkatan 3

Portal pembelajaran statik berbahasa Melayu untuk RBT Tingkatan 3. Kandungan disusun mengikut tiga standard kandungan dan Standard Pembelajaran dalam DSKP KSSM RBT Tingkatan 3.

## Kandungan

- Tiga modul dengan 24 subtopik, nota ringkas, aktiviti bercatatan setempat dan evidens pembelajaran.
- 72 soalan latihan, tiga soalan bagi setiap Standard Pembelajaran, dengan format aneka pilihan, betul/salah dan aplikasi/analisis.
- Cabaran modul dan cabaran keseluruhan yang mengambil sampel soalan secara rawak.
- Pemarkahan automatik, rekod percubaan, jawapan dan penerangan selepas penghantaran.
- Dashboard, penanda penyelesaian subtopik, mata dan lencana.
- Reka bentuk responsif, navigasi papan kekunci dan label kawalan yang jelas.

## Menjalankan portal

Fail JSON dimuatkan menggunakan `fetch`, jadi buka portal melalui pelayan web setempat (bukan dengan membuka `index.html` terus sebagai fail).

1. Buka terminal pada folder ini.
2. Jalankan `python -m http.server 8000`.
3. Buka `http://localhost:8000` dalam pelayar.

Untuk menerbitkan ke GitHub Pages, muat naik kandungan folder ini ke repositori dan pilih sumber penerbitan GitHub Pages yang dikehendaki dalam tetapan repositori. Semua pautan menggunakan laluan relatif.

## Penyimpanan dan ganjaran

Kemajuan dan catatan aktiviti disimpan dalam `localStorage` pada pelayar dan peranti yang digunakan. Data tidak disegerakkan ke peranti lain. Jangan masukkan maklumat sensitif. Fungsi reset pada dashboard memadam kemajuan setempat selepas pengesahan.

Mata hanya diberi sekali apabila subtopik ditandakan selesai dan sekali bagi kuiz pertama dalam setiap set. Percubaan seterusnya tetap direkodkan tetapi tidak mengulang ganjaran penyelesaian set yang sama.

## Asas kurikulum dan semakan guru

Kod SP, objektif dan pernyataan Standard Prestasi dipadankan dengan DSKP KSSM RBT Tingkatan 3 yang dibekalkan. Kuiz ialah latihan kendiri, bukan penetapan Tahap Penguasaan rasmi. Guru perlu menilai evidens hasil kerja murid secara menyeluruh.

Buku teks PDF yang dibekalkan tidak mempunyai lapisan teks yang boleh diekstrak secara automatik. Oleh itu, portal ini menggunakan pemetaan DSKP yang dapat disahkan; contoh atau maklumat tambahan yang tidak disahkan pada halaman buku teks ditandakan untuk semakan guru sebelum penerbitan sebagai bahan rasmi.

## Fail utama

- `data/modules.json` — standard, subtopik, nota, aktiviti, evidens dan soalan.
- `data/assessments.json` — set dan arahan kuiz.
- `js/quiz-engine.js` — pemilihan, rawakan dan pemarkahan.
- `js/storage.js` — kemajuan dan rekod percubaan dalam pelayar.
- `js/app.js` — navigasi dan paparan halaman.
