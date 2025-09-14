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
import { AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import {
  generateLocationCode,
  validateLocationCode,
  parseLocationCode,
  getLocationTypeIcon,
  getLocationTypeTextColor,
  getLocationTypeLabel,
  getWarehouseOptions,
  getAisleOptions,
  getRackOptions,
  getLevelOptions,
  LocationType,
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
  const [aisle, setAisle] = useState("A01");
  const [rack, setRack] = useState("R01");
  const [level, setLevel] = useState("L01");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isValid, setIsValid] = useState(true);

  // Parse initial value if provided
  useEffect(() => {
    if (value && validateLocationCode(value)) {
      const parts = parseLocationCode(value);
      if (parts) {
        setWarehouse(parts.warehouse);
        setAisle(parts.aisle);
        setRack(parts.rack);
        setLevel(parts.level);
        setManualCode(value);
      }
    }
  }, [value]);

  // Update location code when components change
  useEffect(() => {
    if (!manualEntry) {
      const code = generateLocationCode(warehouse, aisle, rack, level);
      onChange(code);
      setManualCode(code);
      setIsValid(true);
    }
  }, [warehouse, aisle, rack, level, manualEntry, onChange]);

  const handleManualCodeChange = (newCode: string) => {
    setManualCode(newCode);
    const valid = validateLocationCode(newCode);
    setIsValid(valid);
    
    if (valid) {
      const parts = parseLocationCode(newCode);
      if (parts) {
        setWarehouse(parts.warehouse);
        setAisle(parts.aisle);
        setRack(parts.rack);
        setLevel(parts.level);
        onChange(newCode);
      }
    }
  };

  const warehouseOptions = getWarehouseOptions();
  const aisleOptions = getAisleOptions();
  const rackOptions = getRackOptions();
  const levelOptions = getLevelOptions();

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
                placeholder="WH1-A01-R02-L03"
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
                      <span className="text-red-600">Invalid format. Use: WH1-A01-R02-L03</span>
                    </>
                  )
                )}
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
                    {aisleOptions.slice(0, 20).map((opt) => (
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

              {/* Rack Selector */}
              <div>
                <Label htmlFor="rack" className="text-xs">Rack</Label>
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

          {/* Location Code Preview */}
          <div className="border rounded-md p-3 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Generated Location Code</p>
                <div className="flex items-center space-x-3">
                  <code className="text-lg font-mono font-semibold" data-testid="text-location-code">
                    {generateLocationCode(warehouse, aisle, rack, level)}
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