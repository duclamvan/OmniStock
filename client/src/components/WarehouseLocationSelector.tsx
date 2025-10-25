import { useState, useEffect, useMemo, memo, useCallback } from "react";
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
import {
  generateShelfLocationCode,
  generatePalletLocationCode,
  validateLocationCode,
  parseShelfLocationCode,
  parsePalletLocationCode,
  getLocationTypeIcon,
  getLocationTypeTextColor,
  getLocationTypeLabel,
  getWarehouseOptions,
  getAreaOptions,
  getAisleOptions,
  getRackOptions,
  getLevelOptions,
  getBinOptions,
  getZoneOptions,
  getPositionOptions,
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
  const [warehouse, setWarehouse] = useState("WH1");
  const [areaType, setAreaType] = useState<AreaType>("shelves");
  const [aisle, setAisle] = useState("A01");
  const [rack, setRack] = useState("R01");
  const [level, setLevel] = useState("L01");
  const [bin, setBin] = useState("B1");
  const [zone, setZone] = useState("B01");
  const [position, setPosition] = useState("P01");
  const [manualEntry, setManualEntry] = useState(false);
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
        setWarehouse(shelfParts.warehouse);
        setAisle(shelfParts.aisle);
        setRack(shelfParts.rack);
        setLevel(shelfParts.level);
        setBin(shelfParts.bin || "B1");
        setManualCode(value);
        setIsOldFormat(false);
        setOldFormatCode("");
        return;
      }
      
      // Try new pallet/office format
      const palletParts = parsePalletLocationCode(value);
      if (palletParts) {
        // Determine if it's office (C prefix) or pallets (B prefix)
        const isOffice = palletParts.zone.startsWith('C');
        setAreaType(isOffice ? "office" : "pallets");
        setWarehouse(palletParts.warehouse);
        setZone(palletParts.zone);
        setPosition(palletParts.position);
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
        setWarehouse(oldMatch[1]);
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
  }, [value]);

  // Update zone when areaType changes (pallets=B, office=C)
  useEffect(() => {
    if (areaType === 'pallets' && !zone.startsWith('B')) {
      setZone('B01');
    } else if (areaType === 'office' && !zone.startsWith('C')) {
      setZone('C01');
    }
  }, [areaType, zone]);

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
      } else if (areaType === "pallets" || areaType === "office") {
        code = generatePalletLocationCode(warehouse, zone, position);
      }
      onChange(code);
      setManualCode(code);
      setIsValid(true);
    }
  }, [warehouse, areaType, aisle, rack, level, bin, zone, position, manualEntry, onChange, isOldFormat, oldFormatCode]);

  const handleManualCodeChange = (newCode: string) => {
    setManualCode(newCode);
    const valid = validateLocationCode(newCode);
    setIsValid(valid);
    
    if (valid) {
      // Try new shelf format
      const shelfParts = parseShelfLocationCode(newCode);
      if (shelfParts) {
        setAreaType("shelves");
        setWarehouse(shelfParts.warehouse);
        setAisle(shelfParts.aisle);
        setRack(shelfParts.rack);
        setLevel(shelfParts.level);
        setBin(shelfParts.bin || "B1");
        setIsOldFormat(false);
        setOldFormatCode("");
        onChange(newCode);
        return;
      }
      
      // Try new pallet/office format
      const palletParts = parsePalletLocationCode(newCode);
      if (palletParts) {
        // Determine if it's office (C prefix) or pallets (B prefix)
        const isOffice = palletParts.zone.startsWith('C');
        setAreaType(isOffice ? "office" : "pallets");
        setWarehouse(palletParts.warehouse);
        setZone(palletParts.zone);
        setPosition(palletParts.position);
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
        setWarehouse(oldMatch[1]);
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
    setAreaType(value as AreaType);
  }, []);

  const handleToggleManualEntry = useCallback(() => {
    setManualEntry(prev => !prev);
  }, []);

  const handleWarehouseChange = useCallback((value: string) => {
    setWarehouse(value);
  }, []);

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

  const handleZoneChange = useCallback((value: string) => {
    setZone(value);
  }, []);

  const handlePositionChange = useCallback((value: string) => {
    setPosition(value);
  }, []);

  const warehouseOptions = useMemo(() => getWarehouseOptions(), []);
  const aisleOptions = useMemo(() => getAisleOptions(), []);
  const rackOptions = useMemo(() => getRackOptions(), []);
  const levelOptions = useMemo(() => getLevelOptions(), []);
  const binOptions = useMemo(() => getBinOptions(), []);
  const zoneOptions = useMemo(() => {
    // Pallets use B zones, Office uses C zones
    const zoneLetter = areaType === 'office' ? 'C' : 'B';
    return getZoneOptions(zoneLetter);
  }, [areaType]);
  const positionOptions = useMemo(() => getPositionOptions(), []);

  const LocationTypeIcon = getLocationTypeIcon(locationType);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Location Type Selector */}
      {showTypeSelector && onLocationTypeChange && (
        <div className="space-y-1">
          <Label htmlFor="location-type" className="text-xs">Location Type</Label>
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
              <SelectValue placeholder="Select location type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="display" data-testid="option-display">Display Area</SelectItem>
              <SelectItem value="warehouse" data-testid="option-warehouse">Warehouse</SelectItem>
              <SelectItem value="pallet" data-testid="option-pallet">Pallet Storage</SelectItem>
              <SelectItem value="other" data-testid="option-other">Other Location</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Area Type Selector (Shelves/Pallets/Office) */}
      <div className="space-y-1">
        <Label htmlFor="area-type" className="text-xs">Storage Type</Label>
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
            <SelectValue placeholder="Select storage type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shelves" data-testid="option-shelves">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>Shelves</span>
              </div>
            </SelectItem>
            <SelectItem value="pallets" data-testid="option-pallets">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>Pallets</span>
              </div>
            </SelectItem>
            <SelectItem value="office" data-testid="option-office">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>Office</span>
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
              <LocationTypeIcon className="h-3.5 w-3.5 text-slate-600" />
              <Label className="text-sm font-medium">Location Code</Label>
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
              {manualEntry ? "Builder" : "Manual"}
            </Button>
          </div>

          {manualEntry ? (
            <div className="space-y-1.5">
              <Label htmlFor="manual-code" className="text-xs">Enter Location Code</Label>
              <Input
                id="manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => handleManualCodeChange(e.target.value.toUpperCase())}
                placeholder={areaType === "pallets" ? "WH1-B03-P05" : areaType === "office" ? "WH1-C01-P01" : "WH1-A06-R04-L04-B2"}
                disabled={disabled}
                data-testid="input-manual-code"
                className={`h-8 ${!isValid && manualCode ? "border-red-500" : ""}`}
              />
              <div className="flex items-center gap-1.5 text-xs">
                {manualCode && (
                  isValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Valid format</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">
                        Invalid format. Use: {areaType === "pallets" ? "WH1-B03-P05" : areaType === "office" ? "WH1-C01-P01" : "WH1-A06-R04-L04-B2"}
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
                    <Label htmlFor="warehouse" className="text-xs">Warehouse</Label>
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
                        <SelectValue />
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
                    <Label htmlFor="aisle" className="text-xs">Aisle</Label>
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
                        <SelectValue />
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
                    <Label htmlFor="rack" className="text-xs">Row</Label>
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
                        <SelectValue />
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
                    <Label htmlFor="level" className="text-xs">Level</Label>
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
                        <SelectValue />
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
                      <Label htmlFor="bin" className="text-xs">Bin</Label>
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
                          <SelectValue />
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
                    <Label htmlFor="warehouse" className="text-xs">Warehouse</Label>
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
                        <SelectValue />
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

                  {/* Zone Selector */}
                  <div>
                    <Label htmlFor="zone" className="text-xs">Zone</Label>
                    <Select
                      value={zone}
                      onValueChange={handleZoneChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="zone"
                        data-testid="select-zone"
                        className="h-9"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneOptions.slice(0, 40).map((opt) => (
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

                  {/* Position Selector */}
                  <div>
                    <Label htmlFor="position" className="text-xs">Position</Label>
                    <Select
                      value={position}
                      onValueChange={handlePositionChange}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="position"
                        data-testid="select-position"
                        className="h-9"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positionOptions.map((opt) => (
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
                    {manualCode || (isOldFormat && oldFormatCode) || (areaType === "pallets" || areaType === "office"
                      ? generatePalletLocationCode(warehouse, zone, position)
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
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default WarehouseLocationSelector;
