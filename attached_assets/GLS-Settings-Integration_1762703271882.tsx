// GLS Settings Integration
// Add this to your settings page (/shipping or /settings)

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface GLSSenderAddress {
  name: string;
  company: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
}

export function GLSSettingsSection() {
  const [senderAddress, setSenderAddress] = useState<GLSSenderAddress>({
    name: '',
    company: 'Davie Supply GmbH',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: 'Waldsassen',
    country: 'Deutschland',
    email: '',
    phone: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load saved settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/gls_default_sender_address');
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          setSenderAddress(JSON.parse(data.value));
        }
      }
    } catch (error) {
      console.error('Failed to load GLS settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'gls_default_sender_address',
          value: JSON.stringify(senderAddress),
          category: 'shipping',
        }),
      });

      if (response.ok) {
        toast.success('GLS sender address saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save GLS settings:', error);
      toast.error('Failed to save GLS settings');
    } finally {
      setIsLoading(false);
    }
  };

  const testBookmarklet = () => {
    const testData = {
      recipient: {
        name: 'Max Mustermann',
        company: 'Test GmbH',
        street: 'Teststraße',
        houseNumber: '42',
        postalCode: '10115',
        city: 'Berlin',
        country: 'Deutschland',
        email: 'test@example.com',
        phone: '+49 30 12345678',
      },
      sender: senderAddress,
      packageSize: 'M',
      weight: 5,
    };

    const bookmarklet = `javascript:(function(){const data=${JSON.stringify(testData)};alert('Test data ready! Bookmarklet would autofill:\\n\\nRecipient: '+data.recipient.name+'\\nSender: '+data.sender.company);})();`;
    
    window.open('https://www.gls-pakete.de/privatkunden/paketversand/paketkonfiguration', '_blank');
    
    setTimeout(() => {
      toast.info('After page loads, you can test the bookmarklet by saving it to your bookmarks bar');
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>GLS Germany - Private Customer Shipping</CardTitle>
        <CardDescription>
          Configure your default sender address for GLS shipments. This will be used to auto-fill the GLS web form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gls-name">Contact Person Name</Label>
            <Input
              id="gls-name"
              value={senderAddress.name}
              onChange={(e) => setSenderAddress({ ...senderAddress, name: e.target.value })}
              placeholder="Your Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-company">Company Name</Label>
            <Input
              id="gls-company"
              value={senderAddress.company}
              onChange={(e) => setSenderAddress({ ...senderAddress, company: e.target.value })}
              placeholder="Davie Supply GmbH"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-street">Street</Label>
            <Input
              id="gls-street"
              value={senderAddress.street}
              onChange={(e) => setSenderAddress({ ...senderAddress, street: e.target.value })}
              placeholder="Street name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-houseNumber">House Number</Label>
            <Input
              id="gls-houseNumber"
              value={senderAddress.houseNumber}
              onChange={(e) => setSenderAddress({ ...senderAddress, houseNumber: e.target.value })}
              placeholder="123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-postalCode">Postal Code</Label>
            <Input
              id="gls-postalCode"
              value={senderAddress.postalCode}
              onChange={(e) => setSenderAddress({ ...senderAddress, postalCode: e.target.value })}
              placeholder="95652"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-city">City</Label>
            <Input
              id="gls-city"
              value={senderAddress.city}
              onChange={(e) => setSenderAddress({ ...senderAddress, city: e.target.value })}
              placeholder="Waldsassen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-email">Email</Label>
            <Input
              id="gls-email"
              type="email"
              value={senderAddress.email}
              onChange={(e) => setSenderAddress({ ...senderAddress, email: e.target.value })}
              placeholder="info@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gls-phone">Phone</Label>
            <Input
              id="gls-phone"
              type="tel"
              value={senderAddress.phone}
              onChange={(e) => setSenderAddress({ ...senderAddress, phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save GLS Sender Address'}
          </Button>
          <Button variant="outline" onClick={testBookmarklet}>
            Test Bookmarklet
          </Button>
        </div>

        <div className="rounded-lg border p-4 bg-muted space-y-2">
          <h4 className="font-semibold text-sm">How to use GLS autofill:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Save your sender address above</li>
            <li>Go to any order and click "Ship with GLS"</li>
            <li>Follow the one-time bookmarklet setup</li>
            <li>Use the bookmarklet to auto-fill the GLS form anytime</li>
          </ol>
        </div>

        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
          <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2">
            💡 Why use this approach?
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            GLS Germany doesn't offer a business API for private customer shipping. The bookmarklet approach allows you to:
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
            <li>Automatically fill the GLS web form with order data</li>
            <li>Avoid manual typing errors</li>
            <li>Ship packages quickly for German domestic orders</li>
            <li>Get affordable rates (from €3.29 within Germany)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// API endpoint example for backend (server/routes/settings.ts)
/*
// Add this route to your settings API

router.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);
    
    if (setting.length > 0) {
      res.json(setting[0]);
    } else {
      res.status(404).json({ message: 'Setting not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to load setting' });
  }
});
*/
