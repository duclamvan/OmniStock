import { useState, useEffect } from "react";
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

export default function WarehouseLocationSelector({
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
  const [area, setArea] = useState("A");
  const [aisle, setAisle] = useState("A01");
  const [rack, setRack] = useState("01");
  const [level, setLevel] = useState("01");
  const [bin, setBin] = useState("B1");
  const [zone, setZone] = useState("A01");
  const [position, setPosition] = useState("P01");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isValid, setIsValid] = useState(true);

  // Parse initial value if provided
  useEffect(() => {
    if (value && validateLocationCode(value)) {
      const shelfParts = parseShelfLocationCode(value);
      if (shelfParts) {
        setAreaType("shelves");
        setWarehouse(shelfParts.warehouse);
        setArea(shelfParts.area);
        setAisle(shelfParts.aisle);
        setRack(shelfParts.rack.replace(/^R/, ''));
        setLevel(shelfParts.level.replace(/^L/, ''));
        setBin(shelfParts.bin || "B1");
        setManualCode(value);
        return;
      }
      
      const palletParts = parsePalletLocationCode(value);
      if (palletParts) {
        setAreaType("pallets");
        setWarehouse(palletParts.warehouse);
        setArea(palletParts.area);
        setZone(palletParts.zone);
        setPosition(palletParts.position);
        setManualCode(value);
        return;
      }
    }
  }, [value]);

  // Update location code when components change
  useEffect(() => {
    if (!manualEntry) {
      let code = "";
      if (areaType === "shelves") {
        code = generateShelfLocationCode(warehouse, area, aisle, rack, level, bin);
      } else if (areaType === "pallets") {
        code = generatePalletLocationCode(warehouse, area, zone, position);
      }
      onChange(code);
      setManualCode(code);
      setIsValid(true);
    }
  }, [warehouse, areaType, area, aisle, rack, level, bin, zone, position, manualEntry, onChange]);

  const handleManualCodeChange = (newCode: string) => {
    setManualCode(newCode);
    const valid = validateLocationCode(newCode);
    setIsValid(valid);
    
    if (valid) {
      const shelfParts = parseShelfLocationCode(newCode);
      if (shelfParts) {
        setAreaType("shelves");
        setWarehouse(shelfParts.warehouse);
        setArea(shelfParts.area);
        setAisle(shelfParts.aisle);
        setRack(shelfParts.rack.replace(/^R/, ''));
        setLevel(shelfParts.level.replace(/^L/, ''));
        setBin(shelfParts.bin || "B1");
        onChange(newCode);
        return;
      }
      
      const palletParts = parsePalletLocationCode(newCode);
      if (palletParts) {
        setAreaType("pallets");
        setWarehouse(palletParts.warehouse);
        setArea(palletParts.area);
        setZone(palletParts.zone);
        setPosition(palletParts.position);
        onChange(newCode);
      }
    }
  };

  const warehouseOptions = getWarehouseOptions();
  const areaOptions = getAreaOptions();
  const aisleOptions = getAisleOptions();
  const rackOptions = getRackOptions();
  const levelOptions = getLevelOptions();
  const binOptions = getBinOptions();
  const zoneOptions = getZoneOptions();
  const positionOptions = getPositionOptions();

  const LocationTypeIcon = getLocationTypeIcon(locationType);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Type Selector */}
      {showTypeSelector && onLocationTypeChange && (
        <div>
          <Label htmlFor="location-type">Location Type</Label>
          <Select
            value={locationType}
            onValueChange={(value) => onLocationTypeChange(value as LocationType)}
            disabled={disabled}
          >
            <SelectTrigger
              id="location-type"
              data-testid="select-location-type"
              className="w-full"
            >
              <SelectValue placeholder="Select location type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="display" data-testid="option-display">
                <div className="flex items-center space-x-2">
                  <span>Display Area</span>
                </div>
              </SelectItem>
              <SelectItem value="warehouse" data-testid="option-warehouse">
                <div className="flex items-center space-x-2">
                  <span>Warehouse</span>
                </div>
              </SelectItem>
              <SelectItem value="pallet" data-testid="option-pallet">
                <div className="flex items-center space-x-2">
                  <span>Pallet Storage</span>
                </div>
              </SelectItem>
              <SelectItem value="other" data-testid="option-other">
                <div className="flex items-center space-x-2">
                  <span>Other Location</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Area Type Selector (Shelves/Pallets/Office) */}
      <div>
        <Label htmlFor="area-type">Storage Type</Label>
        <Select
          value={areaType}
          onValueChange={(value) => setAreaType(value as AreaType)}
          disabled={disabled}
        >
          <SelectTrigger
            id="area-type"
            data-testid="select-area-type"
            className="w-full"
          >
            <SelectValue placeholder="Select storage type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shelves" data-testid="option-shelves">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Shelves</span>
              </div>
            </SelectItem>
            <SelectItem value="pallets" data-testid="option-pallets">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4" />
                <span>Pallets</span>
              </div>
            </SelectItem>
            <SelectItem value="office" data-testid="option-office">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Office</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location Code Builder */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LocationTypeIcon className="h-4 w-4 text-slate-600" />
              <Label className="text-base font-medium">Location Code Builder</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManualEntry(!manualEntry)}
              disabled={disabled}
              data-testid="button-toggle-manual"
            >
              {manualEntry ? "Use Builder" : "Manual Entry"}
            </Button>
          </div>

          {manualEntry ? (
            <div className="space-y-2">
              <Label htmlFor="manual-code">Enter Location Code</Label>
              <Input
                id="manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => handleManualCodeChange(e.target.value.toUpperCase())}
                placeholder={areaType === "pallets" ? "WH1-B-B03-P05" : "WH1-A-A06-R04-L04-B2"}
                disabled={disabled}
                data-testid="input-manual-code"
                className={!isValid && manualCode ? "border-red-500" : ""}
              />
              <div className="flex items-center space-x-2 text-sm">
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
                        Invalid format. Use: {areaType === "pallets" ? "WH1-B-B03-P05" : "WH1-A-A06-R04-L04-B2"}
                      </span>
                    </>
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              {areaType === "shelves" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Warehouse Selector */}
                  <div>
                    <Label htmlFor="warehouse" className="text-xs">Warehouse</Label>
                    <Select
                      value={warehouse}
                      onValueChange={setWarehouse}
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

                  {/* Area Selector */}
                  <div>
                    <Label htmlFor="area" className="text-xs">Area</Label>
                    <Select
                      value={area}
                      onValueChange={setArea}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="area"
                        data-testid="select-area"
                        className="h-9"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {areaOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-area-${opt.value}`}
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
                      onValueChange={setAisle}
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
                      onValueChange={setRack}
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
                            value={opt.value.replace(/^R/, '')}
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
                      onValueChange={setLevel}
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
                            value={opt.value.replace(/^L/, '')}
                            data-testid={`option-${opt.value}`}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bin Selector */}
                  <div>
                    <Label htmlFor="bin" className="text-xs">Bin</Label>
                    <Select
                      value={bin}
                      onValueChange={setBin}
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
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Warehouse Selector */}
                  <div>
                    <Label htmlFor="warehouse" className="text-xs">Warehouse</Label>
                    <Select
                      value={warehouse}
                      onValueChange={setWarehouse}
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

                  {/* Area Selector */}
                  <div>
                    <Label htmlFor="area" className="text-xs">Area</Label>
                    <Select
                      value={area}
                      onValueChange={setArea}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        id="area"
                        data-testid="select-area"
                        className="h-9"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {areaOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            data-testid={`option-area-${opt.value}`}
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
                      onValueChange={setZone}
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
                      onValueChange={setPosition}
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
          <div className="border rounded-md p-3 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Generated Location Code</p>
                <div className="flex items-center space-x-3">
                  <code className="text-lg font-mono font-semibold" data-testid="text-location-code">
                    {manualCode || (areaType === "pallets" 
                      ? generatePalletLocationCode(warehouse, area, zone, position)
                      : generateShelfLocationCode(warehouse, area, aisle, rack, level, bin))}
                  </code>
                  <Badge
                    variant="outline"
                    className={getLocationTypeTextColor(locationType)}
                    data-testid="badge-location-type"
                  >
                    {getLocationTypeLabel(locationType)}
                  </Badge>
                </div>
              </div>
              <MapPin className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
