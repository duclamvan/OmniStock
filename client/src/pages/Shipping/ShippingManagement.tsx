import { useState, useEffect } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';

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

interface CreateParcelResponse {
  tracking_number: string;
  label_url?: string;
}

interface PPLAddress {
  name: string;
  name2?: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export default function ShippingManagement() {
  const { t } = useTranslation(['shipping', 'common']);
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
  
  // PPL default address form state
  const [pplAddress, setPplAddress] = useState<PPLAddress>({
    name: '',
    name2: '',
    street: '',
    city: '',
    zipCode: '',
    country: 'CZ',
    contact: '',
    phone: '',
    email: ''
  });

  // GLS default address form state (simplified - no API integration)
  const [glsAddress, setGlsAddress] = useState({
    name: '',
    company: 'Davie Supply GmbH',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: 'Waldsassen',
    country: 'Deutschland',
    email: '',
    phone: ''
  });

  // DHL default address form state (manual shipping)
  const [dhlAddress, setDhlAddress] = useState({
    firstName: '',
    lastName: '',
    addressSupplement: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    country: 'Deutschland',
    email: ''
  });

  // DHL bank details form state (for COD/Nachnahme)
  const [dhlBankDetails, setDhlBankDetails] = useState({
    iban: '',
    bic: '',
    accountHolder: ''
  });

  // Collapsible state
  const [isPPLOpen, setIsPPLOpen] = useState(true);
  const [isGLSOpen, setIsGLSOpen] = useState(false);
  const [isDHLOpen, setIsDHLOpen] = useState(false);

  // Test PPL connection
  const { data: connectionStatus, isLoading: isTestingConnection, refetch: refetchPPL } = useQuery<PPLConnectionStatus>({
    queryKey: ['/api/shipping/test-connection'],
    refetchInterval: false,
    retry: false
  });

  // Get shipping methods
  const { data: shippingMethods = [], isLoading: isLoadingMethods } = useQuery({
    queryKey: ['/api/shipping/methods'],
    enabled: connectionStatus?.connected === true
  });

  // Load saved PPL default address
  const { data: savedAddress } = useQuery({
    queryKey: ['/api/settings/ppl_default_sender_address'],
    refetchInterval: false,
    retry: false
  });

  // Load saved GLS default address
  const { data: savedGLSAddress } = useQuery({
    queryKey: ['/api/settings/gls_default_sender_address'],
    refetchInterval: false,
    retry: false
  });

  // Load saved DHL default address
  const { data: savedDHLAddress } = useQuery({
    queryKey: ['/api/settings/dhl_default_sender_address'],
    refetchInterval: false,
    retry: false
  });

  // Load saved DHL bank details
  const { data: savedDHLBankDetails } = useQuery({
    queryKey: ['/api/settings/dhl_bank_details'],
    refetchInterval: false,
    retry: false
  });

  // Update form when saved address loads
  useEffect(() => {
    if (savedAddress && (savedAddress as any).value) {
      setPplAddress((savedAddress as any).value as PPLAddress);
    }
  }, [savedAddress]);

  // Update GLS form when saved address loads
  useEffect(() => {
    if (savedGLSAddress && (savedGLSAddress as any).value) {
      setGlsAddress((savedGLSAddress as any).value);
    }
  }, [savedGLSAddress]);

  // Update DHL form when saved address loads
  useEffect(() => {
    if (savedDHLAddress && (savedDHLAddress as any).value) {
      setDhlAddress((savedDHLAddress as any).value);
    }
  }, [savedDHLAddress]);

  // Update DHL bank details when saved data loads
  useEffect(() => {
    if (savedDHLBankDetails && (savedDHLBankDetails as any).value) {
      setDhlBankDetails((savedDHLBankDetails as any).value);
    }
  }, [savedDHLBankDetails]);

  // Save PPL default address mutation
  const savePPLAddressMutation = useMutation({
    mutationFn: async (address: PPLAddress) => 
      apiRequest('POST', '/api/settings', {
        key: 'ppl_default_sender_address',
        value: address,
        category: 'shipping',
        description: 'Default sender address for PPL CZ labels'
      }),
    onSuccess: () => {
      toast({
        title: t('shipping:addressSaved'),
        description: t('shipping:pplAddressSavedSuccess')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/ppl_default_sender_address'] });
    },
    onError: (error: any) => {
      toast({
        title: t('shipping:failedToSaveAddress'),
        description: error.message || t('shipping:unknownError'),
        variant: "destructive"
      });
    }
  });

  // Save GLS default address mutation
  const saveGLSAddressMutation = useMutation({
    mutationFn: async (address: typeof glsAddress) => 
      apiRequest('POST', '/api/settings', {
        key: 'gls_default_sender_address',
        value: address,
        category: 'shipping',
        description: 'Default sender address for GLS Germany shipping (manual labels)'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/gls_default_sender_address'] });
    },
    onError: (error: any) => {
      toast({
        title: t('shipping:failedToSaveAddress'),
        description: error.message || t('shipping:unknownError'),
        variant: "destructive"
      });
    }
  });

  // Save DHL default address mutation
  const saveDHLAddressMutation = useMutation({
    mutationFn: async (address: typeof dhlAddress) => 
      apiRequest('POST', '/api/settings', {
        key: 'dhl_default_sender_address',
        value: address,
        category: 'shipping',
        description: 'Default sender address for DHL Germany shipping (manual labels)'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/dhl_default_sender_address'] });
    },
    onError: (error: any) => {
      toast({
        title: t('shipping:failedToSaveAddress'),
        description: error.message || t('shipping:unknownError'),
        variant: "destructive"
      });
    }
  });

  // Save DHL bank details mutation
  const saveDHLBankDetailsMutation = useMutation({
    mutationFn: async (details: typeof dhlBankDetails) => 
      apiRequest('POST', '/api/settings', {
        key: 'dhl_bank_details',
        value: details,
        category: 'shipping',
        description: 'Bank details for DHL COD (Nachnahme) payments'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/dhl_bank_details'] });
    },
    onError: (error: any) => {
      toast({
        title: t('shipping:failedToSaveAddress'),
        description: error.message || t('shipping:unknownError'),
        variant: "destructive"
      });
    }
  });

  // Create test parcel mutation
  const createTestParcelMutation = useMutation<CreateParcelResponse, Error, TestAddress>({
    mutationFn: async (address: TestAddress) => 
      apiRequest('POST', '/api/shipping/create-test-parcel', address) as unknown as Promise<CreateParcelResponse>,
    onSuccess: (data) => {
      toast({
        title: t('shipping:testParcelCreated'),
        description: `${t('shipping:testParcelCreatedSuccess')} ${data.tracking_number || 'N/A'}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shipping'] });
    },
    onError: (error: any) => {
      toast({
        title: t('shipping:failedToCreateTestParcel'),
        description: error.message || t('shipping:unknownError'),
        variant: "destructive"
      });
    }
  });

  const handleCreateTestParcel = () => {
    createTestParcelMutation.mutate(testAddress);
  };

  // Handle saving PPL default address
  const handleSavePPLAddress = () => {
    // Validate required fields
    if (!pplAddress.name || !pplAddress.street || !pplAddress.city || !pplAddress.zipCode || !pplAddress.country) {
      toast({
        title: t('shipping:validationError'),
        description: t('shipping:fillAllRequiredFields'),
        variant: "destructive"
      });
      return;
    }
    savePPLAddressMutation.mutate(pplAddress);
  };

  // Handle saving GLS default address
  const handleSaveGLSAddress = () => {
    // Validate required fields
    if (!glsAddress.street || !glsAddress.postalCode || !glsAddress.city) {
      toast({
        title: t('shipping:validationError'),
        description: t('shipping:fillRequiredFields'),
        variant: "destructive"
      });
      return;
    }
    saveGLSAddressMutation.mutate(glsAddress);
  };

  // Handle saving DHL default address
  const handleSaveDHLAddress = () => {
    // Validate required fields
    if (!dhlAddress.street || !dhlAddress.postalCode || !dhlAddress.city) {
      toast({
        title: t('shipping:validationError'),
        description: t('shipping:fillRequiredFields'),
        variant: "destructive"
      });
      return;
    }
    saveDHLAddressMutation.mutate(dhlAddress);
  };

  // Handle saving DHL bank details
  const handleSaveDHLBankDetails = () => {
    // Validate required fields
    if (!dhlBankDetails.iban || !dhlBankDetails.accountHolder) {
      toast({
        title: t('shipping:validationError'),
        description: t('shipping:fillIBANAndAccountHolder'),
        variant: "destructive"
      });
      return;
    }
    saveDHLBankDetailsMutation.mutate(dhlBankDetails);
  };

  // Handle PPL test connection
  const handleTestPPLConnection = async () => {
    setIsPPLTesting(true);
    try {
      const result = await refetchPPL();
      if (result.data?.connected) {
        toast({
          title: t('shipping:pplConnectionSuccess'),
          description: result.data.message || t('shipping:successfullyConnected'),
        });
      } else {
        toast({
          title: t('shipping:pplConnectionFailed'),
          description: result.data?.error || t('shipping:failedToConnect'),
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: t('shipping:pplConnectionError'),
        description: error.message || t('shipping:errorOccurredWhileTesting'),
        variant: "destructive"
      });
    } finally {
      setIsPPLTesting(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(price);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8" data-testid="shipping-management">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="title-shipping">{t('shipping:shippingManagement')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t('shipping:manageMultiCarrierShipping')}</p>
      </div>

      <Tabs defaultValue="connection" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="connection" data-testid="tab-connection" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">{t('shipping:connectionStatus')}</span>
            <span className="sm:hidden">{t('shipping:connection')}</span>
          </TabsTrigger>
          <TabsTrigger value="info" data-testid="tab-info" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">{t('shipping:shippingInformation')}</span>
            <span className="sm:hidden">{t('shipping:shippingInfo')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* PPL Connection Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{t('shipping:ppl')}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{t('shipping:czechParcelService')}</CardDescription>
                    </div>
                  </div>
                  {connectionStatus?.connected && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('shipping:connected')}
                    </Badge>
                  )}
                  {connectionStatus && !connectionStatus.connected && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {t('shipping:disconnected')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {isTestingConnection ? (
                  <div className="flex items-center justify-center py-6 sm:py-8" data-testid="status-testing">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">{t('shipping:testingConnection')}</span>
                    </div>
                  </div>
                ) : connectionStatus ? (
                  <div className="space-y-4">
                    {connectionStatus.connected ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{t('shipping:provider')}</p>
                            <p className="font-medium">{connectionStatus.provider || 'PPL'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{t('shipping:status')}</p>
                            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-1.5 animate-in fade-in duration-500">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <p className="font-semibold text-green-700">{t('shipping:active')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">{t('shipping:response')}</p>
                          <p className="text-sm">{connectionStatus.message}</p>
                        </div>
                      </div>
                    ) : (
                      <Alert variant="destructive" className="border-red-200">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <p className="font-medium mb-1">{t('shipping:connectionFailed')}</p>
                          <p className="text-xs">{connectionStatus.error || t('shipping:unableToConnectToPPL')}</p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      {t('shipping:noConnectionTestYet')}
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
                        {t('shipping:testingConnection')}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('shipping:testConnection')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="info" className="space-y-4 sm:space-y-6">
          {/* PPL Shipping Information Card */}
          <Collapsible open={isPPLOpen} onOpenChange={setIsPPLOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b cursor-pointer hover:bg-slate-100 transition-colors p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                      </div>
                      <div className="text-left min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{t('shipping:pplShipping')}</CardTitle>
                        <CardDescription className="text-xs mt-0.5 hidden sm:block">{t('shipping:testLabelGenerationAndView')}</CardDescription>
                      </div>
                    </div>
                    {isPPLOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                  <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    {t('shipping:defaultPPLSenderAddress')}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('shipping:setDefaultSenderAddress')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ppl-name">
                        {t('shipping:name')} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-name"
                        value={pplAddress.name}
                        onChange={(e) => setPplAddress({ ...pplAddress, name: e.target.value })}
                        placeholder={t('shipping:recipientName')}
                        data-testid="input-ppl-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-name2">{t('shipping:companyName2')}</Label>
                      <Input 
                        id="ppl-name2"
                        value={pplAddress.name2}
                        onChange={(e) => setPplAddress({ ...pplAddress, name2: e.target.value })}
                        placeholder={t('shipping:companyName')}
                        data-testid="input-ppl-name2"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ppl-street">
                        {t('shipping:street')} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-street"
                        value={pplAddress.street}
                        onChange={(e) => setPplAddress({ ...pplAddress, street: e.target.value })}
                        placeholder={t('shipping:streetAddress')}
                        data-testid="input-ppl-street"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-city">
                        {t('shipping:city')} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-city"
                        value={pplAddress.city}
                        onChange={(e) => setPplAddress({ ...pplAddress, city: e.target.value })}
                        placeholder={t('shipping:city')}
                        data-testid="input-ppl-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-zipcode">
                        {t('shipping:zipCode')} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-zipcode"
                        value={pplAddress.zipCode}
                        onChange={(e) => setPplAddress({ ...pplAddress, zipCode: e.target.value })}
                        placeholder="12000"
                        data-testid="input-ppl-zipcode"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-country">
                        {t('shipping:country')} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="ppl-country"
                        value={pplAddress.country}
                        onChange={(e) => setPplAddress({ ...pplAddress, country: e.target.value.toUpperCase() })}
                        placeholder="CZ"
                        maxLength={2}
                        data-testid="input-ppl-country"
                      />
                      <p className="text-xs text-muted-foreground">2-letter country code (e.g., CZ, SK, DE)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-contact">{t('shipping:contact')}</Label>
                      <Input 
                        id="ppl-contact"
                        value={pplAddress.contact}
                        onChange={(e) => setPplAddress({ ...pplAddress, contact: e.target.value })}
                        placeholder={t('shipping:contactPersonName')}
                        data-testid="input-ppl-contact"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ppl-phone">{t('shipping:phone')}</Label>
                      <Input 
                        id="ppl-phone"
                        type="tel"
                        value={pplAddress.phone}
                        onChange={(e) => setPplAddress({ ...pplAddress, phone: e.target.value })}
                        placeholder="+420123456789"
                        data-testid="input-ppl-phone"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ppl-email">{t('shipping:email')}</Label>
                      <Input 
                        id="ppl-email"
                        type="email"
                        value={pplAddress.email}
                        onChange={(e) => setPplAddress({ ...pplAddress, email: e.target.value })}
                        placeholder="recipient@example.com"
                        data-testid="input-ppl-email"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={handleSavePPLAddress}
                      className="w-full"
                      disabled={savePPLAddressMutation.isPending}
                      data-testid="button-save-ppl-address"
                    >
                      {savePPLAddressMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          {t('shipping:saving')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('shipping:saveDefaultAddress')}
                        </>
                      )}
                    </Button>
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
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* DHL Shipping Information Card */}
          <Collapsible open={isDHLOpen} onOpenChange={setIsDHLOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b cursor-pointer hover:bg-yellow-100 transition-colors p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                      </div>
                      <div className="text-left min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{t('shipping:dhlDE')}</CardTitle>
                        <CardDescription className="text-xs mt-0.5 hidden sm:block">{t('shipping:configureGLSSenderAddress')}</CardDescription>
                      </div>
                    </div>
                    {isDHLOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="space-y-6">
                    {/* Sender Address Section */}
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-5 border border-yellow-100">
                      <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-yellow-600" />
                        Default DHL DE Sender Address
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Set the default sender address for DHL DE shipping labels
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dhl-firstName">First Name</Label>
                          <Input 
                            id="dhl-firstName"
                            value={dhlAddress.firstName}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, firstName: e.target.value })}
                            placeholder="Max"
                            data-testid="input-dhl-firstname"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-lastName">Last Name</Label>
                          <Input 
                            id="dhl-lastName"
                            value={dhlAddress.lastName}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, lastName: e.target.value })}
                            placeholder="Mustermann"
                            data-testid="input-dhl-lastname"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="dhl-addressSupplement">Address Supplement</Label>
                          <Input 
                            id="dhl-addressSupplement"
                            value={dhlAddress.addressSupplement}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, addressSupplement: e.target.value })}
                            placeholder="c/o Company, Building A"
                            data-testid="input-dhl-addresssupplement"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-street">
                            Street <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="dhl-street"
                            value={dhlAddress.street}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, street: e.target.value })}
                            placeholder="Musterstraße"
                            data-testid="input-dhl-street"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-houseNumber">House Number</Label>
                          <Input 
                            id="dhl-houseNumber"
                            value={dhlAddress.houseNumber}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, houseNumber: e.target.value })}
                            placeholder="123"
                            data-testid="input-dhl-housenumber"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-postalCode">
                            Postal Code <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="dhl-postalCode"
                            value={dhlAddress.postalCode}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, postalCode: e.target.value })}
                            placeholder="12345"
                            data-testid="input-dhl-postalcode"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-city">
                            City <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="dhl-city"
                            value={dhlAddress.city}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, city: e.target.value })}
                            placeholder="Berlin"
                            data-testid="input-dhl-city"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-email">Email</Label>
                          <Input 
                            id="dhl-email"
                            type="email"
                            value={dhlAddress.email}
                            onChange={(e) => setDhlAddress({ ...dhlAddress, email: e.target.value })}
                            placeholder="info@example.com"
                            data-testid="input-dhl-email"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={handleSaveDHLAddress}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                          disabled={saveDHLAddressMutation.isPending}
                          data-testid="button-save-dhl-address"
                        >
                          {saveDHLAddressMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              {t('shipping:saving')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('shipping:saveDHLSenderAddress')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Bank Details Section */}
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-5 border border-yellow-100">
                      <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        {t('shipping:dhlBankDetails')}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('shipping:dhlBankDetails')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="dhl-iban">
                            {t('shipping:iban')} <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="dhl-iban"
                            value={dhlBankDetails.iban}
                            onChange={(e) => setDhlBankDetails({ ...dhlBankDetails, iban: e.target.value })}
                            placeholder="DE89370400440532013000"
                            data-testid="input-dhl-iban"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-bic">{t('shipping:bic')}</Label>
                          <Input 
                            id="dhl-bic"
                            value={dhlBankDetails.bic}
                            onChange={(e) => setDhlBankDetails({ ...dhlBankDetails, bic: e.target.value })}
                            placeholder="COBADEFFXXX"
                            data-testid="input-dhl-bic"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dhl-accountHolder">
                            {t('shipping:accountHolder')} <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="dhl-accountHolder"
                            value={dhlBankDetails.accountHolder}
                            onChange={(e) => setDhlBankDetails({ ...dhlBankDetails, accountHolder: e.target.value })}
                            placeholder="Davie Supply GmbH"
                            data-testid="input-dhl-accountholder"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={handleSaveDHLBankDetails}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                          disabled={saveDHLBankDetailsMutation.isPending}
                          data-testid="button-save-dhl-bank"
                        >
                          {saveDHLBankDetailsMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              {t('shipping:saving')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('shipping:saveBankDetails')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Instructions Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 border border-blue-100">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        {t('shipping:howToUseDHLManualShipping')}
                      </h4>
                      <ol className="text-sm space-y-2 list-decimal list-inside">
                        <li>{t('shipping:saveYourSenderAddress')}</li>
                        <li>{t('shipping:goToAnyOrder')}</li>
                        <li>{t('shipping:clickShipWithDHL')}</li>
                        <li>{t('shipping:copyPrefilledInfo')}</li>
                        <li>{t('shipping:createLabelsManually')}</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-yellow-600" />
                          {t('shipping:features')}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                            <span>{t('shipping:manualLabelWorkflowViaDHL')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                            <span>{t('shipping:noAPIIntegrationRequired')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                            <span>{t('shipping:prefilledShippingInformation')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                            <span>{t('shipping:codSupportWithBankDetails')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                            <span>{t('shipping:reliableDelivery')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-yellow-600" />
                          {t('shipping:whyThisApproach')}
                        </h4>
                        <div className="bg-white border rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">
                            {t('shipping:dhlManualShippingExplanation')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        {t('shipping:importantNotes')}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t('shipping:dhlManualWorkflow')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:labelsCreatedViaDHLWebsite')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:shippingInfoPrefilledForCopyPaste')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:bankDetailsStoredForCOD')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:suitableForDomesticAndInternational')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* GLS Shipping Information Card */}
          <Collapsible open={isGLSOpen} onOpenChange={setIsGLSOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b cursor-pointer hover:bg-green-100 transition-colors p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="text-left min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{t('shipping:gls')}</CardTitle>
                        <CardDescription className="text-xs mt-0.5 hidden sm:block">{t('shipping:configureGLSSenderAddress')}</CardDescription>
                      </div>
                    </div>
                    {isGLSOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
                      <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        {t('shipping:defaultGLSSenderAddress')}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('shipping:setGLSDefaultSenderAddress')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gls-name">{t('shipping:contactPersonName')}</Label>
                          <Input 
                            id="gls-name"
                            value={glsAddress.name}
                            onChange={(e) => setGlsAddress({ ...glsAddress, name: e.target.value })}
                            placeholder={t('shipping:yourName')}
                            data-testid="input-gls-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-company">{t('shipping:companyName')}</Label>
                          <Input 
                            id="gls-company"
                            value={glsAddress.company}
                            onChange={(e) => setGlsAddress({ ...glsAddress, company: e.target.value })}
                            placeholder="Davie Supply GmbH"
                            data-testid="input-gls-company"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-street">
                            {t('shipping:street')} <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="gls-street"
                            value={glsAddress.street}
                            onChange={(e) => setGlsAddress({ ...glsAddress, street: e.target.value })}
                            placeholder={t('shipping:streetName')}
                            data-testid="input-gls-street"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-houseNumber">{t('shipping:houseNumber')}</Label>
                          <Input 
                            id="gls-houseNumber"
                            value={glsAddress.houseNumber}
                            onChange={(e) => setGlsAddress({ ...glsAddress, houseNumber: e.target.value })}
                            placeholder="123"
                            data-testid="input-gls-housenumber"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-postalCode">
                            {t('shipping:postalCode')} <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="gls-postalCode"
                            value={glsAddress.postalCode}
                            onChange={(e) => setGlsAddress({ ...glsAddress, postalCode: e.target.value })}
                            placeholder="95652"
                            data-testid="input-gls-postalcode"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-city">
                            {t('shipping:city')} <span className="text-red-500">*</span>
                          </Label>
                          <Input 
                            id="gls-city"
                            value={glsAddress.city}
                            onChange={(e) => setGlsAddress({ ...glsAddress, city: e.target.value })}
                            placeholder="Waldsassen"
                            data-testid="input-gls-city"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-email">{t('shipping:email')}</Label>
                          <Input 
                            id="gls-email"
                            type="email"
                            value={glsAddress.email}
                            onChange={(e) => setGlsAddress({ ...glsAddress, email: e.target.value })}
                            placeholder="info@example.com"
                            data-testid="input-gls-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gls-phone">{t('shipping:phone')}</Label>
                          <Input 
                            id="gls-phone"
                            type="tel"
                            value={glsAddress.phone}
                            onChange={(e) => setGlsAddress({ ...glsAddress, phone: e.target.value })}
                            placeholder="+49 123 456789"
                            data-testid="input-gls-phone"
                          />
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={handleSaveGLSAddress}
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={saveGLSAddressMutation.isPending}
                          data-testid="button-save-gls-address"
                        >
                          {saveGLSAddressMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              {t('shipping:saving')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {t('shipping:saveGLSSenderAddress')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 border border-blue-100">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        {t('shipping:desktopHowToUseGLS')}
                      </h4>
                      <ol className="text-sm space-y-2 list-decimal list-inside">
                        <li>{t('shipping:glsDesktopStep1')}</li>
                        <li>{t('shipping:glsDesktopStep2')}</li>
                        <li>{t('shipping:glsDesktopStep3')}</li>
                        <li>{t('shipping:glsDesktopStep4')}</li>
                      </ol>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-100">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-600" />
                        {t('shipping:mobileAndroidSetup')}
                      </h4>
                      <ol className="text-sm space-y-2 list-decimal list-inside">
                        <li>{t('shipping:glsMobileStep1')}</li>
                        <li>{t('shipping:glsMobileStep2')}</li>
                        <li>{t('shipping:glsMobileStep3')} <a href="/api/download/gls-autofill-userscript" className="text-purple-600 font-semibold underline hover:text-purple-800" download="gls-autofill-mobile.user.js">gls-autofill-mobile.user.js</a></li>
                        <li>{t('shipping:glsMobileStep4')}</li>
                        <li>{t('shipping:glsMobileStep5')}</li>
                        <li>{t('shipping:glsMobileStep6')}</li>
                        <li>{t('shipping:glsMobileStep7')}</li>
                      </ol>
                      <div className="mt-3 p-3 bg-purple-100 rounded-lg text-xs">
                        <strong className="text-purple-900">{t('shipping:importantNotes')}:</strong> {t('shipping:glsMobileNote')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {t('shipping:features')}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>{t('shipping:manualLabelWorkflowViaGLS')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>{t('shipping:noAPIIntegrationRequired')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>{t('shipping:bookmarkletAutofill')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>{t('shipping:tampermonkeyScriptForMobile')}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                            <span>{t('shipping:affordableRates')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-green-600" />
                          {t('shipping:whyThisApproach')}
                        </h4>
                        <div className="bg-white border rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">
                            {t('shipping:glsAutofillExplanation')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        {t('shipping:importantNotes')}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t('shipping:glsManualWorkflow')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:labelsCreatedViaGLSWebsite')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:bookmarkletAutoFills')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:oneTimeSetup')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <span>{t('shipping:bestForGermanDomestic')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>
      </Tabs>
    </div>
  );
}