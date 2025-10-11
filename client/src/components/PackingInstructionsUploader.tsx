import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Edit
} from "lucide-react";

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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [images, setImages] = useState<string[]>(packingInstructionsImages);
  const [texts, setTexts] = useState<string[]>(packingInstructionsTexts);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [editingTextIndex, setEditingTextIndex] = useState<number | null>(null);
  const [currentTextValue, setCurrentTextValue] = useState("");

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
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, GIF, or WebP image",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
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
      
      const updatedImages = [...images, data.imageUrl];
      setImages(updatedImages);
      onImagesChange(updatedImages);

      toast({
        title: "Upload successful",
        description: "Packing instruction image uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages);
    
    toast({
      title: "Image removed",
      description: "Packing instruction image has been removed",
    });
  };

  const handleAddText = () => {
    setEditingTextIndex(null);
    setCurrentTextValue("");
    setIsTextDialogOpen(true);
  };

  const handleEditText = (index: number) => {
    setEditingTextIndex(index);
    setCurrentTextValue(texts[index]);
    setIsTextDialogOpen(true);
  };

  const handleSaveText = () => {
    if (!currentTextValue.trim()) {
      toast({
        title: "Empty instruction",
        description: "Please enter some text for the instruction",
        variant: "destructive"
      });
      return;
    }

    let updatedTexts: string[];
    
    if (editingTextIndex !== null) {
      updatedTexts = texts.map((text, i) => 
        i === editingTextIndex ? currentTextValue : text
      );
      toast({
        title: "Instruction updated",
        description: "Packing instruction has been updated",
      });
    } else {
      updatedTexts = [...texts, currentTextValue];
      toast({
        title: "Instruction added",
        description: "New packing instruction has been added",
      });
    }

    setTexts(updatedTexts);
    onTextsChange(updatedTexts);
    setIsTextDialogOpen(false);
    setCurrentTextValue("");
    setEditingTextIndex(null);
  };

  const handleRemoveText = (index: number) => {
    const updatedTexts = texts.filter((_, i) => i !== index);
    setTexts(updatedTexts);
    onTextsChange(updatedTexts);
    
    toast({
      title: "Instruction removed",
      description: "Packing instruction has been removed",
    });
  };

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Packing Instructions
        </CardTitle>
        <CardDescription>
          Add visual or written instructions to help packers handle this product correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Instructions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Visual Instructions</Label>
            <Badge variant="secondary">{images.length} image{images.length !== 1 ? 's' : ''}</Badge>
          </div>
          
          {/* Images Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <img
                      src={imageUrl}
                      alt={`Packing instruction ${index + 1}`}
                      className="w-full h-40 object-cover rounded-md"
                      data-testid={`img-packing-preview-${index}`}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="packing-instructions-dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="packing-image-upload"
              data-testid="input-packing-image"
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="h-10 w-10 mx-auto text-gray-400 animate-spin" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Uploading image...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Drag and drop an image here, or click to browse
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  JPG, PNG, GIF, WebP (max 5MB)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-packing-image"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Written Instructions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Written Instructions</Label>
            <Badge variant="secondary">{texts.length} instruction{texts.length !== 1 ? 's' : ''}</Badge>
          </div>

          {/* Text Instructions List */}
          {texts.length > 0 && (
            <div className="space-y-2">
              {texts.map((text, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  data-testid={`text-instruction-${index}`}
                >
                  <FileText className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {truncateText(text)}
                  </p>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditText(index)}
                      data-testid={`button-edit-text-${index}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveText(index)}
                      data-testid={`button-remove-text-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            onClick={handleAddText}
            data-testid="button-add-instruction"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Instruction
          </Button>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Packing instructions will be prominently displayed in the Pick & Pack workflow to ensure proper handling of this product.
          </AlertDescription>
        </Alert>
      </CardContent>

      {/* Text Dialog */}
      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent data-testid="dialog-text-instruction">
          <DialogHeader>
            <DialogTitle>
              {editingTextIndex !== null ? 'Edit Instruction' : 'Add Instruction'}
            </DialogTitle>
            <DialogDescription>
              Provide clear instructions for handling, wrapping, or special care requirements
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="instruction-text">Instruction Text</Label>
            <Textarea
              id="instruction-text"
              placeholder="Enter detailed packing instructions...&#10;&#10;Example:&#10;• Wrap in bubble wrap before placing in box&#10;• Mark as FRAGILE&#10;• Include protective padding on all sides"
              value={currentTextValue}
              onChange={(e) => setCurrentTextValue(e.target.value)}
              rows={8}
              className="resize-none"
              data-testid="textarea-instruction-text"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTextDialogOpen(false);
                setCurrentTextValue("");
                setEditingTextIndex(null);
              }}
              data-testid="button-cancel-text"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveText}
              data-testid="button-save-text"
            >
              {editingTextIndex !== null ? 'Update' : 'Add'} Instruction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
