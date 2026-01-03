#!/usr/bin/env python3
"""
Inventory Processor Script
Generates SKUs matching Davie Supply's format and processes inventory data for import.

Usage:
    python scripts/inventory_processor.py input_file.tsv output_file.csv
"""

import csv
import sys
import os
from typing import Dict, List, Set

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


def remove_diacritics(text: str) -> str:
    """Remove Vietnamese diacritics from text."""
    return ''.join(VIETNAMESE_MAP.get(c, c) for c in text)


def normalize_for_sku(text: str) -> str:
    """Normalize text for SKU generation - remove diacritics and special chars."""
    import re
    normalized = remove_diacritics(text).upper()
    return re.sub(r'[^A-Z0-9]', '', normalized)


def get_category_code(category_name: str) -> str:
    """
    Generate category code from category name.
    - Multi-word: Take first letter of each word (e.g., "Tools & Accessories" -> "TA")
    - Single word: Take first 3 characters (e.g., "Design" -> "DES")
    """
    import re
    words = [w for w in re.split(r'\s+', category_name) if w and w not in ['&', 'and', '-']]
    
    if len(words) > 1:
        code = ''.join(normalize_for_sku(w)[0] if normalize_for_sku(w) else '' for w in words)
        return code[:4] if code else 'GEN'
    else:
        code = normalize_for_sku(category_name)
        return code[:3] if code else 'GEN'


def get_product_code(product_name: str, max_length: int = 6) -> str:
    """
    Generate product code from product name.
    Takes first 4-6 significant characters.
    """
    import re
    words = product_name.split()
    
    if len(words) >= 2:
        first_word = normalize_for_sku(words[0])[:3]
        second_word = normalize_for_sku(words[1])[:3]
        code = first_word + second_word
    else:
        code = normalize_for_sku(product_name)
    
    return code[:max_length] if code else 'PROD'


def generate_sku(category: str, product_name: str, counter: int, existing_skus: Set[str]) -> str:
    """
    Generate a unique SKU matching Davie Supply's format.
    Format: CAT-PROD-NNNNNN (e.g., TA-BUTVZ-000001)
    """
    cat_code = get_category_code(category)
    prod_code = get_product_code(product_name)
    
    base_sku = f"{cat_code}-{prod_code}-{counter:06d}"
    
    if base_sku.upper() in existing_skus:
        suffix = 1
        while f"{base_sku}-{suffix}".upper() in existing_skus:
            suffix += 1
        base_sku = f"{base_sku}-{suffix}"
    
    existing_skus.add(base_sku.upper())
    return base_sku


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
    sku_counter = 1
    
    delimiter = '\t' if input_file.endswith('.tsv') or input_file.endswith('.txt') else ','
    
    print(f"📂 Reading inventory from: {input_file}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        
        for row in reader:
            product_name = row.get('Product name', '').strip()
            category = row.get('Category', '').strip()
            
            if not product_name:
                continue
            
            new_sku = generate_sku(category, product_name, sku_counter, existing_skus)
            sku_counter += 1
            
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
    
    print(f"💾 Writing output to: {output_file}")
    
    output_columns = ['Product name', 'Category', 'SKU', 'Price CZK', 'Price EUR', 'Imp. Cost EUR', 'Imp. Cost CZK']
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=output_columns)
        writer.writeheader()
        writer.writerows(products)
    
    print(f"🚀 Done! Generated {len(products)} SKUs")
    
    print("\n📋 Sample output (first 10 products):")
    print("-" * 80)
    for product in products[:10]:
        print(f"  {product['SKU']:25} | {product['Product name'][:40]}")


def main():
    if len(sys.argv) < 2:
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
