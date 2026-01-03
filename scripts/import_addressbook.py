#!/usr/bin/env python3
"""
Import address book from CSV and match to existing customers.
Usage: python scripts/import_addressbook.py attached_assets/export_1767454080709.csv
"""

import sys
import csv
import json
from pathlib import Path

def parse_csv(filepath: str) -> list:
    """Parse the semicolon-separated CSV file."""
    addresses = []
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f, delimiter=';')
        
        for row in reader:
            address = {
                'company': row.get('NAZEV', '').strip(),
                'street': row.get('ULICE_CP', '').strip(),
                'city': row.get('MESTO', '').strip(),
                'zipCode': row.get('PSC', '').strip(),
                'country': row.get('ZEME', 'CZ').strip(),
                'email': row.get('EMAIL', '').strip(),
                'contact': row.get('KONTAKTNI_OS', '').strip(),
                'phone': row.get('TELEFON', '').strip(),
                'notes': row.get('POZNAMKA', '').strip(),
            }
            
            # Skip empty rows
            if not address['company'] and not address['street']:
                continue
                
            addresses.append(address)
    
    return addresses

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_addressbook.py <csv_file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if not Path(filepath).exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    print(f"Parsing CSV file: {filepath}")
    addresses = parse_csv(filepath)
    print(f"Found {len(addresses)} addresses to import")
    
    # Output parsed addresses as JSON for the API
    output_file = 'scripts/addressbook_parsed.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(addresses, f, ensure_ascii=False, indent=2)
    
    print(f"Parsed addresses saved to {output_file}")
    print("\nSample addresses:")
    for addr in addresses[:5]:
        print(f"  - {addr['company']}: {addr['street']}, {addr['city']} {addr['zipCode']}, {addr['country']}")

if __name__ == '__main__':
    main()
