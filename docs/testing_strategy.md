To prove the app works to the judges without handwriting 50 receipts manually, use this two-pronged approach:

1. Public Baseline Dataset:
Use the CORD (Consolidated Receipt Dataset) from Kaggle/HuggingFace to prove baseline structural OCR capabilities on Indonesian receipts.

2. Proprietary Synthetic Data Generator:
Run this Python script using Pillow to instantly generate dozens of messy, handwritten agricultural receipts with deliberate math errors and varying image quality.

import os
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

os.makedirs("synthetic_receipts", exist_ok=True)
font_large = ImageFont.load_default()
font_small = ImageFont.load_default()

cogs_pool = [("Pupuk Urea", 120000), ("Bibit Cabai", 85000)]
opex_pool = [("Solar Genset", 50000), ("Upah Kuli", 100000)]

def generate_receipt(index):
    img = Image.new('RGB', (600, 800), color=(245, 245, 240))
    draw = ImageDraw.Draw(img)
    
    draw.text((50, 50), "TOKO TANI MAKMUR", font=font_large, fill=(30, 30, 30))
    draw.text((50, 100), "NOTA KONTAN", font=font_small, fill=(50, 50, 50))
    
    items = random.sample(cogs_pool + opex_pool, 2)
    y_pos, actual_total = 160, 0
    
    for name, price in items:
        qty = random.randint(1, 5)
        line_total = qty * price
        actual_total += line_total
        draw.text((50, y_pos), f"{qty} x {name}", fill=(0, 0, 0))
        draw.text((400, y_pos), f"Rp {line_total:,}", fill=(0, 0, 0))
        y_pos += 50
    
    # Inject fraud 20% of the time
    reported_total = actual_total
    is_fraud = random.random() < 0.2
    if is_fraud: reported_total += 50000
        
    draw.text((50, y_pos + 30), "TOTAL:", font=font_large, fill=(0, 0, 0))
    draw.text((400, y_pos + 30), f"Rp {reported_total:,}", font=font_large, fill=(0, 0, 0))
    
    # Add phone camera blur
    if random.random() < 0.3:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(1.0, 2.5)))
    img = img.rotate(random.uniform(-3.0, 3.0), fillcolor=(245,245,240))
    
    status = "fraud" if is_fraud else "clean"
    img.save(f"synthetic_receipts/receipt_{index:03d}_{status}.jpg", quality=random.randint(60, 90))

for i in range(20): generate_receipt(i)