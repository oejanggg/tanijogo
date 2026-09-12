import os
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def create_farm_receipt(
    filename: str,
    title: str,
    merchant_name: str,
    items: list,
    is_fraud: bool = False,
    notes: str = ""
):
    """Generates an authentic Indonesian agricultural receipt image using Pillow."""
    width, height = 650, 900
    # Paper background with warm off-white receipt tint
    img = Image.new("RGB", (width, height), color=(248, 246, 240))
    draw = ImageDraw.Draw(img)

    font_header = ImageFont.load_default()
    font_body = ImageFont.load_default()

    # Draw header
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(200, 195, 185), width=2)
    draw.text((40, 40), f"=== {merchant_name.upper()} ===", font=font_header, fill=(20, 20, 20))
    draw.text((40, 70), f"DOKUMEN / {title.upper()}", font=font_body, fill=(80, 80, 80))
    draw.text((40, 95), "Tanggal: 12 September 2026", font=font_body, fill=(100, 100, 100))
    draw.line([(40, 120), (width - 40, 120)], fill=(150, 150, 150), width=1)

    y_pos = 140
    draw.text((40, y_pos), "Rincian Barang / Komoditas Panen:", font=font_body, fill=(40, 40, 40))
    y_pos += 30

    actual_sum = 0
    for name, qty_str, unit_price, line_total in items:
        actual_sum += line_total
        draw.text((50, y_pos), f"• {name} ({qty_str})", font=font_body, fill=(10, 10, 10))
        draw.text((420, y_pos), f"Rp {line_total:,}", font=font_body, fill=(10, 10, 10))
        y_pos += 25
        draw.text((70, y_pos), f"  @ Rp {unit_price:,}", font=font_body, fill=(100, 100, 100))
        y_pos += 35

    draw.line([(40, y_pos), (width - 40, y_pos)], fill=(150, 150, 150), width=1)
    y_pos += 20

    # Handle fraud total calculation
    reported_total = actual_sum + 150000 if is_fraud else actual_sum

    draw.text((40, y_pos), "TOTAL PEMBAYARAN:", font=font_header, fill=(20, 20, 20))
    draw.text((380, y_pos), f"Rp {reported_total:,}", font=font_header, fill=(20, 20, 20))
    y_pos += 40

    if notes:
        draw.text((40, y_pos), f"Catatan: {notes}", font=font_body, fill=(120, 60, 60))
        y_pos += 30

    # Add realistic receipt footer stamp
    draw.text((40, height - 80), "Terima kasih atas kerja sama Anda - Kelompok Tani SukaTani", font=font_body, fill=(140, 140, 140))
    draw.text((40, height - 50), "[ Cap Lunas / Farmgate Receipt Verified ]", font=font_body, fill=(50, 120, 50))

    # Apply camera rotation and subtle blur for physical paper realism
    img = img.rotate(random.uniform(-1.5, 1.5), fillcolor=(248, 246, 240))
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    img.save(filename, quality=92)
    print(f"Generated realistic farm receipt: {filename}")


def main():
    # 1. Farmgate Chili Harvest Chit (Nota Hasil Panen Cabai Merah)
    create_farm_receipt(
        filename="assets/samples/nota_panen_cabai.jpg",
        title="Nota Timbangan Hasil Panen Cabai",
        merchant_name="Pengepul Hasil Tani - Pak Dadang",
        items=[
            ("Cabai Merah Keriting (Super)", "120 Kg", 35000, 4200000),
            ("Potongan Susut / Refraksi (8%)", "-9.6 Kg", 35000, -336000),
            ("Upah Buruh Petik Harvest", "3 Orang", 100000, 300000),
            ("Sewa Keranjang & Transportasi", "1 Trip", 150000, 150000),
        ],
        is_fraud=False,
        notes="Potongan susut standar 8% disetujui."
    )

    # 2. Farm Inputs Receipt (Toko Tani Makmur)
    create_farm_receipt(
        filename="assets/samples/nota_toko_tani.jpg",
        title="Nota Pembelian Input Pertanian",
        merchant_name="Toko Tani Makmur Garut",
        items=[
            ("Pupuk NPK Mutiara 16-16-16", "2 Sak (100kg)", 850000, 1700000),
            ("Bibit Cabai F1 Hibrida", "10 Pack", 120000, 1200000),
            ("Fungisida & Insectisida", "4 Botol", 95000, 380000),
            ("Solar Genset Pompa Air", "30 Liter", 10000, 300000),
        ],
        is_fraud=False,
        notes="Pembelian input pertanian musim tanam."
    )

    # 3. Fraudulent Harvest Chit (Nota Timbangan Bermasalah)
    create_farm_receipt(
        filename="assets/samples/nota_susut_fraud.jpg",
        title="Nota Timbangan Panen Bawang",
        merchant_name="Tengkulak Pasar Induk",
        items=[
            ("Bawang Merah Grade A", "200 Kg", 28000, 5600000),
            ("Potongan Susut Berlebih (18%)", "-36 Kg", 28000, -1008000),
            ("Biaya Cuci & Sortir", "1 Paket", 250000, 250000),
        ],
        is_fraud=True,
        notes="Perhatian: Terdapat selisih ketersediaan & potongan susut 18%."
    )


if __name__ == "__main__":
    main()
