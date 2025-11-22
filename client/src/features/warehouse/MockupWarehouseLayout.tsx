import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Thermometer, 
  AlertTriangle, 
  Truck,
  Archive,
  ShoppingCart,
  Clock,
  CheckCircle,
  Info,
  MapPin,
  Grid3x3,
  Layers
} from "lucide-react";

interface Zone {
  id: string;
  name: string;
  type: "receiving" | "storage" | "picking" | "shipping" | "returns" | "quarantine";
  color: string;
  icon: any;
  locations: number;
  utilization: number;
  temperature?: string;
  items?: number;
}

export function MockupWarehouseLayout() {
  const { t } = useTranslation();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const zones: Zone[] = [
    {
      id: "Z1",
      name: t('warehouse:receivingArea'),
      type: "receiving",
      color: "bg-blue-100 border-blue-300",
      icon: Truck,
      locations: 12,
      utilization: 45,
      items: 234
    },
    {
      id: "Z2",
      name: t('warehouse:coldStorage'),
      type: "storage",
      color: "bg-cyan-100 border-cyan-300",
      icon: Thermometer,
      locations: 48,
      utilization: 78,
      temperature: "2-8°C",
      items: 1420
    },
    {
      id: "Z3",
      name: t('warehouse:generalStorage'),
      type: "storage",
      color: "bg-gray-100 border-gray-300",
      icon: Archive,
      locations: 240,
      utilization: 82,
      items: 8920
    },
    {
      id: "Z4",
      name: t('warehouse:pickingArea'),
      type: "picking",
      color: "bg-green-100 border-green-300",
      icon: ShoppingCart,
      locations: 60,
      utilization: 91,
      items: 2340
    },
    {
      id: "Z5",
      name: t('warehouse:shippingDock'),
      type: "shipping",
      color: "bg-purple-100 border-purple-300",
      icon: Package,
      locations: 16,
      utilization: 65,
      items: 456
    },
    {
      id: "Z6",
      name: t('warehouse:returnsProcessing'),
      type: "returns",
      color: "bg-yellow-100 border-yellow-300",
      icon: Clock,
      locations: 8,
      utilization: 38,
      items: 89
    },
    {
      id: "Z7",
      name: t('warehouse:quarantineZone'),
      type: "quarantine",
      color: "bg-red-100 border-red-300",
      icon: AlertTriangle,
      locations: 4,
      utilization: 25,
      items: 12
    }
  ];

  const rackLayout = [
    ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"],
    ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"],
    ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"],
    ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
    ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"],
    ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"],
  ];

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 50) return "text-green-600";
    if (utilization < 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getUtilizationBg = (utilization: number) => {
    if (utilization < 50) return "bg-green-500";
    if (utilization < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Warehouse Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('warehouse:totalLocations')}</p>
                <p className="text-2xl font-bold">388</p>
              </div>
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('warehouse:utilization')}</p>
                <p className="text-2xl font-bold">76.5%</p>
              </div>
              <Grid3x3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('warehouse:totalItems')}</p>
                <p className="text-2xl font-bold">13,491</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('warehouse:activeZones')}</p>
                <p className="text-2xl font-bold">7</p>
              </div>
              <Layers className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="layout">{t('warehouse:layout2D')}</TabsTrigger>
          <TabsTrigger value="zones">{t('warehouse:zoneDetails')}</TabsTrigger>
          <TabsTrigger value="heatmap">{t('warehouse:utilizationHeatmap')}</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('warehouse:warehouseFloorPlan')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Warehouse Layout Grid */}
              <div className="relative bg-gray-50 p-8 rounded-lg overflow-auto">
                <div className="grid grid-cols-12 gap-2 min-w-[800px]">
                  {/* Receiving Area */}
                  <div className="col-span-3 row-span-2">
                    <div 
                      className={`${zones[0].color} border-2 rounded-lg p-4 h-32 cursor-pointer hover:shadow-lg transition-shadow`}
                      onClick={() => setSelectedZone(zones[0])}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-5 w-5" />
                        <span className="font-semibold text-sm">{zones[0].name}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p>{t('warehouse:docks')}: 1-4</p>
                        <p className={getUtilizationColor(zones[0].utilization)}>
                          {zones[0].utilization}{t('warehouse:percentFull')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cold Storage */}
                  <div className="col-span-2 row-span-3">
                    <div 
                      className={`${zones[1].color} border-2 rounded-lg p-4 h-48 cursor-pointer hover:shadow-lg transition-shadow`}
                      onClick={() => setSelectedZone(zones[1])}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="h-5 w-5" />
                        <span className="font-semibold text-sm">{zones[1].name}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p>{zones[1].temperature}</p>
                        <p>{t('warehouse:racks')}: C1-C6</p>
                        <p className={getUtilizationColor(zones[1].utilization)}>
                          {zones[1].utilization}{t('warehouse:percentFull')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* General Storage - Main Area */}
                  <div className="col-span-5 row-span-4">
                    <div 
                      className={`${zones[2].color} border-2 rounded-lg p-4 h-64 cursor-pointer hover:shadow-lg transition-shadow`}
                      onClick={() => setSelectedZone(zones[2])}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Archive className="h-5 w-5" />
                        <span className="font-semibold">{zones[2].name}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {rackLayout.map((row, rowIndex) => (
                          <div key={rowIndex} className="contents">
                            {row.slice(0, 6).map((rack) => (
                              <div
                                key={rack}
                                className="bg-gray-300 rounded text-xs p-1 text-center hover:bg-gray-400"
                                title={`${t('warehouse:rack')} ${rack}`}
                              >
                                {rack}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      <p className={`text-xs mt-2 ${getUtilizationColor(zones[2].utilization)}`}>
                        {zones[2].utilization}{t('warehouse:percentFull')}
                      </p>
                    </div>
                  </div>

                  {/* Shipping Dock */}
                  <div className="col-span-2 row-span-2">
                    <div 
                      className={`${zones[4].color} border-2 rounded-lg p-4 h-32 cursor-pointer hover:shadow-lg transition-shadow`}
                      onClick={() => setSelectedZone(zones[4])}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5" />
                        <span className="font-semibold text-sm">{zones[4].name}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p>{t('warehouse:docks')}: 5-8</p>
                        <p className={getUtilizationColor(zones[4].utilization)}>
                          {zones[4].utilization}{t('warehouse:percentFull')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Picking Area */}
                  <div className="col-span-3 row-span-2">
                    <div 
                      className={`${zones[3].color} border-2 rounded-lg p-4 h-32 cursor-pointer hover:shadow-lg transition-shadow`}
                      onClick={() => setSelectedZone(zones[3])}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-5 w-5" />
                        <span className="font-semibold text-sm">{zones[3].name}</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <p>{t('warehouse:stations')}: P1-P12</p>
                        <p className={getUtilizationColor(zones[3].utilization)}>
                          {zones[3].utilization}{t('warehouse:percentFull')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Returns & Quarantine */}
                  <div className="col-span-2 row-span-2">
                    <div className="space-y-2">
                      <div 
                        className={`${zones[5].color} border-2 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow`}
                        onClick={() => setSelectedZone(zones[5])}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-semibold text-xs">{zones[5].name}</span>
                        </div>
                        <p className={`text-xs mt-1 ${getUtilizationColor(zones[5].utilization)}`}>
                          {zones[5].utilization}{t('warehouse:percentFull')}
                        </p>
                      </div>
                      <div 
                        className={`${zones[6].color} border-2 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow`}
                        onClick={() => setSelectedZone(zones[6])}
                      >
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-semibold text-xs">{zones[6].name}</span>
                        </div>
                        <p className={`text-xs mt-1 ${getUtilizationColor(zones[6].utilization)}`}>
                          {zones[6].utilization}{t('warehouse:percentFull')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>{t('warehouse:lowUtilization')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span>{t('warehouse:mediumUtilization')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>{t('warehouse:highUtilization')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Zone Details */}
          {selectedZone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <selectedZone.icon className="h-5 w-5" />
                  {selectedZone.name} {t('warehouse:details')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('warehouse:zoneId')}</p>
                    <p className="font-semibold">{selectedZone.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('warehouse:locations')}</p>
                    <p className="font-semibold">{selectedZone.locations}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('warehouse:itemsStored')}</p>
                    <p className="font-semibold">{selectedZone.items?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('warehouse:utilization')}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${getUtilizationBg(selectedZone.utilization)} h-2 rounded-full`}
                          style={{ width: `${selectedZone.utilization}%` }}
                        />
                      </div>
                      <span className={`font-semibold ${getUtilizationColor(selectedZone.utilization)}`}>
                        {selectedZone.utilization}%
                      </span>
                    </div>
                  </div>
                  {selectedZone.temperature && (
                    <div>
                      <p className="text-sm text-gray-500">{t('warehouse:temperature')}</p>
                      <p className="font-semibold">{selectedZone.temperature}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="zones" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <Card key={zone.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <zone.icon className="h-5 w-5" />
                      {zone.name}
                    </div>
                    <Badge variant="outline">{zone.id}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{t('warehouse:locations')}</span>
                      <span className="font-semibold">{zone.locations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{t('warehouse:items')}</span>
                      <span className="font-semibold">{zone.items?.toLocaleString()}</span>
                    </div>
                    {zone.temperature && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">{t('warehouse:temperature')}</span>
                        <Badge variant="secondary">{zone.temperature}</Badge>
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">{t('warehouse:utilization')}</span>
                        <span className={`text-sm font-semibold ${getUtilizationColor(zone.utilization)}`}>
                          {zone.utilization}%
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${getUtilizationBg(zone.utilization)} h-2 rounded-full transition-all`}
                          style={{ width: `${zone.utilization}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('warehouse:warehouseUtilizationHeatmap')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-1">
                {rackLayout.map((row, rowIndex) => (
                  <div key={rowIndex} className="contents">
                    {row.map((rack) => {
                      const utilization = Math.floor(Math.random() * 100);
                      const bgColor = utilization < 30 ? "bg-green-200" : 
                                     utilization < 60 ? "bg-green-400" :
                                     utilization < 80 ? "bg-yellow-400" :
                                     utilization < 90 ? "bg-orange-400" : "bg-red-500";
                      return (
                        <div
                          key={rack}
                          className={`${bgColor} rounded p-4 text-center hover:opacity-80 cursor-pointer transition-opacity`}
                          title={`${rack}: ${utilization}% full`}
                        >
                          <div className="text-xs font-semibold">{rack}</div>
                          <div className="text-xs mt-1">{utilization}%</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-200 rounded"></div>
                  <span>0-30%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span>30-60%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>60-80%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span>80-90%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>90-100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}