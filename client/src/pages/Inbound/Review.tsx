import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Package, 
  Calculator,
  DollarSign,
  TruckIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const allocationMethods = [
  { value: "weight", label: "By Weight" },
  { value: "value", label: "By Value" },
  { value: "quantity", label: "By Quantity" },
  { value: "equal", label: "Equal Distribution" }
];

export function Review() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [landedCosts, setLandedCosts] = useState({
    shipping: 0,
    insurance: 0,
    customs: 0,
    handling: 0,
    other: 0
  });
  const [allocationMethod, setAllocationMethod] = useState("weight");

  // Fetch receipt details
  const { data: receipt, isLoading } = useQuery({
    queryKey: ["/api/receiving/receipts", id],
    queryFn: async () => {
      const response = await fetch(`/api/receiving/receipts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch receipt");
      return response.json();
    }
  });

  // Calculate landed costs mutation
  const calculateCostsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/receiving/receipts/${id}/calculate-costs`, {
        method: "POST",
        body: JSON.stringify({
          costs: landedCosts,
          method: allocationMethod
        })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Costs calculated",
        description: "Landed costs have been allocated to items"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/receipts", id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to calculate costs",
        variant: "destructive"
      });
    }
  });

  // Post to inventory mutation
  const postToInventoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/receiving/receipts/${id}/post`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Receipt posted to inventory successfully"
      });
      setLocation('/inbound');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post to inventory",
        variant: "destructive"
      });
    }
  });

  const totalLandedCosts = Object.values(landedCosts).reduce((sum, cost) => sum + cost, 0);
  const subtotal = receipt?.lines?.reduce((sum: number, line: any) => 
    sum + (line.quantity * line.unitCost), 0) || 0;
  const grandTotal = subtotal + totalLandedCosts;

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
            <h1 className="text-3xl font-bold">Review & Confirm</h1>
            <p className="text-muted-foreground mt-2">
              Receipt #{receipt?.receiptNumber} • {receipt?.importPurchase?.reference}
            </p>
          </div>
          <Badge variant={receipt?.status === 'completed' ? 'default' : 'secondary'}>
            {receipt?.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Review */}
          <Card>
            <CardHeader>
              <CardTitle>Received Items</CardTitle>
              <CardDescription>
                {receipt?.lines?.length || 0} items • Total weight: {receipt?.totalWeight || 0} kg
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Landed Cost</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt?.lines?.map((line: any) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">
                        {line.product?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{line.product?.sku}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                      <TableCell>${line.unitCost?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        ${line.allocatedCost?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${((line.quantity * line.unitCost) + (line.allocatedCost || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Landed Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Landed Costs</CardTitle>
              <CardDescription>
                Additional costs to be allocated to items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Allocation Method</Label>
                <Select
                  value={allocationMethod}
                  onValueChange={setAllocationMethod}
                >
                  <SelectTrigger data-testid="select-allocation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allocationMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipping">Shipping</Label>
                  <Input
                    id="shipping"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={landedCosts.shipping || ''}
                    onChange={(e) => setLandedCosts({
                      ...landedCosts,
                      shipping: parseFloat(e.target.value) || 0
                    })}
                    data-testid="input-shipping"
                  />
                </div>

                <div>
                  <Label htmlFor="insurance">Insurance</Label>
                  <Input
                    id="insurance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={landedCosts.insurance || ''}
                    onChange={(e) => setLandedCosts({
                      ...landedCosts,
                      insurance: parseFloat(e.target.value) || 0
                    })}
                    data-testid="input-insurance"
                  />
                </div>

                <div>
                  <Label htmlFor="customs">Customs & Duties</Label>
                  <Input
                    id="customs"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={landedCosts.customs || ''}
                    onChange={(e) => setLandedCosts({
                      ...landedCosts,
                      customs: parseFloat(e.target.value) || 0
                    })}
                    data-testid="input-customs"
                  />
                </div>

                <div>
                  <Label htmlFor="handling">Handling</Label>
                  <Input
                    id="handling"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={landedCosts.handling || ''}
                    onChange={(e) => setLandedCosts({
                      ...landedCosts,
                      handling: parseFloat(e.target.value) || 0
                    })}
                    data-testid="input-handling"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="other">Other Costs</Label>
                  <Input
                    id="other"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={landedCosts.other || ''}
                    onChange={(e) => setLandedCosts({
                      ...landedCosts,
                      other: parseFloat(e.target.value) || 0
                    })}
                    data-testid="input-other"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => calculateCostsMutation.mutate()}
                  disabled={calculateCostsMutation.isPending}
                  data-testid="button-calculate"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Allocation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Landed Costs:</span>
                <span>${totalLandedCosts.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between font-semibold">
                  <span>Grand Total:</span>
                  <span className="text-lg">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Info */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt #:</span>
                <span>{receipt?.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{new Date(receipt?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrier:</span>
                <span>{receipt?.carrier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcels:</span>
                <span>{receipt?.claimedParcels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cartons:</span>
                <span>{receipt?.claimedCartons}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dock:</span>
                <span>{receipt?.dockCode || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          {receipt?.status === 'completed' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ready to Post</AlertTitle>
              <AlertDescription>
                Receipt is complete and ready to be posted to inventory.
                This will update stock levels and costs.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setLocation(`/inbound/receive/${id}`)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Receiving
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Save as draft logic
              toast({
                title: "Saved",
                description: "Receipt saved as draft"
              });
            }}
            data-testid="button-save-draft"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={() => postToInventoryMutation.mutate()}
            disabled={receipt?.status !== 'completed' || postToInventoryMutation.isPending}
            data-testid="button-post"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Post to Inventory
          </Button>
        </div>
      </div>
    </div>
  );
}