import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/currencyUtils';
import {
  FileText,
  Shield,
  FileImage,
  Award,
  Book,
  File,
  Upload,
  Download,
  Trash2,
  Plus,
  X,
  Edit,
} from 'lucide-react';

interface ProductFile {
  id: string;
  productId: string;
  fileType: string;
  fileName: string;
  fileUrl: string;
  description: string | null;
  language: string | null;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
}

interface ProductFilesProps {
  productId: string;
}

const FILE_TYPES = [
  { value: 'sds', label: 'Safety Data Sheet (SDS)', icon: Shield },
  { value: 'cpnp', label: 'CPNP Certificate', icon: Award },
  { value: 'flyer', label: 'Product Flyer', icon: FileImage },
  { value: 'certificate', label: 'Certificate', icon: Award },
  { value: 'manual', label: 'User Manual', icon: Book },
  { value: 'other', label: 'Other', icon: File },
];

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'cs', label: 'Czech', flag: '🇨🇿' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { value: 'pl', label: 'Polish', flag: '🇵🇱' },
  { value: 'ro', label: 'Romanian', flag: '🇷🇴' },
  { value: 'hu', label: 'Hungarian', flag: '🇭🇺' },
  { value: 'el', label: 'Greek', flag: '🇬🇷' },
  { value: 'bg', label: 'Bulgarian', flag: '🇧🇬' },
  { value: 'hr', label: 'Croatian', flag: '🇭🇷' },
  { value: 'sk', label: 'Slovak', flag: '🇸🇰' },
  { value: 'sl', label: 'Slovenian', flag: '🇸🇮' },
  { value: 'da', label: 'Danish', flag: '🇩🇰' },
  { value: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { value: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { value: 'no', label: 'Norwegian', flag: '🇳🇴' },
  { value: 'et', label: 'Estonian', flag: '🇪🇪' },
  { value: 'lv', label: 'Latvian', flag: '🇱🇻' },
  { value: 'lt', label: 'Lithuanian', flag: '🇱🇹' },
  { value: 'mt', label: 'Maltese', flag: '🇲🇹' },
  { value: 'ga', label: 'Irish', flag: '🇮🇪' },
  { value: 'uk', label: 'Ukrainian', flag: '🇺🇦' },
  { value: 'sr', label: 'Serbian', flag: '🇷🇸' },
  { value: 'bs', label: 'Bosnian', flag: '🇧🇦' },
  { value: 'mk', label: 'Macedonian', flag: '🇲🇰' },
  { value: 'sq', label: 'Albanian', flag: '🇦🇱' },
  { value: 'is', label: 'Icelandic', flag: '🇮🇸' },
  { value: 'be', label: 'Belarusian', flag: '🇧🇾' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { value: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
];

function getFileTypeIcon(fileType: string) {
  const type = FILE_TYPES.find(t => t.value === fileType);
  return type ? type.icon : FileText;
}

function getFileTypeLabel(fileType: string) {
  const type = FILE_TYPES.find(t => t.value === fileType);
  return type ? type.label : fileType;
}

function getLanguageDisplay(language: string) {
  const lang = LANGUAGES.find(l => l.value === language);
  return lang ? `${lang.flag} ${lang.label}` : language;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function decodeFileName(fileName: string): string {
  try {
    // Try to decode URI component to fix encoding issues
    return decodeURIComponent(fileName);
  } catch {
    // If decoding fails, return original filename
    return fileName;
  }
}

export default function ProductFiles({ productId }: ProductFilesProps) {
  const { t } = useTranslation(['common']);
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<ProductFile | null>(null);
  const [uploadData, setUploadData] = useState({
    fileType: 'other',
    description: '',
    language: '',
    file: null as File | null,
  });
  const [isDragging, setIsDragging] = useState(false);

  // Fetch product files
  const { data: files = [], isLoading } = useQuery<ProductFile[]>({
    queryKey: ['/api/products', productId, 'files'],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/files`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch product files');
      return response.json();
    },
    enabled: !!productId,
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadData.file) throw new Error('No file selected');
      
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('fileType', uploadData.fileType);
      formData.append('description', uploadData.description || uploadData.file.name);
      if (uploadData.language) {
        formData.append('language', uploadData.language);
      }
      
      const response = await fetch(`/api/products/${productId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload file' }));
        throw new Error(errorData.message || 'Failed to upload file');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'files'] });
      toast({
        title: t('common:success'),
        description: t('common:uploadSuccess'),
      });
      setIsUploadOpen(false);
      setUploadData({
        fileType: 'other',
        description: '',
        language: '',
        file: null,
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update file mutation
  const updateMutation = useMutation({
    mutationFn: async ({ fileId, data }: { fileId: string; data: { fileType: string; description: string; language?: string } }) => {
      await apiRequest('PATCH', `/api/product-files/${fileId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'files'] });
      toast({
        title: t('common:success'),
        description: t('common:updateSuccess'),
      });
      setEditingFile(null);
      setIsUploadOpen(false);
      setUploadData({
        fileType: 'other',
        description: '',
        language: '',
        file: null,
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest('DELETE', `/api/product-files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'files'] });
      toast({
        title: t('common:success'),
        description: t('common:deleteSuccess', { item: 'file', count: 1 }),
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Group files by type
  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.fileType]) {
      acc[file.fileType] = [];
    }
    acc[file.fileType].push(file);
    return acc;
  }, {} as Record<string, ProductFile[]>);

  const handleDownload = (file: ProductFile) => {
    window.open(`/api/product-files/${file.id}/download`, '_blank');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      setUploadData(prev => ({ ...prev, file }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadData(prev => ({ ...prev, file: files[0] }));
    }
  };

  const handleEdit = (file: ProductFile) => {
    setEditingFile(file);
    setUploadData({
      fileType: file.fileType,
      description: file.description || file.fileName,
      language: file.language || '',
      file: null,
    });
    setIsUploadOpen(true);
  };

  const handleSave = () => {
    if (editingFile) {
      console.log('Updating file:', editingFile.id);
      console.log('Update data:', {
        fileType: uploadData.fileType,
        description: uploadData.description,
        language: uploadData.language,
      });
      // Update existing file
      updateMutation.mutate({
        fileId: editingFile.id,
        data: {
          fileType: uploadData.fileType,
          description: uploadData.description,
          language: uploadData.language,
        },
      });
    } else {
      // Upload new file
      uploadMutation.mutate();
    }
  };

  const handleCloseDialog = () => {
    setIsUploadOpen(false);
    setEditingFile(null);
    setUploadData({
      fileType: 'other',
      description: '',
      language: '',
      file: null,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('common:productDocuments')}</CardTitle>
          <CardDescription>{t('common:manageDocumentation')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div>
            <CardTitle>
              {t('common:productDocuments')}
              {files.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {files.length} {files.length === 1 ? t('common:file') : t('common:files')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t('common:manageDocumentation')}</CardDescription>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="w-full sm:w-auto" data-testid="button-upload-document">
                <Plus className="h-4 w-4 mr-2" />
                {t('common:upload')} {t('common:document')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingFile ? `${t('common:edit')} ${t('common:document')}` : `${t('common:upload')} ${t('common:document')}`}</DialogTitle>
                <DialogDescription>
                  {editingFile ? t('common:updateDocumentMetadata') : t('common:addNewDocument')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fileType">{t('common:documentType')}</Label>
                  <Select
                    value={uploadData.fileType}
                    onValueChange={(value) => setUploadData(prev => ({ ...prev, fileType: value }))}
                  >
                    <SelectTrigger data-testid="select-file-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center">
                              <Icon className="h-4 w-4 mr-2" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('common:description')} ({t('common:optional')})</Label>
                  <Input
                    id="description"
                    data-testid="input-description"
                    value={uploadData.description}
                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('common:enterDescription')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t('common:language')} ({t('common:optional')})</Label>
                  <Select
                    value={uploadData.language}
                    onValueChange={(value) => setUploadData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger data-testid="select-language">
                      <SelectValue placeholder={t('common:selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!editingFile && (
                  <div className="space-y-2">
                    <Label>{t('common:file')}</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {uploadData.file ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="text-sm">{uploadData.file.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {formatFileSize(uploadData.file.size)}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadData(prev => ({ ...prev, file: null }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {t('common:dragDropFile')}
                        </p>
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                          data-testid="input-file"
                        />
                        <label htmlFor="file-upload">
                          <Button variant="secondary" size="sm" asChild>
                            <span>{t('common:chooseFile')}</span>
                          </Button>
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('common:fileTypesAllowed')}
                        </p>
                      </>
                      )}
                    </div>
                  </div>
                )}
                
                {editingFile && (
                  <div className="space-y-2">
                    <Label>{t('common:currentFile')}</Label>
                    <div className="flex items-center p-3 bg-muted rounded-lg">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="text-sm flex-1">{editingFile.fileName}</span>
                      <Badge variant="secondary">
                        {formatFileSize(editingFile.fileSize)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('common:fileCannotBeChanged')}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={uploadMutation.isPending || updateMutation.isPending}
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={((!uploadData.file && !editingFile) || uploadMutation.isPending || updateMutation.isPending)}
                  data-testid="button-upload"
                >
                  {uploadMutation.isPending || updateMutation.isPending 
                    ? (editingFile ? t('common:updating') : t('common:uploading')) 
                    : (editingFile ? t('common:update') : t('common:upload'))}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('common:noDocumentsUploaded')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('common:uploadDocumentsForOrders')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFiles).map(([fileType, typeFiles]) => {
              const Icon = getFileTypeIcon(fileType);
              return (
                <div key={fileType} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{getFileTypeLabel(fileType)}</h3>
                    <Badge variant="outline">{typeFiles.length}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common:name')}</TableHead>
                        <TableHead>{t('common:language')}</TableHead>
                        <TableHead>{t('common:size')}</TableHead>
                        <TableHead>{t('common:uploaded')}</TableHead>
                        <TableHead className="text-right">{t('common:actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell data-testid={`text-file-name-${file.id}`}>
                            <div>
                              <div className="font-medium">{decodeFileName(file.description || file.fileName)}</div>
                              {file.description && file.description !== file.fileName && (
                                <div className="text-xs text-muted-foreground">{decodeFileName(file.fileName)}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {file.language ? (
                              <div className="text-sm">
                                {getLanguageDisplay(file.language)}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {formatFileSize(file.fileSize)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(file.uploadedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(file)}
                                data-testid={`button-edit-${file.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(file)}
                                data-testid={`button-download-${file.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`button-delete-${file.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('common:deleteItem', { item: t('common:document') })}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('common:deleteConfirmation', { item: file.description || file.fileName })}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(file.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {t('common:delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}