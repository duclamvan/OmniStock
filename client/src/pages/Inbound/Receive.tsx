import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Scan, 
  Plus, 
  Minus, 
  Check, 
  X, 
  AlertCircle,
  Box,
  FileText,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Receive() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [scanInput, setScanInput] = useState("");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [manualQuantity, setManualQuantity] = useState(1);

  // Fetch receipt details
  const { data: receipt, isLoading } = useQuery({
    queryKey: ["/api/receiving/receipts", id],
    queryFn: async () => {
      const response = await fetch(`/api/receiving/receipts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch receipt");
      return response.json();
    }
  });

  // Scan barcode mutation
  const scanMutation = useMutation({
    mutationFn: async (barcode: string) => {
      return apiRequest(`/api/receiving/receipts/${id}/scan`, "POST", { barcode, quantity: 1 });
    },
    onSuccess: () => {
      toast({
        title: "Item scanned",
        description: "Product added to receipt"
      });
      setScanInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/receipts", id] });
    },
    onError: (error: any) => {
      toast({
        title: "Scan failed",
        description: error.message || "Product not found",
        variant: "destructive"
      });
    }
  });

  // Manual add mutation
  const manualAddMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/receiving/receipts/${id}/lines`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Item added",
        description: "Product added to receipt"
      });
      setManualDialogOpen(false);
      setSelectedItem(null);
      setManualQuantity(1);
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/receipts", id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
    }
  });

  // Update line mutation
  const updateLineMutation = useMutation({
    mutationFn: async ({ lineId, quantity }: { lineId: string; quantity: number }) => {
      return apiRequest(`/api/receiving/receipts/${id}/lines/${lineId}`, "PATCH", { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/receipts", id] });
    }
  });

  // Delete line mutation
  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: string) => {
      return apiRequest(`/api/receiving/receipts/${id}/lines/${lineId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Item removed",
        description: "Product removed from receipt"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/receipts", id] });
    }
  });

  // Complete receipt mutation
  const completeReceiptMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/receiving/receipts/${id}/complete`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Receipt completed",
        description: "Proceeding to review..."
      });
      setLocation(`/inbound/review/${id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete receipt",
        variant: "destructive"
      });
    }
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) {
      scanMutation.mutate(scanInput.trim());
    }
  };

  const handleManualAdd = () => {
    if (!selectedItem) return;
    
    manualAddMutation.mutate({
      productId: selectedItem.id,
      quantity: manualQuantity,
      unitCost: selectedItem.cost || 0
    });
  };

  const updateQuantity = (lineId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    updateLineMutation.mutate({ lineId, quantity: newQty });
  };

  const progress = receipt ? (receipt.lines?.length || 0) / (receipt.expectedItems || 1) * 100 : 0;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Receive Shipment</h1>
            <p className="text-muted-foreground mt-2">
              Receipt #{receipt?.receiptNumber} • {receipt?.importPurchase?.reference}
            </p>
          </div>
          <div className="text-right">
            <Badge variant={receipt?.status === 'receiving' ? 'default' : 'secondary'}>
              {receipt?.status}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {receipt?.lines?.length || 0} items received
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{receipt?.lines?.length || 0} of {receipt?.expectedItems || 0} items</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Scanning Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scan Items</CardTitle>
            <CardDescription>Scan barcodes or enter manually</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Scan or enter barcode..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  autoFocus
                  data-testid="input-scan"
                />
              </div>
              <Button type="submit" disabled={scanMutation.isPending}>
                <Scan className="mr-2 h-4 w-4" />
                Scan
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setManualDialogOpen(true)}
                data-testid="button-manual-add"
              >
                <Plus className="mr-2 h-4 w-4" />
                Manual
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parcels:</span>
              <span>{receipt?.claimedParcels || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cartons:</span>
              <span>{receipt?.claimedCartons || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Weight:</span>
              <span>{receipt?.totalWeight || 0} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dock:</span>
              <span>{receipt?.dockCode || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Received Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Received Items</CardTitle>
          <CardDescription>{receipt?.lines?.length || 0} items scanned</CardDescription>
        </CardHeader>
        <CardContent>
          {receipt?.lines && receipt.lines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.lines.map((line: any) => (
                  <TableRow key={line.id} data-testid={`row-line-${line.id}`}>
                    <TableCell className="font-medium">
                      {line.product?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{line.product?.sku}</TableCell>
                    <TableCell>{line.product?.barcode}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(line.id, line.quantity, -1)}
                          disabled={updateLineMutation.isPending}
                          data-testid={`button-qty-minus-${line.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-12 text-center">{line.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(line.id, line.quantity, 1)}
                          disabled={updateLineMutation.isPending}
                          data-testid={`button-qty-plus-${line.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>${line.unitCost?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>${(line.quantity * (line.unitCost || 0)).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLineMutation.mutate(line.id)}
                        disabled={deleteLineMutation.isPending}
                        data-testid={`button-delete-${line.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No items received yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start scanning to add items</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button 
          variant="outline"
          onClick={() => setLocation('/inbound')}
        >
          Back to Search
        </Button>
        <Button
          size="lg"
          onClick={() => completeReceiptMutation.mutate()}
          disabled={!receipt?.lines || receipt.lines.length === 0 || completeReceiptMutation.isPending}
          data-testid="button-complete"
        >
          Complete & Review
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Manual Add Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item Manually</DialogTitle>
            <DialogDescription>
              Search for a product to add to the receipt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Search Product</Label>
              <Input
                placeholder="Enter SKU or product name..."
                onChange={(e) => {
                  // In a real app, this would search products
                  // For now, we'll use a placeholder
                }}
                data-testid="input-search-product"
              />
            </div>

            {selectedItem && (
              <div className="p-3 border rounded-lg">
                <p className="font-medium">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">SKU: {selectedItem.sku}</p>
              </div>
            )}

            <div>
              <Label htmlFor="manual-qty">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setManualQuantity(Math.max(1, manualQuantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="manual-qty"
                  type="number"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 text-center"
                  data-testid="input-manual-qty"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setManualQuantity(manualQuantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleManualAdd}
              disabled={!selectedItem || manualAddMutation.isPending}
              data-testid="button-confirm-manual"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}