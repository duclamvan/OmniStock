#!/usr/bin/env python3
"""
Parse German address book format and convert to JSON for import.
Format:
Company Name
(Optional extra info)
Street Address
Postal Code City, Country
Email

Bearbeiten

Löschen
"""

import re
import json
import sys

def parse_addressbook(filepath: str) -> list:
    """Parse the German address book text file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by the "Bearbeiten\n\nLöschen" pattern
    entries = re.split(r'\nBearbeiten\s*\nLöschen\s*\n?', content)
    
    addresses = []
    
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        
        lines = [l.strip() for l in entry.split('\n') if l.strip()]
        if len(lines) < 3:
            continue
        
        address = {
            'company': '',
            'contact': '',
            'street': '',
            'streetNumber': '',
            'city': '',
            'zipCode': '',
            'country': 'Germany',
            'email': '',
        }
        
        # Find email line (contains @)
        email_idx = None
        for i, line in enumerate(lines):
            if '@' in line:
                address['email'] = line
                email_idx = i
                break
        
        # Find postal code + city line (starts with 5 digits, or has ", DE" or similar)
        postal_idx = None
        for i, line in enumerate(lines):
            # Match pattern: "12345 City, DE" or "12345 City, Country"
            match = re.match(r'^(\d{4,5})\s+(.+?),\s*(\w{2})$', line)
            if match:
                address['zipCode'] = match.group(1)
                address['city'] = match.group(2)
                country_code = match.group(3).upper()
                country_map = {
                    'DE': 'Germany',
                    'AT': 'Austria',
                    'NL': 'Netherlands',
                    'DK': 'Denmark',
                    'CH': 'Switzerland',
                    'BE': 'Belgium',
                    'FR': 'France',
                }
                address['country'] = country_map.get(country_code, country_code)
                postal_idx = i
                break
        
        if postal_idx is None:
            continue
        
        # Street is usually the line before postal code
        if postal_idx > 0:
            street_line = lines[postal_idx - 1]
            # Extract street number from end
            street_match = re.match(r'^(.+?)\s+(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$', street_line)
            if street_match:
                address['street'] = street_match.group(1)
                address['streetNumber'] = street_match.group(2)
            else:
                address['street'] = street_line
        
        # Company name and optional contact
        remaining_lines = lines[:postal_idx - 1] if postal_idx > 1 else []
        
        if remaining_lines:
            # First line is usually company or contact name
            first_line = remaining_lines[0]
            
            # Check if it looks like a person's name (no company keywords)
            company_keywords = ['nails', 'beauty', 'studio', 'salon', 'center', 'shop', 'lounge', 'spa']
            is_company = any(kw in first_line.lower() for kw in company_keywords)
            
            if is_company:
                address['company'] = first_line
                # If there are more lines before street, might be additional info
                if len(remaining_lines) > 1:
                    # Check if second line looks like a name
                    second = remaining_lines[1]
                    if not any(kw in second.lower() for kw in company_keywords) and not second.startswith('('):
                        address['contact'] = second
            else:
                # Might be contact name followed by company
                address['contact'] = first_line
                if len(remaining_lines) > 1:
                    address['company'] = remaining_lines[1]
        
        # Skip entries without essential data
        if address['street'] and address['zipCode']:
            addresses.append(address)
    
    return addresses

def main():
    if len(sys.argv) < 2:
        filepath = 'attached_assets/Pasted-A-Nails-Nagelstudio-Ludwigstra-e-4-63739-Aschaffenburg-_1767454356355.txt'
    else:
        filepath = sys.argv[1]
    
    print(f"Parsing German address book: {filepath}")
    addresses = parse_addressbook(filepath)
    print(f"Parsed {len(addresses)} addresses")
    
    # Save to JSON
    output_file = 'scripts/german_addressbook_parsed.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(addresses, f, ensure_ascii=False, indent=2)
    
    print(f"Saved to {output_file}")
    
    # Show sample
    print("\nSample addresses:")
    for addr in addresses[:5]:
        print(f"  - {addr['company'] or addr['contact']}: {addr['street']} {addr['streetNumber']}, {addr['zipCode']} {addr['city']}, {addr['country']}")
    
    # Output stats
    countries = {}
    for addr in addresses:
        c = addr['country']
        countries[c] = countries.get(c, 0) + 1
    print(f"\nCountry breakdown:")
    for c, count in sorted(countries.items(), key=lambda x: -x[1]):
        print(f"  {c}: {count}")

if __name__ == '__main__':
    main()
