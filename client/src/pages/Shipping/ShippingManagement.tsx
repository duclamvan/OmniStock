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

interface PPLConnectionStatus {
  connected: boolean;
  provider?: string;
  message: string;
  error?: string;
}

interface DHLConnectionStatus {
  success: boolean;
  message: string;
  details?: {
    tokenPreview?: string;
    expiresAt?: string;
    environment?: string;
    baseUrl?: string;
  };
}

interface CreateParcelResponse {
  tracking_number: string;
  label_url?: string;
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

  // Test PPL connection
  const { data: connectionStatus, isLoading: isTestingConnection } = useQuery<PPLConnectionStatus>({
    queryKey: ['/api/shipping/test-connection'],
    refetchInterval: false,
    retry: false
  });

  // Test DHL connection
  const { data: dhlConnectionStatus, isLoading: isTestingDHL } = useQuery<DHLConnectionStatus>({
    queryKey: ['/api/dhl/test'],
    refetchInterval: false,
    retry: false
  });

  // Get shipping methods
  const { data: shippingMethods = [], isLoading: isLoadingMethods } = useQuery({
    queryKey: ['/api/shipping/methods'],
    enabled: connectionStatus?.connected === true
  });

  // Create test parcel mutation
  const createTestParcelMutation = useMutation<CreateParcelResponse, Error, TestAddress>({
    mutationFn: async (address: TestAddress) => 
      apiRequest('POST', '/api/shipping/create-test-parcel', address) as unknown as Promise<CreateParcelResponse>,
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
    <div className="p-6 space-y-6" data-testid="shipping-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-shipping">Shipping Management</h1>
          <p className="text-muted-foreground">Manage shipping labels and track parcels with PPL and DHL</p>
        </div>
        <Button data-testid="button-settings">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connection" data-testid="tab-connection">Connection Status</TabsTrigger>
          <TabsTrigger value="info" data-testid="tab-info">Shipping Information</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PPL Connection Card */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                PPL Connection Status
              </CardTitle>
              <CardDescription>
                Check your PPL API connection and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTestingConnection ? (
                <div className="flex items-center gap-2" data-testid="status-testing">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Testing connection...</span>
                </div>
              ) : connectionStatus ? (
                <div className="space-y-4">
                  <Alert className={connectionStatus.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} data-testid="status-alert">
                    <div className="flex items-center gap-2">
                      {connectionStatus.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={connectionStatus.connected ? 'text-green-800' : 'text-red-800'}>
                        {connectionStatus.connected ? 'Successfully connected to PPL API' : 'Failed to connect to PPL API'}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {connectionStatus.connected && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Connection Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Provider:</strong> {connectionStatus.provider || 'PPL'}</p>
                        <p><strong>Status:</strong> Active</p>
                        <p><strong>Message:</strong> {connectionStatus.message}</p>
                      </div>
                    </div>
                  )}

                  {connectionStatus.error && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
                      <p className="text-sm text-red-600">{connectionStatus.error}</p>
                      <p className="text-sm text-red-600 mt-2">Please check that PPL_CLIENT_ID and PPL_CLIENT_SECRET environment variables are set.</p>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Connection status unknown. Check your API credentials in environment variables (PPL_CLIENT_ID, PPL_CLIENT_SECRET).
                  </AlertDescription>
                </Alert>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/shipping/test-connection'] })}
                  variant="outline"
                  data-testid="button-test-connection"
                >
                  Test Connection Again
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                DHL Connection Status
              </CardTitle>
              <CardDescription>
                Check your DHL API connection and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTestingDHL ? (
                <div className="flex items-center gap-2" data-testid="status-testing-dhl">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Testing DHL connection...</span>
                </div>
              ) : dhlConnectionStatus ? (
                <div className="space-y-4">
                  <Alert className={dhlConnectionStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} data-testid="status-alert-dhl">
                    <div className="flex items-center gap-2">
                      {dhlConnectionStatus.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription className={dhlConnectionStatus.success ? 'text-green-800' : 'text-red-800'}>
                        {dhlConnectionStatus.success ? 'Successfully connected to DHL API' : 'Failed to connect to DHL API'}
                      </AlertDescription>
                    </div>
                  </Alert>

                  {dhlConnectionStatus.success && dhlConnectionStatus.details && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Connection Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Provider:</strong> DHL Parcel DE Shipping</p>
                        <p><strong>Status:</strong> Active</p>
                        <p><strong>Message:</strong> {dhlConnectionStatus.message}</p>
                        {dhlConnectionStatus.details.expiresAt && (
                          <p><strong>Token Expires:</strong> {new Date(dhlConnectionStatus.details.expiresAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {!dhlConnectionStatus.success && dhlConnectionStatus.message && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
                      <p className="text-sm text-red-600">{dhlConnectionStatus.message}</p>
                      <p className="text-sm text-red-600 mt-2">Please check that DHL_API_KEY and DHL_API_SECRET environment variables are set.</p>
                      {dhlConnectionStatus.details && (
                        <details className="mt-2">
                          <summary className="text-sm text-red-600 cursor-pointer">Technical Details</summary>
                          <pre className="mt-2 text-xs text-red-500 overflow-auto">
                            {JSON.stringify(dhlConnectionStatus.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Connection status unknown. Check your API credentials in environment variables (DHL_API_KEY, DHL_API_SECRET).
                  </AlertDescription>
                </Alert>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/dhl/test'] })}
                  variant="outline"
                  data-testid="button-test-connection-dhl"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test DHL Connection Again
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                PPL Shipping Information
              </CardTitle>
              <CardDescription>
                Information about PPL shipping integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Recipient Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name">Name</Label>
                      <Input 
                        id="recipient-name"
                        placeholder="Enter recipient name"
                        data-testid="input-recipient-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-company">Company</Label>
                      <Input 
                        id="recipient-company"
                        placeholder="Enter company name"
                        data-testid="input-recipient-company"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="recipient-address">Address</Label>
                      <Textarea 
                        id="recipient-address"
                        placeholder="Enter full address"
                        rows={3}
                        data-testid="input-recipient-address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient-telephone">Telephone Number</Label>
                      <Input 
                        id="recipient-telephone"
                        type="tel"
                        placeholder="+420 123 456 789"
                        data-testid="input-recipient-telephone"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Supported Features</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Shipping label generation (PDF format)</li>
                    <li>Batch shipment creation</li>
                    <li>Dobírka (Cash on Delivery) support</li>
                    <li>Tracking number assignment</li>
                    <li>Automated label printing</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Product Types</h4>
                  <div className="space-y-2 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">PPL Parcel CZ Business</p>
                      <p className="text-muted-foreground">Standard domestic Czech Republic shipments</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Dobírka (Cash on Delivery)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    PPL supports cash on delivery (dobírka) for shipments. You can specify:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>COD amount in CZK, EUR, or other currencies</li>
                    <li>Variable symbol for payment tracking</li>
                    <li>Automatic order ID association</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">How to Use</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Create or edit an order in the Orders section</li>
                    <li>Add dobírka amount and currency if needed</li>
                    <li>Go to Order Details and click "Create PPL Label"</li>
                    <li>The label will be generated and stored with the order</li>
                    <li>Download and print the label for shipping</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}