// ==UserScript==
// @name         Davie Supply - GLS Autofill Mobile
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-fill GLS shipping form from Davie Supply (Mobile - Kiwi Browser)
// @author       Davie Supply
// @match        https://gls-pakete.de/*
// @match        https://www.gls-pakete.de/*
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 Davie Supply GLS Autofill script loaded');

    // Auto-detect the Davie Supply URL from the referrer or use configured default
    function getDavieSupplyUrl() {
        // Check if we have a referrer from Davie Supply
        if (document.referrer && (document.referrer.includes('replit.dev') || document.referrer.includes('replit.app'))) {
            const url = new URL(document.referrer);
            return url.origin;
        }
        
        // Otherwise, try to get from current origin if it's a Replit URL
        if (window.location.hostname.includes('replit')) {
            // This means the script is being tested on the same domain
            return window.location.origin;
        }
        
        // Default fallback - USER SHOULD EDIT THIS LINE
        return 'https://YOUR_REPLIT_URL.replit.app';
    }

    // Complete country mappings for GLS (German labels required)
    const COUNTRY_MAP = {
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

    // Set value in React input (handles React's controlled components)
    function setInputValue(element, value) {
        if (!element || !value) return false;
        
        try {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(element, value);
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            
            console.log('✅ Set field:', value);
            return true;
        } catch (err) {
            console.error('❌ Error setting value:', err);
            return false;
        }
    }

    // Try multiple selectors to find and fill a field
    function fillField(selectors, value, label) {
        if (!value) return;
        
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                setInputValue(el, value);
                console.log(`✅ Filled ${label}`);
                return;
            }
        }
        console.warn(`⚠️ Could not find ${label}`);
    }

    // Select package size button (supports XS, S, M, L, XL)
    function selectPackageSize(size) {
        if (!size) return;
        
        console.log('📦 Selecting package size:', size);
        
        setTimeout(() => {
            const sizeButtons = document.querySelectorAll('button[data-value]');
            
            // Map all valid package sizes directly
            const validSizes = ['XS', 'S', 'M', 'L', 'XL'];
            const targetSize = validSizes.includes(size.toUpperCase()) ? size.toUpperCase() : 'M';
            
            for (const button of sizeButtons) {
                if (button.getAttribute('data-value') === targetSize) {
                    button.click();
                    console.log(`✅ Selected package size: ${targetSize}`);
                    return;
                }
            }
            console.warn(`⚠️ Could not find package size button for: ${targetSize}`);
        }, 500);
    }

    // Main autofill function
    function autofillForm(data) {
        console.log('📝 Autofilling form with data:', data);
        
        // Wait for form to be ready
        setTimeout(() => {
            const recipient = data.recipient;
            if (!recipient) {
                console.error('❌ No recipient data');
                return;
            }

            // Split name
            const nameParts = recipient.name ? recipient.name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Fill all fields
            fillField(['input[name="firstName"]', 'input[placeholder*="Vorname"]'], firstName, 'First Name');
            fillField(['input[name="lastName"]', 'input[placeholder*="Nachname"]'], lastName, 'Last Name');
            fillField(['input[name="company"]', 'input[placeholder*="Firma"]'], recipient.company, 'Company');
            fillField(['input[name="street"]', 'input[placeholder*="Straße"]'], recipient.street, 'Street');
            fillField(['input[name="houseNumber"]', 'input[placeholder*="Hausnummer"]'], recipient.houseNumber, 'House Number');
            fillField(['input[name="postcode"]', 'input[name="postalCode"]', 'input[placeholder*="PLZ"]'], recipient.postalCode, 'Postal Code');
            fillField(['input[name="city"]', 'input[placeholder*="Ort"]'], recipient.city, 'City');
            fillField(['input[name="email"]', 'input[type="email"]'], recipient.email, 'Email');
            fillField(['input[name="phone"]', 'input[type="tel"]'], recipient.phone, 'Phone');
            
            // Handle country (convert to German label)
            if (recipient.country) {
                const germanCountry = COUNTRY_MAP[recipient.country] || recipient.country;
                fillField(['input[name="country"]', 'input[placeholder*="Land"]'], germanCountry, 'Country');
            }

            // Select package size if provided
            if (data.packageSize) {
                selectPackageSize(data.packageSize);
            }

            console.log('✅ Form autofill complete!');
            
            // Show success message
            showNotification('✅ Form filled from Davie Supply!', 'success');
        }, 1000);
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 14px;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Fetch order data from Davie Supply
    function fetchOrderData(orderId) {
        const davieUrl = getDavieSupplyUrl();
        
        if (davieUrl.includes('YOUR_REPLIT_URL')) {
            showNotification('⚠️ Please edit the userscript and set your Davie Supply URL', 'error');
            console.error('❌ Davie Supply URL not configured. Edit the userscript and replace YOUR_REPLIT_URL with your actual domain.');
            return;
        }

        console.log('📡 Fetching order data from:', davieUrl);
        showNotification('📡 Loading order data...', 'info');

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${davieUrl}/api/gls-autofill-data/${orderId}`,
            headers: {
                'Accept': 'application/json'
            },
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('✅ Order data received:', data);
                    autofillForm(data);
                } catch (error) {
                    console.error('❌ Parse error:', error);
                    showNotification('❌ Invalid data from server', 'error');
                }
            },
            onerror: function(error) {
                console.error('❌ Network error:', error);
                showNotification('❌ Could not connect to Davie Supply', 'error');
            }
        });
    }

    // Check URL for order ID and auto-trigger
    function checkForOrderId() {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('davie_order_id');
        
        if (orderId) {
            console.log('🎯 Order ID found in URL:', orderId);
            // Wait for page to fully load
            setTimeout(() => {
                fetchOrderData(orderId);
            }, 1500);
        } else {
            console.log('ℹ️ No order ID in URL - add ?davie_order_id=XXX to auto-fill');
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForOrderId);
    } else {
        checkForOrderId();
    }

    console.log('✅ Davie Supply GLS Autofill ready');
})();
