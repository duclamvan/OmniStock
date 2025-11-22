import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { 
  Plus, 
  X,
  Package,
  Box,
  Weight,
  Check
} from "lucide-react";

interface PackingMaterial {
  id: string;
  name: string;
  quantity?: number;
}

interface PackingMaterialsSelectorProps {
  packingMaterials: PackingMaterial[];
  onPackingMaterialsChange: (materials: PackingMaterial[]) => void;
  availableMaterials: any[];
}

export default function PackingMaterialsSelector({
  packingMaterials = [],
  onPackingMaterialsChange,
  availableMaterials = []
}: PackingMaterialsSelectorProps) {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const handleAddMaterial = () => {
    if (!selectedMaterialId) {
      toast({
        title: t('common:noMaterialSelected'),
        description: t('common:pleaseSelectMaterial'),
        variant: "destructive"
      });
      return;
    }

    const selectedMaterial = availableMaterials.find(m => m.id === selectedMaterialId);
    if (!selectedMaterial) return;

    const materialExists = packingMaterials.some(m => m.id === selectedMaterialId);
    if (materialExists) {
      toast({
        title: t('common:materialAlreadyAdded'),
        description: t('common:materialAlreadyInList'),
        variant: "destructive"
      });
      return;
    }

    const newMaterial: PackingMaterial = {
      id: selectedMaterial.id,
      name: selectedMaterial.name,
      quantity: quantity > 0 ? quantity : 1
    };

    onPackingMaterialsChange([...packingMaterials, newMaterial]);
    
    toast({
      title: t('common:materialAdded'),
      description: t('common:materialAddedToList', { name: selectedMaterial.name }),
    });

    setIsDialogOpen(false);
    setSelectedMaterialId("");
    setQuantity(1);
    setMaterialSearch("");
  };

  const handleRemoveMaterial = (materialId: string) => {
    const updatedMaterials = packingMaterials.filter(m => m.id !== materialId);
    onPackingMaterialsChange(updatedMaterials);
    
    toast({
      title: t('common:materialRemoved'),
      description: t('common:materialRemovedFromList'),
    });
  };

  const handleUpdateQuantity = (materialId: string, newQuantity: number) => {
    const updatedMaterials = packingMaterials.map(m =>
      m.id === materialId ? { ...m, quantity: newQuantity > 0 ? newQuantity : 1 } : m
    );
    onPackingMaterialsChange(updatedMaterials);
  };

  const getMaterialDetails = (materialId: string) => {
    return availableMaterials.find(m => m.id === materialId);
  };

  return (
    <div className="space-y-4">
      {/* Materials List */}
      {packingMaterials.length > 0 ? (
        <div className="space-y-3">
          {packingMaterials.map((material) => {
            const details = getMaterialDetails(material.id);
            if (!details) return null;

            return (
              <Card key={material.id} className="p-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Image */}
                  <div className="shrink-0 w-16 h-16 rounded border bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    {details.imageUrl ? (
                      <img
                        src={details.imageUrl}
                        alt={details.name}
                        className="w-full h-full object-contain"
                        data-testid={`img-material-${material.id}`}
                      />
                    ) : (
                      <ImagePlaceholder size="sm" variant="product" data-testid={`placeholder-material-${material.id}`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100" data-testid={`text-material-name-${material.id}`}>
                            {details.name}
                          </span>
                          {details.code && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {details.code}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {details.category && (
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {details.category}
                            </span>
                          )}
                          {details.dimensions && (
                            <span className="inline-flex items-center gap-1">
                              <Box className="h-3 w-3" />
                              {details.dimensions}
                            </span>
                          )}
                          {details.weight && (
                            <span className="inline-flex items-center gap-1">
                              <Weight className="h-3 w-3" />
                              {details.weight}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMaterial(material.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        data-testid={`button-remove-material-${material.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Quantity Input */}
                    <div className="flex items-center gap-2 mt-2">
                      <Label htmlFor={`quantity-${material.id}`} className="text-xs text-slate-600 dark:text-slate-400">
                        {t('common:quantity')}:
                      </Label>
                      <Input
                        id={`quantity-${material.id}`}
                        type="number"
                        min="1"
                        step="1"
                        value={material.quantity || 1}
                        onChange={(e) => handleUpdateQuantity(material.id, parseInt(e.target.value) || 1)}
                        className="w-20 h-7 text-sm"
                        data-testid={`input-quantity-${material.id}`}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
          <Package className="h-10 w-10 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('common:noPackingMaterialsAdded')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('common:clickAddMaterialToAdd')}</p>
        </div>
      )}

      {/* Add Material Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="w-full"
        data-testid="button-add-material"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('common:addMaterial')}
      </Button>

      {/* Add Material Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('common:addPackingMaterial')}</DialogTitle>
            <DialogDescription>
              {t('common:searchAndSelectMaterial')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Material Search */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('common:selectMaterial')}</Label>
              <Command shouldFilter={false} className="border rounded-lg">
                <CommandInput
                  placeholder={t('common:searchPackingMaterials')}
                  value={materialSearch}
                  onValueChange={setMaterialSearch}
                  data-testid="input-search-material-dialog"
                />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>{t('common:noPackingMaterialsFound')}</CommandEmpty>
                  <CommandGroup>
                    {availableMaterials
                      ?.filter((material: any) =>
                        materialSearch === "" ||
                        material.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                        material.code?.toLowerCase().includes(materialSearch.toLowerCase()) ||
                        material.type?.toLowerCase().includes(materialSearch.toLowerCase()) ||
                        material.category?.toLowerCase().includes(materialSearch.toLowerCase())
                      )
                      .map((material: any) => (
                        <CommandItem
                          key={material.id}
                          value={material.id}
                          onSelect={() => setSelectedMaterialId(material.id)}
                          className="flex items-start gap-3 p-3 cursor-pointer"
                          data-testid={`option-material-${material.id}`}
                        >
                          {/* Image */}
                          <div className="shrink-0 w-12 h-12 rounded border bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                            {material.imageUrl ? (
                              <img
                                src={material.imageUrl}
                                alt={material.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImagePlaceholder size="xs" variant="product" />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{material.name}</span>
                              {material.code && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {material.code}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400 mb-1">
                              {material.category && (
                                <span className="inline-flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {material.category}
                                </span>
                              )}
                              {material.dimensions && (
                                <span className="inline-flex items-center gap-1">
                                  <Box className="h-3 w-3" />
                                  {material.dimensions}
                                </span>
                              )}
                              {material.weight && (
                                <span className="inline-flex items-center gap-1">
                                  <Weight className="h-3 w-3" />
                                  {material.weight}
                                </span>
                              )}
                            </div>
                            
                            {material.stockQuantity !== undefined && (
                              <div className="text-xs">
                                <span className={material.stockQuantity <= material.minStockLevel ? "text-red-600" : "text-green-600"}>
                                  Stock: {material.stockQuantity}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {selectedMaterialId === material.id && (
                            <Check className="h-4 w-4 shrink-0 text-blue-600" />
                          )}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* Quantity Input */}
            <div>
              <Label htmlFor="dialog-quantity" className="text-sm font-medium">
                {t('common:quantity')}
              </Label>
              <Input
                id="dialog-quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="mt-1"
                data-testid="input-dialog-quantity"
              />
              <p className="text-xs text-slate-500 mt-1">
                {t('common:numberOfUnitsNeeded')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedMaterialId("");
                setQuantity(1);
                setMaterialSearch("");
              }}
              data-testid="button-cancel-dialog"
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAddMaterial}
              disabled={!selectedMaterialId}
              data-testid="button-confirm-add-material"
            >
              {t('common:addMaterial')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
