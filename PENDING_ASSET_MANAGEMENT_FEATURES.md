# Asset Management Endpoint Reference

Dokumen ini berisi endpoint Asset Management untuk backend Calon Mantu, termasuk parameter, request body, dan bentuk response yang digunakan.

Scope Asset Management pada project ini adalah **stok barang/bahan kafe**, bukan aset tetap seperti mesin kopi, kursi, meja, atau peralatan operasional.

## Response Standard

Response JSON umum:

```json
{
  "status": "sukses",
  "message": "ok",
  "data": {}
}
```

Response error validasi Laravel tetap memakai format validation error Laravel dengan HTTP `422`.

Response error proses bisnis:

```json
{
  "status": "gagal",
  "message": "pesan error",
  "data": null
}
```

## 1. Recipe Management CRUD

Status: tersedia

### `GET /api/recipes`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | no | Filter recipe berdasarkan menu/produk utama. |
| `ingredient_id` | integer | no | Filter recipe berdasarkan bahan. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`:

```json
{
  "status": "sukses",
  "message": "ok",
  "data": {
    "data": [
      {
        "id": 1,
        "product_id": 1,
        "ingredient_id": 2,
        "quantity_needed": "18.00",
        "unit": "gram"
      }
    ]
  }
}
```

### `POST /api/recipes`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | yes | ID produk/menu. |
| `ingredient_id` | integer | yes | ID bahan baku. |
| `quantity_needed` | number | yes | Jumlah bahan yang dibutuhkan. |
| `unit` | string | yes | Satuan bahan. |

Example:

```json
{
  "product_id": 1,
  "ingredient_id": 2,
  "quantity_needed": 18,
  "unit": "gram"
}
```

Response `201`: data recipe yang dibuat.

### `GET /api/recipes/{id}`

Path parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | yes | ID recipe. |

Response `200`: detail recipe.

### `PUT /api/recipes/{id}` / `PATCH /api/recipes/{id}`

Path parameter: `id`.

Request body sama seperti create recipe.

Response `200`: data recipe setelah update.

### `DELETE /api/recipes/{id}`

Path parameter: `id`.

Response `200`:

```json
{
  "status": "sukses",
  "message": "deleted",
  "data": null
}
```

### `GET /api/products/{product}/recipes`

Path parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product` | integer | yes | ID produk/menu. |

Response `200`: daftar recipe untuk produk tersebut.

## 2. Low Stock Alert

Status: tersedia

### `GET /api/stock-alerts`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `category_id` | integer | no | Filter berdasarkan kategori produk. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination produk dengan `current_stock < minimum_stock`.

### `GET /api/stock-alerts/summary`

Response `200`:

```json
{
  "status": "sukses",
  "message": "ok",
  "data": {
    "low_stock_count": 5,
    "out_of_stock_count": 2
  }
}
```

## 3. Stock Card / Kartu Stok Per Produk

Status: tersedia

### `GET /api/products/{product}/stock-card`

Path parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product` | integer | yes | ID produk. |

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `from_date` | date | no | Tanggal awal transaksi. |
| `to_date` | date | no | Tanggal akhir transaksi. |
| `transaction_type` | string | no | `in`, `out`, atau `adjustment`. |
| `reference_type` | string | no | Contoh: `purchase`, `sale`, `adjustment`. |

Response `200`:

```json
{
  "status": "sukses",
  "message": "ok",
  "data": {
    "product": {},
    "transactions": [
      {
        "id": 1,
        "transaction_type": "in",
        "quantity": "10.00",
        "reference_type": "purchase",
        "reference_id": 1,
        "running_balance": 10
      }
    ]
  }
}
```

## 4. Stock Transactions

Status: tersedia dengan filter tambahan

### `GET /api/stock-transactions`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | no | Filter produk. |
| `category_id` | integer | no | Filter kategori produk. |
| `employee_id` | integer | no | Filter operator/employee. |
| `transaction_type` | string | no | `in`, `out`, atau `adjustment`. |
| `reference_type` | string | no | `purchase`, `sale`, `adjustment`, dan lain-lain. |
| `from_date` | date | no | Tanggal awal transaksi. |
| `to_date` | date | no | Tanggal akhir transaksi. |
| `search` | string | no | Cari berdasarkan nama produk atau SKU. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination stock transaction dengan relasi `product` dan `employee`.

### `POST /api/stock-transactions`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | yes | ID produk. |
| `transaction_type` | string | yes | `in`, `out`, atau `adjustment`. |
| `quantity` | number | yes | Jumlah stok. |
| `reference_type` | string | yes | `purchase`, `sale`, atau `adjustment`. |
| `reference_id` | integer | no | ID referensi. |
| `employee_id` | integer | no | ID employee/operator. |
| `notes` | string | no | Catatan transaksi. |
| `transaction_date` | datetime | no | Tanggal transaksi. |

Response `201`: data stock transaction yang dibuat.

## 5. Stock Opname

Status: tersedia

### `GET /api/stock-opnames`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | no | Filter status opname. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination stock opname dengan items.

### `POST /api/stock-opnames`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `employee_id` | integer | no | Employee pembuat opname. |
| `opname_date` | date | yes | Tanggal opname. |
| `notes` | string | no | Catatan opname. |

Response `201`: data stock opname baru dengan status awal `draft`.

### `GET /api/stock-opnames/{id}`

Path parameter: `id` stock opname.

Response `200`: detail stock opname dengan items.

### `POST /api/stock-opnames/{id}/items`

Path parameter: `id` stock opname.

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | yes | ID produk yang dihitung. |
| `physical_stock` | number | yes | Stok fisik hasil hitung. |
| `notes` | string | no | Catatan item opname. |

Response `200`: data item opname. Field `system_stock` dan `difference` dihitung otomatis.

Response `422` jika opname bukan `draft`:

```json
{
  "status": "gagal",
  "message": "opname bukan draft",
  "data": null
}
```

### `POST /api/stock-opnames/{id}/submit`

Path parameter: `id` stock opname.

Request body: tidak ada.

Response `200`: status opname menjadi `submitted`.

### `POST /api/stock-opnames/{id}/approve`

Path parameter: `id` stock opname.

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `approved_by` | integer | no | Employee yang approve. |

Response `200`: status opname menjadi `approved`. Sistem membuat `stock_transactions` untuk item yang memiliki selisih.

## 6. Approval Stock Adjustment

Status: tersedia

### `GET /api/stock-adjustments`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | no | Filter status adjustment, contoh `pending`, `approved`, `rejected`. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination stock adjustment.

### `POST /api/stock-adjustments`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | yes | ID produk. |
| `quantity` | number | yes | Jumlah adjustment. |
| `adjustment_type` | string | yes | `increase` atau `decrease`. |
| `requested_by` | integer | no | Employee yang request. |
| `reason` | string | no | Alasan adjustment. |

Response `201`: data stock adjustment dengan status awal `pending`.

### `POST /api/stock-adjustments/{id}/approve`

Path parameter: `id` stock adjustment.

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `approved_by` | integer | no | Employee yang approve. |
| `approval_notes` | string | no | Catatan approval. |

Response `200`: adjustment menjadi `approved` dan sistem membuat `stock_transactions`.

Response `422` jika adjustment tidak pending:

```json
{
  "status": "gagal",
  "message": "adjustment tidak pending",
  "data": null
}
```

### `POST /api/stock-adjustments/{id}/reject`

Path parameter: `id` stock adjustment.

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `approved_by` | integer | no | Employee yang reject. |
| `approval_notes` | string | no | Catatan rejection. |

Response `200`: adjustment menjadi `rejected`.

## 7. Supplier Management

Status: tersedia

### `GET /api/suppliers`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | no | `active` atau `inactive`. |
| `search` | string | no | Cari berdasarkan nama supplier. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination supplier.

### `POST /api/suppliers`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `supplier_name` | string | yes | Nama supplier. |
| `contact_name` | string | no | Nama kontak. |
| `phone` | string | no | Nomor telepon. |
| `email` | string | no | Email supplier. |
| `address` | string | no | Alamat supplier. |
| `status` | string | no | `active` atau `inactive`. |

Response `201`: data supplier baru.

### `GET /api/suppliers/{id}`

Path parameter: `id` supplier.

Response `200`: detail supplier.

### `PUT /api/suppliers/{id}` / `PATCH /api/suppliers/{id}`

Path parameter: `id` supplier.

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `supplier_name` | string | yes | Nama supplier. |
| `contact_name` | string | no | Nama kontak. |
| `phone` | string | no | Nomor telepon. |
| `email` | string | no | Email supplier. |
| `address` | string | no | Alamat supplier. |
| `status` | string | yes | `active` atau `inactive`. |

Response `200`: data supplier setelah update.

### `DELETE /api/suppliers/{id}`

Path parameter: `id` supplier.

Response `200`:

```json
{
  "status": "sukses",
  "message": "deleted",
  "data": null
}
```

## 8. Purchase Order / Pembelian Stok

Status: tersedia

### `GET /api/purchase-orders`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | no | `draft`, `ordered`, `received`, atau `cancelled`. |
| `supplier_id` | integer | no | Filter supplier. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination purchase order dengan items.

### `POST /api/purchase-orders`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `supplier_id` | integer | no | ID supplier. |
| `employee_id` | integer | no | Employee pembuat PO. |
| `order_date` | date | yes | Tanggal PO. |
| `notes` | string | no | Catatan PO. |
| `items` | array | yes | Daftar item PO, minimal 1 item. |
| `items.*.product_id` | integer | yes | ID produk. |
| `items.*.quantity` | number | yes | Jumlah pembelian. |
| `items.*.unit_cost` | number | no | Harga satuan. |
| `items.*.notes` | string | no | Catatan item. |

Example:

```json
{
  "supplier_id": 1,
  "employee_id": 1,
  "order_date": "2026-07-18",
  "notes": "Restock mingguan",
  "items": [
    {
      "product_id": 2,
      "quantity": 10,
      "unit_cost": 25000,
      "notes": "Coffee beans"
    }
  ]
}
```

Response `201`: data purchase order baru dengan `po_number`, `total_amount`, dan items.

### `GET /api/purchase-orders/{id}`

Path parameter: `id` purchase order.

Response `200`: detail purchase order dengan items.

### `PUT /api/purchase-orders/{id}` / `PATCH /api/purchase-orders/{id}`

Path parameter: `id` purchase order.

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `supplier_id` | integer | no | ID supplier. |
| `employee_id` | integer | no | ID employee. |
| `order_date` | date | yes | Tanggal PO. |
| `status` | string | yes | `draft`, `ordered`, atau `cancelled`. |
| `notes` | string | no | Catatan PO. |

Response `200`: data purchase order setelah update.

Response `422` jika PO sudah `received`:

```json
{
  "status": "gagal",
  "message": "purchase order sudah received",
  "data": null
}
```

### `POST /api/purchase-orders/{id}/receive`

Path parameter: `id` purchase order.

Request body: tidak ada.

Response `200`: status PO menjadi `received`, `received_date` terisi, dan sistem membuat stock transaction `in` untuk setiap item.

### `POST /api/purchase-orders/{id}/cancel`

Path parameter: `id` purchase order.

Request body: tidak ada.

Response `200`: status PO menjadi `cancelled`.

## 9. Export Stock Report

Status: tersedia untuk CSV

### `GET /api/stock-report/export`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `category_id` | integer | no | Filter kategori. |
| `product_id` | integer | no | Filter produk. |
| `low_stock_only` | boolean | no | Jika true, hanya produk low stock. |
| `search` | string | no | Cari berdasarkan nama produk atau SKU. |

Response `200`: file download `stock-report.csv`.

Catatan: `format=xlsx` belum tersedia. Endpoint saat ini selalu menghasilkan CSV.

## 10. Filter Stock Report

Status: tersedia

### `GET /api/stock-report`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `category_id` | integer | no | Filter kategori. |
| `product_id` | integer | no | Filter produk. |
| `low_stock_only` | boolean | no | Jika true, hanya produk low stock. |
| `search` | string | no | Cari berdasarkan nama produk atau SKU. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination data dari view `stock_report`.

## 11. Restore Soft Deleted Product

Status: tersedia

### `GET /api/products/deleted`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination produk yang sudah soft deleted.

### `POST /api/products/{id}/restore`

Path parameter: `id` produk yang soft deleted.

Response `200`:

```json
{
  "status": "sukses",
  "message": "restored",
  "data": {}
}
```

### `DELETE /api/products/{id}/force`

Path parameter: `id` produk yang soft deleted.

Response `200`:

```json
{
  "status": "sukses",
  "message": "force deleted",
  "data": null
}
```

## 12. Batch / Lot / Expired Date Tracking

Status: tersedia sebagian

### `GET /api/product-batches`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | no | Filter batch berdasarkan produk. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination product batch.

### `POST /api/product-batches`

Request body:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `product_id` | integer | yes | ID produk. |
| `batch_number` | string | yes | Nomor batch/lot. |
| `expired_date` | date | no | Tanggal kedaluwarsa. |
| `quantity` | number | yes | Jumlah stok pada batch. |
| `received_date` | date | no | Tanggal diterima. |
| `notes` | string | no | Catatan batch. |

Response `201`: data product batch baru.

### `GET /api/product-batches/expiring-soon`

Query parameter:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `days` | integer | no | Batas hari menuju expired, default `30`. |
| `per_page` | integer | no | Jumlah data per halaman, default `15`. |

Response `200`: pagination batch dengan `expired_date <= now + days`.

Catatan: FEFO/FIFO stock deduction belum tersedia.

## 13. Dashboard Asset Summary

Status: tersedia

### `GET /api/assets/summary`

Response `200`:

```json
{
  "status": "sukses",
  "message": "ok",
  "data": {
    "active_products": 10,
    "low_stock_items": 2,
    "stock_value": "1500000.00",
    "today_transactions": 4
  }
}
```

### `GET /api/assets/low-stock-summary`

Response `200`: list produk dengan `current_stock < minimum_stock`.

### `GET /api/assets/stock-movement-summary`

Response `200`: agregasi total quantity per `product_id` dan `transaction_type`.

## 14. Role Access Untuk Asset Management

Status: belum tersedia

Endpoint asset management belum dibatasi berdasarkan role.

Rule yang disarankan:

| Role | Access |
| --- | --- |
| Operator | Lihat produk, stok, dan stock report. |
| Supervisor | Tambah transaksi stok, adjustment, opname. |
| Admin | Full access master data, kategori, produk, supplier, purchase order. |

Yang perlu dikerjakan:

- Middleware role.
- Policy atau gate.
- Mapping role final antara frontend dan backend.

## 15. Audit Trail Master Data

Status: tabel dan model tersedia, endpoint belum tersedia

Data audit yang disarankan:

| Name | Type | Description |
| --- | --- | --- |
| `user_id` | integer | User yang melakukan aksi. |
| `employee_id` | integer | Employee terkait jika ada. |
| `action` | string | Aksi, contoh `create`, `update`, `delete`. |
| `entity_type` | string | Nama entity yang berubah. |
| `entity_id` | integer | ID entity yang berubah. |
| `old_values` | json | Data sebelum perubahan. |
| `new_values` | json | Data sesudah perubahan. |

Endpoint yang belum tersedia:

- `GET /api/audit-trails`
- `GET /api/audit-trails/{id}`

## Prioritas Lanjutan

Prioritas 1:

- Tambahkan role middleware/policy untuk endpoint asset.
- Sinkronkan role backend dan frontend.
- Tambahkan test feature untuk workflow PO, opname, dan adjustment.

Prioritas 2:

- Tambahkan export XLSX jika dibutuhkan.
- Tambahkan endpoint audit trail.
- Tambahkan CRUD lengkap untuk product batch jika dibutuhkan.

Prioritas 3:

- Implement FEFO/FIFO untuk batch yang memiliki expired date.
- Tambahkan notifikasi low stock/expired stock.
