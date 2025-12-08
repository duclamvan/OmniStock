import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, BookmarkIcon, Info, Zap, PlayCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';

interface DHLAutofillButtonProps {
  recipientData: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  senderData?: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    email?: string;
    phone?: string;
  };
  bankData?: {
    iban?: string;
    bic?: string;
    accountHolder?: string;
  };
  orderId?: string;
  codAmount?: number;
  weight?: number;
  cartonCount?: number;
  disabled?: boolean;
}

const BOOKMARKLET_VERSION = "1.0.0";
const DHL_STORAGE_KEY = 'dhl_autofill_data';

export function DHLAutofillButton({ 
  recipientData, 
  senderData, 
  bankData,
  orderId,
  codAmount,
  weight,
  cartonCount,
  disabled = false
}: DHLAutofillButtonProps) {
  const [showBookmarkletDialog, setShowBookmarkletDialog] = useState(false);
  const [showDebugData, setShowDebugData] = useState(false);
  const [dataPrepared, setDataPrepared] = useState(false);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation('orders');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const shouldShowBookmarkletDialog = (): boolean => {
    try {
      const storedVersion = localStorage.getItem('dhl_bookmarklet_version');
      if (!storedVersion || storedVersion !== BOOKMARKLET_VERSION) {
        localStorage.setItem('dhl_bookmarklet_version', BOOKMARKLET_VERSION);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return true;
    }
  };

  const saveDataToLocalStorage = () => {
    const autofillData = {
      orderId: orderId || '',
      recipient: {
        firstName: recipientData.firstName || '',
        lastName: recipientData.lastName || '',
        company: recipientData.company || '',
        street: recipientData.street || '',
        houseNumber: recipientData.houseNumber || '',
        postalCode: recipientData.postalCode || '',
        city: recipientData.city || '',
        country: recipientData.country || 'DE',
        email: recipientData.email || '',
        phone: recipientData.phone || '',
      },
      sender: senderData ? {
        firstName: senderData.firstName || '',
        lastName: senderData.lastName || '',
        company: senderData.company || '',
        street: senderData.street || '',
        houseNumber: senderData.houseNumber || '',
        postalCode: senderData.postalCode || '',
        city: senderData.city || '',
        email: senderData.email || '',
        phone: senderData.phone || '',
      } : undefined,
      codAmount: codAmount || 0,
      bank: bankData ? {
        iban: bankData.iban || '',
        bic: bankData.bic || '',
        accountHolder: bankData.accountHolder || '',
      } : undefined,
      weight: weight || 0,
      cartonCount: 1, // DHL DE always handles 1 carton (COD), rest goes via GLS
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(DHL_STORAGE_KEY, JSON.stringify(autofillData));
      console.log('🟡 DHL Autofill - Data saved to localStorage:', autofillData);
      return true;
    } catch (error) {
      console.error('Failed to save DHL autofill data:', error);
      return false;
    }
  };

  const generateBookmarkletCode = () => {
    const data = {
      orderId: orderId || '',
      recipient: {
        firstName: recipientData.firstName || '',
        lastName: recipientData.lastName || '',
        company: recipientData.company || '',
        street: recipientData.street || '',
        houseNumber: recipientData.houseNumber || '',
        postalCode: recipientData.postalCode || '',
        city: recipientData.city || '',
        country: recipientData.country || 'Deutschland',
        email: recipientData.email || '',
        phone: recipientData.phone || '',
      },
      sender: senderData ? {
        firstName: senderData.firstName || '',
        lastName: senderData.lastName || '',
        company: senderData.company || '',
        street: senderData.street || '',
        houseNumber: senderData.houseNumber || '',
        postalCode: senderData.postalCode || '',
        city: senderData.city || '',
        email: senderData.email || '',
        phone: senderData.phone || '',
      } : null,
      codAmount: codAmount || 0,
      bank: bankData ? {
        iban: bankData.iban || '',
        bic: bankData.bic || '',
        accountHolder: bankData.accountHolder || '',
      } : null,
      weight: weight || 0,
    };

    const jsonStr = JSON.stringify(data);
    const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));

    const bookmarkletLogic = `(function(){
var data=JSON.parse(decodeURIComponent(escape(atob('${base64Data}'))));
console.log('DHL data:',data);
var log=[];
var okCount=0;
var failCount=0;
function L(m){console.log(m);log.push(m);if(m.startsWith('OK '))okCount++;if(m.startsWith('FAIL '))failCount++;}
function showSuccess(title,nextStep,showDetails){
var msg='\\u2705 '+title+'\\n\\n';
msg+='Filled: '+okCount+' fields';
if(failCount>0)msg+=' | Failed: '+failCount;
msg+='\\n\\n\\u27A1 NEXT: '+nextStep;
if(showDetails){msg+='\\n\\n--- Log ---\\n';for(var i=0;i<log.length;i++)msg+=log[i]+'\\n';}
alert(msg);
}
function showError(title,instruction){
alert('\\u274C '+title+'\\n\\n'+instruction);
}
function insertText(el,text){
if(!el||!text)return false;
el.focus();
el.click();
el.select&&el.select();
try{
if(document.execCommand){
document.execCommand('selectAll',false,null);
document.execCommand('insertText',false,text);
L('execCommand: '+text);
return el.value===text;
}
}catch(e){}
var ns=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
ns.call(el,text);
el.dispatchEvent(new InputEvent('input',{data:text,inputType:'insertText',bubbles:true,cancelable:true}));
el.dispatchEvent(new Event('change',{bubbles:true}));
L('InputEvent: '+text);
return el.value===text;
}
function waitFor(fn,cb,maxWait){
var start=Date.now();
var check=function(){
var result=fn();
if(result){cb(result);return;}
if(Date.now()-start<(maxWait||5000)){setTimeout(check,200);}
else{L('Timeout waiting');cb(null);}
};
check();
}
function findInput(labelMatch){
var inputs=document.querySelectorAll('input');
for(var i=0;i<inputs.length;i++){
var inp=inputs[i];
var p=inp.parentElement;
while(p&&p.tagName!=='BODY'){
var txt=(p.textContent||'').toLowerCase();
if(txt.includes(labelMatch)&&txt.length<200){
if(!inp.disabled&&inp.offsetParent!==null)return inp;
}
p=p.parentElement;
}
}
return null;
}
function selectCountry(){
var inp=findInput('zielland')||findInput('zielregion')||document.querySelector('input');
if(inp){
inp.focus();
inp.click();
insertText(inp,'Deutschland');
L('Typed Deutschland');
setTimeout(function(){
var options=document.querySelectorAll('li,div[role="option"],button,a');
var found=false;
for(var i=0;i<options.length;i++){
var opt=options[i];
var txt=opt.textContent||'';
if(txt.trim()==='Deutschland'||(txt.includes('Deutschland')&&txt.length<30)){
opt.click();
L('Clicked dropdown: '+txt.trim().substring(0,20));
found=true;
break;
}
}
if(!found){
inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true}));
L('Country: Enter fallback');
}
},500);
}
}
function selectPackage(){
var w=data.weight||5;
var kg=w<=2?'2 kg':w<=5?'5 kg':w<=10?'10 kg':'20 kg';
var btns=document.querySelectorAll('button');
for(var i=0;i<btns.length;i++){
var b=btns[i];
var c=b.parentElement&&b.parentElement.parentElement;
if(c&&c.textContent&&c.textContent.includes(kg)&&c.textContent.toLowerCase().includes('paket')&&!c.textContent.toLowerCase().includes('päckchen')){
b.click();
L('Package: '+kg);
return;
}
}
}
function clickNachnahme(){
var labels=document.querySelectorAll('label,div,span');
for(var i=0;i<labels.length;i++){
var el=labels[i];
if(el.textContent&&el.textContent.includes('Nachnahme')&&el.textContent.length<80){
var cb=el.querySelector('input[type="checkbox"]');
if(cb&&!cb.checked){cb.click();L('Checked Nachnahme');return true;}
el.click();L('Clicked Nachnahme');return true;
}
}
return false;
}
function findFieldByLabel(labelText){
var inputs=document.querySelectorAll('input');
for(var i=0;i<inputs.length;i++){
var inp=inputs[i];
if(inp.type==='checkbox'||inp.type==='hidden')continue;
var wrapper=inp.parentElement;
if(wrapper){
var wrapperText=wrapper.textContent||'';
if(wrapperText.toLowerCase().includes(labelText.toLowerCase())&&wrapperText.length<100){
if(inp.offsetParent!==null)return inp;
}
}
var prev=inp.previousElementSibling;
if(prev&&prev.textContent&&prev.textContent.toLowerCase().includes(labelText.toLowerCase())){
if(inp.offsetParent!==null)return inp;
}
}
return null;
}
function forceType(inp,val,retries,cb){
inp.scrollIntoView({block:'center'});
inp.click();
inp.focus();
setTimeout(function(){
inp.value='';
var ns=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
ns.call(inp,'');
inp.dispatchEvent(new Event('input',{bubbles:true}));
setTimeout(function(){
inp.click();
inp.focus();
setTimeout(function(){
try{
document.execCommand('selectAll',false,null);
document.execCommand('insertText',false,val);
}catch(e){}
setTimeout(function(){
if(inp.value!==val){
ns.call(inp,val);
inp.dispatchEvent(new InputEvent('input',{data:val,inputType:'insertText',bubbles:true}));
}
inp.dispatchEvent(new Event('change',{bubbles:true}));
inp.dispatchEvent(new Event('blur',{bubbles:true}));
setTimeout(function(){
if(inp.value===val){
cb(true);
}else if(retries>0){
L('Retry left: '+retries);
forceType(inp,val,retries-1,cb);
}else{
cb(false);
}
},300);
},200);
},200);
},200);
},300);
}
function fillOneField(inp,val,lbl,cb){
L('Filling '+lbl+'...');
forceType(inp,val,3,function(ok){
L((ok?'OK ':'FAIL ')+lbl+': '+(ok?val:inp.value));
setTimeout(cb,300);
});
}
function fillAllCOD(){
var iban=data.bank?data.bank.iban:'';
var bic=data.bank?data.bank.bic:'';
var holder=data.bank?data.bank.accountHolder:'';
var amt=data.codAmount?data.codAmount.toFixed(2):'';
var ref=data.orderId||'';
var fieldDefs=[
{label:'iban',val:iban,name:'IBAN'},
{label:'bic',val:bic,name:'BIC'},
{label:'kontoinhaber',val:holder,name:'Kontoinhaber'},
{label:'betrag',val:amt,name:'Betrag'},
{label:'verwendungszweck',val:ref,name:'Verwendungszweck'}
];
var codInputs=[];
var labels=[];
var values=[];
for(var i=0;i<fieldDefs.length;i++){
var fd=fieldDefs[i];
if(!fd.val)continue;
var inp=findFieldByLabel(fd.label);
if(inp){
codInputs.push(inp);
labels.push(fd.name);
values.push(fd.val);
L('Found '+fd.name+' field');
}else{
L('NOT FOUND: '+fd.name);
}
}
L('Found '+codInputs.length+' COD fields by label');
var idx=0;
function fillNext(){
if(idx>=codInputs.length||idx>=values.length){
showSuccess('Product Page Complete!','Click WEITER to proceed to address entry.',false);
return;
}
var inp=codInputs[idx];
var val=values[idx];
var lbl=labels[idx];
if(val){
fillOneField(inp,val,lbl,function(){
idx++;
fillNext();
});
}else{
idx++;
fillNext();
}
}
fillNext();
}
function findAllFieldsByLabel(labelText){
var results=[];
var inputs=document.querySelectorAll('input');
for(var i=0;i<inputs.length;i++){
var inp=inputs[i];
if(inp.type==='checkbox'||inp.type==='hidden')continue;
if(inp.offsetParent===null)continue;
var wrapper=inp.parentElement;
if(wrapper){
var wrapperText=wrapper.textContent||'';
if(wrapperText.toLowerCase().includes(labelText.toLowerCase())&&wrapperText.length<100){
results.push(inp);
continue;
}
}
var prev=inp.previousElementSibling;
if(prev&&prev.textContent&&prev.textContent.toLowerCase().includes(labelText.toLowerCase())){
results.push(inp);
}
}
return results;
}
function fillAddressPage(){
L('Filling Address Page...');
var allInputs=[];
var allLabels=[];
var allValues=[];
var recipientFields=[
{label:'vor- und nachname',val:(data.recipient.firstName+' '+data.recipient.lastName).trim(),name:'R:Name'},
{label:'adresszusatz',val:data.recipient.company||'',name:'R:Adresszusatz'},
{label:'plz',val:data.recipient.postalCode,name:'R:PLZ'},
{label:'wohnort',val:data.recipient.city,name:'R:City'},
{label:'straße',val:data.recipient.street,name:'R:Street'},
{label:'hausnummer',val:data.recipient.houseNumber,name:'R:HouseNo'},
{label:'e-mail des empfängers',val:data.recipient.email||'',name:'R:Email'}
];
for(var i=0;i<recipientFields.length;i++){
var fd=recipientFields[i];
if(!fd.val)continue;
var matches=findAllFieldsByLabel(fd.label);
if(matches.length>0){
allInputs.push(matches[0]);
allLabels.push(fd.name);
allValues.push(fd.val);
L('Found '+fd.name);
}else{
L('NOT FOUND: '+fd.name);
}
}
if(data.sender){
L('Filling Sender...');
var senderFields=[
{label:'vor- und nachname',val:(data.sender.firstName+' '+data.sender.lastName).trim(),name:'S:Name'},
{label:'adresszusatz',val:data.sender.company||'',name:'S:Adresszusatz'},
{label:'plz',val:data.sender.postalCode,name:'S:PLZ'},
{label:'wohnort',val:data.sender.city,name:'S:City'},
{label:'straße',val:data.sender.street,name:'S:Street'},
{label:'hausnummer',val:data.sender.houseNumber,name:'S:HouseNo'},
{label:'e-mail',val:data.sender.email||'',name:'S:Email'}
];
for(var j=0;j<senderFields.length;j++){
var sf=senderFields[j];
if(!sf.val)continue;
var smatches=findAllFieldsByLabel(sf.label);
if(smatches.length>=2){
allInputs.push(smatches[1]);
allLabels.push(sf.name);
allValues.push(sf.val);
L('Found '+sf.name+' (2nd match)');
}else if(smatches.length===1&&sf.label==='e-mail'){
allInputs.push(smatches[0]);
allLabels.push(sf.name);
allValues.push(sf.val);
L('Found '+sf.name);
}else{
L('NOT FOUND: '+sf.name);
}
}
}
L('Found '+allInputs.length+' total fields');
var aidx=0;
function fillAddrNext(){
if(aidx>=allInputs.length){
showSuccess('Address Page Complete!','Verify addresses, then click WEITER to proceed to package contents.',false);
return;
}
var inp=allInputs[aidx];
var val=allValues[aidx];
var lbl=allLabels[aidx];
fillOneField(inp,val,lbl,function(){
aidx++;
fillAddrNext();
});
}
setTimeout(fillAddrNext,500);
}
function detectPageAndFill(){
var url=window.location.href.toLowerCase();
var pageText=document.body.textContent||'';
L('URL: '+url.substring(0,80));
if(url.includes('productselection')){
L('Detected: Product Selection Page (by URL)');
selectCountry();
setTimeout(function(){
selectPackage();
setTimeout(function(){
if(data.codAmount>0){
clickNachnahme();
L('Waiting for Nachnahme form...');
setTimeout(function(){
clickNachnahme();
setTimeout(function(){
var checkCount=0;
function waitForForm(){
var inputs=document.querySelectorAll('input');
var ibanFound=false;
for(var i=0;i<inputs.length;i++){
var p=inputs[i].parentElement;
if(p&&p.textContent&&p.textContent.toLowerCase().includes('iban')){
ibanFound=true;
break;
}
}
if(ibanFound){
L('Nachnahme form ready');
setTimeout(fillAllCOD,500);
}else if(checkCount<20){
checkCount++;
L('Waiting... '+checkCount);
setTimeout(waitForForm,300);
}else{
L('Timeout waiting for form');
showError('COD Form Not Found','Scroll down and click on "Nachnahme" to expand it, then run bookmarklet again.');
}
}
waitForForm();
},1500);
},1000);
}else{
showSuccess('Product Page Complete!','Click WEITER to proceed to address entry.',false);
}
},600);
},600);
}else if(url.includes('addressinput')){
L('Detected: Address Page (by URL)');
fillAddressPage();
}else if(pageText.includes('Adressdaten')||pageText.includes('Vor- und Nachname')){
L('Detected: Address Page (by content)');
fillAddressPage();
}else if(pageText.includes('Produktauswahl')||pageText.includes('Services ergänzen')){
L('Detected: Product Selection Page (by content)');
selectCountry();
setTimeout(function(){
selectPackage();
setTimeout(function(){
if(data.codAmount>0){
clickNachnahme();
L('Waiting for Nachnahme form...');
setTimeout(function(){
clickNachnahme();
setTimeout(function(){
var checkCount=0;
function waitForForm2(){
var inputs=document.querySelectorAll('input');
var ibanFound=false;
for(var i=0;i<inputs.length;i++){
var p=inputs[i].parentElement;
if(p&&p.textContent&&p.textContent.toLowerCase().includes('iban')){
ibanFound=true;
break;
}
}
if(ibanFound){
L('Nachnahme form ready');
setTimeout(fillAllCOD,500);
}else if(checkCount<20){
checkCount++;
setTimeout(waitForForm2,300);
}else{
showError('COD Form Not Found','Scroll down and click on "Nachnahme" to expand it, then run bookmarklet again.');
}
}
waitForForm2();
},1500);
},1000);
}else{
showSuccess('Product Page Complete!','Click WEITER to proceed to address entry.',false);
}
},600);
},600);
}else{
L('Unknown page');
showError('Page Not Recognized','Navigate to Product Selection or Address Input page first.');
}
}
detectPageAndFill();
})();`;

    return `javascript:${encodeURIComponent(bookmarkletLogic.replace(/[\r\n]+/g, ''))}`;
  };

  const bookmarkletCode = generateBookmarkletCode();

  useEffect(() => {
    if (bookmarkletRef.current) {
      bookmarkletRef.current.href = bookmarkletCode;
    }
  }, [bookmarkletCode]);

  const openDHLPage = () => {
    window.open('https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html?type=ShipmentEditorProductSelection', '_blank');
  };

  const handleButtonClick = () => {
    saveDataToLocalStorage();
    setDataPrepared(true);
    openDHLPage();
    
    if (!isMobile && shouldShowBookmarkletDialog()) {
      setShowBookmarkletDialog(true);
    }
    
    toast({
      title: t('dhlAutofillPrepared'),
      description: t('dhlAutofillOpenedDescription'),
      duration: 5000
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleButtonClick}
          disabled={disabled}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold w-full sm:flex-1"
          data-testid="button-dhl-create-label"
        >
          <ExternalLink className="h-4 w-4" />
          Ship DHL DE (1 carton + COD)
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            saveDataToLocalStorage();
            setDataPrepared(true);
            toast({
              title: "Details copied",
              description: "Shipping details saved for autofill!",
            });
          }}
          className="flex items-center gap-2 hidden sm:flex"
          data-testid="button-copy-dhl-details"
        >
          <Copy className="h-4 w-4" />
          Copy Details
        </Button>
      </div>
      
      {!isMobile && (
        <button
          onClick={() => setShowBookmarkletDialog(true)}
          className="text-xs text-yellow-600 hover:text-yellow-800 hover:underline transition-colors"
          data-testid="link-view-setup"
        >
          {t('viewSetupInstructions')}
        </button>
      )}

      <Dialog open={showBookmarkletDialog} onOpenChange={setShowBookmarkletDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookmarkIcon className="h-5 w-5 text-yellow-600" />
              DHL Autofill - Order {orderId}
            </DialogTitle>
            <DialogDescription className="text-sm">
              This bookmarklet contains data for current order. Use it on DHL page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 sm:p-4 bg-muted">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">📋 How to use:</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                <li>DHL page should be open now</li>
                <li>Drag the button below to your bookmarks bar OR copy the code</li>
                <li>Click the bookmarklet on the DHL page to auto-fill</li>
                <li>Verify details and complete shipment</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">1. Drag to bookmarks bar:</h3>
              <div className="flex justify-center p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 rounded border-2 border-dashed border-yellow-300">
                <a
                  ref={bookmarkletRef}
                  href={bookmarkletCode}
                  className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 cursor-move text-sm font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: t('dragToBookmarksBar'),
                      description: t('dragToBookmarksBarDesc'),
                    });
                  }}
                  data-testid="link-bookmarklet"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  DHL Autofill
                </a>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Or right-click and "Add to Bookmarks"
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">2. Or copy manually:</h3>
              <div className="relative">
                <pre className="p-2 sm:p-3 bg-muted rounded text-xs overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all max-h-24">
                  {bookmarkletCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(bookmarkletCode);
                    toast({
                      title: t('copied'),
                      description: t('bookmarkletCodeCopied'),
                    });
                  }}
                  data-testid="button-copy-bookmarklet"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a bookmark, paste as URL, click on DHL page
              </p>
            </div>

            <div className="rounded-lg border p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950/20">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm sm:text-base">⚠️ Important:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                <li>Works directly on DHL website</li>
                <li><strong>Each order has unique bookmarklet with embedded data</strong></li>
                <li>Always verify auto-filled details</li>
                <li>Copy or drag the bookmarklet code to use</li>
              </ul>
            </div>

            <div className="rounded-lg border p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20">
              <button
                onClick={() => setShowDebugData(!showDebugData)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm sm:text-base">
                  🔍 Debug: View Data to be Sent
                </h3>
                <span className="text-blue-600 dark:text-blue-400 text-sm">
                  {showDebugData ? '▼' : '▶'}
                </span>
              </button>
              
              {showDebugData && (
                <div className="mt-3 space-y-2">
                  <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Recipient:</p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(recipientData, null, 2)}
                    </pre>
                  </div>
                  
                  {senderData && (
                    <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Sender:</p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(senderData, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {bankData && (
                    <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Bank Details:</p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(bankData, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Package Info:</p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300">
Order ID: {orderId}
COD Amount: {codAmount ? `€${codAmount.toFixed(2)}` : 'None'}
Weight: {weight ? `${weight} kg` : 'Not specified'}
Cartons: 1 (DHL COD only, rest via GLS)
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBookmarkletDialog(false)}
                className="flex-1"
                data-testid="button-close-dialog"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  openDHLPage();
                  setShowBookmarkletDialog(false);
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                data-testid="button-open-dhl-again"
              >
                Open DHL Page Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
