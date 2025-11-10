// ==UserScript==
// @name         Davie Supply - GLS Autofill (Mobile)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically fill GLS shipping form from Davie Supply order data (Mobile version for Kiwi Browser)
// @author       Davie Supply
// @match        https://gls-pakete.de/*
// @match        https://www.gls-pakete.de/*
// @grant        GM_xmlhttpRequest
// @connect      *.replit.dev
// @connect      *.replit.app
// ==/UserScript==

(function() {
    'use strict';

    // Configuration - UPDATE THIS URL TO YOUR ACTUAL DAVIE SUPPLY URL
    const DAVIE_SUPPLY_URL = window.location.origin.includes('replit') 
        ? window.location.origin 
        : 'https://YOUR_REPLIT_URL.replit.app';

    // Country name mappings for GLS form
    const countryMappings = {
        'Germany': 'Deutschland',
        'Belgium': 'Belgien',
        'Netherlands': 'Niederlande',
        'Austria': 'Österreich',
        'France': 'Frankreich',
        'Czech Republic': 'Tschechien',
        'Denmark': 'Dänemark',
        'Poland': 'Polen',
        'Switzerland': 'Schweiz',
        'Italy': 'Italien',
        'Spain': 'Spanien',
        'Sweden': 'Schweden',
        'Norway': 'Norwegen',
        'Finland': 'Finnland',
        'Portugal': 'Portugal',
        'Luxembourg': 'Luxemburg',
        'Ireland': 'Irland',
        'Slovakia': 'Slowakei',
        'Slovenia': 'Slowenien',
        'Croatia': 'Kroatien',
        'Hungary': 'Ungarn',
        'Romania': 'Rumänien',
        'Bulgaria': 'Bulgarien',
        'Greece': 'Griechenland'
    };

    // Helper function to set value using React-compatible approach
    function setReactValue(element, value) {
        if (!element) return false;
        
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(element, value);
        
        // Dispatch all necessary events for React
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        
        return true;
    }

    // Helper function to try multiple selectors
    function trySetValue(selectors, value, fieldName) {
        if (!value) return false;
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const success = setReactValue(element, value);
                if (success) {
                    console.log(`✅ Set ${fieldName}: ${value}`);
                    return true;
                }
            }
        }
        
        console.warn(`⚠️ Could not find element for ${fieldName}`);
        return false;
    }

    // Function to select package size
    function selectPackageSize(size) {
        console.log('📦 Selecting package size:', size);
        
        // Try to find package size buttons
        const sizeButtons = document.querySelectorAll('button[data-value]');
        
        if (sizeButtons.length > 0) {
            // Determine which size to select
            const targetSize = size === 'XS' ? 'XS' : 'S';
            
            // Find and click the appropriate button
            for (const button of sizeButtons) {
                const buttonValue = button.getAttribute('data-value');
                if (buttonValue === targetSize) {
                    button.click();
                    console.log(`✅ Selected package size: ${targetSize}`);
                    return;
                }
            }
        }
        
        console.warn('⚠️ Could not find package size buttons');
    }

    // Function to set country with dropdown handling
    function setCountry(countryName) {
        return new Promise((resolve) => {
            console.log('🌍 Setting country:', countryName);
            
            // Map to German name if needed
            const germanName = countryMappings[countryName] || countryName;
            console.log('🌍 Mapped to German name:', germanName);
            
            // Find country input field
            const countryInput = document.querySelector('input[name="country"]') || 
                                document.querySelector('input[placeholder*="Land"]');
            
            if (!countryInput) {
                console.warn('⚠️ Country input not found');
                resolve();
                return;
            }
            
            // Set the value
            setReactValue(countryInput, germanName);
            
            // Wait for dropdown to appear
            setTimeout(() => {
                // Try to find and click the dropdown option
                const dropdownOptions = document.querySelectorAll('[role="option"]');
                let optionFound = false;
                
                for (const option of dropdownOptions) {
                    if (option.textContent.trim() === germanName) {
                        option.click();
                        optionFound = true;
                        console.log('✅ Selected country from dropdown');
                        break;
                    }
                }
                
                // If no option found, try pressing Enter
                if (!optionFound) {
                    countryInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                    console.log('⌨️ Pressed Enter on country field');
                }
                
                // Blur the field
                setTimeout(() => {
                    countryInput.blur();
                    
                    // Verify it was set
                    setTimeout(() => {
                        if (countryInput.value === germanName) {
                            console.log('✅ Country set successfully');
                        } else {
                            console.warn('⚠️ Country value may not have been set correctly');
                        }
                        resolve();
                    }, 150);
                }, 200);
            }, 200);
        });
    }

    // Main autofill function
    async function autofillGLSForm(data) {
        console.log('🚀 Starting GLS autofill...', data);
        
        // Split recipient name
        const nameParts = data.recipient.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // Fill recipient fields
        trySetValue([
            'input[name="firstName"]',
            'input[name="firstname"]',
            'input[placeholder="Vorname"]'
        ], firstName, 'First Name');
        
        trySetValue([
            'input[name="lastName"]',
            'input[name="lastname"]',
            'input[placeholder="Nachname"]'
        ], lastName, 'Last Name');
        
        trySetValue([
            'input[name="company"]',
            'input[placeholder*="Firma"]'
        ], data.recipient.company, 'Company');
        
        trySetValue([
            'input[name="street"]',
            'input[placeholder*="Straße"]'
        ], data.recipient.street, 'Street');
        
        trySetValue([
            'input[name="houseNumber"]',
            'input[name="housenumber"]',
            'input[placeholder*="Hausnummer"]'
        ], data.recipient.houseNumber, 'House Number');
        
        trySetValue([
            'input[name="postcode"]',
            'input[name="postalCode"]',
            'input[placeholder*="PLZ"]'
        ], data.recipient.postalCode, 'Postal Code');
        
        trySetValue([
            'input[name="city"]',
            'input[placeholder*="Ort"]'
        ], data.recipient.city, 'City');
        
        trySetValue([
            'input[name="email"]',
            'input[type="email"]'
        ], data.recipient.email, 'Email');
        
        // Set country and wait for it to complete
        if (data.recipient.country) {
            await setCountry(data.recipient.country);
            
            // Re-validate all fields after country selection (React may have cleared them)
            console.log('🔄 Re-validating fields after country selection...');
            
            setTimeout(() => {
                trySetValue(['input[name="firstName"]', 'input[placeholder="Vorname"]'], firstName, 'First Name (re-fill)');
                trySetValue(['input[name="lastName"]', 'input[placeholder="Nachname"]'], lastName, 'Last Name (re-fill)');
                trySetValue(['input[name="company"]', 'input[placeholder*="Firma"]'], data.recipient.company, 'Company (re-fill)');
                trySetValue(['input[name="street"]'], data.recipient.street, 'Street (re-fill)');
                trySetValue(['input[name="houseNumber"]', 'input[name="housenumber"]'], data.recipient.houseNumber, 'House Number (re-fill)');
                trySetValue(['input[name="postcode"]'], data.recipient.postalCode, 'Postal Code (re-fill)');
                trySetValue(['input[name="city"]'], data.recipient.city, 'City (re-fill)');
                trySetValue(['input[name="email"]', 'input[type="email"]'], data.recipient.email, 'Email (re-fill)');
                
                // Select package size after a delay
                setTimeout(() => {
                    if (data.packageSize) {
                        selectPackageSize(data.packageSize);
                    }
                }, 200);
            }, 500);
        }
        
        console.log('✅ Autofill complete!');
    }

    // Function to fetch order data from Davie Supply
    function fetchOrderData() {
        // Extract order ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('davie_order_id');
        
        if (!orderId) {
            alert('No order ID found in URL. Please use the "Ship with GLS" button from Davie Supply.');
            return;
        }
        
        console.log('📦 Fetching order data for ID:', orderId);
        
        // Use GM_xmlhttpRequest to bypass CORS
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${DAVIE_SUPPLY_URL}/api/gls-autofill-data/${orderId}`,
            headers: {
                'Accept': 'application/json'
            },
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('✅ Received order data:', data);
                    autofillGLSForm(data);
                } catch (error) {
                    console.error('❌ Error parsing response:', error);
                    alert('Error loading order data. Please try again.');
                }
            },
            onerror: function(error) {
                console.error('❌ Network error:', error);
                alert('Could not connect to Davie Supply. Please check your connection.');
            }
        });
    }

    // Add autofill button to the page
    function addAutofillButton() {
        // Check if we're on the right page (shipping form page)
        if (!document.querySelector('input[name="firstName"]') && !document.querySelector('input[placeholder="Vorname"]')) {
            return;
        }
        
        // Check if button already exists
        if (document.querySelector('#davie-autofill-btn')) {
            return;
        }
        
        // Create button
        const button = document.createElement('button');
        button.id = 'davie-autofill-btn';
        button.textContent = '📦 Autofill from Davie Supply';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        button.onmouseover = function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
        };
        
        button.onmouseout = function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        };
        
        button.onclick = function() {
            fetchOrderData();
        };
        
        document.body.appendChild(button);
        console.log('✅ Davie Supply autofill button added');
    }

    // Wait for page to load and add button
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addAutofillButton);
    } else {
        addAutofillButton();
    }
    
    // Also watch for navigation changes (for SPAs)
    setInterval(addAutofillButton, 2000);
})();
