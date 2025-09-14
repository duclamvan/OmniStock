import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Image, 
  Trash2, 
  Package, 
  FileText,
  Info,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface PackingInstructionsUploaderProps {
  packingInstructionsText?: string;
  packingInstructionsImage?: string;
  onTextChange: (text: string) => void;
  onImageChange: (imageUrl: string | null) => void;
  productId?: string;
}

export default function PackingInstructionsUploader({
  packingInstructionsText = "",
  packingInstructionsImage = "",
  onTextChange,
  onImageChange,
  productId
}: PackingInstructionsUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(packingInstructionsImage || "");
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; format: string } | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts[parts.length - 1].toLowerCase();
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
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Upload image
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
      
      // Set file info
      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        format: getFileExtension(file.name).toUpperCase()
      });

      // Update preview and notify parent
      setPreviewUrl(data.imageUrl);
      onImageChange(data.imageUrl);

      toast({
        title: "Upload successful",
        description: "Packing instructions image uploaded successfully",
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

  const handleRemoveImage = () => {
    setPreviewUrl("");
    setFileInfo(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast({
      title: "Image removed",
      description: "Packing instructions image has been removed",
    });
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
        {/* Image Upload Section */}
        <div className="space-y-4">
          <Label>Visual Instructions (Image/GIF)</Label>
          
          {!previewUrl ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
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
                  <Loader2 className="h-12 w-12 mx-auto text-gray-400 animate-spin" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Uploading image...</p>
                    <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop an image here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Supported formats: JPG, PNG, GIF, WebP (max 5MB)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-packing-image"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-gray-50 rounded-lg p-4">
                <img
                  src={previewUrl}
                  alt="Packing instructions"
                  className="w-full max-w-md mx-auto rounded-md"
                  data-testid="img-packing-preview"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                  data-testid="button-remove-packing-image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {fileInfo && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Image className="h-4 w-4" />
                  <span>{fileInfo.name}</span>
                  <Badge variant="secondary">{fileInfo.format}</Badge>
                  <Badge variant="outline">{fileInfo.size}</Badge>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-replace-packing-image"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveImage}
                  data-testid="button-delete-packing-image"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Text Instructions Section */}
        <div className="space-y-2">
          <Label htmlFor="packing-text">Written Instructions</Label>
          <Textarea
            id="packing-text"
            placeholder="Enter detailed packing instructions here...&#10;&#10;Example:&#10;• Wrap in bubble wrap before placing in box&#10;• Mark as FRAGILE&#10;• Include protective padding on all sides&#10;• Do not stack heavy items on top"
            value={packingInstructionsText}
            onChange={(e) => onTextChange(e.target.value)}
            rows={6}
            className="resize-none"
            data-testid="textarea-packing-instructions"
          />
          <p className="text-xs text-gray-500">
            Provide clear instructions for handling, wrapping, or special care requirements
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Packing instructions will be prominently displayed in the Pick & Pack workflow to ensure proper handling of this product.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}