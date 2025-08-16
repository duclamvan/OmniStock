import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Plus,
  Settings,
  TestTube
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ShippingMethod {
  id: number;
  name: string;
  carrier: string;
  min_weight: number;
  max_weight: number;
  price: number;
  currency: string;
  countries: string[];
  service_point_input: 'none' | 'required' | 'optional';
}

interface TestAddress {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  telephone?: string;
  email?: string;
}

interface ShippingLabel {
  parcel: any;
  label?: any;
}

export default function ShippingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testAddress, setTestAddress] = useState<TestAddress>({
    name: 'Test Customer',
    address: 'Test Street 123',
    city: 'Amsterdam',
    postal_code: '1012AB',
    country: 'NL',
    telephone: '+31612345678',
    email: 'test@example.com'
  });

  // Test connection
  const { data: connectionStatus, isLoading: isTestingConnection } = useQuery({
    queryKey: ['/api/shipping/test-connection'],
    refetchInterval: false,
    retry: false
  });

  // Get shipping methods
  const { data: shippingMethods = [], isLoading: isLoadingMethods } = useQuery({
    queryKey: ['/api/shipping/methods'],
    enabled: connectionStatus?.connected === true
  });

  // Create test parcel mutation
  const createTestParcelMutation = useMutation({
    mutationFn: (address: TestAddress) => 
      apiRequest('/api/shipping/create-test-parcel', {
        method: 'POST',
        body: JSON.stringify(address)
      }),
    onSuccess: (data) => {
      toast({
        title: "Test Parcel Created",
        description: `Test parcel created successfully. Tracking: ${data.tracking_number || 'N/A'}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shipping'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Test Parcel",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const handleCreateTestParcel = () => {
    createTestParcelMutation.mutate(testAddress);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(price);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipping Management</h1>
          <p className="text-muted-foreground">Manage shipping labels and track parcels with Sendcloud</p>
        </div>
        <Button>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="methods">Shipping Methods</TabsTrigger>
          <TabsTrigger value="test">Test Features</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Sendcloud Connection Status
              </CardTitle>
              <CardDescription>
                Check your Sendcloud API connection and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTestingConnection ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Testing connection...</span>
                </div>
              ) : connectionStatus ? (
                <div className="space-y-4">
                  <Alert className={connectionStatus.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    <div className="flex items-center gap-2">
                      {connectionStatus.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={connectionStatus.connected ? 'text-green-800' : 'text-red-800'}>
                        {connectionStatus.connected ? 'Successfully connected to Sendcloud API' : 'Failed to connect to Sendcloud API'}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {connectionStatus.connected && connectionStatus.user && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Account Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Company:</strong> {connectionStatus.user.company || 'N/A'}</p>
                        <p><strong>Email:</strong> {connectionStatus.user.email || 'N/A'}</p>
                        <p><strong>Country:</strong> {connectionStatus.user.country || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {connectionStatus.error && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
                      <p className="text-sm text-red-600">{connectionStatus.error}</p>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Connection status unknown. Check your API credentials in environment variables.
                  </AlertDescription>
                </Alert>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/shipping/test-connection'] })}
                  variant="outline"
                >
                  Test Connection Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Available Shipping Methods
              </CardTitle>
              <CardDescription>
                Shipping options available through your Sendcloud account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!connectionStatus?.connected ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Please establish a connection to Sendcloud to view shipping methods.
                  </AlertDescription>
                </Alert>
              ) : isLoadingMethods ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading shipping methods...</span>
                </div>
              ) : shippingMethods.length === 0 ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    No shipping methods found. Please check your Sendcloud account configuration.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {shippingMethods.map((method: ShippingMethod) => (
                    <Card key={method.id} className="relative">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{method.name}</h4>
                              <p className="text-sm text-muted-foreground">{method.carrier}</p>
                            </div>
                            <Badge variant="secondary">
                              {formatPrice(method.price, method.currency)}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Weight: {method.min_weight}kg - {method.max_weight}kg</p>
                            <p>Countries: {method.countries.length} available</p>
                            {method.service_point_input !== 'none' && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>Service point {method.service_point_input}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Shipping Features
              </CardTitle>
              <CardDescription>
                Create test parcels and labels to verify your integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!connectionStatus?.connected ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Please establish a connection to Sendcloud to test features.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label htmlFor="test-name">Customer Name</Label>
                      <Input
                        id="test-name"
                        value={testAddress.name}
                        onChange={(e) => setTestAddress({ ...testAddress, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="test-email">Email</Label>
                      <Input
                        id="test-email"
                        type="email"
                        value={testAddress.email}
                        onChange={(e) => setTestAddress({ ...testAddress, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="test-address">Address</Label>
                    <Input
                      id="test-address"
                      value={testAddress.address}
                      onChange={(e) => setTestAddress({ ...testAddress, address: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-4">
                      <Label htmlFor="test-city">City</Label>
                      <Input
                        id="test-city"
                        value={testAddress.city}
                        onChange={(e) => setTestAddress({ ...testAddress, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="test-postal">Postal Code</Label>
                      <Input
                        id="test-postal"
                        value={testAddress.postal_code}
                        onChange={(e) => setTestAddress({ ...testAddress, postal_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="test-country">Country</Label>
                      <Select 
                        value={testAddress.country}
                        onValueChange={(value) => setTestAddress({ ...testAddress, country: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NL">Netherlands</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="BE">Belgium</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="CZ">Czech Republic</SelectItem>
                          <SelectItem value="AT">Austria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="test-phone">Phone (optional)</Label>
                    <Input
                      id="test-phone"
                      value={testAddress.telephone}
                      onChange={(e) => setTestAddress({ ...testAddress, telephone: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <div className="flex gap-4">
                    <Button
                      onClick={handleCreateTestParcel}
                      disabled={createTestParcelMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {createTestParcelMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      Create Test Parcel
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Note:</strong> Test parcels use the "Unstamped letter" method which is free for testing. 
                      No actual shipping charges will be incurred.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}