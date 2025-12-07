import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Search, Map, Grid3x3, ArrowLeft, Plus } from "lucide-react";
import { BinGrid } from "@/components/warehouse/BinGrid";
import { BinDetailsPanel } from "@/components/warehouse/BinDetailsPanel";
import { LayoutGeneratorDialog } from "@/components/warehouse/LayoutGeneratorDialog";

export default function WarehouseMapNew() {
  const { t } = useTranslation(['warehouse', 'common']);
  const { id } = useParams();
  const [selectedBin, setSelectedBin] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLayoutGenerator, setShowLayoutGenerator] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>("all");

  const { data: warehouse, isLoading: warehouseLoading } = useQuery({
    queryKey: ['/api/warehouses', id],
    enabled: !!id
  });

  const { data: layout, isLoading: layoutLoading, refetch: refetchLayout } = useQuery({
    queryKey: ['/api/warehouses', id, 'layout'],
    enabled: !!id
  });

  const { data: bins, isLoading: binsLoading, refetch: refetchBins } = useQuery({
    queryKey: ['/api/warehouses', id, 'layout', 'bins'],
    enabled: !!layout && !!id
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/warehouses', id, 'layout', 'stats'],
    enabled: !!layout && !!id
  });

  // Extract unique zones from bin codes (A for shelves, B for pallets, etc.)
  const zones = bins ? Array.from(new Set(bins.map((bin: any) => bin.code.charAt(0)))).sort() : [];
  
  const filteredBins = bins?.filter((bin: any) => {
    const matchesSearch = bin.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = selectedZone === "all" || bin.code.charAt(0) === selectedZone;
    return matchesSearch && matchesZone;
  }) || [];

  const handleBinClick = (bin: any) => {
    setSelectedBin(bin);
  };

  const handleLayoutGenerated = () => {
    setShowLayoutGenerator(false);
    refetchLayout();
    refetchBins();
    toast({
      title: t('warehouse:layoutGenerated'),
      description: t('warehouse:layoutGeneratedSuccess'),
    });
  };

  if (warehouseLoading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('warehouse:warehouseNotFound')}</h2>
          <p className="text-muted-foreground dark:text-gray-400 mb-4">{t('warehouse:warehouseNotFoundDesc')}</p>
          <Link href="/warehouses">
            <Button data-testid="button-back-warehouses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('warehouse:backToWarehouses')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link href="/warehouses">
            <Button variant="ghost" size="icon" data-testid="button-back" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate" data-testid="text-warehouse-name">{warehouse.name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-400 truncate" data-testid="text-warehouse-location">{warehouse.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!layout && (
            <Button 
              onClick={() => setShowLayoutGenerator(true)} 
              data-testid="button-generate-layout"
              className="flex-1 sm:flex-initial"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:inline">{t('warehouse:generateLayout')}</span>
            </Button>
          )}
          {layout && (
            <Button 
              variant="outline" 
              onClick={() => setShowLayoutGenerator(true)}
              data-testid="button-regenerate-layout"
              className="flex-1 sm:flex-initial"
            >
              <Grid3x3 className="mr-2 h-4 w-4" />
              <span className="sm:inline">{t('warehouse:regenerateLayout')}</span>
            </Button>
          )}
        </div>
      </div>

      {layout && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card data-testid="card-total-bins">
              <CardHeader className="pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t('warehouse:totalBins')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold" data-testid="text-total-bins">
                  {statsLoading ? <Skeleton className="h-6 md:h-8 w-12 md:w-16" /> : stats?.totalBins || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-empty-bins">
              <CardHeader className="pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t('warehouse:emptyBins')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold text-green-600" data-testid="text-empty-bins">
                  {statsLoading ? <Skeleton className="h-6 md:h-8 w-12 md:w-16" /> : stats?.emptyBins || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-occupied-bins">
              <CardHeader className="pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t('warehouse:occupiedBins')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold text-blue-600" data-testid="text-occupied-bins">
                  {statsLoading ? <Skeleton className="h-6 md:h-8 w-12 md:w-16" /> : stats?.occupiedBins || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-utilization">
              <CardHeader className="pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{t('warehouse:utilization')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold text-orange-600" data-testid="text-utilization">
                  {statsLoading ? <Skeleton className="h-6 md:h-8 w-16 md:w-20" /> : `${stats?.utilizationRate || 0}%`}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('warehouse:searchBins')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-bins"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 text-xs">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500 mr-1 md:mr-2" />
                  {t('warehouse:empty')}
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 text-xs">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-500 mr-1 md:mr-2" />
                  {t('warehouse:partial')}
                </Badge>
                <Badge variant="outline" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 text-xs">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 mr-1 md:mr-2" />
                  {t('warehouse:full')}
                </Badge>
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 text-xs">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-500 mr-1 md:mr-2" />
                  {t('common:inactive')}
                </Badge>
              </div>
            </div>
            
            {/* Zone/Section Filter */}
            {zones.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{t('warehouse:storageZone')}:</span>
                <Button
                  variant={selectedZone === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedZone("all")}
                  data-testid="button-zone-all"
                  className="shrink-0"
                >
                  {t('common:all')} ({bins?.length || 0})
                </Button>
                {zones.map(zone => {
                  const zoneCount = bins?.filter(b => b.code.charAt(0) === zone).length || 0;
                  const zoneName = zone === 'A' ? t('warehouse:shelves') : zone === 'B' ? t('warehouse:pallets') : zone === 'C' ? t('warehouse:bulk') : `${t('warehouse:zone')} ${zone}`;
                  return (
                    <Button
                      key={zone}
                      variant={selectedZone === zone ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedZone(zone)}
                      data-testid={`button-zone-${zone}`}
                      className="shrink-0"
                    >
                      {zoneName} {zone} ({zoneCount})
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <Card data-testid="card-bin-grid">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Map className="h-4 w-4 md:h-5 md:w-5" />
                {t('warehouse:warehouseMap')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {binsLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <BinGrid 
                  bins={filteredBins} 
                  onBinClick={handleBinClick}
                  selectedBin={selectedBin}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!layout && !layoutLoading && (
        <Card data-testid="card-no-layout">
          <CardContent className="py-12">
            <div className="text-center">
              <Grid3x3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t('warehouse:noLayoutGenerated')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('warehouse:noLayoutGeneratedDesc')}
              </p>
              <Button 
                onClick={() => setShowLayoutGenerator(true)}
                data-testid="button-generate-layout-empty"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('warehouse:generateLayout')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selectedBin} onOpenChange={() => setSelectedBin(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('warehouse:binDetails')}</SheetTitle>
          </SheetHeader>
          {selectedBin && (
            <BinDetailsPanel 
              bin={selectedBin} 
              onClose={() => setSelectedBin(null)}
              onUpdate={() => refetchBins()}
            />
          )}
        </SheetContent>
      </Sheet>

      <LayoutGeneratorDialog
        open={showLayoutGenerator}
        onOpenChange={setShowLayoutGenerator}
        warehouseId={id!}
        onSuccess={handleLayoutGenerated}
      />
    </div>
  );
}
