import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Package, DollarSign, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReceiptItem {
  id: number;
  itemId: number;
  expectedQuantity: number;
  receivedQuantity: number;
  details: {
    id?: string;
    name: string;
    sku?: string;
    latestLandingCost?: string;
    priceCzk?: number;
    priceEur?: number;
  };
}

interface PriceSettingModalProps {
  open: boolean;
  onClose: () => void;
  receiptId: string;
  items: ReceiptItem[];
  onApprove: (approvedBy: string) => void;
}

export default function PriceSettingModal({
  open,
  onClose,
  receiptId,
  items = [],
  onApprove
}: PriceSettingModalProps) {
  const { toast } = useToast();
  const [itemPrices, setItemPrices] = useState<Record<string, { priceCzk: string; priceEur: string; exists: boolean }>>({});
  const [approvedBy, setApprovedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize and fetch existing prices when modal opens
  useEffect(() => {
    if (!open || !items.length) return;
    
    const fetchExistingPrices = async () => {
      setLoading(true);
      const prices: Record<string, { priceCzk: string; priceEur: string; exists: boolean }> = {};
      
      for (const item of items) {
        const productId = item.details?.id;
        const sku = item.details?.sku;
        
        if (productId || sku) {
          try {
            // Try to fetch existing product by SKU or ID
            const response = await fetch(`/api/products?sku=${sku}`);
            if (response.ok) {
              const products = await response.json();
              const existingProduct = products.find((p: any) => p.sku === sku || p.id === productId);
              
              if (existingProduct) {
                prices[item.itemId] = {
                  priceCzk: existingProduct.priceCzk?.toString() || '',
                  priceEur: existingProduct.priceEur?.toString() || '',
                  exists: true
                };
              } else {
                prices[item.itemId] = {
                  priceCzk: '',
                  priceEur: '',
                  exists: false
                };
              }
            } else {
              prices[item.itemId] = {
                priceCzk: '',
                priceEur: '',
                exists: false
              };
            }
          } catch (error) {
            console.error('Error fetching product:', error);
            prices[item.itemId] = {
              priceCzk: '',
              priceEur: '',
              exists: false
            };
          }
        } else {
          prices[item.itemId] = {
            priceCzk: '',
            priceEur: '',
            exists: false
          };
        }
      }
      
      setItemPrices(prices);
      setLoading(false);
    };
    
    fetchExistingPrices();
  }, [open, items]);

  const handlePriceChange = (itemId: string, currency: 'priceCzk' | 'priceEur', value: string) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [currency]: value
      }
    }));
  };

  const allPricesSet = () => {
    return items.every(item => {
      const prices = itemPrices[item.itemId];
      return prices && prices.priceCzk && prices.priceEur;
    });
  };

  const handleSaveAndApprove = async () => {
    if (!approvedBy) {
      toast({
        title: "Error",
        description: "Please enter your name for approval",
        variant: "destructive"
      });
      return;
    }

    if (!allPricesSet()) {
      toast({
        title: "Error",
        description: "Please set all prices before approving",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      // Prepare items for price saving
      const priceItems = items.map(item => ({
        sku: item.details?.sku,
        productId: item.details?.id,
        priceCzk: itemPrices[item.itemId].priceCzk,
        priceEur: itemPrices[item.itemId].priceEur,
        landingCost: parseFloat(item.details?.latestLandingCost || '0')
      }));
      
      // Save prices first
      const priceResponse = await apiRequest(
        `/api/imports/receipts/${receiptId}/set-prices`,
        'POST',
        { items: priceItems }
      );
      
      const responseData = await priceResponse.json();
      
      if (!priceResponse.ok || !responseData.success) {
        throw new Error(responseData.message || 'Failed to save prices');
      }
      
      // Then proceed with approval
      onApprove(approvedBy);
      onClose();
    } catch (error) {
      console.error('Error saving prices:', error);
      toast({
        title: "Error",
        description: "Failed to save prices. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string | number, currency: string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return `0.00 ${currency}`;
    return `${num.toFixed(2)} ${currency}`;
  };

  const getItemsToAddCount = () => items.filter(item => !itemPrices[item.itemId]?.exists).length;
  const getItemsToUpdateCount = () => items.filter(item => itemPrices[item.itemId]?.exists).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Set Selling Prices Before Approval
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading existing prices...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Item</TableHead>
                  <TableHead className="text-right">Landing Cost</TableHead>
                  <TableHead>Selling Price CZK</TableHead>
                  <TableHead>Selling Price EUR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const prices = itemPrices[item.itemId] || { priceCzk: '', priceEur: '', exists: false };
                  const landingCost = parseFloat(item.details?.latestLandingCost || '0');
                  
                  return (
                    <TableRow key={item.itemId}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.details?.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              Qty: {item.receivedQuantity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {item.details?.sku && (
                              <span className="text-sm text-muted-foreground">
                                SKU: {item.details.sku}
                              </span>
                            )}
                            {prices.exists && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Existing
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${landingCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={prices.priceCzk}
                            onChange={(e) => handlePriceChange(item.itemId.toString(), 'priceCzk', e.target.value)}
                            placeholder="0.00"
                            className="pr-10"
                            data-testid={`input-price-czk-${item.itemId}`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            Kč
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={prices.priceEur}
                            onChange={(e) => handlePriceChange(item.itemId.toString(), 'priceEur', e.target.value)}
                            placeholder="0.00"
                            className="pr-10"
                            data-testid={`input-price-eur-${item.itemId}`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            €
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          
          {/* Summary */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Summary
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Items to add:</span>
                <span className="ml-2 font-medium">{getItemsToAddCount()} new items</span>
              </div>
              <div>
                <span className="text-muted-foreground">Items to update:</span>
                <span className="ml-2 font-medium">{getItemsToUpdateCount()} existing items</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total items:</span>
                <span className="ml-2 font-medium">{items.length} items</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total quantity:</span>
                <span className="ml-2 font-medium">
                  {items.reduce((sum, item) => sum + item.receivedQuantity, 0)} units
                </span>
              </div>
            </div>
          </div>
          
          {/* Approver Name Input */}
          <div className="mt-6">
            <label className="text-sm font-medium mb-2 block">
              Your Name (for approval record)
            </label>
            <Input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Enter your name"
              data-testid="input-approver-name"
            />
          </div>
        </div>
        
        <DialogFooter className="border-t pt-4 mt-4">
          {!allPricesSet() && (
            <div className="flex items-center gap-2 mr-auto text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              Please set all prices before approving
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAndApprove}
            disabled={!allPricesSet() || !approvedBy || saving}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-approve-save-prices"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Save Prices
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}