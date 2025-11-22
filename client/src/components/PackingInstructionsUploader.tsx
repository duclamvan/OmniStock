import { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Package, 
  FileText,
  Info,
  X,
  Loader2,
  Plus,
  Edit,
  MoveUp,
  MoveDown
} from "lucide-react";

interface PackingInstruction {
  image?: string;
  text: string;
}

interface PackingInstructionsUploaderProps {
  packingInstructionsImages?: string[];
  packingInstructionsTexts?: string[];
  onImagesChange: (images: string[]) => void;
  onTextsChange: (texts: string[]) => void;
  productId?: string;
}

export default function PackingInstructionsUploader({
  packingInstructionsImages = [],
  packingInstructionsTexts = [],
  onImagesChange,
  onTextsChange,
  productId
}: PackingInstructionsUploaderProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Convert old format to new format
  const convertToInstructions = (): PackingInstruction[] => {
    const maxLength = Math.max(packingInstructionsImages.length, packingInstructionsTexts.length);
    const instructions: PackingInstruction[] = [];
    
    for (let i = 0; i < maxLength; i++) {
      instructions.push({
        image: packingInstructionsImages[i],
        text: packingInstructionsTexts[i] || ''
      });
    }
    
    return instructions.length > 0 ? instructions : [];
  };

  const [instructions, setInstructions] = useState<PackingInstruction[]>(convertToInstructions());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [editingInstructionIndex, setEditingInstructionIndex] = useState<number | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [currentTextValue, setCurrentTextValue] = useState("");
  const [uploadingInDialog, setUploadingInDialog] = useState(false);

  // Sync with props when they change
  useEffect(() => {
    setInstructions(convertToInstructions());
  }, [packingInstructionsImages, packingInstructionsTexts]);

  // Sync back to parent in old format
  const syncToParent = (newInstructions: PackingInstruction[]) => {
    const images = newInstructions.map(inst => inst.image).filter(Boolean) as string[];
    const texts = newInstructions.map(inst => inst.text);
    onImagesChange(images);
    onTextsChange(texts);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: t('common:invalidFileType'),
        description: t('common:pleaseUploadValidImageFormat'),
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: t('common:fileTooLarge'),
        description: t('common:imageMustBeLessThan5MB'),
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = async (file: File, forDialog: boolean = false) => {
    if (!validateFile(file)) return;

    if (forDialog) {
      setUploadingInDialog(true);
    } else {
      setIsUploading(true);
    }
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      if (forDialog) {
        setCurrentImageUrl(data.imageUrl);
        toast({
          title: t('common:uploadSuccess'),
          description: t('common:imageUploadedSuccessfully'),
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('common:uploadFailed'),
        description: t('common:failedToUploadImageRetry'),
        variant: "destructive"
      });
    } finally {
      if (forDialog) {
        setUploadingInDialog(false);
      } else {
        setIsUploading(false);
      }
      setUploadProgress(0);
    }
  };

  const handleAddInstruction = () => {
    setEditingInstructionIndex(null);
    setCurrentImageUrl("");
    setCurrentTextValue("");
    setIsInstructionDialogOpen(true);
  };

  const handleEditInstruction = (index: number) => {
    setEditingInstructionIndex(index);
    setCurrentImageUrl(instructions[index].image || "");
    setCurrentTextValue(instructions[index].text);
    setIsInstructionDialogOpen(true);
  };

  const handleSaveInstruction = () => {
    if (!currentTextValue.trim() && !currentImageUrl) {
      toast({
        title: t('common:emptyInstruction'),
        description: t('common:pleaseAddImageOrText'),
        variant: "destructive"
      });
      return;
    }

    let updatedInstructions: PackingInstruction[];
    
    if (editingInstructionIndex !== null) {
      updatedInstructions = instructions.map((inst, i) => 
        i === editingInstructionIndex ? { image: currentImageUrl || undefined, text: currentTextValue } : inst
      );
      toast({
        title: t('common:instructionUpdated'),
        description: t('common:packingInstructionUpdated'),
      });
    } else {
      updatedInstructions = [...instructions, { image: currentImageUrl || undefined, text: currentTextValue }];
      toast({
        title: t('common:instructionAdded'),
        description: t('common:newPackingInstructionAdded'),
      });
    }

    setInstructions(updatedInstructions);
    syncToParent(updatedInstructions);
    setIsInstructionDialogOpen(false);
    setCurrentImageUrl("");
    setCurrentTextValue("");
    setEditingInstructionIndex(null);
  };

  const handleRemoveInstruction = (index: number) => {
    const updatedInstructions = instructions.filter((_, i) => i !== index);
    setInstructions(updatedInstructions);
    syncToParent(updatedInstructions);
    
    toast({
      title: t('common:instructionRemoved'),
      description: t('common:packingInstructionRemoved'),
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedInstructions = [...instructions];
    [updatedInstructions[index], updatedInstructions[index - 1]] = 
    [updatedInstructions[index - 1], updatedInstructions[index]];
    setInstructions(updatedInstructions);
    syncToParent(updatedInstructions);
  };

  const handleMoveDown = (index: number) => {
    if (index === instructions.length - 1) return;
    const updatedInstructions = [...instructions];
    [updatedInstructions[index], updatedInstructions[index + 1]] = 
    [updatedInstructions[index + 1], updatedInstructions[index]];
    setInstructions(updatedInstructions);
    syncToParent(updatedInstructions);
  };

  const handleFileSelectInDialog = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0], true);
    }
  };

  const handleRemoveImageInDialog = () => {
    setCurrentImageUrl("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('common:packingInstructions')}
        </CardTitle>
        <CardDescription>
          {t('common:packingInstructionsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions List */}
        {instructions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t('common:instructions')}</Label>
              <Badge variant="secondary">{instructions.length} {t('common:instruction')}{instructions.length !== 1 ? 's' : ''}</Badge>
            </div>
            
            {instructions.map((instruction, index) => (
              <div 
                key={index} 
                className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                data-testid={`instruction-${index}`}
              >
                <div className="flex items-start gap-4">
                  {/* Image Section */}
                  {instruction.image && (
                    <div className="shrink-0">
                      <img
                        src={instruction.image}
                        alt={`Instruction ${index + 1}`}
                        className="w-32 h-32 object-contain rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                        data-testid={`img-instruction-${index}`}
                      />
                    </div>
                  )}
                  
                  {/* Text Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="outline" className="shrink-0">Step {index + 1}</Badge>
                    </div>
                    {instruction.text ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {instruction.text}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                        {t('common:noTextProvided')}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      data-testid={`button-move-up-${index}`}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === instructions.length - 1}
                      data-testid={`button-move-down-${index}`}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditInstruction(index)}
                      data-testid={`button-edit-instruction-${index}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInstruction(index)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-remove-instruction-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Instruction Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleAddInstruction}
          data-testid="button-add-instruction"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('common:addPackingInstruction')}
        </Button>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('common:packingInstructionsWillBeDisplayed')}
          </AlertDescription>
        </Alert>
      </CardContent>

      {/* Instruction Dialog */}
      <Dialog open={isInstructionDialogOpen} onOpenChange={setIsInstructionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-instruction">
          <DialogHeader>
            <DialogTitle>
              {editingInstructionIndex !== null ? t('common:editPackingInstruction') : t('common:addPackingInstruction')}
            </DialogTitle>
            <DialogDescription>
              {t('common:addPackingInstructionDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <Label>{t('common:visualInstructionOptional')}</Label>
              
              {currentImageUrl ? (
                <div className="relative">
                  <img
                    src={currentImageUrl}
                    alt="Instruction preview"
                    className="w-full h-64 object-contain rounded-md border bg-slate-50 dark:bg-slate-900"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImageInDialog}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelectInDialog}
                    className="hidden"
                    id="instruction-image-upload"
                  />
                  
                  {uploadingInDialog ? (
                    <div className="space-y-4">
                      <Loader2 className="h-10 w-10 mx-auto text-gray-400 animate-spin" />
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Uploading image...</p>
                        <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {t('common:addVisualInstructionImage')}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        JPG, PNG, GIF, WebP (max 5MB)
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {t('common:uploadImage')}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Text Instruction Section */}
            <div className="space-y-2">
              <Label htmlFor="instruction-text">{t('common:writtenInstruction')}</Label>
              <Textarea
                id="instruction-text"
                placeholder={`${t('common:enterDetailedPackingInstructions')}\n\n${t('common:exampleInstructions')}`}
                value={currentTextValue}
                onChange={(e) => setCurrentTextValue(e.target.value)}
                rows={8}
                className="resize-none"
                data-testid="textarea-instruction-text"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsInstructionDialogOpen(false);
                setCurrentImageUrl("");
                setCurrentTextValue("");
                setEditingInstructionIndex(null);
              }}
              data-testid="button-cancel-instruction"
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveInstruction}
              data-testid="button-save-instruction"
            >
              {editingInstructionIndex !== null ? t('common:update') : t('common:add')} {t('common:instruction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
