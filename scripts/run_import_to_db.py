#!/usr/bin/env python3
"""
Import matched addresses directly to the database and generate result file.
"""

import json
import psycopg2
import os
import uuid
from datetime import datetime

def normalize_phone(phone: str) -> str:
    """Normalize phone for matching."""
    if not phone:
        return ""
    import re
    digits = re.sub(r'[^\d]', '', phone)
    return digits[-9:] if len(digits) >= 9 else digits

def normalize_name(name: str) -> str:
    """Normalize name for matching."""
    if not name:
        return ""
    import re
    return re.sub(r'[^a-z0-9]', '', name.lower())

def main():
    # Connect to database
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        return
    
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Load merged data
    with open('scripts/merged_customers_addresses.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get all customers from database
    cur.execute("SELECT id, name, phone FROM customers")
    db_customers = cur.fetchall()
    print(f"Found {len(db_customers)} customers in database")
    
    # Build lookup maps
    phone_to_customer = {}
    name_to_customer = {}
    for cid, name, phone in db_customers:
        if phone:
            normalized = normalize_phone(phone)
            if normalized:
                phone_to_customer[normalized] = (cid, name)
        if name:
            normalized = normalize_name(name)
            if normalized:
                name_to_customer[normalized] = (cid, name)
    
    # Get existing shipping addresses to avoid duplicates
    cur.execute("SELECT customer_id, zip_code, street FROM customer_shipping_addresses")
    existing_addresses = set()
    for row in cur.fetchall():
        key = (row[0], row[1], row[2].lower() if row[2] else '')
        existing_addresses.add(key)
    print(f"Found {len(existing_addresses)} existing shipping addresses")
    
    # Process all addresses from both addressbooks
    all_addresses = []
    
    # Load CSV addressbook
    csv_file = 'attached_assets/export_1767454080709.csv'
    with open(csv_file, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    headers = [h.strip() for h in lines[0].split(';')]
    for line in lines[1:]:
        if not line.strip():
            continue
        values = line.split(';')
        row = dict(zip(headers, values))
        country_map = {'CZ': 'Czech Republic', 'DE': 'Germany', 'AT': 'Austria', 
                      'SK': 'Slovakia', 'PL': 'Poland', 'DK': 'Denmark', 'BE': 'Belgium'}
        country = row.get('ZEME', 'CZ').strip()
        all_addresses.append({
            'source': 'csv',
            'company': row.get('NAZEV', '').strip(),
            'street': row.get('ULICE_CP', '').strip(),
            'city': row.get('MESTO', '').strip(),
            'zipCode': row.get('PSC', '').strip(),
            'country': country_map.get(country, country),
            'email': row.get('EMAIL', '').strip(),
            'contact': row.get('KONTAKTNI_OS', '').strip(),
            'phone': row.get('TELEFON', '').strip(),
        })
    
    # Load German addressbook
    import re
    german_file = 'attached_assets/Pasted-A-Nails-Nagelstudio-Ludwigstra-e-4-63739-Aschaffenburg-_1767454356355.txt'
    with open(german_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    entries = re.split(r'\nBearbeiten\s*\n+Löschen\s*\n?', content)
    for entry in entries:
        lines = [l.strip() for l in entry.strip().split('\n') if l.strip()]
        if len(lines) < 3:
            continue
        
        address = {
            'source': 'german_txt',
            'company': '',
            'contact': '',
            'street': '',
            'city': '',
            'zipCode': '',
            'country': 'Germany',
            'email': '',
            'phone': '',
        }
        
        for line in lines:
            if '@' in line:
                address['email'] = line
                break
        
        postal_idx = None
        for i, line in enumerate(lines):
            match = re.match(r'^(\d{4,5})\s+(.+?),\s*(\w{2})$', line)
            if match:
                address['zipCode'] = match.group(1)
                address['city'] = match.group(2)
                country_map = {'DE': 'Germany', 'AT': 'Austria', 'NL': 'Netherlands',
                              'DK': 'Denmark', 'CH': 'Switzerland', 'BE': 'Belgium', 'FR': 'France'}
                address['country'] = country_map.get(match.group(3).upper(), match.group(3))
                postal_idx = i
                break
        
        if postal_idx is None or postal_idx < 1:
            continue
        
        address['street'] = lines[postal_idx - 1]
        
        remaining = lines[:postal_idx - 1]
        if remaining:
            company_keywords = ['nails', 'beauty', 'studio', 'salon', 'center', 'shop', 'lounge', 'spa']
            first = remaining[0]
            if any(kw in first.lower() for kw in company_keywords):
                address['company'] = first
                if len(remaining) > 1 and not remaining[1].startswith('('):
                    address['contact'] = remaining[1]
            else:
                address['contact'] = first
                if len(remaining) > 1:
                    address['company'] = remaining[1]
        
        if address['street'] and address['zipCode']:
            all_addresses.append(address)
    
    print(f"\nTotal addresses to process: {len(all_addresses)}")
    
    # Match and import
    results = {
        'matched': [],
        'skipped_duplicate': [],
        'skipped_no_match': [],
        'errors': [],
    }
    
    for addr in all_addresses:
        addr_phone = normalize_phone(addr.get('phone', ''))
        addr_company = normalize_name(addr.get('company', ''))
        addr_contact = normalize_name(addr.get('contact', ''))
        
        matched_customer = None
        match_type = None
        
        # Match by phone first
        if addr_phone and addr_phone in phone_to_customer:
            matched_customer = phone_to_customer[addr_phone]
            match_type = 'phone'
        # Then by company/contact name
        elif addr_company:
            for norm_name, cust in name_to_customer.items():
                if (addr_company[:10] == norm_name[:10] or 
                    addr_company in norm_name or 
                    norm_name in addr_company):
                    matched_customer = cust
                    match_type = 'company'
                    break
        elif addr_contact:
            for norm_name, cust in name_to_customer.items():
                if addr_contact == norm_name or addr_contact in norm_name or norm_name in addr_contact:
                    matched_customer = cust
                    match_type = 'contact'
                    break
        
        if not matched_customer:
            results['skipped_no_match'].append({
                'company': addr.get('company'),
                'contact': addr.get('contact'),
                'street': addr.get('street'),
                'city': addr.get('city'),
                'source': addr.get('source'),
            })
            continue
        
        customer_id, customer_name = matched_customer
        
        # Check for duplicate
        dup_key = (customer_id, addr.get('zipCode', ''), addr.get('street', '').lower())
        if dup_key in existing_addresses:
            results['skipped_duplicate'].append({
                'customer': customer_name,
                'address': f"{addr.get('street')}, {addr.get('city')}",
            })
            continue
        
        # Parse contact name
        contact = addr.get('contact', '')
        contact_parts = contact.split() if contact else []
        first_name = contact_parts[0] if contact_parts else (addr.get('company', '')[:20] or 'N/A')
        last_name = ' '.join(contact_parts[1:]) if len(contact_parts) > 1 else first_name
        
        # Insert shipping address
        try:
            addr_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO customer_shipping_addresses 
                (id, customer_id, first_name, last_name, company, email, tel, street, city, zip_code, country, is_primary, label, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                addr_id,
                customer_id,
                first_name[:100],
                last_name[:100],
                addr.get('company', '')[:200] or None,
                addr.get('email', '')[:200] or None,
                addr.get('phone', '')[:50] or None,
                addr.get('street', '')[:200],
                addr.get('city', '')[:100],
                addr.get('zipCode', '')[:20],
                addr.get('country', 'Czech Republic')[:100],
                False,
                'Imported',
                datetime.now(),
                datetime.now(),
            ))
            
            existing_addresses.add(dup_key)
            results['matched'].append({
                'customer': customer_name,
                'customer_id': customer_id,
                'match_type': match_type,
                'company': addr.get('company'),
                'street': addr.get('street'),
                'city': addr.get('city'),
                'country': addr.get('country'),
                'source': addr.get('source'),
            })
        except Exception as e:
            results['errors'].append({
                'address': f"{addr.get('company')} - {addr.get('street')}",
                'error': str(e),
            })
    
    conn.commit()
    
    # Summary
    print("\n" + "=" * 60)
    print("IMPORT RESULTS")
    print("=" * 60)
    print(f"Matched and imported: {len(results['matched'])}")
    print(f"Skipped (duplicate): {len(results['skipped_duplicate'])}")
    print(f"Skipped (no match): {len(results['skipped_no_match'])}")
    print(f"Errors: {len(results['errors'])}")
    
    # Save results
    output_file = 'scripts/import_results.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nDetailed results saved to: {output_file}")
    
    # Create Excel-friendly CSV report
    csv_output = 'scripts/import_results.csv'
    with open(csv_output, 'w', encoding='utf-8') as f:
        f.write("Status,Customer,Company,Street,City,Country,Source,Match Type\n")
        for m in results['matched']:
            f.write(f"Imported,\"{m['customer']}\",\"{m.get('company','')}\",\"{m['street']}\",\"{m['city']}\",\"{m['country']}\",{m['source']},{m['match_type']}\n")
        for s in results['skipped_duplicate']:
            f.write(f"Duplicate,\"{s['customer']}\",,,\"{s['address']}\",,existing,\n")
        for s in results['skipped_no_match']:
            f.write(f"No Match,,\"{s.get('company','')}\",\"{s['street']}\",\"{s['city']}\",,{s['source']},\n")
    print(f"CSV report saved to: {csv_output}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
