import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, DollarSign, CheckCircle, AlertCircle, Repeat } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { convertCurrency, formatCurrency } from "@/lib/currencyUtils";

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
  const [displayCurrency, setDisplayCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [exchangeRate, setExchangeRate] = useState<number>(25);

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
    const numValue = parseFloat(value);
    const updates: any = {
      [currency]: value,
      exists: itemPrices[itemId]?.exists || false
    };
    
    // Auto-calculate CZK when EUR is entered
    if (currency === 'priceEur' && !isNaN(numValue) && numValue > 0) {
      updates.priceCzk = (numValue * exchangeRate).toFixed(2);
    }
    
    setItemPrices(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...updates
      }
    }));
  };

  // Handle tab navigation to move horizontally
  const handleKeyDown = (e: React.KeyboardEvent, itemId: number, currentField: 'czk' | 'eur') => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      if (currentField === 'czk') {
        // Move from CZK to EUR in same row
        const eurInput = document.querySelector(`[data-testid="input-price-eur-${itemId}"]`) as HTMLInputElement;
        eurInput?.focus();
      } else {
        // Move from EUR to CZK in next row
        const currentIndex = items.findIndex(item => item.itemId === itemId);
        if (currentIndex < items.length - 1) {
          const nextItem = items[currentIndex + 1];
          const nextCzkInput = document.querySelector(`[data-testid="input-price-czk-${nextItem.itemId}"]`) as HTMLInputElement;
          nextCzkInput?.focus();
        }
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      
      if (currentField === 'eur') {
        // Move back from EUR to CZK in same row
        const czkInput = document.querySelector(`[data-testid="input-price-czk-${itemId}"]`) as HTMLInputElement;
        czkInput?.focus();
      } else {
        // Move back from CZK to EUR in previous row
        const currentIndex = items.findIndex(item => item.itemId === itemId);
        if (currentIndex > 0) {
          const prevItem = items[currentIndex - 1];
          const prevEurInput = document.querySelector(`[data-testid="input-price-eur-${prevItem.itemId}"]`) as HTMLInputElement;
          prevEurInput?.focus();
        }
      }
    }
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Set Selling Prices Before Approval
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Landing Cost:</span>
              <Select value={displayCurrency} onValueChange={(val) => setDisplayCurrency(val as 'EUR' | 'CZK')}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="CZK">CZK (Kč)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          {/* Exchange Rate Input */}
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Repeat className="h-4 w-4 text-blue-600" />
              <label className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                EUR to CZK Exchange Rate:
              </label>
              <Input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 25)}
                className="w-24 h-7 text-xs font-medium"
                data-testid="input-exchange-rate"
              />
              <span className="text-xs text-muted-foreground">
                (CZK price will auto-fill when EUR is entered)
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm">Loading existing prices...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[30%] py-2">Item</TableHead>
                  <TableHead className="text-center w-[60px] py-2">Qty</TableHead>
                  <TableHead className="text-right w-[100px] py-2">Landing Cost</TableHead>
                  <TableHead className="w-[140px] py-2">Price CZK</TableHead>
                  <TableHead className="w-[140px] py-2">Price EUR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const prices = itemPrices[item.itemId] || { priceCzk: '', priceEur: '', exists: false };
                  const landingCostEur = parseFloat(item.details?.latestLandingCost || '0');
                  const landingCostDisplay = displayCurrency === 'CZK' 
                    ? convertCurrency(landingCostEur, 'EUR', 'CZK')
                    : landingCostEur;
                  
                  return (
                    <TableRow key={item.itemId} className="text-xs">
                      <TableCell className="py-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs">{item.details?.name}</span>
                            {prices.exists && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                                Exists
                              </Badge>
                            )}
                          </div>
                          {item.details?.sku && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.details.sku}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.receivedQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium py-2 text-cyan-700 dark:text-cyan-400">
                        {formatCurrency(landingCostDisplay, displayCurrency)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={prices.priceCzk}
                            onChange={(e) => handlePriceChange(item.itemId.toString(), 'priceCzk', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.itemId, 'czk')}
                            placeholder="0.00"
                            className="h-8 text-xs pr-8"
                            data-testid={`input-price-czk-${item.itemId}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            Kč
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={prices.priceEur}
                            onChange={(e) => handlePriceChange(item.itemId.toString(), 'priceEur', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.itemId, 'eur')}
                            placeholder="0.00"
                            className="h-8 text-xs pr-8"
                            data-testid={`input-price-eur-${item.itemId}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
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
          
          {/* Compact Summary & Approver */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold">Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="text-muted-foreground">New items:</div>
                <div className="font-medium">{getItemsToAddCount()}</div>
                <div className="text-muted-foreground">Existing:</div>
                <div className="font-medium">{getItemsToUpdateCount()}</div>
                <div className="text-muted-foreground">Total units:</div>
                <div className="font-medium">{items.reduce((sum, item) => sum + item.receivedQuantity, 0)}</div>
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <label className="text-xs font-semibold mb-2 block">
                Approver Name
              </label>
              <Input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Enter your name"
                className="h-8 text-xs"
                data-testid="input-approver-name"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="border-t pt-3 mt-3">
          {!allPricesSet() && (
            <div className="flex items-center gap-1.5 mr-auto text-xs text-orange-600">
              <AlertCircle className="h-3.5 w-3.5" />
              Please set all prices before approving
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-9 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSaveAndApprove}
            disabled={!allPricesSet() || !approvedBy || saving}
            className="bg-green-600 hover:bg-green-700 h-9 text-xs"
            data-testid="button-approve-save-prices"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                Approve & Save Prices
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}