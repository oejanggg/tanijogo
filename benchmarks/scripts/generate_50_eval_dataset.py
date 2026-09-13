import os
import json
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter


OUTPUT_DIR = "assets/synthetic_dataset"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Data Pools for Indonesian Agriculture & Regional Trade
REGIONS = ["Garut", "Brebes", "Malang", "Banyuwangi", "Tabanan", "Medan", "Lembang", "Blitar", "Probolinggo", "Wonosobo"]

MERCHANTS_CLEAN = [
    "Pengepul Hasil Tani Pak Dadang", "Toko Tani Makmur", "UD Subur Jaya",
    "Koperasi Tani SukaTani", "Pengepul Bawang Pak Harto", "Toko Sarana Tani",
    "Gudang Hasil Panen Pak Slamet", "Kelompok Tani Harapan Bersama"
]

# MERCHANTS_UNRELATED = [
#     "Warung Makan Padang Sederhana", "Toko Elektronik Cahaya",
#     "Bengkel Motor Sinar Jaya", "Restoran Solaria Mall", "Minimarket Indomaret"
# ]

# FARM_ITEMS_POOL = [
#     ("Cabai Merah Keriting", "COGS", 32000, 45000),
#     ("Cabai Rawit Merah", "COGS", 40000, 65000),
#     ("Bawang Merah Grade A", "COGS", 25000, 38000),
#     ("Bawang Putih Honan", "COGS", 30000, 42000),
#     ("Jagung Pipil Kering", "COGS", 5000, 8500),
#     ("Gabah Kering Giling", "COGS", 6500, 8000),
#     ("Pupuk NPK Mutiara 16-16-16", "COGS", 750000, 900000),
#     ("Pupuk Urea Subsidil", "COGS", 130000, 180000),
#     ("Bibit Cabai F1 Hibrida", "COGS", 110000, 140000),
#     ("Fungisida & Insektisida", "COGS", 85000, 150000),
#     ("Upah Buruh Petik Panen", "OPEX", 90000, 120000),
#     ("Sewa Keranjang & Transport", "OPEX", 120000, 200000),
#     ("Solar Genset Irigasi", "OPEX", 10000, 15000),
#     ("Sewa Traktor Garap Lahan", "OPEX", 350000, 600000),
#     ("Pompa Air Alkon 3 Inch", "CAPEX", 2200000, 3500000),
#     ("Sprayer Hama Elektrik 16L", "CAPEX", 450000, 750000),
# ]

FARM_ITEMS_POOL = [
    # ==========================================
    # # SIKLUS TANAM PADI (Usia 100-115 Hari)
    # # ==========================================
    # # -- 1. Buka Lahan & Persiapan --
    # ("Sewa Traktor Roda 4 (Bajak & Garu)", "OPEX", 1500000, 2000000),
    # ("BBM Solar Traktor", "OPEX", 6800, 10000),
    # ("Upah Cangkul Perbaiki Pematang (Galengan)", "OPEX", 90000, 120000),
    # # -- 2. Pembibitan & Tanam --
    # ("Benih Padi Inpari 32 Bersertifikat", "COGS", 15000, 20000),
    # ("Upah Cabut Bibit (Naut)", "OPEX", 70000, 100000),
    # ("Upah Tanam Padi (Tandur) Borongan", "OPEX", 1200000, 1500000),
    # # -- 3. Perawatan (Pupuk & Obat) --
    # ("Pupuk Urea Bersubsidi (Pemupukan 1 & 2)", "COGS", 2250, 2600),
    # ("Pupuk NPK Phonska (Pemupukan 1 & 2)", "COGS", 2300, 2800),
    # ("Upah Matun (Cabut Rumput)", "OPEX", 75000, 100000),
    # ("Insektisida Regent 50 SC (Anti Wereng)", "COGS", 55000, 75000),
    # ("Fungisida Amistar Top (Pencegah Potong Leher)", "COGS", 120000, 150000),
    # ("Tagihan Listrik / Solar Pompa Air Air Irigasi", "OPEX", 250000, 400000),
    # # -- 4. Panen & Penjualan --
    # ("Karung Plastik Kosong 50kg", "OPEX", 2000, 3000),
    # ("Sewa Mesin Combine Harvester (Potong & Perontok)", "OPEX", 2000000, 3000000),
    # ("Ongkos Angkut (Ojek Gabah ke Jalan Raya)", "OPEX", 10000, 15000),
    # ("Nota Tengkulak: Jual GKP (Gabah Kering Panen)", "REVENUE", 6500, 7800),
    # # -- 5. Pembersihan Lahan --
    # ("Bakteri Dekomposer Jerami (EM4)", "COGS", 25000, 35000),
    # ("Upah Babat & Bakar Sisa Jerami", "OPEX", 90000, 120000),

    # # ==========================================
    # # SIKLUS TANAM JAGUNG (Usia 100-110 Hari)
    # # ==========================================
    # # -- 1. Buka Lahan --
    # ("Herbisida Gramoxone (Bakar Rumput Awal)", "COGS", 80000, 110000),
    # ("Sewa Traktor Rotary (Gembur Tanah)", "OPEX", 1200000, 1800000),
    # # -- 2. Pembibitan & Tanam --
    # ("Benih Jagung Hibrida BISI 18", "COGS", 110000, 140000),
    # ("Insektisida Perlakuan Benih (Gaucho)", "COGS", 35000, 50000),
    # ("Upah Tugal/Gejlok Tanam Jagung", "OPEX", 80000, 110000),
    # # -- 3. Perawatan --
    # ("Pupuk Urea (Fase Vegetatif)", "COGS", 2250, 2600),
    # ("Pupuk NPK Mutiara 16-16-16", "COGS", 15000, 19000),
    # ("Insektisida Prevathon (Basmi Ulat Grayak FAW)", "COGS", 135000, 160000),
    # ("Upah Semprot Pestisida (3x Aplikasi)", "OPEX", 85000, 120000),
    # ("Upah Dangir / Kocor Pupuk", "OPEX", 80000, 110000),
    # # -- 4. Panen & Penjualan --
    # ("Upah Petik & Kupas Jagung di Sawah", "OPEX", 90000, 120000),
    # ("Sewa Mesin Pemipil (Sheller) + Solar", "OPEX", 200, 350),
    # ("Karung Mesh / Waring Jagung", "OPEX", 3000, 4500),
    # ("Nota Pabrik: Jual Jagung Pipil Basah", "REVENUE", 4200, 5500),
    # # -- 5. Pembersihan Lahan --
    # ("Upah Tebas Batang / Tebon Jagung", "OPEX", 90000, 120000),
    # ("Penjualan Limbah Tebon Jagung (Pakan Ternak)", "REVENUE", 500000, 800000),

    # ==========================================
    # SIKLUS TANAM CABAI MERAH (Usia 150-180 Hari)
    # ==========================================
    # -- 1. Buka Lahan --
    ("Sewa Traktor & Pembuatan Bedengan", "OPEX", 2500000, 3500000),
    ("Kapur Pertanian (Dolomit) Netralisir pH", "COGS", 800, 1500),
    ("Pupuk Kandang Ayam Fermentasi", "COGS", 20000, 35000),
    ("Plastik Mulsa Hitam Perak", "COGS", 450000, 600000),
    ("Upah Pasang Mulsa & Lubangi", "OPEX", 90000, 120000),
    # -- 2. Pembibitan & Tanam --
    ("Benih Cabai Merah Hibrida (Kopay/Baja)", "COGS", 140000, 180000),
    ("Media Tanam Semai & Tray Semai", "COGS", 350000, 500000),
    ("Upah Pindah Tanam Bibit", "OPEX", 80000, 110000),
    ("Bambu Lanjaran (Ajir)", "CAPEX", 700, 1200),
    ("Tali Rafia (Ikat Tanaman ke Ajir)", "OPEX", 45000, 65000),
    # -- 3. Perawatan --
    ("Pupuk NPK Mutiara (Sistem Kocor)", "COGS", 15000, 19000),
    ("Pupuk Kalsium (Cegah Rontok Bunga)", "COGS", 25000, 40000),
    ("Fungisida Antracol (Cegah Patek/Antraknosa)", "COGS", 140000, 180000),
    ("Insektisida Curacron (Kutu/Thrips)", "COGS", 160000, 200000),
    ("Upah Pekerja Perawatan Rutin (Kocor/Semprot)", "OPEX", 90000, 130000),
    # -- 4. Panen --
    ("Upah Petik Cabai Panen Ke-1 s/d Ke-15", "OPEX", 3000, 5000),
    ("Karung Jaring Cabai", "OPEX", 2500, 4000),
    ("Nota Tengkulak: Jual Cabai Merah Keriting (Harga Rata-rata)", "REVENUE", 32000, 55000),
    # -- 5. Pembersihan Lahan --
    ("Upah Cabut Lanjaran (Bambu) & Simpan", "OPEX", 90000, 120000),
    ("Upah Bongkar Mulsa Plastik & Bakar Tanaman", "OPEX", 90000, 120000)
]


def generate_single_receipt(
    index: int,
    category_type: str,  # 'clean', 'unreadable', 'fraud', 'unrelated', 'mixed'
) -> dict:
    width, height = 650, 900
    
    # Background color variation
    if category_type == "unreadable":
        bg_color = (160, 155, 145)  # Heavy outdoor shadow/dark paper
    elif category_type == "fraud":
        bg_color = (235, 240, 245)  # Screen glare tint
    else:
        bg_color = (248, 246, 240)  # Standard receipt paper

    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    font_main = ImageFont.load_default()

    # Border frame
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(180, 175, 165), width=2)

    region = random.choice(REGIONS)
    
    if category_type == "unrelated":
        merchant = random.choice(MERCHANTS_UNRELATED)
        title = "NOTA PENJUALAN RETAIL"
    else:
        merchant = f"{random.choice(MERCHANTS_CLEAN)} ({region})"
        title = "NOTA TIMBANGAN & TRANSAKSI TANI"

    # Header
    draw.text((40, 40), f"=== {merchant.upper()} ===", font=font_main, fill=(20, 20, 20))
    draw.text((40, 65), f"DOKUMEN: {title}", font=font_main, fill=(80, 80, 80))
    draw.text((40, 90), f"Tanggal: {random.randint(1,28)} September 2026", font=font_main, fill=(100, 100, 100))
    draw.line([(40, 115), (width - 40, 115)], fill=(150, 150, 150), width=1)

    y_pos = 135
    draw.text((40, y_pos), "RINCIAN TRANSAKSI:", font=font_main, fill=(30, 30, 30))
    y_pos += 25

    items_list = []
    actual_total = 0

    if category_type == "unrelated":
        raw_items = [("Nasi Padang Ayam Pop", "2 Porsi", 25000, 50000), ("Es Teh Manis", "2 Gelas", 5000, 10000)]
    elif category_type == "mixed":
        raw_items = [
            ("Pupuk NPK Mutiara", "2 Sak", 850000, 1700000), # COGS
            ("Upah Buruh Petik", "2 Orang", 100000, 200000),  # OPEX
            ("Sprayer Hama 16L", "1 Unit", 550000, 550000)    # CAPEX
        ]
    else:
        # Select 2 to 4 random items from pool
        num_items = random.randint(2, 4)
        chosen = random.sample(FARM_ITEMS_POOL, num_items)
        raw_items = []
        for name, cls, pmin, pmax in chosen:
            qty_num = random.randint(1, 10)
            unit_p = random.randrange(pmin, pmax, 1000)
            line_tot = qty_num * unit_p
            raw_items.append((name, f"{qty_num} Unit/Kg", unit_p, line_tot))

    for name, qty_str, unit_price, line_total in raw_items:
        actual_total += line_total
        draw.text((50, y_pos), f"• {name} ({qty_str})", font=font_main, fill=(10, 10, 10))
        draw.text((420, y_pos), f"Rp {line_total:,}", font=font_main, fill=(10, 10, 10))
        y_pos += 22
        draw.text((70, y_pos), f"  @ Rp {unit_price:,}", font=font_main, fill=(100, 100, 100))
        y_pos += 30

        items_list.append({
            "name": name,
            "qty": qty_str,
            "unit_price": unit_price,
            "line_total": line_total
        })

    # Fraud logic injection
    fraud_flags = []
    is_fraud_flag = False
    reported_total = actual_total

    if category_type == "fraud":
        is_fraud_flag = True
        fraud_kind = random.choice(["math_error", "screen_photo", "excessive_deduction"])
        if fraud_kind == "math_error":
            reported_total += random.choice([50000, 150000, 250000])
            fraud_flags.append("Total aritmatika nota tidak cocok dengan rincian item")
        elif fraud_kind == "excessive_deduction":
            draw.text((50, y_pos), "• Potongan Susut / Refraksi (18%)", font=font_main, fill=(180, 40, 40))
            draw.text((420, y_pos), "-Rp 850,000", font=font_main, fill=(180, 40, 40))
            y_pos += 30
            fraud_flags.append("Potongan susut 18% melebihi batas standar regional 8%")
        elif fraud_kind == "screen_photo":
            fraud_flags.append("Foto terdeteksi berasal dari layar laptop/HP (bukan fisik)")
            # Simulate screen scan lines
            for ly in range(0, height, 8):
                draw.line([(0, ly), (width, ly)], fill=(200, 220, 255), width=1)

    draw.line([(40, y_pos), (width - 40, y_pos)], fill=(150, 150, 150), width=1)
    y_pos += 15

    draw.text((40, y_pos), "TOTAL DIBAYAR:", font=font_main, fill=(20, 20, 20))
    draw.text((380, y_pos), f"Rp {reported_total:,}", font=font_main, fill=(20, 20, 20))
    y_pos += 35

    # Visual Distortions based on category
    if category_type == "unreadable":
        # Extreme blur and low contrast
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(2.8, 4.5)))
        quality_score = random.randint(2, 4)
    elif category_type == "fraud":
        img = img.rotate(random.uniform(-4.0, 4.0), fillcolor=(235, 240, 245))
        img = img.filter(ImageFilter.GaussianBlur(radius=0.8))
        quality_score = random.randint(5, 7)
    else:
        # Clean / Real
        img = img.rotate(random.uniform(-1.0, 1.0), fillcolor=(248, 246, 240))
        img = img.filter(ImageFilter.GaussianBlur(radius=0.4))
        quality_score = random.randint(8, 10)

    filename = f"{OUTPUT_DIR}/receipt_{index:03d}_{category_type}.jpg"
    img.save(filename, quality=85)

    manifest_entry = {
        "id": index,
        "filename": filename,
        "category_type": category_type,
        "merchant_name": merchant,
        "quality_score": quality_score,
        "is_original_receipt": not (category_type in ["fraud", "unreadable", "unrelated"] and is_fraud_flag),
        "reported_total_idr": reported_total,
        "actual_total_idr": actual_total,
        "fraud_flags": fraud_flags,
        "items": items_list
    }
    return manifest_entry


def main():
    print("🚀 Generating 50 Comprehensive Agricultural Dataset Examples...")
    manifest = []
    
    # 20 Clean Authentic Receipts
    for i in range(1, 21):
        manifest.append(generate_single_receipt(i, "clean"))
        
    # 10 Unreadable / Blur / Low Quality Receipts
    for i in range(21, 31):
        manifest.append(generate_single_receipt(i, "unreadable"))

    # 10 Fraud / Math Errors / Screen Photos
    for i in range(31, 41):
        manifest.append(generate_single_receipt(i, "fraud"))

    # 5 Non-Agricultural / Unrelated Receipts
    for i in range(41, 46):
        manifest.append(generate_single_receipt(i, "unrelated"))

    # 5 Mixed COGS + OPEX + CAPEX Receipts
    for i in range(46, 51):
        manifest.append(generate_single_receipt(i, "mixed"))

    manifest_file = "assets/synthetic_dataset/manifest.json"
    with open(manifest_file, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"✅ Generated 50 receipts in '{OUTPUT_DIR}'!")
    print(f"📄 Manifest metadata saved to '{manifest_file}'")


if __name__ == "__main__":
    main()
