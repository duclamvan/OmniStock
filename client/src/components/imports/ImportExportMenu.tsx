import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  Loader2,
  AlertTriangle,
  RotateCcw,
  FileUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ImportEntity = 'products' | 'customers' | 'warehouses' | 'suppliers' | 'discounts' | 'expenses';

export interface ImportExportMenuProps {
  entity: ImportEntity;
  entityLabel: string;
  onImportComplete?: () => void;
}

interface ValidationError {
  column: string;
  message: string;
}

interface PreviewRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: ValidationError[];
  isValid: boolean;
}

interface PreviewData {
  columns: string[];
  rows: PreviewRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

interface ImportResult {
  batchId: string;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

type WizardStep = 'upload' | 'preview' | 'importing' | 'results';

export function ImportExportMenu({ entity, entityLabel, onImportComplete }: ImportExportMenuProps) {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [editedRows, setEditedRows] = useState<Record<number, Record<string, any>>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = useCallback(() => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setEditedRows({});
    setImportProgress(0);
    setImportResult(null);
    setIsDragging(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    resetModal();
    setIsModalOpen(true);
  }, [resetModal]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    resetModal();
  }, [resetModal]);

  const downloadTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/imports/${entity}/template`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_import_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: `${entityLabel} import template has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the import template.",
        variant: "destructive",
      });
    }
  }, [entity, entityLabel, toast]);

  const exportData = useCallback(async () => {
    try {
      const response = await fetch(`/api/exports/${entity}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: `${entityLabel} data has been exported to Excel.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel.",
        variant: "destructive",
      });
    }
  }, [entity, entityLabel, toast]);

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/imports/${entity}/preview`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse file');
      }
      
      return response.json() as Promise<PreviewData>;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setStep('preview');
    },
    onError: (error: Error) => {
      toast({
        title: "File Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      const mergedRows = previewData?.rows.map(row => ({
        ...row,
        data: { ...row.data, ...editedRows[row.rowIndex] },
      }));
      
      const response = await apiRequest('POST', `/api/imports/${entity}/commit`, {
        rows: mergedRows,
      });
      
      return response.json() as Promise<ImportResult>;
    },
    onMutate: () => {
      setStep('importing');
      setImportProgress(0);
      const interval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
    },
    onSuccess: (data) => {
      setImportProgress(100);
      setImportResult(data);
      setStep('results');
      
      queryClient.invalidateQueries({ queryKey: [`/api/${entity}`] });
      onImportComplete?.();
    },
    onError: (error: Error) => {
      setStep('preview');
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await apiRequest('POST', `/api/imports/batches/${batchId}/revert`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Import Reverted",
        description: "All imported records have been removed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/${entity}`] });
      onImportComplete?.();
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast({
        title: "Revert Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateFile = useCallback((file: File): boolean => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return false;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  }, [toast]);

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      previewMutation.mutate(file);
    }
  }, [validateFile, previewMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleCellEdit = useCallback((rowIndex: number, column: string, value: any) => {
    setEditedRows(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [column]: value,
      },
    }));
  }, []);

  const getCellValue = useCallback((row: PreviewRow, column: string) => {
    return editedRows[row.rowIndex]?.[column] ?? row.data[column] ?? '';
  }, [editedRows]);

  const hasColumnError = useCallback((row: PreviewRow, column: string) => {
    return row.errors.some(e => e.column === column);
  }, []);

  const getColumnError = useCallback((row: PreviewRow, column: string) => {
    return row.errors.find(e => e.column === column)?.message;
  }, []);

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import Instructions
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Download the template to see the required format</li>
          <li>Fill in your data following the template structure</li>
          <li>Upload your completed Excel file (.xlsx or .xls)</li>
          <li>Review and edit data before confirming import</li>
        </ul>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="mt-2"
          data-testid="btn-download-template-modal"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
        data-testid="dropzone-file-upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
          data-testid="input-file-upload"
        />
        
        {previewMutation.isPending ? (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Processing file...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <FileUp className={cn(
              "h-10 w-10 mx-auto",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
            <div>
              <p className="font-medium">
                {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-sm text-muted-foreground">
                Excel files only (.xlsx, .xls) - Max 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!previewData) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              {selectedFile?.name}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {previewData.totalRows} rows
            </div>
          </div>
          <div className="flex items-center gap-2">
            {previewData.validRows > 0 && (
              <Badge variant="default" className="bg-green-600 gap-1">
                <Check className="h-3 w-3" />
                {previewData.validRows} valid
              </Badge>
            )}
            {previewData.invalidRows > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {previewData.invalidRows} with errors
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-16 text-center">Status</TableHead>
                {previewData.columns.map(column => (
                  <TableHead key={column} className="min-w-[120px]">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.rows.map(row => (
                <TableRow
                  key={row.rowIndex}
                  className={cn(!row.isValid && "bg-destructive/5")}
                >
                  <TableCell className="text-center font-mono text-xs">
                    {row.rowIndex}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mx-auto" />
                    )}
                  </TableCell>
                  {previewData.columns.map(column => (
                    <TableCell key={column} className="p-1">
                      <div className="relative">
                        <Input
                          value={getCellValue(row, column)}
                          onChange={e => handleCellEdit(row.rowIndex, column, e.target.value)}
                          className={cn(
                            "h-8 text-sm",
                            hasColumnError(row, column) && "border-destructive focus-visible:ring-destructive"
                          )}
                          title={getColumnError(row, column)}
                          data-testid={`input-cell-${row.rowIndex}-${column}`}
                        />
                        {hasColumnError(row, column) && (
                          <div className="absolute -top-1 -right-1">
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {previewData.invalidRows > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Some rows have validation errors
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Edit the highlighted cells to fix errors, or proceed to import only valid rows.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="py-12 space-y-6 text-center">
      <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
      <div className="space-y-2">
        <h4 className="font-medium text-lg">Importing {entityLabel}...</h4>
        <p className="text-sm text-muted-foreground">
          Please wait while we process your data
        </p>
      </div>
      <Progress value={importProgress} className="max-w-xs mx-auto" />
      <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
    </div>
  );

  const renderResultsStep = () => {
    if (!importResult) return null;

    const hasErrors = importResult.errorCount > 0;

    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          {hasErrors ? (
            <div className="space-y-3">
              <div className="h-16 w-16 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <h4 className="text-lg font-medium">Import Completed with Warnings</h4>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-medium">Import Successful!</h4>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{importResult.successCount}</div>
            <div className="text-sm text-green-700 dark:text-green-400">Records Imported</div>
          </div>
          <div className={cn(
            "border rounded-lg p-4 text-center",
            hasErrors
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
              : "bg-muted/50 border-muted"
          )}>
            <div className={cn(
              "text-3xl font-bold",
              hasErrors ? "text-red-600" : "text-muted-foreground"
            )}>
              {importResult.errorCount}
            </div>
            <div className={cn(
              "text-sm",
              hasErrors ? "text-red-700 dark:text-red-400" : "text-muted-foreground"
            )}>
              Failed Records
            </div>
          </div>
        </div>

        {hasErrors && importResult.errors.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Error Details</h5>
            <ScrollArea className="h-32 rounded-md border">
              <div className="p-3 space-y-1.5">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium">Row {error.row}:</span>{" "}
                      <span className="text-muted-foreground">{error.message}</span>
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {importResult.successCount > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div>
                  <p className="font-medium text-sm">Need to undo this import?</p>
                  <p className="text-sm text-muted-foreground">
                    You can revert all imported records if needed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revertMutation.mutate(importResult.batchId)}
                  disabled={revertMutation.isPending}
                  data-testid="btn-revert-import"
                >
                  {revertMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Revert Import
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getDialogTitle = () => {
    switch (step) {
      case 'upload':
        return `Import ${entityLabel}`;
      case 'preview':
        return 'Preview & Edit Data';
      case 'importing':
        return 'Importing Data';
      case 'results':
        return 'Import Results';
    }
  };

  const getDialogDescription = () => {
    switch (step) {
      case 'upload':
        return 'Upload an Excel file to import data';
      case 'preview':
        return 'Review your data before importing. Click cells to edit values.';
      case 'importing':
        return 'Your data is being imported...';
      case 'results':
        return 'Summary of your import operation';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            data-testid={`btn-import-export-menu-${entity}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleOpenModal}
            data-testid={`btn-import-${entity}`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import from Excel
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={exportData}
            data-testid={`btn-export-${entity}`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={downloadTemplate}
            data-testid={`btn-download-template-${entity}`}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {step === 'upload' && renderUploadStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'importing' && renderImportingStep()}
            {step === 'results' && renderResultsStep()}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {step === 'upload' && (
              <Button
                variant="outline"
                onClick={handleCloseModal}
                data-testid="btn-cancel-import"
              >
                Cancel
              </Button>
            )}

            {step === 'preview' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('upload');
                    setSelectedFile(null);
                    setPreviewData(null);
                    setEditedRows({});
                  }}
                  data-testid="btn-back-to-upload"
                >
                  <X className="h-4 w-4 mr-2" />
                  Choose Different File
                </Button>
                <Button
                  onClick={() => commitMutation.mutate()}
                  disabled={commitMutation.isPending || (previewData?.validRows ?? 0) === 0}
                  data-testid="btn-confirm-import"
                >
                  {commitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Import {previewData?.validRows ?? 0} Records
                </Button>
              </>
            )}

            {step === 'results' && (
              <Button
                onClick={handleCloseModal}
                data-testid="btn-close-import"
              >
                <Check className="h-4 w-4 mr-2" />
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
