import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Loader2, Search, Store, Package, Clock, CreditCard, Banknote, Check } from "lucide-react";

interface PPLPickupPoint {
  code: string;
  name: string;
  street?: string;
  city?: string;
  zipCode?: string;
  address?: string;
  type?: string;
  lat?: number;
  lng?: number;
  openingHours?: Record<string, string>;
  services?: string[];
  accessPointType?: string;
}

interface PPLAccessPoint {
  accessPointCode: string;
  accessPointType: string;
  name: string;
  name2?: string;
  street: string;
  city: string;
  country: string;
  zipCode: string;
  phone?: string;
  email?: string;
  tribalServicePoint?: boolean;
  activeCardPayment?: boolean;
  activeCashPayment?: boolean;
  pickupEnabled?: boolean;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  workHours?: Array<{
    weekDay: number;
    dayPart: number;
    openFrom: string;
    openTo: string;
  }>;
}

interface PPLSmartPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPickupPoint: (pickupPoint: PPLPickupPoint) => void;
  customerAddress?: string;
  customerCity?: string;
  customerZipCode?: string;
  language?: "cs" | "en";
}

export function PPLSmartPopup({
  open,
  onOpenChange,
  onSelectPickupPoint,
  customerCity,
  customerZipCode,
}: PPLSmartPopupProps) {
  const { t } = useTranslation(["orders", "common"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPoint, setSelectedPoint] = useState<PPLAccessPoint | null>(null);

  useEffect(() => {
    if (open) {
      setSearchQuery(customerCity || customerZipCode || "");
      setSelectedPoint(null);
    }
  }, [open, customerCity, customerZipCode]);

  const { data: accessPoints, isLoading, error } = useQuery<PPLAccessPoint[]>({
    queryKey: ["/api/shipping/ppl/access-points"],
    enabled: open,
    staleTime: 1000 * 60 * 30,
  });

  const filteredPoints = useMemo(() => {
    if (!accessPoints) return [];
    
    let filtered = accessPoints;
    
    if (selectedType !== "all") {
      filtered = filtered.filter(p => p.accessPointType === selectedType);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.city?.toLowerCase().includes(query) ||
        p.street?.toLowerCase().includes(query) ||
        p.zipCode?.includes(query) ||
        p.accessPointCode?.toLowerCase().includes(query)
      );
    }
    
    return filtered.slice(0, 100);
  }, [accessPoints, selectedType, searchQuery]);

  const handleSelectPoint = (point: PPLAccessPoint) => {
    setSelectedPoint(point);
  };

  const handleConfirmSelection = () => {
    if (selectedPoint) {
      const pickupPoint: PPLPickupPoint = {
        code: selectedPoint.accessPointCode,
        name: selectedPoint.name,
        street: selectedPoint.street,
        city: selectedPoint.city,
        zipCode: selectedPoint.zipCode,
        address: `${selectedPoint.street}, ${selectedPoint.city} ${selectedPoint.zipCode}`,
        type: selectedPoint.accessPointType,
        lat: selectedPoint.gps?.latitude,
        lng: selectedPoint.gps?.longitude,
        accessPointType: selectedPoint.accessPointType,
      };
      onSelectPickupPoint(pickupPoint);
      onOpenChange(false);
    }
  };

  const formatWorkHours = (workHours?: PPLAccessPoint["workHours"]) => {
    if (!workHours || workHours.length === 0) return null;
    
    const dayNames = ["", "Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
    const grouped: Record<number, string[]> = {};
    
    workHours.forEach(wh => {
      if (!grouped[wh.weekDay]) grouped[wh.weekDay] = [];
      grouped[wh.weekDay].push(`${wh.openFrom?.slice(0, 5)}-${wh.openTo?.slice(0, 5)}`);
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, hours]) => `${dayNames[Number(day)]}: ${hours.join(", ")}`)
      .join(" | ");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ParcelShop":
        return <Store className="h-4 w-4" />;
      case "ParcelBox":
      case "AlzaBox":
        return <Package className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "ParcelShop":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ParcelBox":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "AlzaBox":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] max-h-[800px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <DialogTitle className="text-lg">
              {t("orders:selectPickupPoint", "Select Pickup Point")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("orders:pplPickupDescription", "Choose a PPL ParcelShop or ParcelBox near your location")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("orders:searchPickupPoints", "Search by city, street, or ZIP code...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-pickup-points"
              />
            </div>
            <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="all" className="text-xs" data-testid="tab-all-points">
                  {t("common:all", "All")}
                </TabsTrigger>
                <TabsTrigger value="ParcelShop" className="text-xs" data-testid="tab-parcelshop">
                  <Store className="h-3 w-3 mr-1" />
                  Shop
                </TabsTrigger>
                <TabsTrigger value="ParcelBox" className="text-xs" data-testid="tab-parcelbox">
                  <Package className="h-3 w-3 mr-1" />
                  Box
                </TabsTrigger>
                <TabsTrigger value="AlzaBox" className="text-xs" data-testid="tab-alzabox">
                  Alza
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  {t("orders:loadingPickupPoints", "Loading pickup points...")}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>{t("orders:errorLoadingPickupPoints", "Failed to load pickup points")}</p>
                <p className="text-sm mt-1">{t("common:pleaseTryAgain", "Please try again later")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {filteredPoints.length > 0 ? (
                  <>
                    {t("orders:showingPickupPoints", "Showing {{count}} pickup points", { count: filteredPoints.length })}
                    {filteredPoints.length === 100 && ` (${t("common:limitedResults", "limited to first 100")})`}
                  </>
                ) : (
                  t("orders:noPickupPointsFound", "No pickup points found")
                )}
              </div>
              
              <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-2 pb-4">
                  {filteredPoints.map((point) => (
                    <div
                      key={point.accessPointCode}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPoint?.accessPointCode === point.accessPointCode
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                          : "hover:border-gray-400 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleSelectPoint(point)}
                      data-testid={`pickup-point-${point.accessPointCode}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{point.name}</span>
                            <Badge className={`text-xs ${getTypeBadgeColor(point.accessPointType)}`}>
                              {getTypeIcon(point.accessPointType)}
                              <span className="ml-1">{point.accessPointType}</span>
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {point.street}, {point.city} {point.zipCode}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            {point.activeCardPayment && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {t("orders:cardPayment", "Card")}
                              </span>
                            )}
                            {point.activeCashPayment && (
                              <span className="flex items-center gap-1">
                                <Banknote className="h-3 w-3" />
                                {t("orders:cashPayment", "Cash")}
                              </span>
                            )}
                            {point.workHours && point.workHours.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="truncate max-w-[200px]" title={formatWorkHours(point.workHours) || ""}>
                                  {formatWorkHours(point.workHours)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedPoint?.accessPointCode === point.accessPointCode && (
                          <div className="flex-shrink-0">
                            <Check className="h-5 w-5 text-orange-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="border-t p-4 flex justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-pickup"
          >
            {t("common:cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedPoint}
            className="bg-orange-500 hover:bg-orange-600"
            data-testid="button-confirm-pickup"
          >
            {t("orders:confirmSelection", "Confirm Selection")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PPLSmartPopup;
