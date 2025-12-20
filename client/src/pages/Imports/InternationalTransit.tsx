import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Plane, Ship, Truck, MapPin, Clock, Package, Globe, Star, Zap, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Search, CalendarDays, MoreVertical, ArrowLeft, Train, Shield, Copy, ExternalLink, ChevronDown, ChevronUp, Edit, Filter, ArrowUpDown, Info, RefreshCw, FileText, Archive, ArchiveRestore } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { convertCurrency, type Currency } from "@/lib/currencyUtils";
import { useTranslation } from "react-i18next";

interface EasyPostEvent {
  time: string;
  description: string;
  location?: string;
  status?: string;
}

interface Shipment {
  id: string;
  consolidationId: string | null;
  carrier: string;
  trackingNumber: string;
  endCarrier?: string;
  endTrackingNumber?: string;
  shipmentName?: string;
  shipmentType?: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  shippingCostCurrency?: string;
  shippingMethod?: string;
  insuranceValue: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  currentLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
  totalWeight?: number;
  totalUnits?: number;
  unitType?: string;
  endTrackingNumbers?: string[];
  easypostRegistered?: boolean;
  easypostStatus?: string;
  easypostLastEvent?: string;
  easypostLastEventTime?: string;
  easypostEvents?: EasyPostEvent[];
  easypostLastSync?: string;
  easypostCarrier?: string;
  // Aggregated ETA from EasyPost polling
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  trackingCount?: number;
  trackingDeliveredCount?: number;
}

interface DeliveryPrediction {
  estimatedDelivery: string;
  estimatedDays: number;
  confidence: number;
  factors: {
    seasonalDelay: boolean;
    customsDelay: boolean;
    customsDays: number;
    fastRoute: boolean;
    weatherDelay: boolean;
    historicalAccuracy: boolean;
  };
  historicalAverage: number;
  historicalShipments: number;
  lastUpdated: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "in transit": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
};

const statusIcons: Record<string, any> = {
  pending: Package,
  "in transit": Plane,
  delivered: CheckCircle
};

const carrierIcons: Record<string, any> = {
  "DHL": Zap,
  "FedEx": Plane,
  "UPS": Truck,
  "USPS": Package,
  "China Post": Ship,
  "SF Express": Star
};

// Auto-detect carrier from tracking number format
const detectCarrierFromTrackingNumber = (trackingNumber: string): { carrier: string; code: string } | null => {
  const num = trackingNumber.trim().toUpperCase();
  
  // UPS: Starts with 1Z, 18 characters (e.g., 1Z999AA10123456784)
  if (num.startsWith('1Z') && num.length === 18) {
    return { carrier: 'UPS', code: '100002' };
  }
  
  // FedEx: 12, 15, 20, or 22 digits
  if (/^\d{12}$/.test(num) || /^\d{15}$/.test(num) || /^\d{20}$/.test(num) || /^\d{22}$/.test(num)) {
    return { carrier: 'FedEx', code: '100003' };
  }
  
  // DHL Express: 10 digits starting with specific patterns
  if (/^\d{10}$/.test(num) && (num.startsWith('1') || num.startsWith('2') || num.startsWith('3') || num.startsWith('4') || num.startsWith('5'))) {
    return { carrier: 'DHL Express', code: '100001' };
  }
  
  // DPD: 14 digits or starts with specific prefixes
  if (/^\d{14}$/.test(num)) {
    return { carrier: 'DPD', code: '100010' };
  }
  
  // GLS: 11-12 digits
  if (/^\d{11,12}$/.test(num)) {
    return { carrier: 'GLS', code: '100005' };
  }
  
  // PPL: Starts with specific letters + digits (Czech)
  if (/^[A-Z]{2}\d{11}$/.test(num)) {
    return { carrier: 'PPL', code: '100140' };
  }
  
  // PostNL: 3S followed by 13 characters
  if (num.startsWith('3S') && num.length === 15) {
    return { carrier: 'PostNL', code: '14041' };
  }
  
  return null;
};

interface PendingShipment {
  id: string;
  name: string;
  location: string;
  shippingMethod: string;
  warehouse: string;
  notes: string | null;
  targetWeight: string | null;
  maxItems: number | null;
  status: string;
  items: any[];
  itemCount: number;
  existingShipment: any;
  needsTracking: boolean;
  trackingNumber: string | null;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
}

export default function InternationalTransit() {
  const { t } = useTranslation('imports');
  const [isShipmentFormOpen, setIsShipmentFormOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedPendingShipment, setSelectedPendingShipment] = useState<PendingShipment | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, DeliveryPrediction>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTracking, setExpandedTracking] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'delivery' | 'type' | 'status'>('delivery');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewShipmentDetails, setViewShipmentDetails] = useState<Shipment | null>(null);
  const [allocationMethod, setAllocationMethod] = useState<'AUTO' | 'UNITS' | 'WEIGHT' | 'VALUE' | 'HYBRID'>('AUTO');
  const [detectedEndCarrier, setDetectedEndCarrier] = useState<string>('');
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Interface for archived weeks
  interface ArchivedWeek {
    week: string;
    shipments: Shipment[];
    count: number;
    totalWeight: number;
    archivedAt: string;
  }

  // Fetch archived shipments grouped by week
  const { data: archivedWeeks = [], isLoading: isLoadingArchived } = useQuery<ArchivedWeek[]>({
    queryKey: ['/api/imports/shipments/archived'],
    enabled: viewTab === 'archived'
  });

  // Archive current week mutation
  const archiveWeekMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/imports/shipments/archive-week', {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/archived'] });
      toast({ 
        title: t('success'), 
        description: t('archivedShipmentsCount', { count: data.archivedCount, week: data.archiveWeek })
      });
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedToArchive'), variant: "destructive" });
    }
  });

  // Unarchive shipment mutation
  const unarchiveMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await apiRequest('POST', `/api/imports/shipments/${shipmentId}/unarchive`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/archived'] });
      toast({ title: t('success'), description: t('shipmentUnarchived') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedToUnarchive'), variant: "destructive" });
    }
  });

  // Fetch pending shipments
  const { data: pendingShipments = [] } = useQuery<PendingShipment[]>({
    queryKey: ['/api/imports/shipments/pending']
  });
  
  // Fetch warehouses for destination selection
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses']
  });

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  // Move back to warehouse mutation
  const moveBackToWarehouseMutation = useMutation({
    mutationFn: async (consolidationId: string) => {
      const response = await apiRequest('PATCH', '/api/imports/consolidations/' + consolidationId + '/status', {
        status: 'active'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: t('success'), description: t('movedBackToWarehouse') });
    },
    onError: (error) => {
      toast({ title: t('error'), description: t('failedToMoveBack'), variant: "destructive" });
    }
  });
  
  // Create shipment mutation with optimistic updates for speed
  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/imports/shipments', data);
      return response.json();
    },
    onMutate: async (newShipment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/imports/shipments'] });
      await queryClient.cancelQueries({ queryKey: ['/api/imports/shipments/pending'] });
      
      // Optimistically remove from pending if it's a quick ship
      if (newShipment.consolidationId) {
        const previousPending = queryClient.getQueryData(['/api/imports/shipments/pending']);
        queryClient.setQueryData(['/api/imports/shipments/pending'], (old: any) => {
          if (!old) return old;
          return old.filter((item: any) => item.id !== newShipment.consolidationId);
        });
        
        // Return context for rollback
        return { previousPending };
      }
    },
    onSuccess: (data, variables) => {
      // Immediately update the shipments list with the new shipment
      queryClient.setQueryData(['/api/imports/shipments'], (old: any) => {
        if (!old) return [data];
        return [data, ...old];
      });
      
      // Force immediate refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      
      setIsShipmentFormOpen(false);
      setSelectedPendingShipment(null);
      
      // Different messages for Quick Ship vs regular creation
      const isQuickShip = !variables.trackingNumber || variables.trackingNumber === '';
      toast({ 
        title: t('success'), 
        description: isQuickShip 
          ? t('quickShipCompleted') 
          : t('shipmentCreated') 
      });
    },
    onError: (err, newShipment, context: any) => {
      // Rollback optimistic update on error
      if (context?.previousPending) {
        queryClient.setQueryData(['/api/imports/shipments/pending'], context.previousPending);
      }
      toast({ title: t('error'), description: t('failedToCreateShipment'), variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
    }
  });

  // Regenerate shipment name mutation
  const regenerateNameMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      const response = await apiRequest('POST', `/api/imports/shipments/${shipmentId}/regenerate-name`);
      return response.json();
    },
    onSuccess: (data) => {
      // Immediately update the query cache with the new data
      queryClient.setQueryData(['/api/imports/shipments'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((shipment: any) => 
          shipment.id === data.id ? { ...shipment, shipmentName: data.shipmentName } : shipment
        );
      });
      
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      
      // Update the selected shipment if in edit modal
      if (selectedShipment && selectedShipment.id === data.id) {
        setSelectedShipment({ ...selectedShipment, shipmentName: data.shipmentName });
        // Update the input field value (use correct ID)
        const input = document.getElementById('shipmentName') as HTMLInputElement;
        if (input) {
          input.value = data.shipmentName;
        }
      }
      
      toast({ 
        title: t('success'), 
        description: t('shipmentNameRegenerated') 
      });
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('failedToRegenerateName'), 
        variant: "destructive" 
      });
    }
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/imports/shipments/${shipmentId}/tracking`, data);
      return response.json();
    },
    onSuccess: (updatedShipment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      
      // If status is changed to pending, show success message
      if (variables.data.status === 'pending') {
        toast({ 
          title: t('success'), 
          description: t('shipmentMovedBackToPending') 
        });
      } else {
        toast({ title: t('success'), description: t('trackingUpdated') });
      }
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedToUpdateTracking'), variant: "destructive" });
    }
  });

  // Edit shipment mutation
  const editShipmentMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/imports/shipments/${shipmentId}`, data);
      return { ...(await response.json()), shipmentId, hasTrackingNumbers: data.endTrackingNumbers?.length > 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      setIsShipmentFormOpen(false);
      setSelectedShipment(null);
      toast({ title: t('success'), description: t('shipmentUpdated') });
      
      // Auto-sync tracking with EasyPost if tracking numbers were provided
      if (data.hasTrackingNumbers && data.shipmentId) {
        // Wait a moment for DB update to complete, then sync
        setTimeout(() => {
          apiRequest('POST', `/api/imports/shipments/${data.shipmentId}/easypost/register`)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
              toast({ title: t('success'), description: t('trackingSynced') });
            })
            .catch((err) => {
              console.error('Auto-sync failed:', err);
            });
        }, 500);
      }
      
      // Scroll to updated shipment after DOM updates
      setTimeout(() => {
        const shipmentCard = document.getElementById(`shipment-${data.shipmentId}`);
        if (shipmentCard) {
          // Scroll to the card with smooth animation
          shipmentCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Add a highlight effect
          shipmentCard.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            shipmentCard.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
      }, 500); // Wait for DOM to update
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedToUpdateShipment'), variant: "destructive" });
    }
  });

  // Sync EasyPost tracking mutation
  const syncEasyPostMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await apiRequest('POST', `/api/imports/shipments/${shipmentId}/easypost/register`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      toast({ 
        title: t('success'), 
        description: data.message || t('trackingSynced')
      });
    },
    onError: (error: any) => {
      toast({ 
        title: t('error'), 
        description: error?.message || t('failedToSyncTracking'), 
        variant: "destructive" 
      });
    }
  });

  // Sync all shipments with EasyPost
  const syncAllEasyPostMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/imports/easypost/sync-all');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      toast({ 
        title: t('success'), 
        description: data.message || t('allShipmentsSynced')
      });
    },
    onError: (error: any) => {
      toast({ 
        title: t('error'), 
        description: error?.message || t('failedToSyncAllShipments'), 
        variant: "destructive" 
      });
    }
  });

  // AI Prediction function
  const predictDelivery = async (shipment: Shipment) => {
    if (predictions[shipment.id]) return; // Already predicted
    
    setIsPredicting(true);
    try {
      const response = await apiRequest('POST', '/api/imports/shipments/predict-delivery', {
        shipmentId: shipment.id,
        origin: shipment.origin,
        destination: shipment.destination,
        carrier: shipment.carrier,
        dispatchDate: shipment.createdAt
      });
      
      const prediction = await response.json() as DeliveryPrediction;
      setPredictions(prev => ({ ...prev, [shipment.id]: prediction }));
      
      // Update the shipment with the new prediction
      updateTrackingMutation.mutate({
        shipmentId: shipment.id,
        data: { estimatedDelivery: prediction.estimatedDelivery }
      });
      
    } catch (error) {
      toast({ 
        title: t('error'), 
        description: t('aiPredictionFailed'),
        variant: "destructive" 
      });
    } finally {
      setIsPredicting(false);
    }
  };

  // Create a stable key for shipments to prevent infinite loops while detecting real changes
  const shipmentsKey = useMemo(() => {
    return shipments.map(s => `${s.id}-${s.status}-${s.estimatedDelivery || 'none'}`).join(',');
  }, [shipments]);

  // Auto-predict for new shipments - runs when shipments change but prevents infinite loops
  useEffect(() => {
    if (isPredicting) return; // Don't predict if already in progress
    
    shipments.forEach(shipment => {
      if (shipment.status !== 'delivered' && !predictions[shipment.id] && !shipment.estimatedDelivery) {
        predictDelivery(shipment);
      }
    });
  }, [shipmentsKey]); // Use memoized key instead of shipments array

  // Automatic 6-hour tracking sync for all active shipments
  useEffect(() => {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    
    const syncStaleShipments = () => {
      const now = new Date();
      shipments.forEach(shipment => {
        if (shipment.status !== 'delivered' && shipment.trackingNumber) {
          const lastSync = shipment.easypostLastSync ? new Date(shipment.easypostLastSync) : null;
          const needsSync = !lastSync || (now.getTime() - lastSync.getTime() > SIX_HOURS_MS);
          
          if (needsSync) {
            syncEasyPostMutation.mutate(shipment.id);
          }
        }
      });
    };

    // Check on mount and set interval
    if (shipments.length > 0) {
      syncStaleShipments();
    }

    const interval = setInterval(syncStaleShipments, SIX_HOURS_MS);
    return () => clearInterval(interval);
  }, [shipmentsKey]);

  // Handle edit shipment form submission
  const handleEditShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Parse end tracking numbers from textarea (one per line)
    const endTrackingNumbersText = formData.get('endTrackingNumbers') as string || '';
    const endTrackingNumbers = endTrackingNumbersText
      .split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0);
    
    const data = {
      carrier: formData.get('carrier') as string || 'Standard Carrier',
      trackingNumber: formData.get('trackingNumber') as string,
      endCarrier: formData.get('endCarrier') as string || null,
      endTrackingNumbers: endTrackingNumbers.length > 0 ? endTrackingNumbers : null,
      shipmentName: formData.get('shipmentName') as string || '',
      shipmentType: formData.get('shipmentType') as string,
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
      shippingCost: parseFloat(formData.get('shippingCost') as string) || 0,
      shippingCostCurrency: formData.get('shippingCostCurrency') as string || 'USD',
      shippingMethod: formData.get('shipmentType') as string,
      notes: formData.get('notes') as string || null,
      totalWeight: parseFloat(formData.get('totalWeight') as string) || 0,
      totalUnits: parseInt(formData.get('totalUnits') as string) || 1,
      unitType: formData.get('unitType') as string || 'carton',
    };
    
    if (selectedShipment) {
      editShipmentMutation.mutate({ shipmentId: selectedShipment.id, data });
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t('copied'), description: t('trackingNumberCopied') });
    } catch (err) {
      toast({ title: t('error'), description: t('failedToCopy'), variant: "destructive" });
    }
  };

  // Get carrier tracking URL
  const getCarrierTrackingUrl = (carrier: string, trackingNumber: string): string => {
    const carrierUrls: Record<string, string> = {
      'DHL': `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
      'DPD': `https://www.dpd.com/cz/cs/sledovani-zasilek/?parcelNumber=${trackingNumber}`,
      'GLS': `https://gls-group.eu/EU/en/parcel-tracking?match=${trackingNumber}`,
      'Czech Post': `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
      'China Post': `http://english.11183.com.cn/zdxt/servlet/TrackingByEnglish?mailNum=${trackingNumber}`,
      'SF Express': `https://www.sf-express.com/us/en/dynamic_function/waybill/#search/bill-number/${trackingNumber}`,
    };
    
    return carrierUrls[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
  };

  // Sort and filter shipments
  const sortAndFilterShipments = (shipmentsToSort: Shipment[]) => {
    // Filter by shipment type
    let filtered = shipmentsToSort;
    if (filterType !== 'all') {
      filtered = shipmentsToSort.filter(s => s.shipmentType === filterType);
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    // Sort shipments
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'delivery':
          const dateA = a.estimatedDelivery || a.deliveredAt || new Date(a.createdAt).toISOString();
          const dateB = b.estimatedDelivery || b.deliveredAt || new Date(b.createdAt).toISOString();
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        case 'type':
          return (a.shipmentType || '').localeCompare(b.shipmentType || '');
        case 'status':
          const statusOrder = { 'pending': 0, 'in transit': 1, 'delivered': 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 0) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 0);
        default:
          return 0;
      }
    });

    return sorted;
  };

  const handleCreateShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Generate AI shipment name based on items and shipment type
    const generateShipmentName = () => {
      const method = selectedPendingShipment?.shippingMethod || '';
      const itemCount = selectedPendingShipment?.itemCount || 0;
      const items = selectedPendingShipment?.items || [];
      
      // Get first few item names
      const itemNames = items.slice(0, 2).map((item: any) => item.name).join(', ');
      const moreItems = items.length > 2 ? ` +${items.length - 2} more` : '';
      
      // Create descriptive name
      const methodType = method.includes('express') ? 'Express' : 
                        method.includes('air') ? 'Air' : 
                        method.includes('sea') ? 'Sea' : 
                        method.includes('railway') ? 'Rail' : 'Standard';
      
      return `${methodType} - ${itemNames}${moreItems} (${itemCount} ${t('items')})`;
    };
    
    // Parse end tracking numbers from textarea (one per line)
    const endTrackingNumbersText = formData.get('endTrackingNumbers') as string || '';
    const endTrackingNumbers = endTrackingNumbersText
      .split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0);
    
    // Get default origin/destination from pending shipment or warehouses
    const defaultOrigin = selectedPendingShipment?.warehouse || selectedPendingShipment?.location || 'China, Guangzhou';
    const defaultDestination = warehouses.length > 0 ? warehouses[0].name : 'Czech Republic, Prague';
    
    const data = {
      consolidationId: selectedPendingShipment?.id || (formData.get('consolidationId') as string) || null,
      carrier: formData.get('carrier') as string || t('standardCarrier'),
      trackingNumber: formData.get('trackingNumber') as string,
      endCarrier: formData.get('endCarrier') as string || null,
      endTrackingNumbers: endTrackingNumbers.length > 0 ? endTrackingNumbers : null,
      shipmentName: formData.get('shipmentName') as string || '',  // Let backend generate if empty
      shipmentType: formData.get('shipmentType') as string || selectedPendingShipment?.shippingMethod,
      origin: formData.get('origin') as string || defaultOrigin,
      destination: formData.get('destination') as string || defaultDestination,
      shippingCost: parseFloat(formData.get('shippingCost') as string) || 0,
      shippingCostCurrency: formData.get('shippingCostCurrency') as string || 'USD',
      shippingMethod: formData.get('shipmentType') as string || selectedPendingShipment?.shippingMethod,
      notes: formData.get('notes') as string || null,
      totalWeight: parseFloat(formData.get('totalWeight') as string) || selectedPendingShipment?.targetWeight || 0,
      totalUnits: parseInt(formData.get('totalUnits') as string) || 1,
      unitType: formData.get('unitType') as string || 'carton',
      items: selectedPendingShipment?.items || [],  // Pass items for AI generation
    };
    
    createShipmentMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => (
    <Badge className={statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status] || Package;
    return <Icon className="h-4 w-4" />;
  };

  const getCarrierIcon = (carrier: string) => {
    const Icon = carrierIcons[carrier] || Truck;
    return <Icon className="h-4 w-4" />;
  };

  const calculateProgress = (shipment: Shipment) => {
    if (shipment.status === 'delivered') return 100;
    
    const dispatchDate = new Date(shipment.createdAt);
    const estimatedDelivery = shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery) : null;
    const currentDate = new Date();
    
    if (!estimatedDelivery) return 25; // Default progress if no estimation
    
    const totalDays = differenceInDays(estimatedDelivery, dispatchDate);
    const daysPassed = differenceInDays(currentDate, dispatchDate);
    
    const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 95);
    return Math.round(progress);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 dark:text-green-400";
    if (confidence >= 75) return "text-blue-600 dark:text-blue-400";
    if (confidence >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };
  
  // Helper function to get shipment type color (border only)
  // Color psychology: Fast/urgent methods use warm colors, slower methods use cool colors
  // Sensitive items use deeper/richer variants to indicate special handling
  const getShipmentTypeColor = (shipmentType: string) => {
    if (shipmentType?.includes('express')) {
      // Express: Fastest - Red tones for urgency
      return shipmentType.includes('sensitive') ? 'border-l-orange-500' : 'border-l-red-500';
    } else if (shipmentType?.includes('air')) {
      // Air DDP: Fast - Blue/purple for sky and premium
      return shipmentType.includes('sensitive') ? 'border-l-purple-500' : 'border-l-blue-500';
    } else if (shipmentType?.includes('railway')) {
      // Railway: Moderate - Green/amber for balanced eco-friendly
      return shipmentType.includes('sensitive') ? 'border-l-amber-500' : 'border-l-green-500';
    } else if (shipmentType?.includes('sea')) {
      // Sea: Slowest - Teal/indigo for ocean depth
      return shipmentType.includes('sensitive') ? 'border-l-indigo-500' : 'border-l-teal-500';
    }
    return 'border-l-gray-500';
  };

  // Helper function to get shipment type icon with matching color psychology
  const getShipmentTypeIcon = (shipmentType: string, className: string = 'h-4 w-4') => {
    const isSensitive = shipmentType?.includes('sensitive');
    
    if (shipmentType?.includes('express')) {
      // Zap icon for express - red/orange for urgency
      const iconColor = isSensitive ? 'text-orange-500' : 'text-red-500';
      return <Zap className={`${className} ${iconColor}`} />;
    } else if (shipmentType?.includes('air')) {
      // Plane icon for air - blue/purple for sky
      const iconColor = isSensitive ? 'text-purple-500' : 'text-blue-500';
      return <Plane className={`${className} ${iconColor}`} />;
    } else if (shipmentType?.includes('railway')) {
      // Train icon for railway - green/amber for eco
      const iconColor = isSensitive ? 'text-amber-500' : 'text-green-500';
      return <Train className={`${className} ${iconColor}`} />;
    } else if (shipmentType?.includes('sea')) {
      // Ship icon for sea - teal/indigo for ocean
      const iconColor = isSensitive ? 'text-indigo-500' : 'text-teal-500';
      return <Ship className={`${className} ${iconColor}`} />;
    }
    return <Package className={`${className} text-muted-foreground`} />;
  };

  // Helper function to format shipment type display name with enhanced labels
  const formatShipmentType = (shipmentType: string) => {
    if (!shipmentType) return { label: '', badge: null };
    
    const isSensitive = shipmentType.includes('sensitive');
    const baseType = shipmentType.replace('_sensitive', '_general');
    
    const typeMap: { [key: string]: string } = {
      'air_ddp_general': 'Air DDP',
      'express_general': 'Express',
      'railway_general': 'Railway',
      'sea_general': 'Sea Freight'
    };
    
    const label = typeMap[baseType] || shipmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      label,
      badge: isSensitive ? '⚠️ Sensitive' : null
    };
  };

  const getTimeRemaining = (shipment: Shipment) => {
    if (shipment.status === 'delivered') return t('delivered');
    
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return t('calculating');
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(deliveryDate, currentDate);
    
    if (daysRemaining < 0) return t('delayed');
    if (daysRemaining === 0) return t('today');
    if (daysRemaining === 1) return t('oneDay');
    if (daysRemaining < 7) return `${daysRemaining} ${t('days')}`;
    if (daysRemaining < 30) {
      const weeks = Math.floor(daysRemaining / 7);
      return weeks === 1 ? t('oneWeek') : `${weeks} ${t('weeks')}`;
    }
    
    const months = Math.floor(daysRemaining / 30);
    return months === 1 ? t('oneMonth') : `${months} ${t('months')}`;
  };

  const getETAColor = (shipment: Shipment) => {
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(deliveryDate, currentDate);
    
    if (shipment.status === 'delivered') return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (daysRemaining < 0) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (daysRemaining === 0) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    if (daysRemaining <= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  };

  const getProgressTextColor = (shipment: Shipment) => {
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return "text-gray-600 dark:text-gray-400";
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(deliveryDate, currentDate);
    
    if (shipment.status === 'delivered') return "text-green-600 dark:text-green-400";
    if (daysRemaining < 0) return "text-red-600 dark:text-red-400";
    if (daysRemaining === 0) return "text-orange-600 dark:text-orange-400";
    if (daysRemaining <= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-blue-600 dark:text-blue-400";
  };

  const getDaysInTransit = (shipment: Shipment) => {
    const start = new Date(shipment.createdAt);
    const end = shipment.deliveredAt ? new Date(shipment.deliveredAt) : new Date();
    return differenceInDays(end, start);
  };

  const getDelayInfo = (shipment: Shipment) => {
    if (shipment.status === 'delivered') return null;
    
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return null;
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysDelayed = differenceInDays(currentDate, deliveryDate);
    
    if (daysDelayed > 0) {
      return daysDelayed;
    }
    return null;
  };

  // Filter shipments based on search query
  const filteredShipments = shipments.filter(shipment => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in tracking number
    if (shipment.trackingNumber.toLowerCase().includes(query)) return true;
    
    // Search in carrier
    if (shipment.carrier.toLowerCase().includes(query)) return true;
    
    // Search in origin/destination
    if (shipment.origin.toLowerCase().includes(query)) return true;
    if (shipment.destination.toLowerCase().includes(query)) return true;
    
    // Search in status
    if (shipment.status.toLowerCase().includes(query)) return true;
    
    // Search in items
    if (shipment.items && shipment.items.length > 0) {
      return shipment.items.some((item: any) => 
        item.name?.toLowerCase().includes(query) ||
        item.trackingNumber?.toLowerCase().includes(query)
      );
    }
    
    return false;
  });

  // Filter pending shipments based on search query
  const filteredPendingShipments = pendingShipments.filter(pending => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in consolidation name
    if (pending.name.toLowerCase().includes(query)) return true;
    
    // Search in location/warehouse
    if (pending.location?.toLowerCase().includes(query)) return true;
    if (pending.warehouse.toLowerCase().includes(query)) return true;
    
    // Search in shipping method
    if (pending.shippingMethod?.toLowerCase().includes(query)) return true;
    
    // Search in items
    if (pending.items && pending.items.length > 0) {
      return pending.items.some((item: any) => 
        item.name?.toLowerCase().includes(query)
      );
    }
    
    return false;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('internationalTransit')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('trackAllShipments')}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchByTracking')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-shipments"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllEasyPostMutation.mutate()}
            disabled={syncAllEasyPostMutation.isPending}
            data-testid="button-sync-all-tracking"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncAllEasyPostMutation.isPending ? 'animate-spin' : ''}`} />
            {t('syncTracking')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveWeekMutation.mutate()}
            disabled={archiveWeekMutation.isPending || shipments.length === 0}
            data-testid="button-archive-week"
          >
            <Archive className={`h-4 w-4 mr-2`} />
            {archiveWeekMutation.isPending ? t('archiving') : t('archiveWeek')}
          </Button>
          <Dialog 
            open={isShipmentFormOpen} 
            onOpenChange={(open) => {
              if (!open) {
                setIsShipmentFormOpen(false);
                setSelectedShipment(null);
                setSelectedPendingShipment(null);
                setDetectedEndCarrier('');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button 
                data-testid="button-create-shipment"
                onClick={() => {
                  setIsShipmentFormOpen(true);
                  setSelectedPendingShipment(null);
                  setSelectedShipment(null);
                  setDetectedEndCarrier('');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('createShipment')}
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {selectedShipment 
                  ? t('editShipmentTitle') 
                  : selectedPendingShipment 
                    ? t('addTrackingInfoTitle') 
                    : t('createNewShipmentTitle')}
              </DialogTitle>
              <DialogDescription>
                {selectedShipment
                  ? t('updateShipmentTrackingInfo')
                  : selectedPendingShipment 
                    ? t('addTrackingForConsolidation', { name: selectedPendingShipment.name, count: selectedPendingShipment.itemCount })
                    : t('createNewShipmentWithAI')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={selectedShipment ? handleEditShipment : handleCreateShipment} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 space-y-4">
                
                {/* Essential Fields - Always Visible */}
                <div className="space-y-4">
                  {/* Shipment Name - Autofilled from consolidation */}
                  <div className="space-y-2">
                    <Label htmlFor="shipmentName">{t('shipmentName')} *</Label>
                    <Input 
                      id="shipmentName" 
                      name="shipmentName" 
                      required
                      defaultValue={selectedShipment?.shipmentName || selectedPendingShipment?.name || ''}
                      data-testid="input-shipment-name"
                      placeholder={t('aiWillGenerateName')}
                    />
                  </div>

                  {/* Shipment Type - Auto-selected from consolidation shipping method */}
                  <div className="space-y-2">
                    <Label htmlFor="shipmentType">{t('shipmentType')} *</Label>
                    <Select name="shipmentType" required defaultValue={selectedShipment?.shipmentType || selectedPendingShipment?.shippingMethod || 'general_air_ddp'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_air_ddp">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-blue-500" />
                            {t('generalAirDDP')}
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_air_ddp">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-orange-500" />
                            {t('sensitiveAirDDP')}
                          </div>
                        </SelectItem>
                        <SelectItem value="general_express">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-red-500" />
                            {t('generalExpress')}
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_express">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-500" />
                            {t('sensitiveExpress')}
                          </div>
                        </SelectItem>
                        <SelectItem value="general_railway">
                          <div className="flex items-center gap-2">
                            <Train className="h-4 w-4 text-green-500" />
                            {t('generalRailway')}
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_railway">
                          <div className="flex items-center gap-2">
                            <Train className="h-4 w-4 text-orange-500" />
                            {t('sensitiveRailway')}
                          </div>
                        </SelectItem>
                        <SelectItem value="general_sea">
                          <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4 text-cyan-500" />
                            {t('generalSea')}
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_sea">
                          <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4 text-orange-500" />
                            {t('sensitiveSea')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Shipping Cost - Required */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="shippingCost">{t('shippingCost')} *</Label>
                      <Input 
                        id="shippingCost"
                        name="shippingCost" 
                        type="number" 
                        step="0.01"
                        required
                        defaultValue={selectedShipment?.shippingCost || ''}
                        placeholder="0.00"
                        data-testid="input-shipping-cost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingCostCurrency">{t('currency')} *</Label>
                      <Select name="shippingCostCurrency" required defaultValue={selectedShipment?.shippingCostCurrency || 'USD'}>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CZK">CZK</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* End Carrier - Dropdown with EasyPost carrier codes */}
                  <div className="space-y-2">
                    <Label htmlFor="endCarrier">{t('endCarrier')} * {detectedEndCarrier && <span className="text-xs text-green-600 font-normal ml-1">({t('autoDetected')})</span>}</Label>
                    <Select name="endCarrier" required 
                      value={detectedEndCarrier || (
                        selectedShipment?.endCarrier && selectedShipment?.easypostCarrier
                          ? `${selectedShipment.endCarrier}|${selectedShipment.easypostCarrier}`
                          : selectedShipment?.endCarrier 
                            ? `${selectedShipment.endCarrier}|0`
                            : ''
                      )}
                      onValueChange={(value) => setDetectedEndCarrier(value)}
                    >
                      <SelectTrigger data-testid="select-end-carrier">
                        <SelectValue placeholder={t('selectEndCarrier')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DHL Express|100001">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-600" />
                            DHL Express
                          </div>
                        </SelectItem>
                        <SelectItem value="DPD|100010">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-red-600" />
                            DPD
                          </div>
                        </SelectItem>
                        <SelectItem value="DHL Paket|7041">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-yellow-600" />
                            DHL Paket
                          </div>
                        </SelectItem>
                        <SelectItem value="GLS|100005">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            GLS
                          </div>
                        </SelectItem>
                        <SelectItem value="PPL CZ|100140">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-800" />
                            PPL
                          </div>
                        </SelectItem>
                        <SelectItem value="Czech Post|3221">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-700" />
                            Česká pošta
                          </div>
                        </SelectItem>
                        <SelectItem value="PostNL|14041">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-orange-500" />
                            PostNL
                          </div>
                        </SelectItem>
                        <SelectItem value="Bpost|2061">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-red-500" />
                            Bpost
                          </div>
                        </SelectItem>
                        <SelectItem value="FedEx|100003">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-purple-600" />
                            FedEx
                          </div>
                        </SelectItem>
                        <SelectItem value="UPS|100002">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-amber-700" />
                            UPS
                          </div>
                        </SelectItem>
                        <SelectItem value="Yodel|100017">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            Yodel
                          </div>
                        </SelectItem>
                        <SelectItem value="Zásilkovna|0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-green-600" />
                            Zásilkovna
                          </div>
                        </SelectItem>
                        <SelectItem value="Other|0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-600" />
                            {t('other')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* End Tracking Numbers */}
                  <div className="space-y-2">
                    <Label htmlFor="endTrackingNumbers">{t('endTrackingNumbers')} * <span className="text-xs text-muted-foreground font-normal">({t('onePerLine')})</span></Label>
                    <Textarea 
                      id="endTrackingNumbers" 
                      name="endTrackingNumbers" 
                      required
                      rows={3}
                      defaultValue={
                        selectedShipment?.endTrackingNumbers?.length 
                          ? selectedShipment.endTrackingNumbers.join('\n')
                          : (selectedShipment?.endTrackingNumber || '')
                      }
                      data-testid="textarea-end-tracking-numbers"
                      placeholder={t('pasteTrackingNumbers')}
                      className="font-mono text-sm"
                      onBlur={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim());
                        if (lines.length > 0) {
                          const detected = detectCarrierFromTrackingNumber(lines[0]);
                          if (detected && !detectedEndCarrier) {
                            setDetectedEndCarrier(`${detected.carrier}|${detected.code}`);
                            toast({
                              title: t('carrierDetected'),
                              description: `${detected.carrier} ${t('autoSelectedBasedOnTracking')}`,
                            });
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Additional Details - Collapsible */}
                <Collapsible className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                      <span className="text-sm font-medium">{t('additionalDetails')}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t('optional')}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 space-y-4">
                    {/* Internal Tracking Number & Carrier (for different tracking tool) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="trackingNumber" className="text-xs text-muted-foreground">{t('internalTrackingNumber')}</Label>
                        <Input 
                          id="trackingNumber" 
                          name="trackingNumber" 
                          defaultValue={selectedShipment?.trackingNumber || ''}
                          data-testid="input-tracking-number"
                          placeholder={t('enterInternalTracking')}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carrier" className="text-xs text-muted-foreground">{t('internalCarrier')}</Label>
                        <Input 
                          id="carrier" 
                          name="carrier" 
                          defaultValue={selectedShipment?.carrier || ''}
                          data-testid="input-carrier"
                          placeholder={t('enterInternalCarrier')}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Route Info - Autofilled */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('origin')}</Label>
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {selectedShipment?.origin || selectedPendingShipment?.warehouse || 'China, Guangzhou'}
                        </div>
                        <input type="hidden" name="origin" value={selectedShipment?.origin || selectedPendingShipment?.warehouse || 'China, Guangzhou'} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('destination')}</Label>
                        <Select name="destination" defaultValue={
                          selectedShipment?.destination || 
                          selectedPendingShipment?.destination || 
                          // Find matching warehouse by partial name match from location
                          (selectedPendingShipment?.location && warehouses.length > 0 
                            ? warehouses.find((w: any) => 
                                w.name?.toLowerCase().includes(selectedPendingShipment.location?.toLowerCase()) ||
                                selectedPendingShipment.location?.toLowerCase().includes(w.name?.toLowerCase()) ||
                                w.address?.toLowerCase().includes(selectedPendingShipment.location?.toLowerCase())
                              )?.name || warehouses[0]?.name
                            : warehouses.length > 0 ? warehouses[0].name : "Czech Republic, Prague")
                        }>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.length > 0 ? (
                              warehouses.map((warehouse: any) => (
                                <SelectItem key={warehouse.id} value={warehouse.name}>
                                  {warehouse.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Czech Republic, Prague">{t('czechRepublicPrague')}</SelectItem>
                                <SelectItem value="USA, California">{t('usaCalifornia')}</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Package Details - Autofilled */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('totalWeight')} (kg)</Label>
                        <Input 
                          name="totalWeight" 
                          type="number"
                          step="0.01"
                          defaultValue={selectedShipment?.totalWeight || selectedPendingShipment?.targetWeight || ''}
                          className="h-9 text-sm"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('totalUnits')}</Label>
                        <Input 
                          name="totalUnits" 
                          type="number"
                          min="1"
                          defaultValue={selectedShipment?.totalUnits || selectedPendingShipment?.itemCount || '1'}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('unitType')}</Label>
                        <Select name="unitType" defaultValue={selectedShipment?.unitType || 'cartons'}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cartons">{t('cartons')}</SelectItem>
                            <SelectItem value="boxes">{t('boxes')}</SelectItem>
                            <SelectItem value="pallets">{t('pallets')}</SelectItem>
                            <SelectItem value="bags">{t('bags')}</SelectItem>
                            <SelectItem value="crates">{t('crates')}</SelectItem>
                            <SelectItem value="pieces">{t('pieces')}</SelectItem>
                            <SelectItem value="cbm">{t('cbm')}</SelectItem>
                            <SelectItem value="drums">{t('drums')}</SelectItem>
                            <SelectItem value="20gp_container">{t('container20GP')}</SelectItem>
                            <SelectItem value="40gp_container">{t('container40GP')}</SelectItem>
                            <SelectItem value="40hq_container">{t('container40HQ')}</SelectItem>
                            <SelectItem value="45hq_container">{t('container45HQ')}</SelectItem>
                            <SelectItem value="lcl">{t('lclShipment')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('notes')}</Label>
                      <Textarea 
                        name="notes" 
                        rows={2}
                        defaultValue={selectedShipment?.notes || ''}
                        className="text-sm"
                        placeholder={t('additionalShippingNotes')}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setIsShipmentFormOpen(false);
                  setSelectedShipment(null);
                  setSelectedPendingShipment(null);
                }}>
                  {t('cancel')}
                </Button>
                <Button type="submit" 
                  disabled={selectedShipment ? editShipmentMutation.isPending : createShipmentMutation.isPending} 
                  data-testid="button-submit-shipment">
                  {selectedShipment 
                    ? (editShipmentMutation.isPending ? t('updating') : t('updateShipment'))
                    : (createShipmentMutation.isPending ? t('creating') : t('createShipment'))
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Results Indicator */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>
            {filteredShipments.length === 1 
              ? t('foundShipmentsMatching', { count: filteredShipments.length, pending: filteredPendingShipments.length, query: searchQuery })
              : t('foundShipmentsMatchingPlural', { count: filteredShipments.length, pending: filteredPendingShipments.length, query: searchQuery })
            }
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="h-6 px-2"
          >
            {t('clear')}
          </Button>
        </div>
      )}

      {/* Color Legend - Collapsible */}
      <details className="mb-4">
        <summary className="cursor-pointer text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <Info className="h-4 w-4" />
          {t('shipmentTypeColorGuide')}
        </summary>
        <Card className="mt-2">
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-red-500 rounded"></div>
                <div>
                  <p className="font-medium">{t('express')}</p>
                  <p className="text-xs text-muted-foreground">{t('fastest')} (1-3 {t('days')})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-blue-500 rounded"></div>
                <div>
                  <p className="font-medium">{t('airDDP')}</p>
                  <p className="text-xs text-muted-foreground">{t('fast')} (5-7 {t('days')})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-green-500 rounded"></div>
                <div>
                  <p className="font-medium">{t('railway')}</p>
                  <p className="text-xs text-muted-foreground">{t('moderate')} (15-20 {t('days')})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-teal-500 rounded"></div>
                <div>
                  <p className="font-medium">{t('sea')}</p>
                  <p className="text-xs text-muted-foreground">{t('economical')} (30-45 {t('days')})</p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300">
                  ⚠️ {t('sensitive')}
                </Badge>
                <span>{t('itemsWithBatteriesOrSpecialHandling')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </details>

      {/* View Tabs */}
      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'active' | 'archived')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            {t('activeShipments')} ({shipments.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            {t('archivedShipments')} ({archivedWeeks.reduce((sum, w) => sum + w.count, 0)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('active')}</CardTitle>
            <Plane className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-active-shipments">
              {filteredShipments.filter(s => s.status !== 'delivered').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('inTransit')}</CardTitle>
            <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {filteredShipments.filter(s => s.status === 'in transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('alerts')}</CardTitle>
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {filteredShipments.filter(s => s.status === 'in transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('delivered')}</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {filteredShipments.filter(s => s.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Shipments - Shipped Consolidations needing tracking */}
      {filteredPendingShipments.length > 0 && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-yellow-600" />
              <span>{t('pendingShipments')}</span>
              <Badge variant="secondary" className="ml-2">{filteredPendingShipments.length}</Badge>
            </CardTitle>
            <CardDescription>
              {t('shippedConsolidationsNeedTracking')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPendingShipments.map((pending) => (
                <div key={pending.id} className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Package className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{pending.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {pending.location} • {pending.warehouse} • {pending.itemCount} {t('items')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Badge variant="outline" className="text-[10px] sm:text-xs flex items-center px-2 py-1">
                        {(() => {
                          const method = pending.shippingMethod;
                          const iconClass = "h-3 w-3 mr-1";
                          if (method?.includes('air')) {
                            return <Plane className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else if (method?.includes('express')) {
                            return <Zap className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else if (method?.includes('railway')) {
                            return <Train className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else if (method?.includes('sea')) {
                            return <Ship className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else {
                            return <Package className={iconClass} />;
                          }
                        })()}
                        <span className="hidden sm:inline">{pending.shippingMethod?.replace(/_/g, ' ').toUpperCase() || 'STANDARD'}</span>
                        <span className="sm:hidden">{pending.shippingMethod?.replace(/_/g, ' ').split(' ')[0] || 'STD'}</span>
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs px-2"
                        onClick={() => {
                          // Quick ship with defaults
                          const generateShipmentName = () => {
                            const method = pending.shippingMethod || '';
                            const itemCount = pending.itemCount || 0;
                            const items = pending.items || [];
                            
                            const itemNames = items.slice(0, 2).map((item: any) => item.name).join(', ');
                            const moreItems = items.length > 2 ? ` +${items.length - 2} more` : '';
                            
                            const methodType = method.includes('express') ? 'Express' : 
                                              method.includes('air') ? 'Air' : 
                                              method.includes('sea') ? 'Sea' : 
                                              method.includes('railway') ? 'Rail' : 'Standard';
                            
                            return `${methodType} - ${itemNames}${moreItems} (${itemCount} items)`;
                          };
                          
                          const quickShipData = {
                            consolidationId: pending.id,
                            carrier: '',
                            trackingNumber: '',
                            endCarrier: null,
                            endTrackingNumber: null,
                            shipmentName: generateShipmentName(),
                            shipmentType: pending.shippingMethod,
                            origin: pending.warehouse || 'China, Guangzhou',
                            destination: warehouses.length > 0 ? warehouses[0].name : 'Czech Republic, Prague',
                            shippingCost: 0,
                            shippingCostCurrency: 'USD',
                            shippingMethod: pending.shippingMethod,
                            notes: '',
                          };
                          
                          createShipmentMutation.mutate(quickShipData);
                        }}
                        data-testid={`button-quick-ship-${pending.id}`}
                      >
                        <Zap className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">{t('quickShip')}</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        className="text-xs px-2"
                        onClick={() => {
                          setSelectedPendingShipment(pending);
                          setDetectedEndCarrier('');
                          setIsShipmentFormOpen(true);
                        }}
                        data-testid={`button-add-tracking-${pending.id}`}
                      >
                        <Plus className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">{pending.trackingNumber ? t('update') : t('add')}</span>
                        <span className="sm:hidden">{t('tracking')}</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => moveBackToWarehouseMutation.mutate(pending.id)}
                            disabled={moveBackToWarehouseMutation.isPending}
                          >
                            <ArrowLeft className="h-3 w-3 mr-2" />
                            {t('moveBackToWarehouse')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Items Preview */}
                  {pending.items && pending.items.length > 0 && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t('contents')}:</p>
                      <div className="space-y-1">
                        {pending.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="w-6 h-6 object-cover rounded border flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                                <Package className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="truncate flex-1">{item.name}</span>
                            <Badge variant="secondary" className="text-xs px-1 py-0 h-5 min-w-[30px] flex items-center justify-center">
                              x{item.quantity || 1}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {pending.targetWeight && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('totalWeightLabel')}: {pending.targetWeight} kg
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>{t('shipmentTracking')}</CardTitle>
              <CardDescription>
                {t('monitorAllInternationalShipments')}
              </CardDescription>
            </div>
            
            {/* Sort and Filter Controls */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full text-xs sm:text-sm">
                      <SelectValue placeholder={t('filterByTypeLabel')} />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {t('allShipmentsFilter')}
                      </div>
                    </SelectItem>
                    <SelectItem value="air_ddp_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('air_ddp_general', 'h-4 w-4')}
                        {t('airDDPGeneral')}
                      </div>
                    </SelectItem>
                    <SelectItem value="air_ddp_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('air_ddp_sensitive', 'h-4 w-4')}
                        {t('airDDPSensitive')}
                      </div>
                    </SelectItem>
                    <SelectItem value="express_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('express_general', 'h-4 w-4')}
                        {t('expressGeneralLabel')}
                      </div>
                    </SelectItem>
                    <SelectItem value="express_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('express_sensitive', 'h-4 w-4')}
                        {t('expressSensitiveLabel')}
                      </div>
                    </SelectItem>
                    <SelectItem value="railway_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('railway_general', 'h-4 w-4')}
                        {t('railwayGeneralLabel')}
                      </div>
                    </SelectItem>
                    <SelectItem value="railway_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('railway_sensitive', 'h-4 w-4')}
                        {t('railwaySensitiveLabel')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sea_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('sea_general', 'h-4 w-4')}
                        {t('seaGeneralLabel')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sea_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('sea_sensitive', 'h-4 w-4')}
                        {t('seaSensitiveLabel')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                </div>
                
                <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full text-xs sm:text-sm">
                      <SelectValue placeholder={t('status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatus')}</SelectItem>
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="in transit">{t('inTransit')}</SelectItem>
                      <SelectItem value="delivered">{t('delivered')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-full text-xs sm:text-sm">
                      <SelectValue placeholder={t('sortBy')} />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">{t('deliveryDate')}</SelectItem>
                    <SelectItem value="type">{t('shipmentType')}</SelectItem>
                    <SelectItem value="status">{t('status')}</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? t('noShipmentsMatchSearch') : t('noShipmentsFound')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t('tryAdjustingSearch') : t('createFirstShipment')}
              </p>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
                  {t('clearSearch')}
                </Button>
              ) : (
                <Button onClick={() => { setDetectedEndCarrier(''); setIsShipmentFormOpen(true); }} data-testid="button-create-first-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('createShipment')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sortAndFilterShipments(filteredShipments).map((shipment) => {
                const prediction = predictions[shipment.id];
                const progress = calculateProgress(shipment);
                
                return (
                  <Card 
                    key={shipment.id} 
                    id={`shipment-${shipment.id}`}
                    className="group hover:shadow-md transition-all duration-200 border border-border/50 hover:border-border"
                    onClick={() => setViewShipmentDetails(shipment)}
                  >
                    <CardContent className="p-4">
                      {/* Header: Title + Status Dropdown */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate" data-testid={`shipment-tracking-${shipment.id}`}>
                            {shipment.shipmentName || shipment.trackingNumber || `${t('shipment')} #${shipment.id.slice(0, 8)}`}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {shipment.origin} → {shipment.destination}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={shipment.status}
                            onValueChange={(status) => 
                              updateTrackingMutation.mutate({ 
                                shipmentId: shipment.id, 
                                data: { status, ...(status === 'delivered' ? { deliveredAt: new Date().toISOString() } : {}) }
                              })
                            }
                          >
                            <SelectTrigger 
                              onClick={(e) => e.stopPropagation()}
                              className={`h-8 text-xs font-medium min-w-[100px] ${
                                shipment.status === 'delivered' 
                                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/50 dark:border-green-800 dark:text-green-300' 
                                  : shipment.status === 'in transit' 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300' 
                                    : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300'
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t('pending')}</SelectItem>
                              <SelectItem value="in transit">{t('inTransit')}</SelectItem>
                              <SelectItem value="delivered">{t('delivered')}</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedShipment(shipment);
                                setDetectedEndCarrier('');
                                setIsShipmentFormOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('editShipment')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                syncEasyPostMutation.mutate(shipment.id);
                              }}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('syncTracking')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5 text-xs">
                          <span className="text-muted-foreground">
                            {format(new Date(shipment.createdAt), 'MMM dd')}
                          </span>
                          <span className={`font-medium ${
                            shipment.status === 'delivered' ? 'text-green-600' :
                            (() => {
                              const eta = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
                              if (!eta) return 'text-muted-foreground';
                              const days = differenceInDays(new Date(eta), new Date());
                              if (days < 0) return 'text-red-600';
                              if (days <= 2) return 'text-amber-600';
                              return 'text-blue-600';
                            })()
                          }`}>
                            {getTimeRemaining(shipment)}
                          </span>
                          <span className="text-muted-foreground">
                            {shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery 
                              ? format(new Date(shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery), 'MMM dd')
                              : '—'}
                          </span>
                        </div>
                        <Progress 
                          value={progress} 
                          className={`h-2 ${
                            shipment.status === 'delivered' ? '[&>div]:bg-green-500' :
                            (() => {
                              const eta = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
                              if (!eta) return '[&>div]:bg-slate-400';
                              const days = differenceInDays(new Date(eta), new Date());
                              if (days < 0) return '[&>div]:bg-red-500';
                              if (days <= 2) return '[&>div]:bg-amber-500';
                              return '[&>div]:bg-blue-500';
                            })()
                          }`}
                        />
                        {shipment.easypostLastSync && (
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">
                            {t('lastSynced')}: {format(new Date(shipment.easypostLastSync), 'MMM dd, HH:mm')}
                            {/* Show tracking progress for multi-tracking shipments */}
                            {shipment.trackingCount && shipment.trackingCount > 1 && (
                              <span className="ml-2">
                                ({shipment.trackingDeliveredCount || 0}/{shipment.trackingCount} {t('delivered')})
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* EasyPost Status & History */}
                      {(shipment.easypostStatus || shipment.easypostLastEvent) && (
                        <div className="border-t pt-3 mb-3">
                          <div className="flex items-start gap-2">
                            <Globe className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              {shipment.easypostStatus && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] ${
                                      shipment.easypostStatus === 'Delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                      shipment.easypostStatus === 'InTransit' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      shipment.easypostStatus === 'AvailableForPickup' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      shipment.easypostStatus === 'Exception' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}
                                  >
                                    {shipment.easypostStatus}
                                  </Badge>
                                  {shipment.endCarrier && (
                                    <span className="text-[10px] text-muted-foreground">{shipment.endCarrier}</span>
                                  )}
                                  {/* Estimated days from EasyPost polling */}
                                  {shipment.estimatedDaysMin !== undefined && shipment.estimatedDaysMin !== null && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[10px] ml-auto ${
                                        shipment.estimatedDaysMin <= 1 ? 'bg-green-50 text-green-700 border-green-200' :
                                        shipment.estimatedDaysMin <= 3 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        shipment.estimatedDaysMin <= 7 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {shipment.estimatedDaysMin === shipment.estimatedDaysMax 
                                        ? `${shipment.estimatedDaysMin}d`
                                        : `${shipment.estimatedDaysMin}-${shipment.estimatedDaysMax}d`
                                      }
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {shipment.easypostLastEvent && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {shipment.easypostLastEvent}
                                </p>
                              )}
                              {shipment.easypostLastEventTime && (
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                  {format(new Date(shipment.easypostLastEventTime), 'MMM dd, HH:mm')}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Tracking History Dropdown */}
                          {shipment.easypostEvents && Array.isArray(shipment.easypostEvents) && shipment.easypostEvents.length > 0 && (
                            <Collapsible className="mt-2">
                              <CollapsibleTrigger 
                                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronDown className="h-3 w-3" />
                                {t('showTrackingHistory')} ({shipment.easypostEvents.length})
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <div 
                                  className="max-h-40 overflow-y-auto space-y-2 pl-2 border-l-2 border-blue-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {shipment.easypostEvents.map((event: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                      <p className="font-medium text-foreground">{event.description || event.z}</p>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        {event.time && <span>{format(new Date(event.time), 'MMM dd, HH:mm')}</span>}
                                        {event.location && <span>• {event.location}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      )}

                      {/* Package Contents - Clean List */}
                      {shipment.items && shipment.items.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t('packageContents')} ({shipment.totalUnits || shipment.itemCount})
                          </p>
                          <div className="space-y-1.5">
                            {shipment.items.slice(0, 3).map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="" className="w-6 h-6 object-cover rounded flex-shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                    <Package className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="flex-1 truncate">{item.name || `Item ${index + 1}`}</span>
                                <span className="text-muted-foreground text-xs">×{item.quantity || 1}</span>
                              </div>
                            ))}
                            {shipment.items.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{shipment.items.length - 3} {t('moreItems')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Archived Shipments Tab */}
        <TabsContent value="archived" className="mt-4">
          {isLoadingArchived ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : archivedWeeks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('noArchivedShipments')}</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {t('noArchivedShipmentsDescription')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {archivedWeeks.map((week) => (
                <Card key={week.week}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          {t('weekLabel')} {week.week}
                        </CardTitle>
                        <CardDescription>
                          {t('archivedOn')} {week.archivedAt ? format(new Date(week.archivedAt), 'MMM dd, yyyy HH:mm') : '—'}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {week.count} {week.count === 1 ? t('shipment') : t('shipmentsPlural')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {week.shipments.map((shipment) => (
                        <div 
                          key={shipment.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getShipmentTypeIcon(shipment.shipmentType || '', 'h-5 w-5')}
                            <div>
                              <p className="font-medium">{shipment.shipmentName || shipment.trackingNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {shipment.origin} → {shipment.destination}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={shipment.status === 'delivered' ? 'bg-green-100 text-green-800' : shipment.status === 'in transit' ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800'}>
                              {shipment.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unarchiveMutation.mutate(shipment.id)}
                              disabled={unarchiveMutation.isPending}
                              data-testid={`button-unarchive-${shipment.id}`}
                            >
                              <ArchiveRestore className="h-4 w-4 mr-1" />
                              {t('restore')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Shipment Details Dialog */}
      <Dialog open={!!viewShipmentDetails} onOpenChange={() => setViewShipmentDetails(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {viewShipmentDetails && getShipmentTypeIcon(viewShipmentDetails.shipmentType || '', 'h-5 w-5 text-primary')}
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    {viewShipmentDetails?.shipmentName || viewShipmentDetails?.trackingNumber}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {viewShipmentDetails?.origin} → {viewShipmentDetails?.destination}
                  </DialogDescription>
                </div>
              </div>
              <Badge className={viewShipmentDetails?.status === 'delivered' ? 'bg-green-100 text-green-800' : viewShipmentDetails?.status === 'in transit' ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800'}>
                {viewShipmentDetails?.status}
              </Badge>
            </div>
          </DialogHeader>

          {viewShipmentDetails && (() => {
            const totalShipping = parseFloat(viewShipmentDetails.shippingCost || '0') + parseFloat(viewShipmentDetails.insuranceValue || '0');
            const totalItems = viewShipmentDetails.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0;
            const currency = viewShipmentDetails.shippingCostCurrency || 'USD';
            
            // Helper: Calculate volumetric weight (L × W × H / 6000 for air freight)
            const getVolumetricWeight = (item: any): number => {
              if (!item.dimensions) return 0;
              try {
                const dims = typeof item.dimensions === 'string' ? JSON.parse(item.dimensions) : item.dimensions;
                if (dims.length && dims.width && dims.height) {
                  return (dims.length * dims.width * dims.height) / 6000;
                }
              } catch (e) {
                return 0;
              }
              return 0;
            };
            
            // Helper: Calculate chargeable weight (max of actual weight or volumetric weight)
            const getChargeableWeight = (item: any): number => {
              const actualWeight = parseFloat(item.weight || 0);
              const volumetricWeight = getVolumetricWeight(item);
              return Math.max(actualWeight, volumetricWeight);
            };
            
            // Calculate totals for different allocation methods
            const totalWeight = viewShipmentDetails.items?.reduce((sum: number, item: any) => {
              const itemWeight = parseFloat(item.weight || 0);
              return sum + (itemWeight * (item.quantity || 1));
            }, 0) || 0;
            
            const totalChargeableWeight = viewShipmentDetails.items?.reduce((sum: number, item: any) => {
              const chargeableWeight = getChargeableWeight(item);
              return sum + (chargeableWeight * (item.quantity || 1));
            }, 0) || 0;
            
            const totalValue = viewShipmentDetails.items?.reduce((sum: number, item: any) => {
              const itemValue = parseFloat(item.unitPrice || 0);
              return sum + (itemValue * (item.quantity || 1));
            }, 0) || 0;
            
            // Determine AUTO method based on shipment type (same logic as LandingCostService)
            const unitType = (viewShipmentDetails.unitType || 'items').toLowerCase();
            let autoMethod = 'HYBRID'; // default
            
            if (unitType.includes('container')) {
              autoMethod = 'VALUE';
            } else if (unitType.includes('pallet')) {
              autoMethod = 'UNITS';
            } else if (unitType.includes('box') || unitType.includes('parcel') || unitType.includes('package')) {
              autoMethod = 'CHARGEABLE_WEIGHT';
            } else if (unitType === 'mixed' || unitType === 'items') {
              autoMethod = 'HYBRID';
            }
            
            const effectiveMethod = allocationMethod === 'AUTO' ? autoMethod : allocationMethod;
            
            // Function to calculate shipping cost per item based on allocation method
            const calculateShippingCost = (item: any) => {
              const qty = item.quantity || 1;
              const itemWeight = parseFloat(item.weight || 0) * qty;
              const itemChargeableWeight = getChargeableWeight(item) * qty;
              const itemValue = parseFloat(item.unitPrice || 0) * qty;
              
              switch (effectiveMethod) {
                case 'UNITS':
                  return totalItems > 0 ? totalShipping / totalItems : 0;
                  
                case 'WEIGHT':
                  return totalWeight > 0 ? (itemWeight / totalWeight) * totalShipping : 0;
                  
                case 'CHARGEABLE_WEIGHT':
                  return totalChargeableWeight > 0 ? (itemChargeableWeight / totalChargeableWeight) * totalShipping : 0;
                  
                case 'VALUE':
                  return totalValue > 0 ? (itemValue / totalValue) * totalShipping : 0;
                  
                case 'HYBRID':
                  // 60% weight, 40% value (same as LandingCostService default)
                  const weightPortion = totalChargeableWeight > 0 ? (itemChargeableWeight / totalChargeableWeight) * totalShipping * 0.6 : 0;
                  const valuePortion = totalValue > 0 ? (itemValue / totalValue) * totalShipping * 0.4 : 0;
                  return weightPortion + valuePortion;
                  
                default:
                  return totalItems > 0 ? totalShipping / totalItems : 0;
              }
            };
            
            // For the overview, show average per unit
            const shippingPerUnit = totalItems > 0 ? totalShipping / totalItems : 0;
            
            return (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Compact Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg text-xs">
                  <div>
                    <p className="text-muted-foreground">{t('items')}</p>
                    <p className="font-semibold text-sm">{totalItems} {t('units')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('weight')}</p>
                    <p className="font-semibold text-sm">{viewShipmentDetails.totalWeight || '—'} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('shipping')}</p>
                    <p className="font-semibold text-sm">{currency} {totalShipping.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('perUnit')}</p>
                    <p className="font-semibold text-sm">{currency} {shippingPerUnit.toFixed(2)}</p>
                  </div>
                </div>

                {/* Items Table with Pricing */}
                {viewShipmentDetails.items && viewShipmentDetails.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        {t('itemPricingAndLandingCost')}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="allocation-method" className="text-xs text-muted-foreground">
                          {t('allocationMethod')}:
                        </Label>
                        <Select value={allocationMethod} onValueChange={(value: any) => setAllocationMethod(value)}>
                          <SelectTrigger id="allocation-method" className="h-8 w-[160px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-cyan-600" />
                                <span className="font-semibold">{t('auto')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="UNITS">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                {t('byUnits')}
                              </div>
                            </SelectItem>
                            <SelectItem value="WEIGHT">
                              <div className="flex items-center gap-2">
                                <Target className="h-3 w-3" />
                                {t('byWeight')}
                              </div>
                            </SelectItem>
                            <SelectItem value="VALUE">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                {t('byValue')}
                              </div>
                            </SelectItem>
                            <SelectItem value="HYBRID">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                {t('hybrid')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {viewShipmentDetails.items.map((item: any, index: number) => {
                        const qty = item.quantity || 1;
                        const unitCost = parseFloat(item.unitPrice || 0);
                        const itemShippingCost = calculateShippingCost(item);
                        const shippingCostPerUnit = qty > 0 ? itemShippingCost / qty : 0;
                        const landingCost = unitCost + shippingCostPerUnit;
                        const landingCostEUR = convertCurrency(landingCost, currency as Currency, 'EUR');
                        const landingCostCZK = convertCurrency(landingCost, currency as Currency, 'CZK');
                        
                        return (
                          <div key={index} className="border rounded-lg p-3 space-y-2 bg-card">
                            <div className="flex items-start gap-3">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="w-12 h-12 object-cover rounded border flex-shrink-0" />
                              ) : (
                                <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 flex justify-between items-start">
                                <p className="font-medium text-sm">{item.name || `Item ${index + 1}`}</p>
                                <Badge variant="outline" className="text-xs">{t('qty')}: {qty}</Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">{t('unitCost')}</p>
                                <p className="font-mono">{currency} {unitCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('shippingPerUnit')}</p>
                                <p className="font-mono text-blue-600">{currency} {shippingCostPerUnit.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('landingCost')}</p>
                                <p className="font-mono font-semibold">{currency} {landingCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('landingEUR')}</p>
                                <p className="font-mono text-cyan-700 dark:text-cyan-400">€{landingCostEUR.toFixed(2)}</p>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">{t('landingCZK')}</p>
                              <p className="font-mono text-sm text-cyan-700 dark:text-cyan-400">{landingCostCZK.toFixed(0)} Kč</p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Mobile Totals Card */}
                      <div className="border-2 border-primary/20 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/30">
                        <p className="font-semibold mb-3">{t('totals')}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">{t('totalCost')}</p>
                            <p className="font-mono font-semibold">
                              {currency} {viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('totalShipping')}</p>
                            <p className="font-mono font-semibold text-blue-600">
                              {currency} {totalShipping.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('totalLanding')}</p>
                            <p className="font-mono font-semibold">
                              {currency} {(() => {
                                const totalLanding = viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                  sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                                ) + totalShipping;
                                return totalLanding.toFixed(2);
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('landingEUR')}</p>
                            <p className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                              €{(() => {
                                const totalLanding = viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                  sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                                ) + totalShipping;
                                return convertCurrency(totalLanding, currency as Currency, 'EUR').toFixed(2);
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">{t('totalLandingCZK')}</p>
                          <p className="font-mono text-base font-semibold text-cyan-700 dark:text-cyan-400">
                            {(() => {
                              const totalLanding = viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                              ) + totalShipping;
                              return convertCurrency(totalLanding, currency as Currency, 'CZK').toFixed(0);
                            })()} Kč
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Table View */}
                    <div className="hidden md:block border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableHead className="w-[30%]">{t('item')}</TableHead>
                            <TableHead className="text-center w-[8%]">{t('qty')}</TableHead>
                            <TableHead className="text-right w-[14%]">{t('unitCost')}</TableHead>
                            <TableHead className="text-right w-[12%]">{t('shipping')}</TableHead>
                            <TableHead className="text-right w-[12%]">{t('landing')}</TableHead>
                            <TableHead className="text-right w-[12%]">{t('landingCostEUR')}</TableHead>
                            <TableHead className="text-right w-[12%]">{t('landingCostCZK')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewShipmentDetails.items.map((item: any, index: number) => {
                            const qty = item.quantity || 1;
                            const unitCost = parseFloat(item.unitPrice || 0);
                            const itemShippingCost = calculateShippingCost(item);
                            const shippingCostPerUnit = qty > 0 ? itemShippingCost / qty : 0;
                            const landingCost = unitCost + shippingCostPerUnit;
                            const landingCostEUR = convertCurrency(landingCost, currency as Currency, 'EUR');
                            const landingCostCZK = convertCurrency(landingCost, currency as Currency, 'CZK');
                            
                            return (
                              <TableRow key={index} className="text-sm">
                                <TableCell className="font-medium">{item.name || t('itemNumber', { number: index + 1 })}</TableCell>
                                <TableCell className="text-center font-mono text-xs">{qty}</TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  {currency} {unitCost.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-blue-600">
                                  {currency} {shippingCostPerUnit.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-semibold font-mono text-xs">
                                  {currency} {landingCost.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-cyan-700 dark:text-cyan-400">
                                  €{landingCostEUR.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-cyan-700 dark:text-cyan-400">
                                  {landingCostCZK.toFixed(0)} Kč
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-slate-50 dark:bg-slate-900/30 font-semibold">
                            <TableCell colSpan={2}>{t('totals')}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {currency} {viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                              ).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-600">
                              {currency} {totalShipping.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {currency} {(() => {
                                const totalLanding = viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                  sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                                ) + totalShipping;
                                return totalLanding.toFixed(2);
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-cyan-700 dark:text-cyan-400">
                              €{(() => {
                                const totalLanding = viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                  sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                                ) + totalShipping;
                                return convertCurrency(totalLanding, currency as Currency, 'EUR').toFixed(2);
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-cyan-700 dark:text-cyan-400">
                              {(() => {
                                const totalLanding = viewShipmentDetails.items.reduce((sum: number, item: any) => 
                                  sum + (parseFloat(item.unitPrice || 0) * (item.quantity || 1)), 0
                                ) + totalShipping;
                                return convertCurrency(totalLanding, currency as Currency, 'CZK').toFixed(0);
                              })()} Kč
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="text-xs text-muted-foreground px-1 space-y-1.5">
                      <p>
                        💡 {t('shippingCostAllocatedAcross')} <strong className="text-foreground">{totalItems} {t('unitsLabel')}</strong> {t('using')}{' '}
                        <strong className="text-foreground">
                          {effectiveMethod}
                        </strong>{allocationMethod === 'AUTO' && ` ${t('autoSelected')}`}. {t('landingCostsConverted')}
                      </p>
                      
                      {/* Method-specific explanation with auto-selection context */}
                      {effectiveMethod === 'CHARGEABLE_WEIGHT' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-blue-600 dark:text-blue-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}⚖️ {t('usingChargeableWeight')}
                        </p>
                      )}
                      {effectiveMethod === 'WEIGHT' && (
                        <p className="text-blue-600 dark:text-blue-400">
                          ⚖️ {t('heavierItemsProportional')}
                        </p>
                      )}
                      {effectiveMethod === 'VALUE' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-green-600 dark:text-green-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}💰 {t('higherValueItemsProportional')}
                        </p>
                      )}
                      {effectiveMethod === 'HYBRID' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-purple-600 dark:text-purple-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}⚡ {t('balancedAllocation')}
                        </p>
                      )}
                      {effectiveMethod === 'UNITS' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-gray-600 dark:text-gray-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}📦 {t('equalDistributionPerUnit')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Compact Tracking & Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(viewShipmentDetails.trackingNumber || viewShipmentDetails.endTrackingNumber) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          {t('trackingAction')}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => syncEasyPostMutation.mutate(viewShipmentDetails.id)}
                          disabled={syncEasyPostMutation.isPending}
                          data-testid={`button-sync-tracking-${viewShipmentDetails.id}`}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${syncEasyPostMutation.isPending ? 'animate-spin' : ''}`} />
                          {t('syncTracking')}
                        </Button>
                      </div>
                      <div className="space-y-2 p-3 border rounded-lg text-xs">
                        <div>
                          <p className="text-muted-foreground">{t('endCarrier')}</p>
                          <p className="font-medium">{viewShipmentDetails.endCarrier || '—'}</p>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground">{t('endTrackingNumber')}</p>
                          <p className="font-mono text-blue-600 font-medium">{viewShipmentDetails.endTrackingNumber || viewShipmentDetails.endTrackingNumbers?.join(', ') || '—'}</p>
                        </div>
                        
                        {/* EasyPost Status */}
                        {viewShipmentDetails.easypostRegistered && (
                          <div className="pt-2 border-t space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t('liveTrackingStatus')}</span>
                              <Badge variant={viewShipmentDetails.easypostStatus === 'Delivered' ? 'default' : 'secondary'} className="text-xs">
                                {viewShipmentDetails.easypostStatus || t('unknown')}
                              </Badge>
                            </div>
                            {viewShipmentDetails.easypostLastEvent && (
                              <p className="text-muted-foreground">
                                {viewShipmentDetails.easypostLastEvent}
                                {viewShipmentDetails.easypostLastEventTime && (
                                  <span className="ml-1 text-xs opacity-70">
                                    ({format(new Date(viewShipmentDetails.easypostLastEventTime), 'MMM dd, HH:mm')})
                                  </span>
                                )}
                              </p>
                            )}
                            {viewShipmentDetails.easypostLastSync && (
                              <p className="text-xs text-muted-foreground/70">
                                {t('lastSynced')}: {format(new Date(viewShipmentDetails.easypostLastSync), 'MMM dd, HH:mm')}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* EasyPost Events Timeline */}
                        {viewShipmentDetails.easypostEvents && viewShipmentDetails.easypostEvents.length > 0 && (
                          <div className="pt-2 border-t space-y-2">
                            <p className="text-muted-foreground font-medium">{t('trackingEvents')}</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {viewShipmentDetails.easypostEvents.slice(0, 10).map((event, idx) => (
                                <div key={idx} className="flex gap-2 text-xs">
                                  <div className="w-2 h-2 mt-1 rounded-full bg-blue-500 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-foreground">{event.description}</p>
                                    <p className="text-muted-foreground/70">
                                      {event.time && format(new Date(event.time), 'MMM dd, HH:mm')}
                                      {event.location && ` • ${event.location}`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      {t('timelineLabel')}
                    </h3>
                    <div className="space-y-1.5 p-3 border rounded-lg text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('createdLabel')}</span>
                        <span className="font-medium">{format(new Date(viewShipmentDetails.createdAt), 'MMM dd, HH:mm')}</span>
                      </div>
                      {viewShipmentDetails.estimatedDelivery && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('estimatedDeliveryShort')}</span>
                          <span className="font-medium">{format(new Date(viewShipmentDetails.estimatedDelivery), 'MMM dd')}</span>
                        </div>
                      )}
                      {viewShipmentDetails.deliveredAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('delivered')}</span>
                          <span className="font-medium text-green-600">{format(new Date(viewShipmentDetails.deliveredAt), 'MMM dd, HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewShipmentDetails.notes && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {t('notesLabel')}
                    </h3>
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <p className="text-sm text-muted-foreground">{viewShipmentDetails.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}