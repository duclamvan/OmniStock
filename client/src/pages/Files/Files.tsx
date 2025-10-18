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

const FILE_TYPES = [
  { value: "MSDS", label: "MSDS (Material Safety Data Sheet)" },
  { value: "CPNP", label: "CPNP Certificate" },
  { value: "Leaflet", label: "Product Leaflet" },
  { value: "Manual", label: "User Manual" },
  { value: "Certificate", label: "Other Certificate" },
  { value: "Other", label: "Other Document" },
];

export default function Files() {
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
      if (!response.ok) throw new Error("Failed to fetch files");
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
        title: "Success",
        description: "File record created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create file record",
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
        title: "Success",
        description: "File updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update file",
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
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
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
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Files Management</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Add File
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingFile ? "Edit File" : "Add New File"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="fileName">File Name</Label>
                    <Input
                      id="fileName"
                      name="fileName"
                      defaultValue={editingFile?.fileName}
                      required
                      placeholder="e.g., Product Safety Sheet"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fileType">File Type</Label>
                    <Select 
                      name="fileType" 
                      defaultValue={editingFile?.fileType || "Other"}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select file type" />
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
                    <Label htmlFor="productId">Product (Optional)</Label>
                    <Select name="productId" defaultValue={editingFile?.productId || "NONE"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No Product</SelectItem>
                        {products.map((product: any) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fileUrl">File URL</Label>
                    <Input
                      id="fileUrl"
                      name="fileUrl"
                      type="url"
                      defaultValue={editingFile?.fileUrl}
                      required
                      placeholder="https://example.com/file.pdf"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingFile?.description}
                      placeholder="Brief description of the file"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      name="tags"
                      defaultValue={editingFile?.tags?.join(", ")}
                      placeholder="safety, certification, 2024"
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
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingFile ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {FILE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Files Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No files found. Add your first file to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                              if (confirm("Are you sure you want to delete this file?")) {
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}