#!/usr/bin/env python3
"""
Import matched addresses from merge result to database via API.
"""

import json
import subprocess
import sys

def main():
    # Load merged data
    with open('scripts/merged_customers_addresses.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    matched_customers = data['matched_customers']
    
    print(f"Found {len(matched_customers)} customers with matched addresses")
    print(f"Total addresses to import: {sum(len(c['addresses']) for c in matched_customers)}")
    
    # Convert to format expected by API
    addresses_for_import = []
    
    for cust_data in matched_customers:
        customer = cust_data['customer']
        for addr in cust_data['addresses']:
            addresses_for_import.append({
                'company': addr.get('company', ''),
                'contact': addr.get('contact', ''),
                'street': addr.get('street', ''),
                'city': addr.get('city', ''),
                'zipCode': addr.get('zipCode', ''),
                'country': addr.get('country', ''),
                'email': addr.get('email', ''),
                'phone': customer.get('phone', addr.get('phone', '')),
            })
    
    # Save for API import
    output_file = 'scripts/addresses_for_import.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({'addresses': addresses_for_import}, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved {len(addresses_for_import)} addresses to {output_file}")
    print("\nTo import, use the 'Import Address Book' button in the Customers page")
    print("Or call the API endpoint: POST /api/customers/import-addressbook")

if __name__ == '__main__':
    main()
