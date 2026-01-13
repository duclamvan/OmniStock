import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currencyUtils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Search, 
  DollarSign,
  ChevronLeft,
  FileSpreadsheet,
  Trash2,
  Loader2,
  ArrowRight,
  ExternalLink
} from "lucide-react";

interface ParsedRow {
  date: string;
  amount: number;
  currency: string;
  payee: string;
  note: string;
  rawData: Record<string, string>;
}

interface MatchedPayment {
  payment: ParsedRow;
  orderId: string;
  orderDbId: string;
  customerName: string;
  orderTotal: number;
  orderCreatedAt: string;
  matchType: 'exact' | 'fuzzy';
  difference: number;
}

interface NeedsReviewPayment {
  payment: ParsedRow;
  candidates: Array<{
    orderId: string;
    orderDbId: string;
    customerName: string;
    orderTotal: number;
    orderDate: string;
    daysDiff: number;
  }>;
}

interface UnmatchedPayment {
  payment: ParsedRow;
  reason: string;
}

interface ImportResults {
  matched: MatchedPayment[];
  needsReview: NeedsReviewPayment[];
  unmatched: UnmatchedPayment[];
}

export default function BankImport() {
  usePageTitle('orders:bankImport', 'Bank Import');
  const { toast } = useToast();
  const { t } = useTranslation(['orders', 'common']);
  const { formatDate } = useLocalization();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [headerRow, setHeaderRow] = useState<string[]>([]);
  
  const [fuzzyMatchingEnabled, setFuzzyMatchingEnabled] = useState(true);
  const [amountTolerance, setAmountTolerance] = useState(2.0);
  
  const [results, setResults] = useState<ImportResults | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [reviewSelections, setReviewSelections] = useState<Record<string, string>>({});
  
  const [activeTab, setActiveTab] = useState("matched");

  const parseCSV = useCallback((content: string): { headers: string[]; rows: string[][] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);
    
    return { headers, rows };
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { headers, rows } = parseCSV(content);
      
      setHeaderRow(headers);
      setPreviewRows(rows.slice(0, 5));
      
      const parsed: ParsedRow[] = rows.map(row => {
        const rawData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawData[header] = row[index] || '';
        });
        
        const dateCol = headers.find(h => 
          h.toLowerCase().includes('date') || 
          h.toLowerCase().includes('datum')
        );
        const amountCol = headers.find(h => 
          h.toLowerCase().includes('amount') || 
          h.toLowerCase().includes('částka') ||
          h.toLowerCase().includes('castka')
        );
        const currencyCol = headers.find(h => 
          h.toLowerCase().includes('currency') || 
          h.toLowerCase().includes('měna') ||
          h.toLowerCase().includes('mena')
        );
        const payeeCol = headers.find(h => 
          h.toLowerCase().includes('payee') || 
          h.toLowerCase().includes('příjemce') ||
          h.toLowerCase().includes('prijemce') ||
          h.toLowerCase().includes('name') ||
          h.toLowerCase().includes('jméno')
        );
        const noteCol = headers.find(h => 
          h.toLowerCase().includes('note') || 
          h.toLowerCase().includes('poznámka') ||
          h.toLowerCase().includes('poznamka') ||
          h.toLowerCase().includes('message') ||
          h.toLowerCase().includes('zpráva')
        );
        
        return {
          date: dateCol ? rawData[dateCol] : '',
          amount: amountCol ? parseFloat(rawData[amountCol]?.replace(/[^\d.-]/g, '') || '0') : 0,
          currency: currencyCol ? rawData[currencyCol] : 'CZK',
          payee: payeeCol ? rawData[payeeCol] : '',
          note: noteCol ? rawData[noteCol] : '',
          rawData,
        };
      });
      
      setParsedRows(parsed);
    };
    reader.readAsText(selectedFile);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.type === 'text/csv')) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileChange({ target: fileInputRef.current } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setPreviewRows([]);
    setHeaderRow([]);
    setResults(null);
    setSelectedMatches(new Set());
    setReviewSelections({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/orders/bank-import', {
        rows: parsedRows,
        enableFuzzyMatching: fuzzyMatchingEnabled,
        amountTolerance,
      });
      return response.json();
    },
    onSuccess: (data: ImportResults) => {
      setResults(data);
      const allMatchIds = data.matched.map(m => `${m.payment.date}-${m.payment.amount}`);
      setSelectedMatches(new Set(allMatchIds));
      
      if (data.matched.length > 0) {
        setActiveTab("matched");
      } else if (data.needsReview.length > 0) {
        setActiveTab("review");
      } else {
        setActiveTab("unmatched");
      }
      
      toast({
        title: t('orders:bankImportComplete'),
        description: t('orders:bankImportResults', {
          matched: data.matched.length,
          review: data.needsReview.length,
          unmatched: data.unmatched.length,
        }),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message,
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (confirmData: { matches: Array<{ orderDbId: string; paymentInfo: ParsedRow }> }) => {
      const response = await apiRequest('POST', '/api/orders/bank-import/confirm', confirmData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: t('orders:paymentsConfirmed'),
        description: t('orders:paymentsConfirmedDesc', { count: data.confirmed }),
      });
      
      clearFile();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message,
      });
    },
  });

  const handleConfirmSelected = useCallback(() => {
    if (!results) return;
    
    const matchesToConfirm = results.matched
      .filter(m => selectedMatches.has(`${m.payment.date}-${m.payment.amount}`))
      .map(m => ({
        orderDbId: m.orderDbId,
        paymentInfo: m.payment,
      }));
    
    if (matchesToConfirm.length === 0) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('orders:noMatchesSelected'),
      });
      return;
    }
    
    confirmMutation.mutate({ matches: matchesToConfirm });
  }, [results, selectedMatches, confirmMutation, toast, t]);

  const handleConfirmReviewItem = useCallback((paymentKey: string, orderDbId: string) => {
    if (!results) return;
    
    const reviewItem = results.needsReview.find(
      r => `${r.payment.date}-${r.payment.amount}` === paymentKey
    );
    
    if (!reviewItem) return;
    
    confirmMutation.mutate({
      matches: [{
        orderDbId,
        paymentInfo: reviewItem.payment,
      }],
    });
  }, [results, confirmMutation]);

  const toggleMatchSelection = useCallback((key: string) => {
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  const selectAllMatches = useCallback(() => {
    if (!results) return;
    const allKeys = results.matched.map(m => `${m.payment.date}-${m.payment.amount}`);
    setSelectedMatches(new Set(allKeys));
  }, [results]);

  const deselectAllMatches = useCallback(() => {
    setSelectedMatches(new Set());
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <Link href="/orders?filter=payLater" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('orders:payLaterOrders')}
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('orders:bankImport')}</h1>
        <p className="text-muted-foreground mt-1">{t('orders:bankImportDescription')}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('orders:uploadCSV')}
            </CardTitle>
            <CardDescription>{t('orders:uploadCSVDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-1">{t('orders:dragDropCSV')}</p>
                <p className="text-sm text-muted-foreground">{t('orders:orClickToUpload')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedRows.length} {t('orders:rowsParsed')}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {previewRows.length > 0 && (
                  <div className="overflow-x-auto">
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('orders:preview')}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headerRow.slice(0, 6).map((header, idx) => (
                            <TableHead key={idx} className="whitespace-nowrap">{header}</TableHead>
                          ))}
                          {headerRow.length > 6 && <TableHead>...</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {row.slice(0, 6).map((cell, cellIdx) => (
                              <TableCell key={cellIdx} className="whitespace-nowrap max-w-[150px] truncate">
                                {cell}
                              </TableCell>
                            ))}
                            {row.length > 6 && <TableCell>...</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('orders:matchingSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="fuzzy-matching" className="text-lg font-medium">
                  {t('orders:enableFuzzyMatching')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('orders:fuzzyMatchingDescription')}
                </p>
              </div>
              <Switch
                id="fuzzy-matching"
                checked={fuzzyMatchingEnabled}
                onCheckedChange={setFuzzyMatchingEnabled}
              />
            </div>

            {fuzzyMatchingEnabled && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="amount-tolerance" className="text-lg font-medium">
                    {t('orders:amountTolerance')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('orders:amountToleranceDescription')}
                  </p>
                </div>
                <Input
                  id="amount-tolerance"
                  type="number"
                  step="0.5"
                  min="0"
                  value={amountTolerance}
                  onChange={(e) => setAmountTolerance(parseFloat(e.target.value) || 0)}
                  className="w-full sm:w-24"
                />
              </div>
            )}

            <Button
              onClick={() => importMutation.mutate()}
              disabled={parsedRows.length === 0 || importMutation.isPending}
              className="w-full sm:w-auto"
              size="lg"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('orders:matching')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t('orders:importAndMatch')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>{t('orders:matchingResults')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="matched" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('orders:autoMatched')}</span>
                    <Badge variant="default" className="bg-green-500 dark:bg-green-600">
                      {results.matched.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="review" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('orders:needsReview')}</span>
                    <Badge variant="default" className="bg-yellow-500 dark:bg-yellow-600">
                      {results.needsReview.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="unmatched" className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('orders:unmatched')}</span>
                    <Badge variant="destructive">
                      {results.unmatched.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="matched" className="space-y-4">
                  {results.matched.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t('orders:noAutoMatches')}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={selectAllMatches}>
                            {t('common:selectAll')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={deselectAllMatches}>
                            {t('common:deselectAll')}
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {selectedMatches.size} {t('common:selected')}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10"></TableHead>
                              <TableHead>{t('orders:paymentDate')}</TableHead>
                              <TableHead>{t('orders:amount')}</TableHead>
                              <TableHead className="hidden md:table-cell">{t('orders:payee')}</TableHead>
                              <TableHead className="hidden lg:table-cell">{t('orders:note')}</TableHead>
                              <TableHead className="w-8"></TableHead>
                              <TableHead>{t('orders:orderNumber')}</TableHead>
                              <TableHead>{t('orders:customer')}</TableHead>
                              <TableHead>{t('common:created')}</TableHead>
                              <TableHead>{t('orders:orderTotal')}</TableHead>
                              <TableHead>{t('orders:matchType')}</TableHead>
                              <TableHead>{t('orders:matchDifference')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.matched.map((match, idx) => {
                              const key = `${match.payment.date}-${match.payment.amount}`;
                              return (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedMatches.has(key)}
                                      onCheckedChange={() => toggleMatchSelection(key)}
                                    />
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">{match.payment.date}</TableCell>
                                  <TableCell className="whitespace-nowrap font-medium">
                                    {formatCurrency(match.payment.amount, match.payment.currency)}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                                    {match.payment.payee}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell max-w-[150px] truncate">
                                    {match.payment.note}
                                  </TableCell>
                                  <TableCell>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  </TableCell>
                                  <TableCell>
                                    <Link href={`/orders/${match.orderDbId}`} className="text-primary hover:underline font-mono">
                                      {match.orderId}
                                    </Link>
                                  </TableCell>
                                  <TableCell>{match.customerName}</TableCell>
                                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                                    {match.orderCreatedAt ? new Date(match.orderCreatedAt).toLocaleDateString() : '-'}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {formatCurrency(match.orderTotal, match.payment.currency)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={match.matchType === 'exact' ? 'default' : 'secondary'}>
                                      {match.matchType === 'exact' ? t('orders:exact') : t('orders:fuzzy')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={cn(
                                    "whitespace-nowrap font-medium",
                                    match.difference === 0 ? "text-green-600 dark:text-green-400" :
                                    Math.abs(match.difference) <= amountTolerance ? "text-yellow-600 dark:text-yellow-400" :
                                    "text-red-600 dark:text-red-400"
                                  )}>
                                    {match.difference === 0 ? '—' : 
                                      (match.difference > 0 ? '+' : '') + formatCurrency(match.difference, match.payment.currency)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={handleConfirmSelected}
                          disabled={selectedMatches.size === 0 || confirmMutation.isPending}
                          size="lg"
                        >
                          {confirmMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t('orders:confirming')}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('orders:confirmSelected')} ({selectedMatches.size})
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="review" className="space-y-4">
                  {results.needsReview.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t('orders:noReviewItems')}
                    </p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {results.needsReview.map((item, idx) => {
                        const paymentKey = `${item.payment.date}-${item.payment.amount}`;
                        return (
                          <Card key={idx} className="bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                {t('orders:payment')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">{t('orders:date')}:</span>
                                  <span className="ml-2 font-medium">{item.payment.date}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t('orders:amount')}:</span>
                                  <span className="ml-2 font-bold">
                                    {formatCurrency(item.payment.amount, item.payment.currency)}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">{t('orders:payee')}:</span>
                                  <span className="ml-2">{item.payment.payee}</span>
                                </div>
                                {item.payment.note && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">{t('orders:note')}:</span>
                                    <span className="ml-2 text-xs">{item.payment.note}</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label className="text-lg">{t('orders:selectOrder')}</Label>
                                <Select
                                  value={reviewSelections[paymentKey] || ''}
                                  onValueChange={(value) => setReviewSelections(prev => ({
                                    ...prev,
                                    [paymentKey]: value,
                                  }))}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('orders:selectAnOrder')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {item.candidates.map((candidate) => (
                                      <SelectItem key={candidate.orderDbId} value={candidate.orderDbId}>
                                        <div className="flex flex-col">
                                          <span className="font-mono font-medium">{candidate.orderId}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {candidate.customerName} • {formatCurrency(candidate.orderTotal, item.payment.currency)} • {candidate.daysDiff}d
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <Button
                                onClick={() => handleConfirmReviewItem(paymentKey, reviewSelections[paymentKey])}
                                disabled={!reviewSelections[paymentKey] || confirmMutation.isPending}
                                className="w-full"
                                size="lg"
                              >
                                {confirmMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                {t('orders:confirmPairing')}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="unmatched" className="space-y-4">
                  {results.unmatched.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t('orders:allPaymentsMatched')}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('orders:paymentDate')}</TableHead>
                            <TableHead>{t('orders:amount')}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('orders:payee')}</TableHead>
                            <TableHead className="hidden lg:table-cell">{t('orders:note')}</TableHead>
                            <TableHead>{t('orders:reason')}</TableHead>
                            <TableHead className="w-24"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.unmatched.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="whitespace-nowrap">{item.payment.date}</TableCell>
                              <TableCell className="whitespace-nowrap font-medium">
                                {formatCurrency(item.payment.amount, item.payment.currency)}
                              </TableCell>
                              <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                                {item.payment.payee}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell max-w-[150px] truncate">
                                {item.payment.note}
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400">
                                {item.reason}
                              </TableCell>
                              <TableCell>
                                <Link href={`/orders?search=${encodeURIComponent(item.payment.payee || item.payment.amount.toString())}`}>
                                  <Button variant="ghost" size="sm">
                                    <Search className="h-4 w-4 mr-1" />
                                    {t('orders:findOrder')}
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
