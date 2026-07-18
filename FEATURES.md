# Daftar Fitur Frontend POS

Dokumen ini merangkum fitur yang sudah terimplementasi pada frontend `fe-cm` berdasarkan halaman, route, dan integrasi API yang tersedia di kode.

## Ringkasan Aplikasi

Frontend ini adalah aplikasi POS berbasis React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, dan Axios.

Modul utama yang tersedia:

- Dashboard admin
- POS kasir
- Manajemen order
- Manajemen produk
- Manajemen kategori
- Manajemen stok
- Manajemen karyawan
- Halaman order pelanggan berbasis QR
- Auth, token, dan role access

## Route Yang Tersedia

| Route | Halaman | Keterangan |
| --- | --- | --- |
| `/` | Dashboard | Ringkasan operasional admin |
| `/pos` | POS Kasir | Order kasir dan keranjang transaksi |
| `/orders` | Orders | Monitoring dan update status order |
| `/products` | Products | CRUD produk |
| `/categories` | Categories | CRUD kategori |
| `/stock` | Stock | Laporan dan transaksi stok |
| `/employees` | Employees | CRUD karyawan |
| `/u` | User Order | Order pelanggan tanpa QR di URL, QR bisa diinput manual |
| `/u/:qrCode` | User Order | Order pelanggan berdasarkan QR meja |
| `/order` | User Order | Alias halaman order pelanggan |
| `/order/:qrCode` | User Order | Alias order pelanggan berdasarkan QR meja |
| `/unauthorized` | Unauthorized | Halaman akses tidak tersedia |
| `/login` | Login | Saat ini diarahkan ke `/` karena auth guard dinonaktifkan |

## Dashboard Admin

Fitur yang tersedia:

- Menampilkan ringkasan jumlah order terbaru.
- Menampilkan jumlah produk aktif.
- Menampilkan jumlah produk low stock.
- Menghitung total paid sales dari order dengan status pembayaran `paid`.
- Menampilkan daftar order terakhir.
- Menampilkan daftar produk low stock.
- Mengambil data produk, order, dan laporan stok dari backend.

Endpoint yang digunakan:

- `GET /products`
- `GET /pos/orders`
- `GET /stock-report`

## POS Kasir

Fitur yang tersedia:

- Menampilkan menu produk untuk kasir.
- Pencarian produk atau SKU.
- Filter menu berdasarkan kategori.
- Tambah produk ke cart.
- Tambah dan kurangi quantity item.
- Hapus item dari cart.
- Tambah catatan per item.
- Pilih tipe order:
  - `dine_in_cashier`
  - `takeaway`
- Input nama customer.
- Input Table ID untuk order dine-in.
- Pilih metode pembayaran:
  - `cash`
  - `qris`
- Input diskon.
- Input nominal pembayaran untuk cash.
- Hitung subtotal.
- Hitung total setelah diskon.
- Hitung kembalian untuk pembayaran cash.
- Submit order kasir ke backend.
- Refresh data order, produk, dan stock report setelah order berhasil dibuat.

Endpoint yang digunakan:

- `GET /categories`
- `GET /pos/menu`
- `POST /pos/cashier-orders`

## Manajemen Orders

Fitur yang tersedia:

- Menampilkan daftar order.
- Filter order berdasarkan order status.
- Filter order berdasarkan payment status.
- Melihat detail order.
- Menampilkan item dalam order.
-  harga satuan, subtotal, dan catatan item.
- Update status order.

Status order yang bisa dipilih:

- `preparing`
- `ready`
- `completed`
- `cancelled`

Status pembayaran yang difilter:

- `pending`
- `paid`
- `cancelled`

Endpoint yang digunakan:

- `GET /pos/orders`
- `GET /pos/orders/:id`
- `PATCH /pos/orders/:id/status`

## Manajemen Produk

Fitur yang tersedia:

- Menampilkan daftar produk.
- Pencarian produk atau SKU.
- Tambah produk baru.
- Edit produk.
- Hapus produk.
- Menampilkan status produk aktif atau tidak aktif.
- Menampilkan stok produk.
- Menampilkan harga jual produk.
- Menghubungkan produk dengan kategori.

Field produk yang dikelola:

- Nama produk
- SKU
- Kategori
- Deskripsi
- Unit of measure
- Minimum stock
- Current stock
- Cost price
- Selling price
- Status aktif atau nonaktif

Endpoint yang digunakan:

- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `GET /categories`

## Manajemen Kategori

Fitur yang tersedia:

- Menampilkan daftar kategori.
- Tambah kategori baru.
- Edit kategori.
- Hapus kategori.
- Menampilkan deskripsi kategori.

Field kategori yang dikelola:

- Nama kategori
- Deskripsi

Endpoint yang digunakan:

- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`

## Manajemen Stok

Fitur yang tersedia:

- Menampilkan indikator produk low stock.
- Menampilkan stock report.
- Menampilkan riwayat transaksi stok.
- Tambah transaksi stok.
- Refresh data transaksi stok, stock report, dan produk setelah transaksi stok berhasil dibuat.

Tipe transaksi stok:

- `in`
- `out`
- `adjustment`

Reference type yang tersedia:

- `purchase`
- `sale`
- `adjustment`

Field transaksi stok yang dikelola:

- Produk
- Tipe transaksi
- Quantity
- Reference type
- Employee ID dari user login jika tersedia
- Catatan transaksi

Data stock report yang ditampilkan:

- Nama produk
- Total stock in
- Total stock out
- Current stock
- Last transaction date

Endpoint yang digunakan:

- `GET /products`
- `GET /stock-transactions`
- `POST /stock-transactions`
- `GET /stock-report`

## Manajemen Karyawan

Fitur yang tersedia:

- Menampilkan daftar karyawan.
- Tambah karyawan.
- Edit karyawan.
- Hapus karyawan.
- Mengatur role karyawan.
- Mengatur status karyawan.
- Input password saat membuat karyawan.
- Input password baru opsional saat edit karyawan.

Role yang tersedia:

- Admin
- Kasir
- User

Status yang tersedia:

- Active
- Inactive

Field karyawan yang dikelola:

- Nama lengkap
- Email
- Role
- Status
- Password

Endpoint yang digunakan:

- `GET /employees`
- `POST /employees`
- `PUT /employees/:id`
- `DELETE /employees/:id`

## Order Pelanggan Berbasis QR

Fitur yang tersedia:

- Halaman publik untuk pelanggan.
- Order berdasarkan QR meja dari URL.
- Order dengan input QR meja manual jika QR tidak tersedia di URL.
- Menampilkan informasi meja.
- Menampilkan menu pelanggan.
- Pencarian menu.
- Filter menu berdasarkan kategori.
- Menampilkan stok menu.
- Menonaktifkan tombol tambah jika stok habis.
- Tambah produk ke cart.
- Tambah dan kurangi quantity.
- Hapus item dari cart.
- Input nama pemesan.
- Catatan item.
- Quick notes untuk catatan cepat.
- Submit order QR ke backend.
- Menampilkan konfirmasi order berhasil dikirim.
- Menampilkan nomor order, status order, dan total pembayaran QRIS.
- Layout responsif desktop dan mobile.

Quick notes yang tersedia:

- Level 0
- Level 1
- Level 2
- Level 3
- Level 4
- Level 5
- Tanpa bawang
- Extra pangsit
- Es sedikit

Endpoint yang digunakan:

- `GET /categories`
- `GET /pos/menu`
- `GET /pos/tables/:qrCode/menu`
- `POST /pos/qr-orders`

## Auth, Token, Dan Role Access

Fitur yang tersedia di kode:

- Login menggunakan username dan password.
- Logout.
- Penyimpanan token di `localStorage` dengan key `pos_token`.
- Penyimpanan data user di `localStorage` dengan key `pos_user`.
- Axios request interceptor untuk mengirim `Authorization: Bearer <token>`.
- Normalisasi role user dari beberapa kemungkinan format response backend.
- Role-based access helper.
- Redirect home berdasarkan role.

Role aplikasi:

- `admin`
- `kasir`
- `user`

Mapping home berdasarkan role:

- Admin: `/`
- Kasir: `/pos`
- User: `/u`

Endpoint yang digunakan:

- `POST /auth/login`
- `GET /me`
- `POST /auth/logout`

Catatan:

- Saat ini auth guard dinonaktifkan dengan `AUTH_GUARD_DISABLED = true` di routing dan layout.
- Karena guard dinonaktifkan, semua menu admin/kasir terlihat tanpa login.
- Route `/login` saat ini diarahkan ke `/`, sehingga halaman login sudah ada di kode tetapi tidak aktif sebagai flow utama aplikasi.

## Integrasi API

Base URL API diambil dari environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Jika environment variable tidak tersedia, default yang digunakan adalah:

```text
http://127.0.0.1:8000/api
```

Daftar endpoint yang sudah digunakan frontend:

- `POST /auth/login`
- `GET /me`
- `POST /auth/logout`
- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `GET /pos/menu`
- `GET /pos/tables/:qrCode/menu`
- `POST /pos/qr-orders`
- `POST /pos/cashier-orders`
- `GET /pos/orders`
- `GET /pos/orders/:id`
- `PATCH /pos/orders/:id/status`
- `GET /stock-transactions`
- `POST /stock-transactions`
- `GET /stock-report`
- `GET /employees`
- `POST /employees`
- `PUT /employees/:id`
- `DELETE /employees/:id`

## State UI Yang Sudah Ada

Komponen state yang digunakan di berbagai halaman:

- Loading state
- Error state
- Empty state
- Toast success
- Toast error

## Komponen UI Umum

Komponen UI reusable yang tersedia:

- Button
- Input
- Select
- Textarea
- Field
- Badge

## Catatan Status Implementasi

Fitur yang sudah terlihat lengkap secara frontend:

- Dashboard
- POS kasir
- Orders
- Products
- Categories
- Stock
- Employees
- User QR order
- API client dan error handling
- Token storage dan auth context

Fitur yang sudah ada tetapi belum aktif penuh dalam routing saat ini:

- Login page
- Protected route
- Role-based route guard

Alasannya karena `AUTH_GUARD_DISABLED` masih bernilai `true`.
