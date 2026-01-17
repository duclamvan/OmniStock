import os
import sys
import time
import re
import openpyxl
from apify_client import ApifyClient

# Configuration
INPUT_FILE = 'attached_assets/customers_comprehensive_1768685976098.xlsx'
OUTPUT_FILE = 'attached_assets/customers_comprehensive_with_fb_names.xlsx'
FACEBOOK_URL_COL = 10  # Column K (0-indexed)
FACEBOOK_NAME_COL = 9  # Column J (0-indexed)
BATCH_SIZE = 20  # Process this many URLs per API call
SAVE_EVERY = 50  # Save progress every N rows

def extract_username_from_url(url):
    """Extract Facebook username/ID from URL"""
    if not url:
        return None
    
    clean_url = url.strip()
    
    # Pattern 1: profile.php?id=NUMERIC_ID
    match = re.search(r'facebook\.com\/profile\.php\?id=(\d+)', clean_url, re.I)
    if match:
        return match.group(1)
    
    # Pattern 2: /people/Name/NUMERIC_ID
    match = re.search(r'facebook\.com\/people\/[^\/]+\/(\d+)', clean_url, re.I)
    if match:
        return match.group(1)
    
    # Pattern 3: Any numeric ID (10+ digits)
    match = re.search(r'facebook\.com\/.*?(\d{10,})', clean_url, re.I)
    if match:
        return match.group(1)
    
    # Pattern 4: Standard username
    match = re.search(r'facebook\.com\/([a-zA-Z0-9._-]+)\/?(?:\?|$|#)?', clean_url, re.I)
    if match:
        username = match.group(1).lower()
        skip_paths = ['people', 'pages', 'groups', 'events', 'watch', 'marketplace', 'gaming', 'live', 'stories', 'reels', 'photo', 'photos', 'video', 'videos', 'share', 'sharer', 'pg']
        if username not in skip_paths:
            return match.group(1)
    
    return None

def build_fb_url(username):
    """Build Facebook URL from username/ID"""
    if username.isdigit():
        return f"https://www.facebook.com/profile.php?id={username}"
    return f"https://www.facebook.com/{username}"

def fetch_facebook_names_batch(client, batch):
    """Fetch multiple Facebook profiles in one API call"""
    try:
        urls = [build_fb_url(username) for _, _, username in batch]
        
        # Run the Apify actor with all URLs at once
        run_input = {"urls": urls}
        run = client.actor("vulnv/facebook-profile-scraper").call(run_input=run_input)
        
        # Fetch results
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        
        # Map results back to rows
        results = {}
        for item in items:
            name = item.get('title') or item.get('name') or item.get('fullName') or item.get('displayName')
            url = item.get('url') or item.get('profileUrl') or ''
            # Extract username from result URL to match back
            username = extract_username_from_url(url)
            if username and name:
                results[username.lower()] = name
        
        return results
    except Exception as e:
        print(f"  Batch error: {e}")
        return {}

def main():
    api_key = os.environ.get('APIFY_API_KEY')
    if not api_key:
        print("ERROR: APIFY_API_KEY not found in environment")
        sys.exit(1)
    
    client = ApifyClient(api_key)
    
    print(f"Loading workbook: {INPUT_FILE}")
    wb = openpyxl.load_workbook(INPUT_FILE)
    ws = wb.active
    
    # Collect rows needing processing
    rows_to_process = []
    for row_idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
        fb_url = row[FACEBOOK_URL_COL].value
        fb_name = row[FACEBOOK_NAME_COL].value
        if fb_url and str(fb_url).strip() and (not fb_name or not str(fb_name).strip()):
            username = extract_username_from_url(str(fb_url))
            if username:
                rows_to_process.append((row_idx, fb_url, username))
    
    total = len(rows_to_process)
    print(f"Found {total} rows to process")
    print(f"Processing in batches of {BATCH_SIZE}...")
    
    success_count = 0
    error_count = 0
    
    # Process in batches
    for batch_start in range(0, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = rows_to_process[batch_start:batch_end]
        
        print(f"\n[Batch {batch_start//BATCH_SIZE + 1}/{(total + BATCH_SIZE - 1)//BATCH_SIZE}] Processing rows {batch_start+1}-{batch_end}...")
        
        results = fetch_facebook_names_batch(client, batch)
        
        # Apply results to worksheet
        for row_idx, fb_url, username in batch:
            name = results.get(username.lower())
            if name:
                ws.cell(row=row_idx, column=FACEBOOK_NAME_COL + 1).value = name
                print(f"  Row {row_idx}: {name}")
                success_count += 1
            else:
                print(f"  Row {row_idx}: No name for {username}")
                error_count += 1
        
        # Save progress periodically
        if batch_end % SAVE_EVERY == 0 or batch_end == total:
            print(f"  Saving progress ({batch_end} rows processed)...")
            wb.save(OUTPUT_FILE)
    
    # Final save
    wb.save(OUTPUT_FILE)
    print(f"\n=== COMPLETE ===")
    print(f"Output saved to: {OUTPUT_FILE}")
    print(f"Success: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    main()
