export interface DHLAutofillData {
  orderId: string;
  recipient: {
    firstName: string;
    lastName: string;
    addressSupplement?: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
    email: string;
  };
  sender?: {
    firstName: string;
    lastName: string;
    addressSupplement?: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
    email: string;
  };
  packageSize: '2kg' | '5kg' | '10kg' | '20kg';
  codEnabled: boolean;
  codAmount?: number;
  bankDetails?: {
    iban: string;
    bic: string;
    accountHolder: string;
  };
  timestamp: number;
}

const DHL_AUTOFILL_KEY = 'wms_dhl_autofill_data';

export function saveDHLAutofillData(data: DHLAutofillData): void {
  localStorage.setItem(DHL_AUTOFILL_KEY, JSON.stringify(data));
}

export function getDHLAutofillData(): DHLAutofillData | null {
  const data = localStorage.getItem(DHL_AUTOFILL_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearDHLAutofillData(): void {
  localStorage.removeItem(DHL_AUTOFILL_KEY);
}

export const COUNTRY_TO_GERMAN: Record<string, string> = {
  'Germany': 'Deutschland',
  'Deutschland': 'Deutschland',
  'Austria': 'Österreich',
  'Österreich': 'Österreich',
  'Switzerland': 'Schweiz',
  'Schweiz': 'Schweiz',
  'France': 'Frankreich',
  'Frankreich': 'Frankreich',
  'Netherlands': 'Niederlande',
  'Niederlande': 'Niederlande',
  'Belgium': 'Belgien',
  'Belgien': 'Belgien',
  'Poland': 'Polen',
  'Polen': 'Polen',
  'Czech Republic': 'Tschechien',
  'Czechia': 'Tschechien',
  'Tschechien': 'Tschechien',
  'Denmark': 'Dänemark',
  'Dänemark': 'Dänemark',
  'Italy': 'Italien',
  'Italien': 'Italien',
  'Spain': 'Spanien',
  'Spanien': 'Spanien',
  'Portugal': 'Portugal',
  'Sweden': 'Schweden',
  'Schweden': 'Schweden',
  'Norway': 'Norwegen',
  'Norwegen': 'Norwegen',
  'Finland': 'Finnland',
  'Finnland': 'Finnland',
  'Luxembourg': 'Luxemburg',
  'Luxemburg': 'Luxemburg',
  'Hungary': 'Ungarn',
  'Ungarn': 'Ungarn',
  'Slovakia': 'Slowakei',
  'Slowakei': 'Slowakei',
  'Slovenia': 'Slowenien',
  'Slowenien': 'Slowenien',
  'Croatia': 'Kroatien',
  'Kroatien': 'Kroatien',
  'Romania': 'Rumänien',
  'Rumänien': 'Rumänien',
  'Bulgaria': 'Bulgarien',
  'Bulgarien': 'Bulgarien',
  'Greece': 'Griechenland',
  'Griechenland': 'Griechenland',
  'Ireland': 'Irland',
  'Irland': 'Irland',
  'United Kingdom': 'Vereinigtes Königreich',
  'UK': 'Vereinigtes Königreich',
};

export function generateBookmarkletCode(): string {
  return `javascript:(function(){
  var KEY='wms_dhl_autofill_data';
  var data;
  try{data=JSON.parse(localStorage.getItem(KEY));}catch(e){alert('No DHL autofill data found. Please prepare data in WMS first.');return;}
  if(!data){alert('No DHL autofill data found. Please prepare data in WMS first.');return;}
  
  var url=window.location.href;
  var isProductPage=url.includes('ShipmentEditorProductSelection');
  var isAddressPage=url.includes('ShipmentEditorAddressInput');
  
  function fill(sel,val){
    var el=document.querySelector(sel);
    if(el){
      el.value=val;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      el.dispatchEvent(new Event('blur',{bubbles:true}));
    }
  }
  
  function click(sel){
    var el=document.querySelector(sel);
    if(el)el.click();
  }
  
  function selectByText(sel,text){
    var el=document.querySelector(sel);
    if(el){
      var opts=el.querySelectorAll('option');
      for(var i=0;i<opts.length;i++){
        if(opts[i].textContent.trim().toLowerCase().includes(text.toLowerCase())){
          el.value=opts[i].value;
          el.dispatchEvent(new Event('change',{bubbles:true}));
          break;
        }
      }
    }
  }
  
  function findAndClick(text){
    var els=document.querySelectorAll('button,label,span,div');
    for(var i=0;i<els.length;i++){
      if(els[i].textContent.trim()===text||els[i].textContent.trim().includes(text)){
        els[i].click();
        return true;
      }
    }
    return false;
  }
  
  if(isProductPage){
    setTimeout(function(){
      selectByText('select[name*="country"],select[id*="country"],select[data-testid*="country"]',data.recipient.country);
      var sizeMap={'2kg':'S','5kg':'M','10kg':'L','20kg':'XL'};
      var size=sizeMap[data.packageSize]||data.packageSize;
      findAndClick(data.packageSize)||findAndClick(size);
      if(data.codEnabled){
        findAndClick('Nachnahme')||findAndClick('COD')||findAndClick('Cash on Delivery');
        setTimeout(function(){
          if(data.bankDetails){
            fill('input[name*="iban"],input[id*="iban"],input[placeholder*="IBAN"]',data.bankDetails.iban);
            fill('input[name*="bic"],input[id*="bic"],input[placeholder*="BIC"]',data.bankDetails.bic);
            fill('input[name*="holder"],input[id*="holder"],input[name*="kontoinhaber"],input[placeholder*="Kontoinhaber"]',data.bankDetails.accountHolder);
            fill('input[name*="amount"],input[id*="amount"],input[name*="betrag"],input[placeholder*="Betrag"]',data.codAmount.toFixed(2));
            fill('input[name*="reference"],input[id*="reference"],input[name*="verwendungszweck"],input[placeholder*="Verwendungszweck"]',data.orderId);
          }
        },500);
      }
      alert('Page 1 filled! Order: '+data.orderId+'\\nPackage: '+data.packageSize+'\\nCOD: '+(data.codEnabled?'Yes ('+data.codAmount+' EUR)':'No'));
    },300);
  }else if(isAddressPage){
    setTimeout(function(){
      var r=data.recipient;
      fill('input[name*="firstName"][data-type="recipient"],input[name*="vorname"]:not([data-type="sender"]),input[id*="recipientFirstName"],input[placeholder*="Vorname"]',r.firstName);
      fill('input[name*="lastName"][data-type="recipient"],input[name*="nachname"]:not([data-type="sender"]),input[id*="recipientLastName"],input[placeholder*="Nachname"]',r.lastName);
      fill('input[name*="street"][data-type="recipient"],input[name*="strasse"]:not([data-type="sender"]),input[id*="recipientStreet"],input[placeholder*="Straße"]',r.street);
      fill('input[name*="houseNumber"][data-type="recipient"],input[name*="hausnummer"]:not([data-type="sender"]),input[id*="recipientHouseNumber"],input[placeholder*="Hausnummer"]',r.houseNumber);
      fill('input[name*="postalCode"][data-type="recipient"],input[name*="plz"]:not([data-type="sender"]),input[id*="recipientPostalCode"],input[placeholder*="PLZ"]',r.postalCode);
      fill('input[name*="city"][data-type="recipient"],input[name*="ort"]:not([data-type="sender"]),input[id*="recipientCity"],input[placeholder*="Ort"]',r.city);
      fill('input[name*="email"][data-type="recipient"],input[id*="recipientEmail"],input[placeholder*="E-Mail"]',r.email);
      if(r.addressSupplement){
        fill('input[name*="addressSupplement"],input[name*="adresszusatz"],input[id*="addressSupplement"],input[placeholder*="Adresszusatz"]',r.addressSupplement);
      }
      if(data.sender){
        var s=data.sender;
        fill('input[name*="firstName"][data-type="sender"],input[name*="senderVorname"],input[id*="senderFirstName"]',s.firstName);
        fill('input[name*="lastName"][data-type="sender"],input[name*="senderNachname"],input[id*="senderLastName"]',s.lastName);
        fill('input[name*="street"][data-type="sender"],input[name*="senderStrasse"],input[id*="senderStreet"]',s.street);
        fill('input[name*="houseNumber"][data-type="sender"],input[name*="senderHausnummer"],input[id*="senderHouseNumber"]',s.houseNumber);
        fill('input[name*="postalCode"][data-type="sender"],input[name*="senderPlz"],input[id*="senderPostalCode"]',s.postalCode);
        fill('input[name*="city"][data-type="sender"],input[name*="senderOrt"],input[id*="senderCity"]',s.city);
        fill('input[name*="email"][data-type="sender"],input[id*="senderEmail"]',s.email);
      }
      alert('Address page filled!\\nRecipient: '+r.firstName+' '+r.lastName+'\\n'+r.street+' '+r.houseNumber+'\\n'+r.postalCode+' '+r.city);
    },300);
  }else{
    alert('Please navigate to DHL shipping label page first:\\nhttps://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html');
  }
})();`;
}

export function generateReadableBookmarklet(): string {
  return `
/*
 * DHL Autofill Bookmarklet for WMS
 * 
 * INSTALLATION:
 * 1. Create a new bookmark in your browser
 * 2. Name it "DHL Autofill"
 * 3. Copy the minified code below into the URL field
 * 4. Save the bookmark
 * 
 * USAGE:
 * 1. In WMS, click "Prepare DHL Autofill" button
 * 2. Open DHL website: https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html
 * 3. Click your "DHL Autofill" bookmark
 * 4. Navigate to address page and click bookmark again
 * 
 * MINIFIED CODE (copy this into bookmark URL):
 */

${generateBookmarkletCode()}
`;
}
