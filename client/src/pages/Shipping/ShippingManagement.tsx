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
  const [isPPLTesting, setIsPPLTesting] = useState(false);
  const [isDHLTesting, setIsDHLTesting] = useState(false);

  // Test PPL connection
  const { data: connectionStatus, isLoading: isTestingConnection, refetch: refetchPPL } = useQuery<PPLConnectionStatus>({
    queryKey: ['/api/shipping/test-connection'],
    refetchInterval: false,
    retry: false
  });

  // Test DHL connection
  const { data: dhlConnectionStatus, isLoading: isTestingDHL, refetch: refetchDHL } = useQuery<DHLConnectionStatus>({
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

  // Handle PPL test connection
  const handleTestPPLConnection = async () => {
    setIsPPLTesting(true);
    try {
      const result = await refetchPPL();
      if (result.data?.connected) {
        toast({
          title: "PPL Connection Successful",
          description: result.data.message || "Successfully connected to PPL API",
        });
      } else {
        toast({
          title: "PPL Connection Failed",
          description: result.data?.error || "Failed to connect to PPL API",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "PPL Connection Error",
        description: error.message || "An error occurred while testing PPL connection",
        variant: "destructive"
      });
    } finally {
      setIsPPLTesting(false);
    }
  };

  // Handle DHL test connection
  const handleTestDHLConnection = async () => {
    setIsDHLTesting(true);
    try {
      const result = await refetchDHL();
      if (result.data?.success) {
        toast({
          title: "DHL Connection Successful",
          description: result.data.message || "Successfully connected to DHL API",
        });
      } else {
        toast({
          title: "DHL Connection Failed",
          description: result.data?.message || "Failed to connect to DHL API",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "DHL Connection Error",
        description: error.message || "An error occurred while testing DHL connection",
        variant: "destructive"
      });
    } finally {
      setIsDHLTesting(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(price);
  };

  return (
    <div className="p-6 space-y-8" data-testid="shipping-management">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="title-shipping">Shipping Management</h1>
        <p className="text-muted-foreground">Manage multi-carrier shipping integrations and test API connections</p>
      </div>

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connection" data-testid="tab-connection">Connection Status</TabsTrigger>
          <TabsTrigger value="info" data-testid="tab-info">Shipping Information</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PPL Connection Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">PPL CZ</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Czech Parcel Service</CardDescription>
                    </div>
                  </div>
                  {connectionStatus?.connected && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {connectionStatus && !connectionStatus.connected && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Disconnected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {isTestingConnection ? (
                  <div className="flex items-center justify-center py-8" data-testid="status-testing">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Testing connection...</span>
                    </div>
                  </div>
                ) : connectionStatus ? (
                  <div className="space-y-4">
                    {connectionStatus.connected ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Provider</p>
                            <p className="font-medium">{connectionStatus.provider || 'PPL'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Status</p>
                            <p className="font-medium text-green-600">Active</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Response</p>
                          <p className="text-sm">{connectionStatus.message}</p>
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive" className="border-red-200">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <p className="font-medium mb-1">Connection Failed</p>
                          <p className="text-xs">{connectionStatus.error || 'Unable to connect to PPL API'}</p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      No connection test performed yet. Click the button below to test.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-2">
                  <Button 
                    onClick={handleTestPPLConnection}
                    className="w-full"
                    variant={connectionStatus?.connected ? "outline" : "default"}
                    disabled={isPPLTesting || isTestingConnection}
                    data-testid="button-test-connection"
                  >
                    {isPPLTesting || isTestingConnection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* DHL Connection Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Package className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">DHL Parcel DE</CardTitle>
                      <CardDescription className="text-xs mt-0.5">German Shipping Service</CardDescription>
                    </div>
                  </div>
                  {dhlConnectionStatus?.success && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {dhlConnectionStatus && !dhlConnectionStatus.success && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Disconnected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {isTestingDHL ? (
                  <div className="flex items-center justify-center py-8" data-testid="status-testing-dhl">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Testing connection...</span>
                    </div>
                  </div>
                ) : dhlConnectionStatus ? (
                  <div className="space-y-4">
                    {dhlConnectionStatus.success ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Provider</p>
                            <p className="font-medium">DHL Parcel DE</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Status</p>
                            <p className="font-medium text-green-600">Active</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Environment</p>
                            <p className="text-sm font-medium">{dhlConnectionStatus.details?.environment || 'Production'}</p>
                          </div>
                          {dhlConnectionStatus.details?.expiresAt && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Token Expires</p>
                              <p className="text-sm">{new Date(dhlConnectionStatus.details.expiresAt).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive" className="border-red-200">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <p className="font-medium mb-1">Connection Failed</p>
                          <p className="text-xs">{dhlConnectionStatus.message || 'Unable to connect to DHL API'}</p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      No connection test performed yet. Click the button below to test.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-2">
                  <Button 
                    onClick={handleTestDHLConnection}
                    className="w-full"
                    variant={dhlConnectionStatus?.success ? "outline" : "default"}
                    disabled={isDHLTesting || isTestingDHL}
                    data-testid="button-test-connection-dhl"
                  >
                    {isDHLTesting || isTestingDHL ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Truck className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">PPL Shipping Information</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Test label generation and view integration details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                  <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Recipient Address
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Test PPL label generation with recipient details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ppl-name">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-name"
                        placeholder="Recipient name"
                        data-testid="input-ppl-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-name2">Company (name2)</Label>
                      <Input 
                        id="ppl-name2"
                        placeholder="Company name (optional)"
                        data-testid="input-ppl-name2"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ppl-street">
                        Street <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-street"
                        placeholder="Street address"
                        data-testid="input-ppl-street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-city">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-city"
                        placeholder="City"
                        data-testid="input-ppl-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-zipcode">
                        Zip Code <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-zipcode"
                        placeholder="12000"
                        data-testid="input-ppl-zipcode"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-country">
                        Country <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-country"
                        placeholder="CZ"
                        maxLength={2}
                        data-testid="input-ppl-country"
                      />
                      <p className="text-xs text-muted-foreground">2-letter country code (e.g., CZ, SK, DE)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-contact">Contact Person</Label>
                      <Input 
                        id="ppl-contact"
                        placeholder="Contact name (optional)"
                        data-testid="input-ppl-contact"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-phone">Phone</Label>
                      <Input 
                        id="ppl-phone"
                        type="tel"
                        placeholder="+420123456789"
                        data-testid="input-ppl-phone"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ppl-email">Email</Label>
                      <Input 
                        id="ppl-email"
                        type="email"
                        placeholder="recipient@example.com"
                        data-testid="input-ppl-email"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Supported Features
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span>Shipping label generation (PDF format)</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span>Batch shipment creation</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span>Dobírka (Cash on Delivery) support</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span>Tracking number assignment</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <span>Automated label printing</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Product Types
                    </h4>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="font-medium text-sm">PPL Parcel CZ Business</p>
                      <p className="text-muted-foreground text-xs mt-1">Standard domestic Czech Republic shipments</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-600" />
                    Cash on Delivery (Dobírka)
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    PPL supports cash on delivery (dobírka) for shipments:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span>COD amount in CZK, EUR, or USD</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span>Variable symbol for payment tracking</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <span>Automatic order ID association</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}