# GLS Germany Autofill - Quick Start Guide

## 🎯 What You're Getting

A smart button that opens the GLS Germany website and helps you autofill shipping forms with one click. Perfect for German domestic shipments when you need affordable rates (from €3.29) without API complexity.

## 📦 What's Included

```
✓ GLSAutofillButton.tsx           - Main component with bookmarklet
✓ GLS-Integration-Example.tsx     - Usage examples  
✓ GLS-Settings-Integration.tsx    - Settings page component
✓ GLS-INTEGRATION-README.md       - Full documentation
```

## ⚡ 5-Minute Setup

### Step 1: Add the Component (2 min)

```bash
# Copy to your project
cp GLSAutofillButton.tsx src/components/shipping/
cp GLS-Settings-Integration.tsx src/components/settings/
```

### Step 2: Add to Settings Page (1 min)

```tsx
// In your /shipping or /settings page
import { GLSSettingsSection } from '@/components/settings/GLSSettingsSection';

<GLSSettingsSection />
```

### Step 3: Add to Order Pages (2 min)

```tsx
// In EditOrder.tsx, OrderDetails.tsx, or PickPack.tsx
import { GLSAutofillButton } from '@/components/shipping/GLSAutofillButton';

// In your shipping section:
{order.shippingCountry === 'Germany' && (
  <GLSAutofillButton
    recipientData={{
      name: customer.name,
      street: order.shippingStreet,
      postalCode: order.shippingPostalCode,
      city: order.shippingCity,
      email: customer.email,
      phone: customer.phone,
    }}
    senderData={{
      name: 'Your Name',
      company: 'Davie Supply GmbH',
      street: 'Your Street',
      postalCode: '95652',
      city: 'Waldsassen',
      email: 'info@daviesupply.com',
      phone: '+49 123 456789',
    }}
    packageSize="M"
    weight={order.totalWeight}
  />
)}
```

## 🎮 How to Use (Daily)

```
1. Open German order → Click "Ship with GLS"
2. GLS page opens → Click saved bookmarklet
3. Form autofills → Verify and submit
4. Get QR code → Show at PaketShop
```

### First Time Only: Save the Bookmarklet

When you first click "Ship with GLS", a dialog appears:
1. Drag the blue "GLS Autofill" button to your bookmarks bar
2. Done! Now you can use it for all future orders

## 💡 Why This Approach?

| ❌ Traditional API | ✅ Bookmarklet |
|-------------------|----------------|
| Weeks of approval | 5 min setup |
| Business accounts only | Works for everyone |
| Complex integration | Drag & drop |
| €€€ monthly fees | Free |

GLS Germany doesn't offer API access for low-volume shippers (< 250 packages/month), so this bookmarklet bridges the gap perfectly.

## 🚀 Features

- ✅ **Auto-fill recipient & sender data**
- ✅ **Smart package size detection**
- ✅ **Copy to clipboard fallback**
- ✅ **One-time bookmarklet setup**
- ✅ **Settings persistence**
- ✅ **Works for all German orders**

## 📊 Package Size Auto-Detection

The system automatically suggests:
- **XS** (2kg): Small items
- **S** (5kg): Books, accessories  
- **M** (10kg): Standard packages ← Most common
- **L** (20kg): Heavy items
- **XL** (31.5kg): Very heavy

## 🔧 Customization

Want to load sender from settings instead of hardcoding?

```tsx
// Add this hook in your component
const [senderData, setSenderData] = useState(null);

useEffect(() => {
  fetch('/api/settings/gls_default_sender_address')
    .then(r => r.json())
    .then(data => setSenderData(JSON.parse(data.value)));
}, []);

// Then use it:
<GLSAutofillButton
  recipientData={recipientData}
  senderData={senderData} // ← From settings
  packageSize={packageSize}
  weight={order.totalWeight}
/>
```

## 🆘 Troubleshooting

### Bookmarklet doesn't fill the form?
- GLS may have updated their form
- Use "Copy Details" button as fallback
- Fields copy to clipboard for manual paste

### Can't drag bookmarklet?
- Try right-click → "Bookmark This Link"
- Or click "Copy Code" and create bookmark manually

### Wrong data in fields?
- Check your order data format
- Verify sender settings are saved
- Name should be in "First Last" format

## 🎨 UI/UX Considerations

The button shows:
- "Ship with GLS" - Opens page + shows setup dialog
- "Copy Details" - Quick clipboard copy for manual entry

First-time users see a helpful setup dialog explaining:
- How to save the bookmarklet
- Where to click it (after GLS page loads)
- What it does (autofills the form)

## 📈 When to Use Each Carrier

**Use GLS when:**
- ✓ Shipping to Germany
- ✓ Low/medium volume (< 20 packages/month)
- ✓ Need affordable rates
- ✓ Okay with manual label creation

**Use PPL when:**
- ✓ Shipping to Czech Republic
- ✓ Need automated labels (you have API)
- ✓ Want dobírka (COD) support
- ✓ Higher volume

**Use DHL when:**
- ✓ Business shipping account
- ✓ International parcels
- ✓ Need tracking integration

## 🔮 Future Possibilities

If you get more volume:
1. Register as GLS business customer (250+ packages/year)
2. Get API access
3. Replace bookmarklet with full API integration
4. Automatic label generation like PPL

For now, the bookmarklet is perfect for your needs!

## 📝 Support & Resources

- **GLS Germany**: https://www.gls-pakete.de/
- **PaketShop Finder**: https://www.gls-pakete.de/paketshop-suche
- **Prices**: From €3.29 (domestic Germany)
- **Tracking**: Included for all packages

## ✨ Pro Tips

1. **Save your sender address in settings first** - Makes setup faster
2. **Keep bookmarklet visible** - Pin bookmarks bar if hidden
3. **Always verify before submitting** - Double-check addresses
4. **Use QR code** - No need to print labels at home
5. **Find closest PaketShop** - Over 9,000 locations in Germany

---

**Time to implement**: 5 minutes  
**Time saved per order**: ~2 minutes  
**ROI**: Immediate 🎉

Ready to start? Just copy the files and follow Step 1! 🚀
