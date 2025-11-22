import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, DollarSign, CheckCircle, AlertCircle, Repeat, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const { t } = useTranslation(['imports', 'common']);
  const { toast } = useToast();
  const [itemPrices, setItemPrices] = useState<Record<string, { priceCzk: string; priceEur: string; exists: boolean }>>({});
  const [approvedBy, setApprovedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [exchangeRate, setExchangeRate] = useState<number>(25);
  const [showColumns, setShowColumns] = useState({
    sku: true,
    qty: true,
    landingCostCzk: true,
    landingCostEur: true
  });

  // Load saved approver name from localStorage on mount
  useEffect(() => {
    const savedApprover = localStorage.getItem('lastApproverName');
    if (savedApprover) {
      setApprovedBy(savedApprover);
    }
  }, []);

  // Initialize and fetch existing prices when modal opens
  useEffect(() => {
    if (!open || !items.length) return;
    
    const fetchExistingPrices = async () => {
      setLoading(true);
      const prices: Record<string, { priceCzk: string; priceEur: string; exists: boolean }> = {};
      
      // Try to load previously saved prices from localStorage first
      const savedPricesKey = `receipt_${receiptId}_prices`;
      const savedPricesStr = localStorage.getItem(savedPricesKey);
      let savedPrices: Record<string, { priceCzk: string; priceEur: string }> = {};
      if (savedPricesStr) {
        try {
          savedPrices = JSON.parse(savedPricesStr);
        } catch (e) {
          console.error('Error parsing saved prices:', e);
        }
      }
      
      for (const item of items) {
        const productId = item.details?.id;
        const sku = item.details?.sku;
        const itemKey = item.itemId.toString();
        
        // Check if we have saved prices for this item
        if (savedPrices[itemKey]) {
          prices[item.itemId] = {
            priceCzk: savedPrices[itemKey].priceCzk || '',
            priceEur: savedPrices[itemKey].priceEur || '',
            exists: false // Mark as not from inventory since these are user-entered
          };
          continue;
        }
        
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
  }, [open, items, receiptId]);

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
    
    const updatedPrices = {
      ...itemPrices,
      [itemId]: {
        ...itemPrices[itemId],
        ...updates
      }
    };
    
    setItemPrices(updatedPrices);
    
    // Save prices to localStorage for this receipt
    const savedPricesKey = `receipt_${receiptId}_prices`;
    const pricesToSave: Record<string, { priceCzk: string; priceEur: string }> = {};
    Object.keys(updatedPrices).forEach(key => {
      pricesToSave[key] = {
        priceCzk: updatedPrices[key].priceCzk,
        priceEur: updatedPrices[key].priceEur
      };
    });
    localStorage.setItem(savedPricesKey, JSON.stringify(pricesToSave));
  };

  // Handle tab navigation to move vertically down in same column
  const handleKeyDown = (e: React.KeyboardEvent, itemId: number, currentField: 'czk' | 'eur') => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      const currentIndex = items.findIndex(item => item.itemId === itemId);
      if (currentIndex < items.length - 1) {
        const nextItem = items[currentIndex + 1];
        const nextInput = document.querySelector(
          `[data-testid="input-price-${currentField === 'czk' ? 'czk' : 'eur'}-${nextItem.itemId}"]`
        ) as HTMLInputElement;
        nextInput?.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      
      const currentIndex = items.findIndex(item => item.itemId === itemId);
      if (currentIndex > 0) {
        const prevItem = items[currentIndex - 1];
        const prevInput = document.querySelector(
          `[data-testid="input-price-${currentField === 'czk' ? 'czk' : 'eur'}-${prevItem.itemId}"]`
        ) as HTMLInputElement;
        prevInput?.focus();
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
        title: t('common:error'),
        description: t('imports:pleaseEnterNameForApproval'),
        variant: "destructive"
      });
      return;
    }

    if (!allPricesSet()) {
      toast({
        title: t('common:error'),
        description: t('imports:pleaseSetAllPricesBeforeApproving'),
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    let progressToastId: string | undefined;
    
    // Show progress toast with animation
    const { id } = toast({
      title: `⚙️ ${t('imports:processingReceiptApproval')}`,
      description: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>{t('imports:updatingProductsInInventory', { count: items.length })}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-in-out" 
              style={{ 
                width: '0%',
                animation: 'progress 3s ease-in-out infinite'
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t('imports:settingPricesUpdatingCosts')}
          </div>
        </div>
      ),
      duration: Infinity, // Keep it open until we dismiss it
    });
    progressToastId = id;
    
    try {
      // Prepare items for the combined operation
      const priceItems = items.map(item => ({
        sku: item.details?.sku,
        productId: item.details?.id,
        priceCzk: itemPrices[item.itemId].priceCzk,
        priceEur: itemPrices[item.itemId].priceEur,
        landingCost: parseFloat(item.details?.latestLandingCost || '0')
      }));
      
      // Call the combined endpoint that handles both price setting and approval atomically
      const response = await apiRequest(
        'POST',
        `/api/imports/receipts/approve-with-prices/${receiptId}`,
        {
          items: priceItems,
          approvedBy: approvedBy,
          notes: '' // Optional notes field
        }
      );
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to approve receipt');
      }
      
      // Dismiss the progress toast using the returned dismiss function
      const dismissProgress = () => {
        if (progressToastId) {
          const toastObj = toast({ id: progressToastId, open: false } as any);
          if (toastObj && toastObj.dismiss) toastObj.dismiss();
        }
      };
      dismissProgress();
      
      // Show success toast with detailed summary
      const { summary } = result;
      const pricesUpdated = summary?.prices?.updated || 0;
      const pricesCreated = summary?.prices?.created || 0;
      const inventoryUpdated = summary?.inventory?.updated || 0;
      const inventoryCreated = summary?.inventory?.created || 0;
      const total = inventoryUpdated + inventoryCreated;
      
      toast({
        title: `✅ ${t('imports:receiptApprovedSuccessfully')}`,
        description: (
          <div className="space-y-2 text-sm">
            <div className="font-semibold">{t('imports:approvedByLabel')} {approvedBy}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2 font-medium border-b pb-1">{t('imports:pricesUpdatedLabel')}</div>
              <div>• {t('imports:existingProducts')}</div>
              <div>{pricesUpdated}</div>
              <div>• {t('imports:newProducts')}</div>
              <div>{pricesCreated}</div>
              
              <div className="col-span-2 font-medium border-b pb-1 mt-2">{t('imports:inventoryChanges')}</div>
              <div>• {t('imports:productsUpdated')}</div>
              <div>{inventoryUpdated}</div>
              <div>• {t('imports:newProductsCreated')}</div>
              <div>{inventoryCreated}</div>
              
              <div className="col-span-2 font-semibold mt-2 pt-2 border-t">
                {t('imports:totalProductsProcessed', { total })}
              </div>
            </div>
          </div>
        ),
        duration: 8000,
      });
      
      // Save approver name to localStorage for next time
      localStorage.setItem('lastApproverName', approvedBy);
      
      // Clear saved prices from localStorage after successful approval
      const savedPricesKey = `receipt_${receiptId}_prices`;
      localStorage.removeItem(savedPricesKey);
      
      // Close modal
      onClose();
      
      // Call onApprove callback to trigger refetch in parent component (pass null to indicate already approved)
      if (typeof onApprove === 'function') {
        onApprove(null as any); // Pass null to signal that approval is already done, just refetch
      }
    } catch (error) {
      // Dismiss the progress toast using the returned dismiss function
      const dismissProgress = () => {
        if (progressToastId) {
          const toastObj = toast({ id: progressToastId, open: false } as any);
          if (toastObj && toastObj.dismiss) toastObj.dismiss();
        }
      };
      dismissProgress();
      
      console.error('Error approving receipt:', error);
      toast({
        title: `❌ ${t('imports:approvalFailed')}`,
        description: error instanceof Error ? error.message : t('imports:failedToApproveReceiptTryAgain'),
        variant: "destructive",
        duration: 6000,
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
              {t('imports:setSellingPricesBeforeApproval')}
            </DialogTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="text-xs">{t('imports:columns')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">{t('imports:showHideColumns')}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="col-sku"
                        checked={showColumns.sku}
                        onCheckedChange={(checked) => setShowColumns(prev => ({ ...prev, sku: !!checked }))}
                      />
                      <Label htmlFor="col-sku" className="text-xs cursor-pointer">{t('common:sku')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="col-qty"
                        checked={showColumns.qty}
                        onCheckedChange={(checked) => setShowColumns(prev => ({ ...prev, qty: !!checked }))}
                      />
                      <Label htmlFor="col-qty" className="text-xs cursor-pointer">{t('common:quantity')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="col-landing-czk"
                        checked={showColumns.landingCostCzk}
                        onCheckedChange={(checked) => setShowColumns(prev => ({ ...prev, landingCostCzk: !!checked }))}
                      />
                      <Label htmlFor="col-landing-czk" className="text-xs cursor-pointer">{t('imports:landingCostCZK')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="col-landing-eur"
                        checked={showColumns.landingCostEur}
                        onCheckedChange={(checked) => setShowColumns(prev => ({ ...prev, landingCostEur: !!checked }))}
                      />
                      <Label htmlFor="col-landing-eur" className="text-xs cursor-pointer">{t('imports:landingCostEUR')}</Label>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          {/* Exchange Rate Input */}
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Repeat className="h-4 w-4 text-blue-600" />
              <label className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                {t('imports:eurToCzkExchangeRate')}
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
                {t('imports:czkAutoFillsWhenEurEntered')}
              </span>
            </div>
          </div>

          {/* Auto-fill Info Banner */}
          {getItemsToUpdateCount() > 0 && (
            <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {getItemsToUpdateCount()} {getItemsToUpdateCount() === 1 ? t('common:item') : t('common:items')} {t('imports:autoFilledWithExistingPrices')}
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm">{t('imports:loadingExistingPrices')}</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="py-2">{t('common:item')}</TableHead>
                  {showColumns.qty && <TableHead className="text-center w-[60px] py-2">{t('common:qty')}</TableHead>}
                  {showColumns.landingCostCzk && <TableHead className="text-right w-[100px] py-2">{t('imports:costCZK')}</TableHead>}
                  {showColumns.landingCostEur && <TableHead className="text-right w-[100px] py-2">{t('imports:costEUR')}</TableHead>}
                  <TableHead className="w-[130px] py-2">{t('imports:priceCZK')}</TableHead>
                  <TableHead className="w-[130px] py-2">{t('imports:priceEUR')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const prices = itemPrices[item.itemId] || { priceCzk: '', priceEur: '', exists: false };
                  const landingCostEur = parseFloat(item.details?.latestLandingCost || '0');
                  const landingCostCzk = convertCurrency(landingCostEur, 'EUR', 'CZK');
                  
                  return (
                    <TableRow key={item.itemId} className="text-xs">
                      <TableCell className="py-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-xs">{item.details?.name}</span>
                            {prices.exists && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                                {t('imports:exists')}
                              </Badge>
                            )}
                          </div>
                          {showColumns.sku && item.details?.sku && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.details.sku}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {showColumns.qty && (
                        <TableCell className="text-center py-2">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {item.receivedQuantity}
                          </Badge>
                        </TableCell>
                      )}
                      {showColumns.landingCostCzk && (
                        <TableCell className="text-right font-medium py-2 text-cyan-700 dark:text-cyan-400">
                          {formatCurrency(landingCostCzk, 'CZK')}
                        </TableCell>
                      )}
                      {showColumns.landingCostEur && (
                        <TableCell className="text-right font-medium py-2 text-cyan-700 dark:text-cyan-400">
                          {formatCurrency(landingCostEur, 'EUR')}
                        </TableCell>
                      )}
                      <TableCell className="py-2">
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={prices.priceCzk}
                            onChange={(e) => handlePriceChange(item.itemId.toString(), 'priceCzk', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, item.itemId, 'czk')}
                            placeholder="0.00"
                            className={`h-8 text-xs pr-8 ${prices.exists && prices.priceCzk ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800' : ''}`}
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
                            className={`h-8 text-xs pr-8 ${prices.exists && prices.priceEur ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800' : ''}`}
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
                <h3 className="text-xs font-semibold">{t('common:summary')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="text-muted-foreground">{t('imports:newItems')}</div>
                <div className="font-medium">{getItemsToAddCount()}</div>
                <div className="text-muted-foreground">{t('imports:existing')}</div>
                <div className="font-medium">{getItemsToUpdateCount()}</div>
                <div className="text-muted-foreground">{t('imports:totalUnitsLabel')}</div>
                <div className="font-medium">{items.reduce((sum, item) => sum + item.receivedQuantity, 0)}</div>
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <label className="text-xs font-semibold mb-2 block">
                {t('imports:approverName')}
              </label>
              <Input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                onClick={(e) => e.currentTarget.select()}
                placeholder={t('imports:enterYourName')}
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
              {t('imports:pleaseSetAllPricesBeforeApproving')}
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-9 text-xs">
            {t('common:cancel')}
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
                {t('common:saving')}
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                {t('imports:approveAndSavePrices')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}