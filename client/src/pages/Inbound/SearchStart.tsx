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
      return apiRequest("/api/receiving/receipts", "POST", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Receipt created",
        description: "Starting receiving process..."
      });
      setLocation(`/inbound/receive/${data.receipt.id}`);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="carrier">Carrier</Label>
              <Select
                value={searchParams.carrier}
                onValueChange={(value) => setSearchParams({ ...searchParams, carrier: value })}
              >
                <SelectTrigger id="carrier" data-testid="select-carrier">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="parcels">Number of Parcels</Label>
              <Input
                id="parcels"
                type="number"
                placeholder="e.g., 5"
                value={searchParams.parcels}
                onChange={(e) => setSearchParams({ ...searchParams, parcels: e.target.value })}
                data-testid="input-parcels"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                className="w-full"
                disabled={isLoading}
                data-testid="button-search"
              >
                <Search className="mr-2 h-4 w-4" />
                Search Orders
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Matching Import Orders</h2>
          {searchResults.map((purchase: any) => (
            <Card 
              key={purchase.id} 
              className={`cursor-pointer transition-colors ${
                selectedPurchase?.id === purchase.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedPurchase(purchase)}
              data-testid={`card-purchase-${purchase.id}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{purchase.reference}</CardTitle>
                    <CardDescription>
                      {purchase.items?.length || 0} items • {purchase.totalWeight || 0}kg
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant={purchase.status === 'pending' ? 'secondary' : 'default'}>
                      {purchase.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <TruckIcon className="h-3 w-3 text-muted-foreground" />
                    <span>{purchase.carrier || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span>{purchase.expectedParcels || 0} parcels</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{purchase.warehouse?.name || 'Main'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>ETA: {purchase.eta ? new Date(purchase.eta).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {selectedPurchase && (
            <div className="flex justify-end">
              <Button 
                onClick={() => setStartDialogOpen(true)}
                size="lg"
                data-testid="button-start-receiving"
              >
                Start Receiving
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {searchResults && searchResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No matching import orders found for {searchParams.carrier} with {searchParams.parcels} parcels
            </p>
          </CardContent>
        </Card>
      )}

      {/* Start Receipt Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Receiving Process</DialogTitle>
            <DialogDescription>
              Confirm shipment details and dock location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Import Order</Label>
              <p className="text-sm text-muted-foreground">{selectedPurchase?.reference}</p>
            </div>

            <div>
              <Label>Carrier</Label>
              <p className="text-sm text-muted-foreground">{searchParams.carrier}</p>
            </div>

            <div>
              <Label>Expected Parcels</Label>
              <p className="text-sm text-muted-foreground">{searchParams.parcels}</p>
            </div>

            <div>
              <Label htmlFor="cartons">Number of Cartons</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCartons(Math.max(0, cartons - 1))}
                  data-testid="button-cartons-minus"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="cartons"
                  type="number"
                  value={cartons}
                  onChange={(e) => setCartons(parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                  data-testid="input-cartons"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCartons(cartons + 1)}
                  data-testid="button-cartons-plus"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="dock">Dock Code (Optional)</Label>
              <Input
                id="dock"
                placeholder="e.g., DOCK-A1"
                value={dockCode}
                onChange={(e) => setDockCode(e.target.value)}
                data-testid="input-dock"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartReceipt}
              disabled={createReceiptMutation.isPending}
              data-testid="button-confirm-start"
            >
              Start Receiving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}