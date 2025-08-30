import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar, Search, Plus, Minus, TruckIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const carriers = [
  "GLS",
  "PPL",
  "DHL",
  "DPD",
  "Rail",
  "Forwarder",
  "Czech Post",
  "Zasilkovna",
  "Other"
];

export function SearchStart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState({
    carrier: "",
    parcels: ""
  });
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [cartons, setCartons] = useState(0);
  const [dockCode, setDockCode] = useState("");

  // Search for import purchases
  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ["/api/receiving/search", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams.carrier) params.append("carrier", searchParams.carrier);
      if (searchParams.parcels) params.append("parcels", searchParams.parcels);
      
      const response = await fetch(`/api/receiving/search?${params}`);
      if (!response.ok) throw new Error("Failed to search");
      return response.json();
    },
    enabled: false
  });

  // Create receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/receiving/receipts", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Receipt created",
        description: "Starting receiving process..."
      });
      setLocation(`/inbound/simple/${data.receipt.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create receipt",
        variant: "destructive"
      });
    }
  });

  const handleSearch = () => {
    if (!searchParams.carrier || !searchParams.parcels) {
      toast({
        title: "Missing information",
        description: "Please select a carrier and enter number of parcels",
        variant: "destructive"
      });
      return;
    }
    refetch();
  };

  const handleStartReceipt = () => {
    if (!selectedPurchase) return;
    
    createReceiptMutation.mutate({
      importPurchaseId: selectedPurchase.id,
      carrier: searchParams.carrier,
      claimedParcels: parseInt(searchParams.parcels),
      claimedCartons: cartons,
      dockCode
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inbound Receiving</h1>
        <p className="text-muted-foreground mt-2">Search and start receiving shipments</p>
      </div>

      {/* Search Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Incoming Shipment</CardTitle>
          <CardDescription>Enter carrier and parcel count to find matching import orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gri