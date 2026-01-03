#!/usr/bin/env python3
"""
Inventory Processor Script
Generates SKUs matching Davie Supply's exact format and processes inventory data for import.

SKU Format: CATEGORY-PRODUCTPART (e.g., GP-SOGEPO for "SORAH Gel Polish 15ml" in "Gel Polish")
- Category: First letter of each word (multi-word) or first 3 chars (single word)
- Product: First 6 chars (1 word), first 3 of each (2 words), first 2 of first 3 (3+ words)
- Only adds -1, -2 suffix if duplicate exists

Usage:
    python scripts/inventory_processor.py input_file.tsv output_file.csv
"""

import csv
import sys
import os
from typing import Set

# Vietnamese diacritics mapping (matching client/src/lib/vietnameseSearch.ts)
VIETNAMESE_MAP = {
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'Á': 'A', 'À': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ắ': 'A', 'Ằ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ấ': 'A', 'Ầ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'đ': 'd', 'Đ': 'D',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'É': 'E', 'È': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ế': 'E', 'Ề': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'Í': 'I', 'Ì': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'Ó': 'O', 'Ò': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ố': 'O', 'Ồ': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ớ': 'O', 'Ờ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'Ú': 'U', 'Ù': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ứ': 'U', 'Ừ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'Ý': 'Y', 'Ỳ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
}


def normalize_for_sku(text: str) -> str:
    """
    Normalize text for SKU generation - remove Vietnamese diacritics and non-alphanumeric chars.
    Matches the normalizeForSKU function in ProductForm.tsx
    """
    import re
    # Remove Vietnamese diacritics
    normalized = ''.join(VIETNAMESE_MAP.get(c, c) for c in text)
    # Remove non-alphanumeric characters and convert to uppercase
    return re.sub(r'[^A-Za-z0-9]', '', normalized).upper()


def get_category_part(category_name: str) -> str:
    """
    Generate category code from category name.
    Matches the exact logic from ProductForm.tsx generateSKU function.
    
    - Multi-word: Take first letter of each word (e.g., "Gel Polish" -> "GP", "Tools & Accessories" -> "TA")
    - Single word: Take first 3 characters (e.g., "Design" -> "DES", "Tips" -> "TIP")
    """
    # Split on whitespace and filter out empty strings and connectors
    words = [w for w in category_name.split() if w and w not in ['&', 'and', '-', '/']]
    
    if len(words) > 1:
        # Multi-word: first letter of each word
        category_part = ''.join(normalize_for_sku(w)[0] if normalize_for_sku(w) else '' for w in words)
    else:
        # Single word: first 3 characters
        category_part = normalize_for_sku(category_name)[:3]
    
    return category_part.upper() if category_part else 'GEN'


def get_product_part(product_name: str) -> str:
    """
    Generate product code from product name.
    Matches the exact logic from ProductForm.tsx generateSKU function.
    
    - 1 word: Take first 6 characters
    - 2 words: Take first 3 chars of each word
    - 3+ words: Take first 2 chars of first 3 words
    """
    words = [w for w in product_name.split() if w]
    
    if not words:
        return 'ITEM'
    
    if len(words) == 1:
        # Single word: take first 6 characters
        product_part = normalize_for_sku(words[0])[:6]
    elif len(words) == 2:
        # Two words: take first 3 chars of each
        product_part = normalize_for_sku(words[0])[:3] + normalize_for_sku(words[1])[:3]
    else:
        # Multiple words (3+): take first 2 chars of first 3 words
        product_part = ''.join(normalize_for_sku(w)[:2] for w in words[:3])
    
    return product_part.upper() if product_part else 'ITEM'


def generate_sku(category: str, product_name: str, existing_skus: Set[str]) -> str:
    """
    Generate a unique SKU matching Davie Supply's exact format.
    Format: CAT-PRODPART (e.g., GP-SOGEPO)
    Only adds -1, -2, etc. suffix if duplicate exists.
    """
    cat_part = get_category_part(category)
    prod_part = get_product_part(product_name)
    
    base_sku = f"{cat_part}-{prod_part}"
    
    # Check if base SKU exists - only add counter if needed
    if base_sku.upper() not in existing_skus:
        existing_skus.add(base_sku.upper())
        return base_sku
    
    # Find next available counter
    counter = 1
    while f"{base_sku}-{counter}".upper() in existing_skus:
        counter += 1
    
    final_sku = f"{base_sku}-{counter}"
    existing_skus.add(final_sku.upper())
    return final_sku


def clean_price(value: str) -> str:
    """Clean price value, handling commas and #N/A."""
    if not value or value.strip() in ['#N/A', 'Loading...', '']:
        return '0'
    cleaned = value.replace(',', '').strip()
    try:
        float(cleaned)
        return cleaned
    except ValueError:
        return '0'


def process_inventory(input_file: str, output_file: str):
    """
    Process inventory file and generate new SKUs.
    
    Input columns: Product name, Reference, Category, SKU, Price CZK, Price EUR, 
                   Imp. Cost EUR, Imp. Cost CZK, Weight (g), Imported (pcs), Stock (pcs), Total orders
    
    Output columns: Product name, Category, SKU, Price CZK, Price EUR, Imp. Cost EUR, Imp. Cost CZK
    """
    products = []
    existing_skus: Set[str] = set()
    
    # Detect delimiter based on file extension
    delimiter = '\t' if input_file.endswith('.tsv') or input_file.endswith('.txt') else ','
    
    print(f"📂 Reading inventory from: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        
        for row in reader:
            product_name = row.get('Product name', '').strip()
            category = row.get('Category', '').strip()
            
            if not product_name:
                continue
            
            # Generate SKU using exact site logic
            new_sku = generate_sku(category, product_name, existing_skus)
            
            products.append({
                'Product name': product_name,
                'Category': category,
                'SKU': new_sku,
                'Price CZK': clean_price(row.get('Price CZK', '0')),
                'Price EUR': clean_price(row.get('Price EUR', '0')),
                'Imp. Cost EUR': clean_price(row.get('Imp. Cost EUR', '0')),
                'Imp. Cost CZK': clean_price(row.get('Imp. Cost CZK', '0')),
            })
    
    print(f"✅ Processed {len(products)} products")
    
    # Count unique vs duplicated SKUs
    unique_count = len([p for p in products if '-' not in p['SKU'].split('-')[-1] or not p['SKU'].split('-')[-1].isdigit()])
    dup_count = len(products) - unique_count
    print(f"   📊 {unique_count} unique base SKUs, {dup_count} with suffix counters")
    
    print(f"💾 Writing output to: {output_file}")
    
    output_columns = ['Product name', 'Category', 'SKU', 'Price CZK', 'Price EUR', 'Imp. Cost EUR', 'Imp. Cost CZK']
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=output_columns)
        writer.writeheader()
        writer.writerows(products)
    
    print(f"🚀 Done! Generated {len(products)} SKUs")
    
    # Show sample output grouped by category
    print("\n📋 Sample output (first 15 products):")
    print("-" * 80)
    for product in products[:15]:
        print(f"  {product['SKU']:20} | {product['Category']:20} | {product['Product name'][:35]}")


def main():
    if len(sys.argv) < 2:
        # Default to the attached file if no args
        input_file = 'attached_assets/Pasted-Product-name-Reference-Category-SKU-Price-CZK-Price-EUR_1767405059741.txt'
        output_file = 'inventory_import_ready.csv'
    elif len(sys.argv) == 2:
        input_file = sys.argv[1]
        output_file = 'inventory_import_ready.csv'
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"❌ Error: Input file not found: {input_file}")
        sys.exit(1)
    
    process_inventory(input_file, output_file)


if __name__ == '__main__':
    main()
