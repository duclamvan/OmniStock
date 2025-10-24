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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Plane, Ship, Truck, MapPin, Clock, Package, Globe, Star, Zap, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Search, CalendarDays, MoreVertical, ArrowLeft, Train, Shield, Copy, ExternalLink, ChevronDown, ChevronUp, Edit, Filter, ArrowUpDown, Info, RefreshCw, FileText } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { convertCurrency, type Currency } from "@/lib/currencyUtils";

interface Shipment {
  id: number;
  consolidationId: number | null;
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

interface PendingShipment {
  id: number;
  name: string;
  location: string;
  shippingMethod: string;
  warehouse: string;
  notes: string | null;
  targetWeight: string | null;
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
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [isEditShipmentOpen, setIsEditShipmentOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedPendingShipment, setSelectedPendingShipment] = useState<PendingShipment | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<Record<number, DeliveryPrediction>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTracking, setExpandedTracking] = useState<Record<number, boolean>>({});
  const [sortBy, setSortBy] = useState<'delivery' | 'type' | 'status'>('delivery');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewShipmentDetails, setViewShipmentDetails] = useState<Shipment | null>(null);
  const [allocationMethod, setAllocationMethod] = useState<'AUTO' | 'UNITS' | 'WEIGHT' | 'VALUE' | 'HYBRID'>('AUTO');
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    mutationFn: async (consolidationId: number) => {
      const response = await apiRequest('/api/imports/consolidations/' + consolidationId + '/status', 'PATCH', {
        status: 'active'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: "Success", description: "Moved back to warehouse successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to move back to warehouse", variant: "destructive" });
    }
  });
  
  // Create shipment mutation with optimistic updates for speed
  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/imports/shipments', 'POST', data);
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
      
      setIsCreateShipmentOpen(false);
      setSelectedPendingShipment(null);
      
      // Different messages for Quick Ship vs regular creation
      const isQuickShip = !variables.trackingNumber || variables.trackingNumber === '';
      toast({ 
        title: "Success", 
        description: isQuickShip 
          ? "Quick Ship completed! Shipment moved to tracking." 
          : "Shipment created successfully" 
      });
    },
    onError: (err, newShipment, context: any) => {
      // Rollback optimistic update on error
      if (context?.previousPending) {
        queryClient.setQueryData(['/api/imports/shipments/pending'], context.previousPending);
      }
      toast({ title: "Error", description: "Failed to create shipment", variant: "destructive" });
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
        title: "Success", 
        description: "Shipment name regenerated successfully" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to regenerate shipment name", 
        variant: "destructive" 
      });
    }
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/imports/shipments/${shipmentId}/tracking`, data);
      return response.json();
    },
    onSuccess: (updatedShipment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      
      // If status is changed to pending, show success message
      if (variables.data.status === 'pending') {
        toast({ 
          title: "Success", 
          description: "Shipment moved back to pending with tracking information preserved" 
        });
      } else {
        toast({ title: "Success", description: "Tracking updated successfully" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tracking", variant: "destructive" });
    }
  });

  // Edit shipment mutation
  const editShipmentMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/imports/shipments/${shipmentId}`, data);
      return { ...response.json(), shipmentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      setIsEditShipmentOpen(false);
      setSelectedShipment(null);
      toast({ title: "Success", description: "Shipment updated successfully" });
      
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
      toast({ title: "Error", description: "Failed to update shipment", variant: "destructive" });
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
        title: "AI Prediction Failed", 
        description: "Could not generate delivery prediction",
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
      toast({ title: "Copied!", description: "Tracking number copied to clipboard" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
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
      
      return `${methodType} - ${itemNames}${moreItems} (${itemCount} items)`;
    };
    
    // Parse end tracking numbers from textarea (one per line)
    const endTrackingNumbersText = formData.get('endTrackingNumbers') as string || '';
    const endTrackingNumbers = endTrackingNumbersText
      .split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0);
    
    const data = {
      consolidationId: selectedPendingShipment?.id || (formData.get('consolidationId') ? parseInt(formData.get('consolidationId') as string) : null),
      carrier: formData.get('carrier') as string || 'Standard Carrier',
      trackingNumber: formData.get('trackingNumber') as string,
      endCarrier: formData.get('endCarrier') as string || null,
      endTrackingNumbers: endTrackingNumbers.length > 0 ? endTrackingNumbers : null,
      shipmentName: formData.get('shipmentName') as string || '',  // Let backend generate if empty
      shipmentType: formData.get('shipmentType') as string || selectedPendingShipment?.shippingMethod,
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
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
    if (shipment.status === 'delivered') return 'Delivered';
    
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return 'Calculating...';
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(deliveryDate, currentDate);
    
    if (daysRemaining < 0) return 'Delayed';
    if (daysRemaining === 0) return 'Today';
    if (daysRemaining === 1) return '1 day';
    if (daysRemaining < 7) return `${daysRemaining} days`;
    if (daysRemaining < 30) {
      const weeks = Math.floor(daysRemaining / 7);
      return weeks === 1 ? '1 week' : `${weeks} weeks`;
    }
    
    const months = Math.floor(daysRemaining / 30);
    return months === 1 ? '1 month' : `${months} months`;
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">International Transit</h1>
          <p className="text-muted-foreground">AI-powered shipment tracking with delivery predictions</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by tracking, carrier, items, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-shipments"
            />
          </div>
          <Dialog 
            open={isCreateShipmentOpen || isEditShipmentOpen} 
            onOpenChange={(open) => {
              if (!open) {
                setIsCreateShipmentOpen(false);
                setIsEditShipmentOpen(false);
                setSelectedPendingShipment(null);
                setSelectedShipment(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button 
                data-testid="button-create-shipment"
                onClick={() => {
                  setIsCreateShipmentOpen(true);
                  setSelectedPendingShipment(null);
                  setSelectedShipment(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {selectedShipment 
                  ? 'Edit Shipment' 
                  : selectedPendingShipment 
                    ? 'Add Tracking Information' 
                    : 'Create New Shipment'}
              </DialogTitle>
              <DialogDescription>
                {selectedShipment
                  ? 'Update shipment tracking information and details'
                  : selectedPendingShipment 
                    ? `Add tracking for consolidation ${selectedPendingShipment.name} (${selectedPendingShipment.itemCount} items)`
                    : 'Create a new international shipment with AI delivery prediction'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={selectedShipment ? handleEditShipment : handleCreateShipment} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 space-y-6">
                
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipmentName">Shipment Name *</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="shipmentName" 
                          name="shipmentName" 
                          required
                          defaultValue={selectedShipment?.shipmentName || ''}
                          data-testid="input-shipment-name"
                          placeholder="AI will generate based on items"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            if (selectedShipment) {
                              // For edit mode, regenerate based on existing shipment
                              regenerateNameMutation.mutate(selectedShipment.id);
                            } else if (selectedPendingShipment) {
                              // For add tracking mode, use backend to generate structured name
                              const input = document.getElementById('shipmentName') as HTMLInputElement;
                              const shipmentTypeSelect = document.querySelector('[name="shipmentType"]') as HTMLSelectElement;
                              
                              if (input) {
                                input.value = 'Generating...';
                                
                                // Get origin and shipmentType from form or defaults
                                const origin = selectedPendingShipment.warehouse || 'China, Guangzhou';
                                const shipmentType = shipmentTypeSelect?.value || 'air_ddp_general';
                                
                                // Create a temporary shipment request to get AI-generated name
                                fetch('/api/imports/shipments/generate-name', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    consolidationId: selectedPendingShipment.id,
                                    origin,
                                    shipmentType
                                  })
                                })
                                  .then(res => res.json())
                                  .then(data => {
                                    if (data.name && input) {
                                      input.value = data.name;
                                    }
                                  })
                                  .catch(() => {
                                    // Fallback to generic name if API fails
                                    if (input) input.value = 'XX-GEN-MixedGoods-2025';
                                  });
                              }
                            } else {
                              // For create mode without items, use fallback
                              const input = document.getElementById('shipmentName') as HTMLInputElement;
                              if (input) input.value = 'XX-GEN-MixedGoods-2025';
                            }
                          }}
                          disabled={regenerateNameMutation.isPending}
                          title={selectedShipment ? "Regenerate name based on contents" : "Generate name from items"}
                        >
                          <RefreshCw className={`h-4 w-4 ${regenerateNameMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipmentType">Shipment Type *</Label>
                      <Select name="shipmentType" required defaultValue={selectedShipment?.shipmentType || selectedPendingShipment?.shippingMethod || 'air_ddp_general'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="air_ddp_general">
                            <div className="flex items-center gap-2">
                              <Plane className="h-4 w-4 text-blue-500" />
                              Air DDP (general)
                            </div>
                          </SelectItem>
                          <SelectItem value="air_ddp_sensitive">
                            <div className="flex items-center gap-2">
                              <Plane className="h-4 w-4 text-orange-500" />
                              Air DDP (sensitive)
                            </div>
                          </SelectItem>
                          <SelectItem value="express_general">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-purple-500" />
                              Express (general)
                            </div>
                          </SelectItem>
                          <SelectItem value="express_sensitive">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-orange-500" />
                              Express (sensitive)
                            </div>
                          </SelectItem>
                          <SelectItem value="railway_general">
                            <div className="flex items-center gap-2">
                              <Train className="h-4 w-4 text-green-500" />
                              Railway (general)
                            </div>
                          </SelectItem>
                          <SelectItem value="railway_sensitive">
                            <div className="flex items-center gap-2">
                              <Train className="h-4 w-4 text-orange-500" />
                              Railway (sensitive)
                            </div>
                          </SelectItem>
                          <SelectItem value="sea_general">
                            <div className="flex items-center gap-2">
                              <Ship className="h-4 w-4 text-cyan-500" />
                              Sea (general)
                            </div>
                          </SelectItem>
                          <SelectItem value="sea_sensitive">
                            <div className="flex items-center gap-2">
                              <Ship className="h-4 w-4 text-orange-500" />
                              Sea (sensitive)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Primary Tracking Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-foreground">Primary Carrier (China to Europe)</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trackingNumber">Tracking Number</Label>
                      <Input 
                        id="trackingNumber" 
                        name="trackingNumber" 
                        defaultValue={selectedShipment?.trackingNumber || selectedPendingShipment?.trackingNumber || ''}
                        data-testid="input-tracking-number"
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carrier">Transit Carrier</Label>
                      <Input 
                        id="carrier" 
                        name="carrier" 
                        defaultValue={selectedShipment?.carrier || selectedPendingShipment?.carrier || ''}
                        data-testid="input-carrier"
                        placeholder="e.g., China Post, SF Express"
                      />
                    </div>
                  </div>
                </div>

                {/* End Carrier Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-foreground">End Carrier (European Courier)</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="endCarrier">End Carrier *</Label>
                      <Input 
                        id="endCarrier" 
                        name="endCarrier" 
                        required
                        defaultValue={selectedShipment?.endCarrier || ''}
                        data-testid="input-end-carrier"
                        placeholder="e.g., DPD, DHL, GLS"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTrackingNumbers">End Tracking Numbers * <span className="text-xs text-muted-foreground font-normal">(one per line)</span></Label>
                      <Textarea 
                        id="endTrackingNumbers" 
                        name="endTrackingNumbers" 
                        required
                        rows={4}
                        defaultValue={
                          selectedShipment?.endTrackingNumbers?.length 
                            ? selectedShipment.endTrackingNumbers.join('\n')
                            : (selectedShipment?.endTrackingNumber || '') // Legacy fallback
                        }
                        data-testid="textarea-end-tracking-numbers"
                        placeholder="Paste tracking numbers here&#10;One per line&#10;Example: 12345678901&#10;Example: 98765432109"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        These tracking numbers will be used to verify parcels during receiving
                      </p>
                    </div>
                  </div>
                </div>

                {/* Package Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-foreground">Package Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalWeight">Total Weight (kg) *</Label>
                      <Input 
                        id="totalWeight" 
                        name="totalWeight" 
                        type="number"
                        step="0.01"
                        required 
                        defaultValue={selectedShipment?.totalWeight || selectedPendingShipment?.targetWeight || ''}
                        data-testid="input-total-weight"
                        placeholder="35.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalUnits">Total Units *</Label>
                      <Input 
                        id="totalUnits" 
                        name="totalUnits" 
                        type="number"
                        min="1"
                        required
                        defaultValue={selectedShipment?.totalUnits || selectedPendingShipment?.itemCount || '1'}
                        data-testid="input-total-units"
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitType">Unit Type</Label>
                      <Select name="unitType" defaultValue={selectedShipment?.unitType || selectedPendingShipment?.unitType || 'cartons'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cartons">Cartons</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="pallets">Pallets</SelectItem>
                          <SelectItem value="bags">Bags</SelectItem>
                          <SelectItem value="crates">Crates</SelectItem>
                          <SelectItem value="20GP Container">20GP Container</SelectItem>
                          <SelectItem value="40GP Container">40GP Container</SelectItem>
                          <SelectItem value="40HQ Container">40HQ Container</SelectItem>
                          <SelectItem value="45HQ Container">45HQ Container</SelectItem>
                          <SelectItem value="LCL Shipment">LCL Shipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Shipping Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-foreground">Shipping Details</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="origin">Origin</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {selectedShipment?.origin || selectedPendingShipment?.warehouse || 'China, Guangzhou'}
                        </span>
                      </div>
                      <input type="hidden" name="origin" value={selectedShipment?.origin || selectedPendingShipment?.warehouse || 'China, Guangzhou'} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination Warehouse *</Label>
                      <Select name="destination" required defaultValue={selectedShipment?.destination || (warehouses.length > 0 ? warehouses[0].name : "Czech Republic, Prague")}>
                        <SelectTrigger data-testid="select-destination">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.length > 0 ? (
                            warehouses.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.name}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{warehouse.name}</span>
                                  {(warehouse.address || warehouse.city || warehouse.country) && (
                                    <span className="text-xs text-muted-foreground">
                                      {[warehouse.address, warehouse.city, warehouse.country].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Czech Republic, Prague">Czech Republic, Prague</SelectItem>
                              <SelectItem value="USA, California">USA, California</SelectItem>
                              <SelectItem value="USA, New York">USA, New York</SelectItem>
                              <SelectItem value="UK, London">UK, London</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shippingCost">Shipping Cost</Label>
                      <Input 
                        id="shippingCost" 
                        name="shippingCost" 
                        type="number" 
                        step="0.01" 
                        data-testid="input-shipping-cost"
                        defaultValue={selectedShipment?.shippingCost || selectedPendingShipment?.shippingCost || ''}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingCostCurrency">Currency</Label>
                      <Select name="shippingCostCurrency" defaultValue={selectedShipment?.shippingCostCurrency || selectedPendingShipment?.shippingCostCurrency || 'USD'}>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CZK">CZK</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="VND">VND</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-foreground">Additional Notes</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      data-testid="textarea-notes"
                      defaultValue={selectedShipment?.notes || ''}
                      placeholder="Additional shipping notes..."
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateShipmentOpen(false);
                  setIsEditShipmentOpen(false);
                  setSelectedPendingShipment(null);
                  setSelectedShipment(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" 
                  disabled={selectedShipment ? editShipmentMutation.isPending : createShipmentMutation.isPending} 
                  data-testid="button-submit-shipment">
                  {selectedShipment 
                    ? (editShipmentMutation.isPending ? "Updating..." : "Update Shipment")
                    : (createShipmentMutation.isPending ? "Creating..." : "Create Shipment")
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
            Found {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''} and 
            {' '}{filteredPendingShipments.length} pending consolidation{filteredPendingShipments.length !== 1 ? 's' : ''}
            {' '}matching "{searchQuery}"
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="h-6 px-2"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Color Legend - Collapsible */}
      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <Info className="h-4 w-4" />
          Shipment Type Color Guide
        </summary>
        <Card className="mt-2">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-red-500 rounded"></div>
                <div>
                  <p className="font-medium">Express</p>
                  <p className="text-xs text-muted-foreground">Fastest (1-3 days)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-blue-500 rounded"></div>
                <div>
                  <p className="font-medium">Air DDP</p>
                  <p className="text-xs text-muted-foreground">Fast (5-7 days)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-green-500 rounded"></div>
                <div>
                  <p className="font-medium">Railway</p>
                  <p className="text-xs text-muted-foreground">Moderate (15-20 days)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-teal-500 rounded"></div>
                <div>
                  <p className="font-medium">Sea</p>
                  <p className="text-xs text-muted-foreground">Economical (30-45 days)</p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300">
                  ⚠️ Sensitive
                </Badge>
                <span>Items with batteries, liquids, or special handling requirements use warmer color variants</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </details>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-shipments">
              {filteredShipments.filter(s => s.status !== 'delivered').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredShipments.filter(s => s.status === 'in transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredShipments.filter(s => s.status === 'in transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
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
              <span>Pending Shipments</span>
              <Badge variant="secondary" className="ml-2">{filteredPendingShipments.length}</Badge>
            </CardTitle>
            <CardDescription>
              Shipped consolidations that need tracking information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPendingShipments.map((pending) => (
                <div key={pending.id} className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-sm">{pending.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pending.location} • {pending.warehouse} • {pending.itemCount} items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs flex items-center">
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
                        {pending.shippingMethod?.replace(/_/g, ' ').toUpperCase() || 'STANDARD'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
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
                            carrier: pending.shippingMethod || 'standard',
                            trackingNumber: '', // Will be provided later
                            endCarrier: null,
                            endTrackingNumber: null,
                            shipmentName: generateShipmentName(),
                            shipmentType: pending.shippingMethod,
                            origin: pending.warehouse || 'China, Guangzhou',
                            destination: warehouses.length > 0 ? warehouses[0].name : 'Czech Republic, Prague',
                            shippingCost: 0, // Will be provided later
                            shippingCostCurrency: 'USD',
                            shippingMethod: pending.shippingMethod,
                            notes: 'Quick shipped - tracking to be added',
                          };
                          
                          createShipmentMutation.mutate(quickShipData);
                        }}
                        data-testid={`button-quick-ship-${pending.id}`}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Quick Ship
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => {
                          setSelectedPendingShipment(pending);
                          setIsCreateShipmentOpen(true);
                        }}
                        data-testid={`button-add-tracking-${pending.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {pending.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
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
                            Move Back to Warehouse
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Items Preview */}
                  {pending.items && pending.items.length > 0 && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Contents:</p>
                      <div className="space-y-0.5">
                        {pending.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center gap-1 text-xs">
                            <span className="truncate">{item.name}</span>
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
                      Total Weight: {pending.targetWeight} kg
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
              <CardTitle>Shipment Tracking</CardTitle>
              <CardDescription>
                Monitor all international shipments with AI-powered delivery predictions
              </CardDescription>
            </div>
            
            {/* Sort and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        All Shipments
                      </div>
                    </SelectItem>
                    <SelectItem value="air_ddp_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('air_ddp_general', 'h-4 w-4')}
                        Air DDP (general)
                      </div>
                    </SelectItem>
                    <SelectItem value="air_ddp_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('air_ddp_sensitive', 'h-4 w-4')}
                        Air DDP (sensitive)
                      </div>
                    </SelectItem>
                    <SelectItem value="express_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('express_general', 'h-4 w-4')}
                        Express (general)
                      </div>
                    </SelectItem>
                    <SelectItem value="express_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('express_sensitive', 'h-4 w-4')}
                        Express (sensitive)
                      </div>
                    </SelectItem>
                    <SelectItem value="railway_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('railway_general', 'h-4 w-4')}
                        Railway (general)
                      </div>
                    </SelectItem>
                    <SelectItem value="railway_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('railway_sensitive', 'h-4 w-4')}
                        Railway (sensitive)
                      </div>
                    </SelectItem>
                    <SelectItem value="sea_general">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('sea_general', 'h-4 w-4')}
                        Sea (general)
                      </div>
                    </SelectItem>
                    <SelectItem value="sea_sensitive">
                      <div className="flex items-center gap-2">
                        {getShipmentTypeIcon('sea_sensitive', 'h-4 w-4')}
                        Sea (sensitive)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery Date</SelectItem>
                    <SelectItem value="type">Shipment Type</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No shipments match your search' : 'No shipments found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first international shipment'}
              </p>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => setIsCreateShipmentOpen(true)} data-testid="button-create-first-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shipment
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
                    className="hover:shadow-md transition-all duration-300 cursor-pointer border"
                    onClick={() => setViewShipmentDetails(shipment)}
                  >
                    <CardContent className="p-4">
                      {/* Compact Header Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {/* Left: Type Icon + Name + Metadata */}
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className="shrink-0 mt-0.5">
                            {getShipmentTypeIcon(shipment.shipmentType || shipment.carrier || shipment.shippingMethod || '', 'h-6 w-6')}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Title + Type Badge */}
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg truncate" data-testid={`shipment-tracking-${shipment.id}`}>
                                {shipment.shipmentName || shipment.trackingNumber || `Shipment #${shipment.id}`}
                              </h3>
                              {shipment.shipmentType && (() => {
                                const typeInfo = formatShipmentType(shipment.shipmentType);
                                return typeInfo.badge && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300 shrink-0">
                                    {typeInfo.badge}
                                  </Badge>
                                );
                              })()}
                            </div>
                            
                            {/* Compact Metadata Row */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                              {shipment.shipmentType && (() => {
                                const typeInfo = formatShipmentType(shipment.shipmentType);
                                return <span className="font-semibold">{typeInfo.label}</span>;
                              })()}
                              {shipment.totalUnits && shipment.unitType && (
                                <>
                                  <span>•</span>
                                  <span>{shipment.totalUnits} {shipment.unitType}</span>
                                </>
                              )}
                              {shipment.totalWeight && (
                                <>
                                  <span>•</span>
                                  <span>{shipment.totalWeight}kg</span>
                                </>
                              )}
                              {shipment.shippingCost && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold">{shipment.shippingCostCurrency || 'USD'} {shipment.shippingCost}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{shipment.endCarrier || shipment.carrier || 'Standard Carrier'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: ETA Badge + Status + Actions */}
                        <div className="flex items-start gap-2 flex-shrink-0">
                          <Badge className={`text-xs whitespace-nowrap h-7 ${getETAColor(shipment)}`}>
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {getTimeRemaining(shipment)}
                          </Badge>
                          <Select
                            value={shipment.status}
                            onValueChange={(status) => 
                              updateTrackingMutation.mutate({ 
                                shipmentId: shipment.id, 
                                data: { status }
                              })
                            }
                          >
                            <SelectTrigger 
                              onClick={(e) => e.stopPropagation()}
                              className={`w-32 h-8 ${shipment.status === 'delivered' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200' : shipment.status === 'in transit' ? 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200'}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in transit">In Transit</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Three-dot menu for edit */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedShipment(shipment);
                                setIsEditShipmentOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Shipment
                              </DropdownMenuItem>
                              {shipment.status === "pending" && (
                                <DropdownMenuItem onClick={() => {
                                  const shipmentId = shipment.id;
                                  editShipmentMutation.mutate({
                                    shipmentId,
                                    data: { status: "in transit" }
                                  }, {
                                    onSuccess: () => {
                                      // Additional scrolling for Quick Ship
                                      setTimeout(() => {
                                        const card = document.getElementById(`shipment-${shipmentId}`);
                                        if (card) {
                                          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                                          setTimeout(() => {
                                            card.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                                          }, 2000);
                                        }
                                      }, 600);
                                    }
                                  });
                                }}>
                                  <Plane className="h-4 w-4 mr-2 text-blue-600" />
                                  Quick Ship: Mark In Transit
                                </DropdownMenuItem>
                              )}
                              {shipment.status === "in transit" && (
                                <DropdownMenuItem onClick={() => {
                                  const shipmentId = shipment.id;
                                  editShipmentMutation.mutate({
                                    shipmentId,
                                    data: { status: "delivered", deliveredAt: new Date().toISOString() }
                                  }, {
                                    onSuccess: () => {
                                      // Additional scrolling for Quick Ship
                                      setTimeout(() => {
                                        const card = document.getElementById(`shipment-${shipmentId}`);
                                        if (card) {
                                          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          card.classList.add('ring-2', 'ring-green-500', 'ring-offset-2');
                                          setTimeout(() => {
                                            card.classList.remove('ring-2', 'ring-green-500', 'ring-offset-2');
                                          }, 2000);
                                        }
                                      }, 600);
                                    }
                                  });
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Quick Ship: Mark Delivered
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Route Section */}
                      <div className="flex items-center gap-3 mb-4 text-sm bg-slate-50 dark:bg-slate-900/30 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-medium">{shipment.origin}</span>
                        </div>
                        <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-700"></div>
                        <div className="flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-green-600" />
                          <span className="font-medium">{shipment.destination}</span>
                        </div>
                      </div>

                      {/* Shipping Progress & Status - Always Visible */}
                      <div className="mb-3 space-y-2">
                        {/* Shipping Duration and Delay Info */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3 text-cyan-600" />
                            <span className="text-muted-foreground">
                              {shipment.status === 'delivered' ? 'Delivered in' : 'In transit'}
                            </span>
                            <Badge variant="outline" className="text-xs h-5 bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950 dark:border-cyan-700">
                              {getDaysInTransit(shipment)} {getDaysInTransit(shipment) === 1 ? 'day' : 'days'}
                            </Badge>
                          </div>
                          
                          {(() => {
                            const daysDelayed = getDelayInfo(shipment);
                            if (daysDelayed) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <AlertCircle className="h-3 w-3 text-red-600" />
                                  <Badge variant="outline" className="text-xs h-5 bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-700">
                                    Delayed {daysDelayed} {daysDelayed === 1 ? 'day' : 'days'}
                                  </Badge>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Progress Bar with Dates */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-muted-foreground font-medium">
                              {format(new Date(shipment.createdAt), 'MMM dd')}
                            </span>
                            <span className={`text-sm font-semibold ${getProgressTextColor(shipment)}`}>
                              {getTimeRemaining(shipment)}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery 
                                ? format(new Date(shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery), 'MMM dd')
                                : 'TBD'}
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={`h-2.5 ${(() => {
                              const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
                              if (!estimatedDelivery) return '[&>div]:bg-gray-500';
                              
                              const deliveryDate = new Date(estimatedDelivery);
                              const currentDate = new Date();
                              const daysRemaining = differenceInDays(deliveryDate, currentDate);
                              
                              if (shipment.status === 'delivered') return '[&>div]:bg-green-500';
                              if (daysRemaining < 0) return '[&>div]:bg-red-500';
                              if (daysRemaining === 0) return '[&>div]:bg-orange-500';
                              if (daysRemaining <= 3) return '[&>div]:bg-yellow-500';
                              return '[&>div]:bg-cyan-500';
                            })()}`}
                          />
                        </div>
                      </div>

                      {/* Tracking Numbers - Compact Expandable */}
                      {(shipment.trackingNumber || shipment.endTrackingNumber) && (
                        <div className="mb-3">
                          <div 
                            className="flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-900/30 rounded-md px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setExpandedTracking(prev => ({ ...prev, [shipment.id]: !prev[shipment.id] }));
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 text-cyan-600" />
                              <span className="text-xs font-medium">Tracking Numbers</span>
                              {shipment.endTrackingNumber && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">2 carriers</Badge>
                              )}
                            </div>
                            {expandedTracking[shipment.id] ? (
                              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          
                          {expandedTracking[shipment.id] && (
                            <div className="mt-2 space-y-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                              {/* Primary Carrier */}
                              {shipment.trackingNumber && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Primary Carrier</p>
                                      <p className="text-xs font-medium mt-0.5">{shipment.carrier || 'Standard Carrier'}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(shipment.trackingNumber);
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(getCarrierTrackingUrl(shipment.carrier, shipment.trackingNumber), '_blank');
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-900 rounded px-2 py-1.5">
                                    <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{shipment.trackingNumber}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* End Carrier */}
                              {shipment.endTrackingNumber && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">End Carrier</p>
                                      <p className="text-xs font-medium mt-0.5">{shipment.endCarrier || 'Local Courier'}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (shipment.endTrackingNumber) {
                                            copyToClipboard(shipment.endTrackingNumber);
                                          }
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (shipment.endTrackingNumber) {
                                            window.open(getCarrierTrackingUrl(shipment.endCarrier || 'Local Courier', shipment.endTrackingNumber), '_blank');
                                          }
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-900 rounded px-2 py-1.5">
                                    <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{shipment.endTrackingNumber}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Shipment Items - Always Show */}
                      {shipment.items && shipment.items.length > 0 && (
                        <div className="border rounded-lg p-3 bg-muted/30 mb-3">
                          <div className="text-sm font-medium mb-2">Package Contents ({shipment.totalUnits || shipment.itemCount} {shipment.unitType || 'items'}):</div>
                          <div className="space-y-1">
                            {shipment.items.map((item: any, index: number) => (
                              <div key={index} className="text-sm flex justify-between">
                                <span className="text-muted-foreground">
                                  {item.name || `Item ${index + 1}`} {item.trackingNumber && `(${item.trackingNumber})`}
                                </span>
                                <span className="font-medium">Qty: {item.quantity || 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Notes Section */}
                      {shipment.notes && (
                        <div className="border rounded-lg p-3 bg-muted/30 mb-3">
                          <div className="text-sm font-medium mb-2">Notes:</div>
                          <p className="text-sm text-muted-foreground">{shipment.notes}</p>
                        </div>
                      )}

                      {/* Compact AI Prediction Section */}
                      {prediction && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-md p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">AI Prediction</span>
                            </div>
                            <Badge variant="secondary" className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                              {prediction.confidence}%
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Est. Delivery</p>
                              <p className="font-semibold">
                                {format(new Date(prediction.estimatedDelivery), 'MMM dd')}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Avg Time</p>
                              <p className="font-semibold">
                                {prediction.historicalAverage}d
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Factors</p>
                              <div className="flex gap-1">
                                {prediction.factors.customsDelay && (
                                  <span className="text-yellow-600">+{prediction.factors.customsDays}d</span>
                                )}
                                {prediction.factors.fastRoute && (
                                  <span className="text-green-600">Fast</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compact Action Bar */}
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center space-x-2">
                          {!prediction && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                predictDelivery(shipment);
                              }}
                              disabled={isPredicting}
                              data-testid={`button-predict-${shipment.id}`}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {isPredicting ? 'Predicting...' : 'AI Predict'}
                            </Button>
                          )}
                          
                          {shipment.status !== 'delivered' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTrackingMutation.mutate({
                                  shipmentId: shipment.id,
                                  data: { status: 'delivered' }
                                });
                              }}
                              data-testid={`button-mark-delivered-${shipment.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg text-xs">
                  <div>
                    <p className="text-muted-foreground">Items</p>
                    <p className="font-semibold text-sm">{totalItems} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-semibold text-sm">{viewShipmentDetails.totalWeight || '—'} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shipping</p>
                    <p className="font-semibold text-sm">{currency} {totalShipping.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Per Unit</p>
                    <p className="font-semibold text-sm">{currency} {shippingPerUnit.toFixed(2)}</p>
                  </div>
                </div>

                {/* Items Table with Pricing */}
                {viewShipmentDetails.items && viewShipmentDetails.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Item Pricing & Landing Cost
                      </h3>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="allocation-method" className="text-xs text-muted-foreground">
                          Allocation Method:
                        </Label>
                        <Select value={allocationMethod} onValueChange={(value: any) => setAllocationMethod(value)}>
                          <SelectTrigger id="allocation-method" className="h-8 w-[160px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-cyan-600" />
                                <span className="font-semibold">Auto (Smart)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="UNITS">
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                By Units
                              </div>
                            </SelectItem>
                            <SelectItem value="WEIGHT">
                              <div className="flex items-center gap-2">
                                <Target className="h-3 w-3" />
                                By Weight
                              </div>
                            </SelectItem>
                            <SelectItem value="VALUE">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                By Value
                              </div>
                            </SelectItem>
                            <SelectItem value="HYBRID">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                Hybrid (60/40)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableHead className="w-[30%]">Item</TableHead>
                            <TableHead className="text-center w-[8%]">Qty</TableHead>
                            <TableHead className="text-right w-[14%]">Unit Cost</TableHead>
                            <TableHead className="text-right w-[12%]">Shipping</TableHead>
                            <TableHead className="text-right w-[12%]">Landing</TableHead>
                            <TableHead className="text-right w-[12%]">Landing (EUR)</TableHead>
                            <TableHead className="text-right w-[12%]">Landing (CZK)</TableHead>
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
                                <TableCell className="font-medium">{item.name || `Item ${index + 1}`}</TableCell>
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
                            <TableCell colSpan={2}>Totals</TableCell>
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
                        💡 Shipping cost allocated across <strong className="text-foreground">{totalItems} units</strong> using{' '}
                        <strong className="text-foreground">
                          {effectiveMethod}
                        </strong>{allocationMethod === 'AUTO' && ' (auto-selected)'}. Landing costs converted to EUR and CZK.
                      </p>
                      
                      {/* Method-specific explanation with auto-selection context */}
                      {effectiveMethod === 'CHARGEABLE_WEIGHT' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-blue-600 dark:text-blue-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}⚖️ Using chargeable weight (max of actual or volumetric weight) for proportional cost allocation.
                        </p>
                      )}
                      {effectiveMethod === 'WEIGHT' && (
                        <p className="text-blue-600 dark:text-blue-400">
                          ⚖️ Heavier items receive proportionally more shipping cost based on actual weight.
                        </p>
                      )}
                      {effectiveMethod === 'VALUE' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-green-600 dark:text-green-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}💰 Higher value items receive proportionally more shipping cost based on their cost.
                        </p>
                      )}
                      {effectiveMethod === 'HYBRID' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-purple-600 dark:text-purple-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}⚡ Balanced allocation: 60% by chargeable weight + 40% by value for fair distribution.
                        </p>
                      )}
                      {effectiveMethod === 'UNITS' && (
                        <p className={allocationMethod === 'AUTO' ? "text-cyan-600 dark:text-cyan-400" : "text-gray-600 dark:text-gray-400"}>
                          {allocationMethod === 'AUTO' && '🤖 '}📦 Equal distribution per unit regardless of weight or value.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Compact Tracking & Timeline */}
                <div className="grid grid-cols-2 gap-4">
                  {(viewShipmentDetails.trackingNumber || viewShipmentDetails.endTrackingNumber) && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        Tracking
                      </h3>
                      <div className="space-y-2 p-3 border rounded-lg text-xs">
                        {viewShipmentDetails.trackingNumber && (
                          <div>
                            <p className="text-muted-foreground">{viewShipmentDetails.carrier}</p>
                            <p className="font-mono text-blue-600 font-medium">{viewShipmentDetails.trackingNumber}</p>
                          </div>
                        )}
                        {viewShipmentDetails.endTrackingNumber && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground">{viewShipmentDetails.endCarrier || 'Local'}</p>
                            <p className="font-mono text-blue-600 font-medium">{viewShipmentDetails.endTrackingNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Timeline
                    </h3>
                    <div className="space-y-1.5 p-3 border rounded-lg text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">{format(new Date(viewShipmentDetails.createdAt), 'MMM dd, HH:mm')}</span>
                      </div>
                      {viewShipmentDetails.estimatedDelivery && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Delivery</span>
                          <span className="font-medium">{format(new Date(viewShipmentDetails.estimatedDelivery), 'MMM dd')}</span>
                        </div>
                      )}
                      {viewShipmentDetails.deliveredAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivered</span>
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
                      Notes
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