import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { 
  Save,
  Edit2,
  Package,
  Ruler,
  Weight,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Copy,
  RefreshCcw,
  Info
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Carton {
  id: number;
  shipmentId: number;
  purchaseItemId: number;
  qtyInCarton: number;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  grossWeightKg: string | null;
  volumetricWeight?: number;
  chargeableWeight?: number;
  item?: {
    id: number;
    sku: string;
    name: string;
    quantity: number;
  };
}

interface BulkEditData {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  grossWeightKg?: number;
}

interface CartonDimensionsProps {
  shipmentId: number;
}

const cartonFormSchema = z.object({
  lengthCm: z.string().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Must be a positive number"
  }),
  widthCm: z.string().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Must be a positive number"
  }),
  heightCm: z.string().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Must be a positive number"
  }),
  grossWeightKg: z.string().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Must be a positive number"
  }),
});

type CartonFormValues = z.infer<typeof cartonFormSchema>;

const CartonDimensions = ({ shipmentId }: CartonDimensionsProps) => {
  const { toast } = useToast();
  const [selectedCartons, setSelectedCartons] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [editingCarton, setEditingCarton] = useState<Carton | null>(null);
  const [localCartons, setLocalCartons] = useState<Map<number, Partial<Carton>>>(new Map());

  // Fetch cartons
  const { data: cartonsResponse, isLoading, refetch } = useQuery({
    queryKey: [`/api/imports/shipments/${shipmentId}/cartons`],
    enabled: !!shipmentId
  });
  
  // Extract cartons array from response
  const cartons: Carton[] = cartonsResponse?.cartons || [];

  // Initialize local state when cartons are loaded
  useEffect(() => {
    if (cartons && cartons.length > 0 && localCartons.size === 0) {
      const newLocalCartons = new Map();
      cartons.forEach(carton => {
        newLocalCartons.set(carton.id, {
          lengthCm: carton.lengthCm,
          widthCm: carton.widthCm,
          heightCm: carton.heightCm,
          grossWeightKg: carton.grossWeightKg
        });
      });
      setLocalCartons(newLocalCartons);
    }
  }, [cartons, localCartons.size]);

  const bulkEditForm = useForm<CartonFormValues>({
    resolver: zodResolver(cartonFormSchema),
    defaultValues: {
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      grossWeightKg: '',
    },
  });

  const singleEditForm = useForm<CartonFormValues>({
    resolver: zodResolver(cartonFormSchema),
    defaultValues: {
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      grossWeightKg: '',
    },
  });

  // Update carton mutation
  const updateCartonMutation = useMutation({
    mutationFn: async ({ cartonId, data }: { cartonId: number; data: any }) => {
      return apiRequest(`/api/imports/shipments/${shipmentId}/cartons/${cartonId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Carton Updated",
        description: "Carton dimensions have been saved"
      });
      refetch();
      setEditingCarton(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update carton",
        variant: "destructive"
      });
    }
  });

  // Bulk update cartons mutation
  const bulkUpdateCartonsMutation = useMutation({
    mutationFn: async (data: BulkEditData) => {
      const promises = Array.from(selectedCartons).map(cartonId => 
        apiRequest(`/api/imports/shipments/${shipmentId}/cartons/${cartonId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Cartons Updated",
        description: `${selectedCartons.size} cartons have been updated`
      });
      refetch();
      setSelectedCartons(new Set());
      setShowBulkEdit(false);
      bulkEditForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cartons",
        variant: "destructive"
      });
    }
  });

  const calculateVolumetricWeight = (length?: number, width?: number, height?: number, divisor: number = 6000) => {
    if (!length || !width || !height) return null;
    return (length * width * height) / divisor;
  };

  const calculateChargeableWeight = (actualWeight?: number, volumetricWeight?: number) => {
    if (!actualWeight && !volumetricWeight) return null;
    if (!actualWeight) return volumetricWeight;
    if (!volumetricWeight) return actualWeight;
    return Math.max(actualWeight, volumetricWeight);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCartons(new Set(cartons.map(c => c.id)));
    } else {
      setSelectedCartons(new Set());
    }
  };

  const handleSelectCarton = (cartonId: number, checked: boolean) => {
    const newSelected = new Set(selectedCartons);
    if (checked) {
      newSelected.add(cartonId);
    } else {
      newSelected.delete(cartonId);
    }
    setSelectedCartons(newSelected);
  };

  const handleLocalChange = (cartonId: number, field: keyof Carton, value: string) => {
    const newLocal = new Map(localCartons);
    const current = newLocal.get(cartonId) || {};
    newLocal.set(cartonId, { ...current, [field]: value });
    setLocalCartons(newLocal);
  };

  const saveCarton = (cartonId: number) => {
    const localData = localCartons.get(cartonId);
    if (!localData) return;

    const data: any = {};
    if (localData.lengthCm) data.lengthCm = parseFloat(localData.lengthCm as string);
    if (localData.widthCm) data.widthCm = parseFloat(localData.widthCm as string);
    if (localData.heightCm) data.heightCm = parseFloat(localData.heightCm as string);
    if (localData.grossWeightKg) data.grossWeightKg = parseFloat(localData.grossWeightKg as string);

    updateCartonMutation.mutate({ cartonId, data });
  };

  const handleBulkEdit = (data: CartonFormValues) => {
    const updateData: BulkEditData = {};
    if (data.lengthCm) updateData.lengthCm = parseFloat(data.lengthCm);
    if (data.widthCm) updateData.widthCm = parseFloat(data.widthCm);
    if (data.heightCm) updateData.heightCm = parseFloat(data.heightCm);
    if (data.grossWeightKg) updateData.grossWeightKg = parseFloat(data.grossWeightKg);

    bulkUpdateCartonsMutation.mutate(updateData);
  };

  const handleSingleEdit = (data: CartonFormValues) => {
    if (!editingCarton) return;

    const updateData: any = {};
    if (data.lengthCm) updateData.lengthCm = parseFloat(data.lengthCm);
    if (data.widthCm) updateData.widthCm = parseFloat(data.widthCm);
    if (data.heightCm) updateData.heightCm = parseFloat(data.heightCm);
    if (data.grossWeightKg) updateData.grossWeightKg = parseFloat(data.grossWeightKg);

    updateCartonMutation.mutate({ cartonId: editingCarton.id, data: updateData });
  };

  const copyDimensions = (carton: Carton) => {
    if (!carton.lengthCm || !carton.widthCm || !carton.heightCm || !carton.grossWeightKg) {
      toast({
        title: "Cannot Copy",
        description: "This carton has incomplete dimensions",
        variant: "destructive"
      });
      return;
    }

    bulkEditForm.setValue('lengthCm', carton.lengthCm);
    bulkEditForm.setValue('widthCm', carton.widthCm);
    bulkEditForm.setValue('heightCm', carton.heightCm);
    bulkEditForm.setValue('grossWeightKg', carton.grossWeightKg);

    toast({
      title: "Dimensions Copied",
      description: "Apply to selected cartons using bulk edit",
    });
  };

  const totalCartons = cartons.length;
  const cartonsWithDimensions = cartons.filter(c => 
    c.lengthCm && c.widthCm && c.heightCm && c.grossWeightKg
  ).length;
  const missingDimensions = totalCartons - cartonsWithDimensions;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Carton Dimensions...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Carton Dimensions</CardTitle>
                <CardDescription>
                  Manage carton dimensions for volumetric weight calculations
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {missingDimensions > 0 ? (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {missingDimensions} Missing Dimensions
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All Complete
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Total Cartons
                </div>
                <p className="text-xl font-semibold">{totalCartons}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </div>
                <p className="text-xl font-semibold">{cartonsWithDimensions}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Incomplete
                </div>
                <p className="text-xl font-semibold">{missingDimensions}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Weight className="h-4 w-4" />
                  Total Weight
                </div>
                <p className="text-xl font-semibold">
                  {cartons.reduce((sum, c) => sum + (parseFloat(c.grossWeightKg || '0')), 0).toFixed(2)} kg
                </p>
              </div>
            </div>

            {missingDimensions > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Dimensions</AlertTitle>
                <AlertDescription>
                  {missingDimensions} cartons are missing dimension data. 
                  This may affect volumetric weight calculations and freight cost allocation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedCartons.size === cartons.length && cartons.length > 0}
              onCheckedChange={handleSelectAll}
              data-testid="checkbox-select-all"
            />
            <Label className="text-sm">
              Select All ({selectedCartons.size} selected)
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkEdit(true)}
            disabled={selectedCartons.size === 0}
            data-testid="button-bulk-edit"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Bulk Edit
          </Button>
        </div>

        {/* Cartons Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Ruler className="h-4 w-4" />
                        L (cm)
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Ruler className="h-4 w-4" />
                        W (cm)
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Ruler className="h-4 w-4" />
                        H (cm)
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Weight className="h-4 w-4" />
                        Weight (kg)
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Vol. Weight</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Volumetric weight = (L×W×H) / 6000</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Chargeable</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Max of actual and volumetric weight</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartons.map(carton => {
                    const local = localCartons.get(carton.id) || {};
                    const length = parseFloat(local.lengthCm || carton.lengthCm || '0');
                    const width = parseFloat(local.widthCm || carton.widthCm || '0');
                    const height = parseFloat(local.heightCm || carton.heightCm || '0');
                    const weight = parseFloat(local.grossWeightKg || carton.grossWeightKg || '0');
                    
                    const volumetricWeight = calculateVolumetricWeight(length, width, height);
                    const chargeableWeight = calculateChargeableWeight(weight, volumetricWeight || 0);
                    
                    const isComplete = carton.lengthCm && carton.widthCm && carton.heightCm && carton.grossWeightKg;
                    const hasLocalChanges = local.lengthCm !== undefined || local.widthCm !== undefined || 
                                          local.heightCm !== undefined || local.grossWeightKg !== undefined;

                    return (
                      <TableRow key={carton.id} className={!isComplete ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCartons.has(carton.id)}
                            onCheckedChange={(checked) => handleSelectCarton(carton.id, !!checked)}
                            data-testid={`checkbox-carton-${carton.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          {carton.item?.name || `Item #${carton.purchaseItemId}`}
                        </TableCell>
                        <TableCell>{carton.item?.sku || '-'}</TableCell>
                        <TableCell className="text-center">{carton.qtyInCarton}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={local.lengthCm || carton.lengthCm || ''}
                            onChange={(e) => handleLocalChange(carton.id, 'lengthCm', e.target.value)}
                            placeholder="0.00"
                            className="w-20 mx-auto"
                            data-testid={`input-length-${carton.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={local.widthCm || carton.widthCm || ''}
                            onChange={(e) => handleLocalChange(carton.id, 'widthCm', e.target.value)}
                            placeholder="0.00"
                            className="w-20 mx-auto"
                            data-testid={`input-width-${carton.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={local.heightCm || carton.heightCm || ''}
                            onChange={(e) => handleLocalChange(carton.id, 'heightCm', e.target.value)}
                            placeholder="0.00"
                            className="w-20 mx-auto"
                            data-testid={`input-height-${carton.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={local.grossWeightKg || carton.grossWeightKg || ''}
                            onChange={(e) => handleLocalChange(carton.id, 'grossWeightKg', e.target.value)}
                            placeholder="0.000"
                            className="w-20 mx-auto"
                            data-testid={`input-weight-${carton.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {volumetricWeight ? volumetricWeight.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {chargeableWeight ? chargeableWeight.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {hasLocalChanges && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => saveCarton(carton.id)}
                                data-testid={`button-save-${carton.id}`}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyDimensions(carton)}
                              disabled={!isComplete}
                              data-testid={`button-copy-${carton.id}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Volumetric Weight Calculation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Volumetric weight is calculated using the formula: (Length × Width × Height) / Divisor
                </p>
                <p className="text-sm text-muted-foreground">
                  Standard divisors: Air freight = 6000, Sea freight = 1000000, Courier = 5000
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Chargeable weight is the greater of actual weight and volumetric weight.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Dimensions</DialogTitle>
            <DialogDescription>
              Update dimensions for {selectedCartons.size} selected cartons. 
              Leave fields empty to keep existing values.
            </DialogDescription>
          </DialogHeader>
          <Form {...bulkEditForm}>
            <form onSubmit={bulkEditForm.handleSubmit(handleBulkEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bulkEditForm.control}
                  name="lengthCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Length (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Leave empty to skip"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bulkEditForm.control}
                  name="widthCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Width (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Leave empty to skip"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bulkEditForm.control}
                  name="heightCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Leave empty to skip"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bulkEditForm.control}
                  name="grossWeightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gross Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="Leave empty to skip"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBulkEdit(false);
                    bulkEditForm.reset();
                  }}
                  disabled={bulkUpdateCartonsMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={bulkUpdateCartonsMutation.isPending}
                  data-testid="button-apply-bulk-edit"
                >
                  {bulkUpdateCartonsMutation.isPending ? (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>Apply to {selectedCartons.size} Cartons</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CartonDimensions;