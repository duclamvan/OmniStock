import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, MapPin, Package, Layers } from "lucide-react";
import { useDefaultWarehouseSelection } from "@/hooks/useDefaultWarehouseSelection";
import {
  generateShelfLocationCode,
  generatePalletLocationCode,
  validateLocationCode,
  parseShelfLocationCode,
  parsePalletLocationCode,
  getLocationTypeIcon,
  getLocationTypeTextColor,
  getLocationTypeLabel,
  getAreaOptions,
  getAisleOptions,
  getRackOptions,
  getLevelOptions,
  getBinOptions,
  getPalletOptions,
  getPalletAisleOptions,
  LocationType,
  AreaType,
} from "@/lib/warehouseHelpers";

interface WarehouseLocationSelectorProps {
  value?: string;
  onChange: (code: string) => void;
  locationType?: LocationType;
  onLocationTypeChange?: (type: LocationType) => void;
  showTypeSelector?: boolean;
  className?: string;
  disabled?: boolean;
}

const WarehouseLocationSelector = memo(function WarehouseLocationSelector({
  value = "",
  onChange,
  locationType = "warehouse",
  onLocationTypeChange,
  showTypeSelector = true,
  className = "",
  disabled = false,
}: WarehouseLocationSelectorProps) {
  const { t } = useTranslation(['warehouse', 'common']);
  
  // Fetch warehouses from database
  const { data: warehousesData = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    retry: false,
  });

  // FIX 3: Use orchestrator hook for ALL state management (areaType + manualEntry now in hook!)
  const {
    value: warehouse,
    setValue: setWarehouse,
    hasManualOverride,
    locationType: areaType,
    setLocationType: setAreaType,
    manualEntry,
    setManualEntry: setManualEntryFromHook,
    locationDefaults,
  } = useDefaultWarehouseSelection({
    initialValue: value ? value.split('-')[0] : undefined,
    onChange: (newWarehouse) => {
      // This onChange is called when the warehouse changes in the hook
      // The location code will be updated by the useEffect below
    },
  });
  
  // Location component states (these remain in component - they're not part of default warehouse logic)
  const [aisle, setAisle] = useState("A01");
  const [rack, setRack] = useState("R01");
  const [level, setLevel] = useState("L01");
  const [bin, setBin] = useState("B1");
  const [palletAisle, setPalletAisle] = useState("B01");
  const [palletRack, setPalletRack] = useState("R01");
  const [palletLevel, setPalletLevel] = useState("L01");
  const [pallet, setPallet] = useState("PAL1");
  const [manualCode, setManualCode] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [isOldFormat, setIsOldFormat] = useState(false);
  const [oldFormatCode, setOldFormatCode] = useState("");

  // Parse initial value if provided
  useEffect(() => {
    if (value && validateLocationCode(value)) {
      // Try new shelf format first
      const shelfParts = parseShelfLocationCode(value);
      if (shelfParts) {
        setAreaType("shelves");
        setWarehouse(shelfParts.warehouse, false); // false = not manual, don't mark as override
        setAisle(shelfParts.aisle);
        setRack(shelfParts.rack);
        setLevel(shelfParts.level);
        setBin(shelfParts.bin || "B1");
        setManualCode(value);
        setIsOldFormat(false);
        setOldFormatCode("");
        return;
      }
      
      // Try new pallet format (5-field: WH1-B01-R01-L01-PAL1)
      const palletParts = parsePalletLocationCode(value);
      if (palletParts) {
        setAreaType("pallet");
        setWarehouse(palletParts.warehouse, false); // false = not manual, don't mark as override
        setPalletAisle(palletParts.aisle);
        setPalletRack(palletParts.rack);
        setPalletLevel(palletParts.level);
        setPallet(palletParts.pallet);
        setManualCode(value);
        setIsOldFormat(false);
        setOldFormatCode("");
        return;
      }
      
      // Try old format for backward compatibility (WH1-A01-R02-L03)
      const oldPattern = /^(WH\d+)-([A-Z]\d{2})-(R\d{2})-(L\d{2})$/;
      const oldMatch = value.match(oldPattern);
      if (oldMatch) {
        setAreaType("shelves");
        setWarehouse(oldMatch[1], false); // false = not manual, don't mark as override
        setAisle(oldMatch[2]);
        setRack(oldMatch[3]);
        setLevel(oldMatch[4]);
        setBin("B1");
        setManualCode(value);
        setIsOldFormat(true);
        setOldFormatCode(value);
        return;
      }
    }
  }, [value, setWarehouse, setAreaType]);

  // Update location code when components change
  useEffect(() => {
    if (!manualEntry) {
      // If this was an old format code, preserve it
      if (isOldFormat && oldFormatCode) {
        onChange(oldFormatCode);
        setManualCode(oldFormatCode);
        setIsValid(true);
        return;
      }
      
      let code = "";
      if (areaType === "shelves") {
        code = generateShelfLocationCode(warehouse, aisle, rack, level, bin);
      } else if (areaType === "pallet") {
        code = generatePalletLocationCode(warehouse, palletAisle, palletRack, palletLevel, pallet);
      }
      onChange(code);
      setManualCode(code);
      setIsValid(true);
    }
  }, [warehouse, areaType, aisle, rack, level, bin, palletAisle, palletRack, palletLevel, pallet, manualEntry, onChange, isOldFormat, oldFormatCode]);

  const handleManualCodeChange = (newCode: string) => {
    setManualCode(newCode);
    const valid = validateLocationCode(newCode);
    setIsValid(valid);
    
    if (valid) {
      // Try new shelf format
      const shelfParts = parseShelfLocationCode(newCode);
      if (shelfParts) {
        setAreaType("shelves");
        setWarehouse(shelfParts.warehouse, true); // true = mark as manual
        setAisle(shelfParts.aisle);
        setRack(shelfParts.rack);
        setLevel(shelfParts.level);
        setBin(shelfParts.bin || "B1");
        setIsOldFormat(false);
        setOldFormatCode("");
        onChange(newCode);
        return;
      }
      
      // Try new pallet format (5-field)
      const palletParts = parsePalletLocationCode(newCode);
      if (palletParts) {
        setAreaType("pallet");
        setWarehouse(palletParts.warehouse, true); // true = mark as manual
        setPalletAisle(palletParts.aisle);
        setPalletRack(palletParts.rack);
        setPalletLevel(palletParts.level);
        setPallet(palletParts.pallet);
        setIsOldFormat(false);
        setOldFormatCode("");
        onChange(newCode);
        return;
      }
      
      // Try old format (WH1-A01-R02-L03)
      const oldPattern = /^(WH\d+)-([A-Z]\d{2})-(R\d{2})-(L\d{2})$/;
      const oldMatch = newCode.match(oldPattern);
      if (oldMatch) {
        setAreaType("shelves");
        setWarehouse(oldMatch[1], true); // true = mark as manual
        setAisle(oldMatch[2]);
        setRack(oldMatch[3]);
        setLevel(oldMatch[4]);
        setBin("B1");
        setIsOldFormat(true);
        setOldFormatCode(newCode);
        onChange(newCode);
        return;
      }
    }
  };

  // Memoized handlers to prevent unnecessary re-renders and freezing
  const handleAreaTypeChange = useCallback((value: string) => {
    setAreaType(value as 'pallet' | 'office' | 'shelves');
  }, [setAreaType]);

  const handleToggleManualEntry = useCallback(() => {
    setManualEntryFromHook(!manualEntry);
  }, [manualEntry, setManualEntryFromHook]);

  const handleWarehouseChange = useCallback((value: string) => {
    setWarehouse(value, true); // true = mark as manual selection
  }, [setWarehouse]);

  const handleAisleChange = useCallback((value: string) => {
    setAisle(value);
  }, []);

  const handleRackChange = useCallback((value: string) => {
    setRack(value);
  }, []);

  const handleLevelChange = useCallback((value: string) => {
    setLevel(value);
    // For ground level (pallet) or top storage, set bin to B1 as default (won't be shown)
    if (value === 'L00' || value === 'L99') {
      setBin('B1');
    }
  }, []);

  const handleBinChange = useCallback((value: string) => {
    setBin(value);
  }, []);

  const handlePalletAisleChange = useCallback((value: string) => {
    setPalletAisle(value);
  }, []);

  const handlePalletRackChange = useCallback((value: string) => {
    setPalletRack(value);
  }, []);

  const handlePalletLevelChange = useCallback((value: string) => {
    setPalletLevel(value);
  }, []);

  const handlePalletChange = useCallback((value: string) => {
    setPallet(value);
  }, []);

  // Helper to extract short code from warehouse ID (pattern: WH-{code}-{random})
  const extractWarehouseCode = useCallback((warehouseId: string): string => {
    const match = warehouseId.match(/^WH-([A-Za-z0-9]+)-/);
    return match ? match[1] : warehouseId;
  }, []);

  // Generate warehouse options from fetched data
  const warehouseOptions = useMemo(() => {
    if (!warehousesData || warehousesData.length === 0) {
      return [{ value: 'WH1', label: t('warehouse:warehouseNumber', { number: 1 }) }];
    }
    
    // Sort by createdAt ascending (oldest first)
    const sortedWarehouses = [...warehousesData].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });
    
    // Extract short code from warehouse ID (e.g., "WH-WH1-ABC123" -> "WH1")
    return sortedWarehouses.map((warehouse, index) => {
      const shortCode = extractWarehouseCode(warehouse.id);
      return {
        value: shortCode,
        label: `${warehouse.name || t('warehouse:warehouseNumber', { number: index + 1 })} (${shortCode})`
      };
    });
  }, [warehousesData, t, extractWarehouseCode]);

  const aisleOptions = useMemo(() => getAisleOptions(), []);
  const rackOptions = useMemo(() => getRackOptions(), []);
  const levelOptions = useMemo(() => getLevelOptions(), []);
  const binOptions = useMemo(() => getBinOptions(), []);
  const palletAisleOptions = useMemo(() => getPalletAisleOptions(), []);
  const palletOptions = useMemo(() => getPalletOptions(), []);

  const LocationTypeIcon = getLocationTypeIcon(locationType);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Location Type Selector */}
      {showTypeSelector && onLocationTypeChange && (
        <div className="space-y-1">
          <Label htmlFor="location-type" className="text-xs">{t('warehouse:locationType')}</Label>
          <Select
            value={locationType}
            onValueChange={(value) => onLocationTypeChange(value as LocationType)}
            disabled={disabled}
          >
            <SelectTrigger
              id="location-type"
              data-testid="select-location-type"
              className="w-full h-8"
            >
              <SelectValue placeholder={t('warehouse:selectLocationType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="display" data-testid="option-display">{t('warehouse:displayArea')}</SelectItem>
              <SelectItem value="warehouse" data-testid="option-warehouse">{t('warehouse:warehouse')}</SelectItem>
              <SelectItem value="pallet" data-testid="option-pallet">{t('warehouse:palletStorage')}</SelectItem>
              <SelectItem value="other" data-testid="option-other">{t('warehouse:otherLocation')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Area Type Selector (Shelves/Pallets) */}
      <div className="space-y-1">
        <Label htmlFor="area-type" className="text-xs">{t('warehouse:storageType')}</Label>
        <Select
          value={areaType}
          onValueChange={handleAreaTypeChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="area-type"
            data-testid="select-area-type"
            className="w-full h-8"
          >
            <SelectValue placeholder={t('warehouse:selectStorageType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shelves" data-testid="option-shelves">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>{t('warehouse:shelves')}</span>
              </div>
            </SelectItem>
            <SelectItem value="pallet" data-testid="option-pallet">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>{t('warehouse:pallets')}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location Code Builder */}
      <Card className="p-3">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LocationTypeIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <Label className="text-sm font-medium">{t('warehouse:locationCode')}</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleManualEntry}
              disabled={disabled}
              data-testid="button-toggle-manual"
              className="h-7 text-xs"
            >
              {manualEntry ? t('warehouse:builder') : t('warehouse:manual')}
            </Button>
          </div>

          {manualEntry ? (
            <div className="space-y-1.5">
              <Label htmlFor="manual-code" className="text-xs">{t('warehouse:enterLocationCode')}</Label>
              <Input
                id="manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => handleManualCodeChange(e.target.value.toUpperCase())}
                placeholder={areaType === "pallet" ? "WH1-B01-R01-L01-PAL1" : "WH1-A06-R04-L04-B2"}
                disabled={disabled}
                data-testid="input-manual-code"
                className={`h-8 ${!isValid && manualCode ? "border-red-500" : ""}`}
              />
              <div className="flex items-center gap-1.5 text-xs">
                {manualCode && (
                  isValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">{t('warehouse:validFormat')}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">
                        {t('warehouse:invalidFormat')} {areaType === "pallet" ? "WH1-B01-R01-L01-PAL1" : "WH1-A06-R04-L04-B2"}
                      </span>
                    </>
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              {areaType === "shelves" ? (
                <div className={`grid gap-2 ${level === 'L00' || level === 'L99' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {/* Warehouse Selector */}
                  <div>
                    <Label htmlFor="warehouse" className="text-xs">{t('warehouse:warehouse')}</Label>
                    <Select
                      value={warehouse}
                      onValueChange={handleWarehouseChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="warehouse"
                        data-testid="select-warehouse"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectWarehouse')} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Aisle Selector */}
                  <div>
                    <Label htmlFor="aisle" className="text-xs">{t('warehouse:aisle')}</Label>
                    <Select
                      value={aisle}
                      onValueChange={handleAisleChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="aisle"
                        data-testid="select-aisle"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectAislePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {aisleOptions.slice(0, 30).map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row Selector */}
                  <div>
                    <Label htmlFor="rack" className="text-xs">{t('warehouse:row')}</Label>
                    <Select
                      value={rack}
                      onValueChange={handleRackChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="rack"
                        data-testid="select-rack"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectRowPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {rackOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Level Selector */}
                  <div>
                    <Label htmlFor="level" className="text-xs">{t('warehouse:level')}</Label>
                    <Select
                      value={level}
                      onValueChange={handleLevelChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="level"
                        data-testid="select-level"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectLevelPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {levelOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bin Selector - Only show for regular shelving levels (not ground pallet L00 or top storage L99) */}
                  {level !== 'L00' && level !== 'L99' && (
                    <div>
                      <Label htmlFor="bin" className="text-xs">{t('warehouse:bin')}</Label>
                      <Select
                        value={bin}
                        onValueChange={handleBinChange}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          id="bin"
                          data-testid="select-bin"
                          className="h-9"
                        >
                          <SelectValue placeholder={t('warehouse:selectBinPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {binOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              data-testid={`option-${opt.value}`}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {/* Warehouse Selector */}
                  <div>
                    <Label htmlFor="warehouse" className="text-xs">{t('warehouse:warehouse')}</Label>
                    <Select
                      value={warehouse}
                      onValueChange={handleWarehouseChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="warehouse"
                        data-testid="select-warehouse"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectWarehouse')} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Aisle Selector for Pallets (B01-B99) */}
                  <div>
                    <Label htmlFor="pallet-aisle" className="text-xs">{t('warehouse:aisle')}</Label>
                    <Select
                      value={palletAisle}
                      onValueChange={handlePalletAisleChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="pallet-aisle"
                        data-testid="select-pallet-aisle"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectAislePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {palletAisleOptions.slice(0, 30).map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row Selector */}
                  <div>
                    <Label htmlFor="pallet-rack" className="text-xs">{t('warehouse:row')}</Label>
                    <Select
                      value={palletRack}
                      onValueChange={handlePalletRackChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="pallet-rack"
                        data-testid="select-pallet-rack"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectRowPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {rackOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Level Selector */}
                  <div>
                    <Label htmlFor="pallet-level" className="text-xs">{t('warehouse:level')}</Label>
                    <Select
                      value={palletLevel}
                      onValueChange={handlePalletLevelChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="pallet-level"
                        data-testid="select-pallet-level"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectLevelPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {levelOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pallet Selector (PAL1-PAL99) */}
                  <div>
                    <Label htmlFor="pallet" className="text-xs">{t('warehouse:pallet')}</Label>
                    <Select
                      value={pallet}
                      onValueChange={handlePalletChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="pallet"
                        data-testid="select-pallet"
                        className="h-9"
                      >
                        <SelectValue placeholder={t('warehouse:selectPalletPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {palletOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Location Code Preview */}
          <div className="border rounded-md p-2 bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-base font-mono font-semibold" data-testid="text-location-code">
                    {manualCode || (isOldFormat && oldFormatCode) || (areaType === "pallet"
                      ? generatePalletLocationCode(warehouse, palletAisle, palletRack, palletLevel, pallet)
                      : generateShelfLocationCode(warehouse, aisle, rack, level, bin))}
                  </code>
                  <Badge
                    variant="outline"
                    className={`h-5 text-xs ${getLocationTypeTextColor(locationType)}`}
                    data-testid="badge-location-type"
                  >
                    {getLocationTypeLabel(locationType)}
                  </Badge>
                </div>
              </div>
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default WarehouseLocationSelector;
