import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Download, Trash2, Edit, FileIcon, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from 'react-i18next';

export default function Files() {
  const { t } = useTranslation(['system', 'common']);
  
  const FILE_TYPES = [
    { value: "MSDS", label: t('system:msds') },
    { value: "CPNP", label: t('system:cpnp') },
    { value: "Leaflet", label: t('system:leaflet') },
    { value: "Manual", label: t('system:manual') },
    { value: "Certificate", label: t('system:certificate') },
    { value: "Other", label: t('system:otherDocument') },
  ];
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Fetch all files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["/api/product-files", filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("fileType", filterType);
      const response = await fetch(`/api/product-files?${params}`);
      if (!response.ok) throw new Error(t('system:failedToFetchFiles'));
      return response.json();
    },
  });

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Create file mutation
  const createFileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/product-files", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-files"] });
      setIsAddDialogOpen(false);
      toast({
        title: t('common:success'),
        description: t('common:createSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:createFailed'),
        variant: "destructive",
      });
    },
  });

  // Update file mutation
  const updateFileMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => 
      apiRequest("PUT", `/api/product-files/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-files"] });
      setEditingFile(null);
      toast({
        title: t('common:success'),
        description: t('common:updateSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:updateFailed'),
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/product-files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-files"] });
      toast({
        title: t('common:success'),
        description: t('common:deleteSuccess', { count: 1, item: t('system:file').toLowerCase() }),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:deleteFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productId = formData.get("productId");
    const data = {
      productId: productId === "NONE" || !productId ? null : productId,
      fileName: formData.get("fileName"),
      fileType: formData.get("fileType"),
      fileUrl: formData.get("fileUrl"),
      description: formData.get("description"),
      uploadedBy: "Current User", // This would come from auth context
      tags: formData.get("tags")?.toString().split(",").map(t => t.trim()).filter(Boolean),
    };

    if (editingFile) {
      updateFileMutation.mutate({ id: editingFile.id, ...data });
    } else {
      createFileMutation.mutate(data);
    }
  };

  const filteredFiles = files.filter((file: any) => {
    const matchesSearch = 
      file.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.product_files?.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "MSDS":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "CPNP":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "Leaflet":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "Manual":
        return <FileText className="h-4 w-4 text-purple-500" />;
      case "Certificate":
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <CardTitle className="text-xl sm:text-2xl font-bold">{t('system:fileManagement')}</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('system:uploadNewFile')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFile ? t('common:edit') + ' ' + t('system:file') : t('common:add') + ' ' + t('system:file')}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fileName">{t('system:fileName')}</Label>
                    <Input
                      id="fileName"
                      name="fileName"
                      defaultValue={editingFile?.fileName}
                      required
                      placeholder={t('system:fileNamePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fileType">{t('system:fileType')}</Label>
                    <Select 
                      name="fileType" 
                      defaultValue={editingFile?.fileType || "Other"}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('common:select') + ' ' + t('system:fileType').toLowerCase()} />
                      </SelectTrigger>
                      <SelectContent>
                        {FILE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="productId">{t('orders:product')} ({t('common:optional')})</Label>
                    <Select name="productId" defaultValue={editingFile?.productId || "NONE"}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common:select') + ' ' + t('orders:product').toLowerCase()} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{t('common:none')}</SelectItem>
                        {products.map((product: any) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fileUrl">{t('common:url')}</Label>
                    <Input
                      id="fileUrl"
                      name="fileUrl"
                      type="url"
                      defaultValue={editingFile?.fileUrl}
                      required
                      placeholder={t('system:fileUrlPlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">{t('common:description')}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingFile?.description}
                      placeholder={t('common:description')}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">{t('common:tags')}</Label>
                    <Input
                      id="tags"
                      name="tags"
                      defaultValue={editingFile?.tags?.join(", ")}
                      placeholder={t('system:tagsPlaceholder')}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setEditingFile(null);
                      }}
                    >
                      {t('common:cancel')}
                    </Button>
                    <Button type="submit">
                      {editingFile ? t('common:update') : t('common:create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('common:search') + ' ' + t('system:files').toLowerCase() + '...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 sm:h-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 sm:h-9">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('common:filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:allTypes')}</SelectItem>
                {FILE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Files Table/Cards */}
          {isLoading ? (
            <div className="text-center py-8 text-sm sm:text-base">{t('common:loading')}</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
              {t('system:noFilesYet')}. {t('system:uploadNewFile')}.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {filteredFiles.map((file: any) => (
                  <Card key={file.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getFileIcon(file.fileType)}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate">{file.fileName}</h3>
                            <p className="text-xs text-gray-500">{file.fileType}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(file.fileUrl, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingFile(file);
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (confirm(t('common:deleteConfirmation', { item: file.fileName }))) {
                                deleteFileMutation.mutate(file.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {file.products && (
                        <div className="text-xs">
                          <span className="text-gray-500">{t('orders:product')}: </span>
                          <span className="font-medium">{file.products.name}</span>
                        </div>
                      )}
                      {file.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{file.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
                        </span>
                        {file.tags?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {file.tags.map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common:type')}</TableHead>
                      <TableHead>{t('system:fileName')}</TableHead>
                      <TableHead>{t('orders:product')}</TableHead>
                      <TableHead>{t('common:description')}</TableHead>
                      <TableHead>{t('common:createdAt')}</TableHead>
                      <TableHead>{t('common:na')}</TableHead>
                      <TableHead className="text-right">{t('common:actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file: any) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.fileType)}
                            <span className="text-sm font-medium">
                              {file.fileType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {file.fileName}
                        </TableCell>
                        <TableCell>
                          {file.products ? (
                            <span className="text-sm">
                              {file.products.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {file.description || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(file.uploadedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {file.tags?.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {file.tags.map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.fileUrl, "_blank")}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingFile(file);
                                setIsAddDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(t('common:deleteConfirmation', { item: file.fileName }))) {
                                  deleteFileMutation.mutate(file.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}