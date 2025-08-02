import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, X } from "lucide-react";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  facebookName: z.string().optional(),
  facebookUrl: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  type: z.enum(["regular", "vip", "wholesale"]).default("regular"),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddressSuggestion {
  formatted: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export default function AddCustomer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [addressAutocomplete, setAddressAutocomplete] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Comprehensive mock address database for Czech Republic and neighbors
  const mockAddresses: AddressSuggestion[] = [
    // Czech Republic addresses
    { 
      formatted: "Dragounská 2545/9A, 350 02 Cheb, Czechia",
      street: "Dragounská 2545/9A",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czechia"
    },
    { 
      formatted: "Dragounská 150, 350 02 Cheb, Czechia",
      street: "Dragounská 150",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czechia"
    },
    {
      formatted: "Palackého náměstí 2, 301 00 Plzeň, Czechia",
      street: "Palackého náměstí 2",
      city: "Plzeň",
      state: "Plzeňský kraj",
      zipCode: "301 00",
      country: "Czechia"
    },
    {
      formatted: "Wenceslas Square 785/36, 110 00 Praha 1, Czechia",
      street: "Wenceslas Square 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Václavské náměstí 785/36, 110 00 Praha 1, Czechia",
      street: "Václavské náměstí 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Národní 1009/3, 110 00 Praha 1, Czechia",
      street: "Národní 1009/3",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Masná 70, 602 00 Brno, Czechia",
      street: "Masná 70",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czechia"
    },
    {
      formatted: "Jugoslávská 5, 613 00 Brno, Czechia",
      street: "Jugoslávská 5",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "613 00",
      country: "Czechia"
    },
    {
      formatted: "Stodolní 8, 702 00 Ostrava, Czechia",
      street: "Stodolní 8",
      city: "Ostrava",
      state: "Moravskoslezský kraj",
      zipCode: "702 00",
      country: "Czechia"
    },
    {
      formatted: "Hornopolní 3322/34, 702 00 Ostrava, Czechia",
      street: "Hornopolní 3322/34",
      city: "Ostrava",
      state: "Moravskoslezský kraj",
      zipCode: "702 00",
      country: "Czechia"
    },
    {
      formatted: "U Zimního stadionu 1952, 370 01 České Budějovice, Czechia",
      street: "U Zimního stadionu 1952",
      city: "České Budějovice",
      state: "Jihočeský kraj",
      zipCode: "370 01",
      country: "Czechia"
    },
    {
      formatted: "Náměstí Přemysla Otakara II. 38, 370 01 České Budějovice, Czechia",
      street: "Náměstí Přemysla Otakara II. 38",
      city: "České Budějovice",
      state: "Jihočeský kraj",
      zipCode: "370 01",
      country: "Czechia"
    },
    {
      formatted: "Široká 387/11, 381 01 Český Krumlov, Czechia",
      street: "Široká 387/11",
      city: "Český Krumlov",
      state: "Jihočeský kraj",
      zipCode: "381 01",
      country: "Czechia"
    },
    {
      formatted: "Americká 65/8, 301 00 Plzeň, Czechia",
      street: "Americká 65/8",
      city: "Plzeň",
      state: "Plzeňský kraj",
      zipCode: "301 00",
      country: "Czechia"
    },
    {
      formatted: "Univerzitní 22, 306 14 Plzeň, Czechia",
      street: "Univerzitní 22",
      city: "Plzeň",
      state: "Plzeňský kraj",
      zipCode: "306 14",
      country: "Czechia"
    },
    {
      formatted: "Karlova 4, 360 01 Karlovy Vary, Czechia",
      street: "Karlova 4",
      city: "Karlovy Vary",
      state: "Karlovarský kraj",
      zipCode: "360 01",
      country: "Czechia"
    },
    {
      formatted: "Tržiště 37, 360 01 Karlovy Vary, Czechia",
      street: "Tržiště 37",
      city: "Karlovy Vary",
      state: "Karlovarský kraj",
      zipCode: "360 01",
      country: "Czechia"
    },
    {
      formatted: "Velké náměstí 500/48, 500 03 Hradec Králové, Czechia",
      street: "Velké náměstí 500/48",
      city: "Hradec Králové",
      state: "Královéhradecký kraj",
      zipCode: "500 03",
      country: "Czechia"
    },
    {
      formatted: "Tomkova 142, 500 26 Hradec Králové, Czechia",
      street: "Tomkova 142",
      city: "Hradec Králové",
      state: "Královéhradecký kraj",
      zipCode: "500 26",
      country: "Czechia"
    },
    {
      formatted: "Náměstí Míru 1, 530 02 Pardubice, Czechia",
      street: "Náměstí Míru 1",
      city: "Pardubice",
      state: "Pardubický kraj",
      zipCode: "530 02",
      country: "Czechia"
    },
    // Germany addresses (Bavaria region near Czech border)
    {
      formatted: "Ludwigstraße 19, 80539 Munich, Germany",
      street: "Ludwigstraße 19",
      city: "Munich",
      state: "Bavaria",
      zipCode: "80539",
      country: "Germany"
    },
    {
      formatted: "Marienplatz 8, 80331 Munich, Germany",
      street: "Marienplatz 8",
      city: "Munich",
      state: "Bavaria",
      zipCode: "80331",
      country: "Germany"
    },
    {
      formatted: "Spiegelstraße 6, 81241 Munich, Germany",
      street: "Spiegelstraße 6",
      city: "Munich",
      state: "Bavaria",
      zipCode: "81241",
      country: "Germany"
    },
    {
      formatted: "Am Eisbach 5, 80538 Munich, Germany",
      street: "Am Eisbach 5",
      city: "Munich",
      state: "Bavaria",
      zipCode: "80538",
      country: "Germany"
    },
    {
      formatted: "Prinzregentenstraße 3, 80538 Munich, Germany",
      street: "Prinzregentenstraße 3",
      city: "Munich",
      state: "Bavaria",
      zipCode: "80538",
      country: "Germany"
    },
    {
      formatted: "Hauptmarkt 14, 90403 Nuremberg, Germany",
      street: "Hauptmarkt 14",
      city: "Nuremberg",
      state: "Bavaria",
      zipCode: "90403",
      country: "Germany"
    },
    {
      formatted: "Königstraße 93, 90402 Nuremberg, Germany",
      street: "Königstraße 93",
      city: "Nuremberg",
      state: "Bavaria",
      zipCode: "90402",
      country: "Germany"
    },
    {
      formatted: "Maximilianstraße 9, 93047 Regensburg, Germany",
      street: "Maximilianstraße 9",
      city: "Regensburg",
      state: "Bavaria",
      zipCode: "93047",
      country: "Germany"
    },
    {
      formatted: "Theresienstraße 1, 94032 Passau, Germany",
      street: "Theresienstraße 1",
      city: "Passau",
      state: "Bavaria",
      zipCode: "94032",
      country: "Germany"
    },
    {
      formatted: "Neustadt 520, 84028 Landshut, Germany",
      street: "Neustadt 520",
      city: "Landshut",
      state: "Bavaria",
      zipCode: "84028",
      country: "Germany"
    },
    {
      formatted: "Hauptplatz 4, 95444 Bayreuth, Germany",
      street: "Hauptplatz 4",
      city: "Bayreuth",
      state: "Bavaria",
      zipCode: "95444",
      country: "Germany"
    },
    {
      formatted: "Promenade 1, 95448 Bayreuth, Germany",
      street: "Promenade 1",
      city: "Bayreuth",
      state: "Bavaria",
      zipCode: "95448",
      country: "Germany"
    },
    {
      formatted: "Maxplatz 16, 95643 Tirschenreuth, Germany",
      street: "Maxplatz 16",
      city: "Tirschenreuth",
      state: "Bavaria",
      zipCode: "95643",
      country: "Germany"
    },
    {
      formatted: "Marktplatz 38, 92224 Amberg, Germany",
      street: "Marktplatz 38",
      city: "Amberg",
      state: "Bavaria",
      zipCode: "92224",
      country: "Germany"
    },
    {
      formatted: "Ringstraße 1, 92318 Neumarkt, Germany",
      street: "Ringstraße 1",
      city: "Neumarkt",
      state: "Bavaria",
      zipCode: "92318",
      country: "Germany"
    },
    {
      formatted: "Postplatz 2, 92421 Schwandorf, Germany",
      street: "Postplatz 2",
      city: "Schwandorf",
      state: "Bavaria",
      zipCode: "92421",
      country: "Germany"
    },
    {
      formatted: "Friedrichstraße 29, 92648 Vohenstrauß, Germany",
      street: "Friedrichstraße 29",
      city: "Vohenstrauß",
      state: "Bavaria",
      zipCode: "92648",
      country: "Germany"
    },
    {
      formatted: "Stadtplatz 27, 94086 Bad Griesbach, Germany",
      street: "Stadtplatz 27",
      city: "Bad Griesbach",
      state: "Bavaria",
      zipCode: "94086",
      country: "Germany"
    },
    {
      formatted: "Oberer Stadtplatz 1, 94469 Deggendorf, Germany",
      street: "Oberer Stadtplatz 1",
      city: "Deggendorf",
      state: "Bavaria",
      zipCode: "94469",
      country: "Germany"
    },
    {
      formatted: "Ludwigsplatz 21, 94315 Straubing, Germany",
      street: "Ludwigsplatz 21",
      city: "Straubing",
      state: "Bavaria",
      zipCode: "94315",
      country: "Germany"
    },
    // Austria addresses (near Czech border)
    {
      formatted: "Hauptplatz 1, 4020 Linz, Austria",
      street: "Hauptplatz 1",
      city: "Linz",
      state: "Upper Austria",
      zipCode: "4020",
      country: "Austria"
    },
    {
      formatted: "Landstraße 31, 4020 Linz, Austria",
      street: "Landstraße 31",
      city: "Linz",
      state: "Upper Austria",
      zipCode: "4020",
      country: "Austria"
    },
    {
      formatted: "Graben 21, 1010 Vienna, Austria",
      street: "Graben 21",
      city: "Vienna",
      state: "Vienna",
      zipCode: "1010",
      country: "Austria"
    },
    {
      formatted: "Stephansplatz 12, 1010 Vienna, Austria",
      street: "Stephansplatz 12",
      city: "Vienna",
      state: "Vienna",
      zipCode: "1010",
      country: "Austria"
    },
    {
      formatted: "Kärntner Straße 51, 1010 Vienna, Austria",
      street: "Kärntner Straße 51",
      city: "Vienna",
      state: "Vienna",
      zipCode: "1010",
      country: "Austria"
    },
    {
      formatted: "Ringstraße 1, 1010 Vienna, Austria",
      street: "Ringstraße 1",
      city: "Vienna",
      state: "Vienna",
      zipCode: "1010",
      country: "Austria"
    },
    {
      formatted: "Mariahilfer Straße 120, 1070 Vienna, Austria",
      street: "Mariahilfer Straße 120",
      city: "Vienna",
      state: "Vienna",
      zipCode: "1070",
      country: "Austria"
    },
    {
      formatted: "Wollzeile 5, 1010 Vienna, Austria",
      street: "Wollzeile 5",
      city: "Vienna",
      state: "Vienna",
      zipCode: "1010",
      country: "Austria"
    },
    {
      formatted: "Salzburger Straße 1, 5280 Braunau am Inn, Austria",
      street: "Salzburger Straße 1",
      city: "Braunau am Inn",
      state: "Upper Austria",
      zipCode: "5280",
      country: "Austria"
    },
    {
      formatted: "Stadtplatz 38, 4780 Schärding, Austria",
      street: "Stadtplatz 38",
      city: "Schärding",
      state: "Upper Austria",
      zipCode: "4780",
      country: "Austria"
    },
    {
      formatted: "Marktplatz 1, 3950 Gmünd, Austria",
      street: "Marktplatz 1",
      city: "Gmünd",
      state: "Lower Austria",
      zipCode: "3950",
      country: "Austria"
    },
    {
      formatted: "Rathausplatz 1, 3580 Horn, Austria",
      street: "Rathausplatz 1",
      city: "Horn",
      state: "Lower Austria",
      zipCode: "3580",
      country: "Austria"
    },
    {
      formatted: "Kremser Straße 2, 3500 Krems, Austria",
      street: "Kremser Straße 2",
      city: "Krems",
      state: "Lower Austria",
      zipCode: "3500",
      country: "Austria"
    },
    {
      formatted: "Rathausplatz 2, 3100 St. Pölten, Austria",
      street: "Rathausplatz 2",
      city: "St. Pölten",
      state: "Lower Austria",
      zipCode: "3100",
      country: "Austria"
    },
    {
      formatted: "Hauptplatz 1, 8010 Graz, Austria",
      street: "Hauptplatz 1",
      city: "Graz",
      state: "Styria",
      zipCode: "8010",
      country: "Austria"
    },
    // Additional Bremen, Germany addresses
    {
      formatted: "Am Markt 1, 28195 Bremen, Germany",
      street: "Am Markt 1",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Böttcherstraße 4, 28195 Bremen, Germany",
      street: "Böttcherstraße 4",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Domshof 8, 28195 Bremen, Germany",
      street: "Domshof 8",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Obernstraße 50, 28195 Bremen, Germany",
      street: "Obernstraße 50",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Sögestraße 42, 28195 Bremen, Germany",
      street: "Sögestraße 42",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Bahnhofstraße 28, 28195 Bremen, Germany",
      street: "Bahnhofstraße 28",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Ansgaritorstraße 11, 28195 Bremen, Germany",
      street: "Ansgaritorstraße 11",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Langenstraße 72, 28195 Bremen, Germany",
      street: "Langenstraße 72",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Am Wall 201, 28195 Bremen, Germany",
      street: "Am Wall 201",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Schlachte 1, 28195 Bremen, Germany",
      street: "Schlachte 1",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28195",
      country: "Germany"
    },
    {
      formatted: "Ostertorsteinweg 70, 28203 Bremen, Germany",
      street: "Ostertorsteinweg 70",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28203",
      country: "Germany"
    },
    {
      formatted: "Schwachhauser Heerstraße 2, 28203 Bremen, Germany",
      street: "Schwachhauser Heerstraße 2",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28203",
      country: "Germany"
    },
    {
      formatted: "Hamburger Straße 273, 28205 Bremen, Germany",
      street: "Hamburger Straße 273",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28205",
      country: "Germany"
    },
    {
      formatted: "Waller Heerstraße 2, 28217 Bremen, Germany",
      street: "Waller Heerstraße 2",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28217",
      country: "Germany"
    },
    {
      formatted: "Nordstraße 65, 28217 Bremen, Germany",
      street: "Nordstraße 65",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28217",
      country: "Germany"
    },
    {
      formatted: "Doventorsteinweg 46, 28217 Bremen, Germany",
      street: "Doventorsteinweg 46",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28217",
      country: "Germany"
    },
    {
      formatted: "Buntentorsteinweg 145, 28201 Bremen, Germany",
      street: "Buntentorsteinweg 145",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28201",
      country: "Germany"
    },
    {
      formatted: "Neuenlander Straße 55, 28201 Bremen, Germany",
      street: "Neuenlander Straße 55",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28201",
      country: "Germany"
    },
    {
      formatted: "Pappelstraße 85, 28199 Bremen, Germany",
      street: "Pappelstraße 85",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28199",
      country: "Germany"
    },
    {
      formatted: "Kornstraße 271, 28201 Bremen, Germany",
      street: "Kornstraße 271",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28201",
      country: "Germany"
    },
    {
      formatted: "Hastedter Heerstraße 367, 28207 Bremen, Germany",
      street: "Hastedter Heerstraße 367",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28207",
      country: "Germany"
    },
    {
      formatted: "Bennigsenstraße 2, 28207 Bremen, Germany",
      street: "Bennigsenstraße 2",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28207",
      country: "Germany"
    },
    {
      formatted: "Kirchbachstraße 1, 28211 Bremen, Germany",
      street: "Kirchbachstraße 1",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28211",
      country: "Germany"
    },
    {
      formatted: "Bismarckstraße 30, 28209 Bremen, Germany",
      street: "Bismarckstraße 30",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28209",
      country: "Germany"
    },
    {
      formatted: "Wachmannstraße 39, 28209 Bremen, Germany",
      street: "Wachmannstraße 39",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28209",
      country: "Germany"
    },
    {
      formatted: "Hermann-Böse-Straße 8, 28209 Bremen, Germany",
      street: "Hermann-Böse-Straße 8",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28209",
      country: "Germany"
    },
    {
      formatted: "Horner Heerstraße 19, 28217 Bremen, Germany",
      street: "Horner Heerstraße 19",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28217",
      country: "Germany"
    },
    {
      formatted: "Lilienthaler Heerstraße 179, 28357 Bremen, Germany",
      street: "Lilienthaler Heerstraße 179",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28357",
      country: "Germany"
    },
    {
      formatted: "Borgfelder Straße 2, 28357 Bremen, Germany",
      street: "Borgfelder Straße 2",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28357",
      country: "Germany"
    },
    {
      formatted: "Kattenturmer Heerstraße 140, 28277 Bremen, Germany",
      street: "Kattenturmer Heerstraße 140",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28277",
      country: "Germany"
    },
    {
      formatted: "Alfred-Faust-Straße 6, 28277 Bremen, Germany",
      street: "Alfred-Faust-Straße 6",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28277",
      country: "Germany"
    },
    {
      formatted: "Hans-Bredow-Straße 19, 28307 Bremen, Germany",
      street: "Hans-Bredow-Straße 19",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28307",
      country: "Germany"
    },
    {
      formatted: "Hemelinger Heerstraße 8, 28309 Bremen, Germany",
      street: "Hemelinger Heerstraße 8",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28309",
      country: "Germany"
    },
    {
      formatted: "Sebaldsbrücker Heerstraße 49, 28309 Bremen, Germany",
      street: "Sebaldsbrücker Heerstraße 49",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28309",
      country: "Germany"
    },
    {
      formatted: "Georg-Bitter-Straße 17, 28329 Bremen, Germany",
      street: "Georg-Bitter-Straße 17",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28329",
      country: "Germany"
    },
    {
      formatted: "Mahndorfer Heerstraße 2, 28329 Bremen, Germany",
      street: "Mahndorfer Heerstraße 2",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28329",
      country: "Germany"
    },
    {
      formatted: "Oberneulander Heerstraße 15, 28355 Bremen, Germany",
      street: "Oberneulander Heerstraße 15",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28355",
      country: "Germany"
    },
    {
      formatted: "Rockwinkeler Heerstraße 4, 28355 Bremen, Germany",
      street: "Rockwinkeler Heerstraße 4",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28355",
      country: "Germany"
    }
  ];

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      facebookName: "",
      facebookUrl: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      zipCode: "",
      country: "",
      type: "regular",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return apiRequest('POST', '/api/customers', data);
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      navigate('/customers');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  // Address search with fuzzy matching
  const searchAddresses = (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    setIsLoadingAddresses(true);
    setShowAddressDropdown(true);

    // Simulate async search with timeout
    setTimeout(() => {
      const searchTerms = query.toLowerCase().split(/\s+/);
      
      const results = mockAddresses
        .map(address => {
          let score = 0;
          const addressLower = address.formatted.toLowerCase();
          
          // Check each search term
          searchTerms.forEach(term => {
            if (addressLower.includes(term)) {
              score += term.length * 2; // Give more weight to longer matches
              
              // Bonus for exact word matches
              const words = addressLower.split(/\s+/);
              if (words.some(word => word === term)) {
                score += term.length;
              }
            }
          });
          
          // Additional scoring for specific field matches
          if (address.city && searchTerms.some(term => address.city.toLowerCase().includes(term))) {
            score += 5;
          }
          if (address.zipCode && searchTerms.some(term => address.zipCode.includes(term))) {
            score += 10; // High score for zip code matches
          }
          if (address.country && searchTerms.some(term => address.country.toLowerCase().includes(term))) {
            score += 3;
          }
          
          return { address, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => item.address);
      
      setAddressSuggestions(results);
      setIsLoadingAddresses(false);
    }, 300);
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    form.setValue('address', suggestion.street || '');
    form.setValue('city', suggestion.city || '');
    form.setValue('zipCode', suggestion.zipCode || '');
    form.setValue('country', suggestion.country || '');
    
    setAddressAutocomplete(suggestion.formatted);
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Add New Customer</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  {...form.register('name', {
                    onChange: (e) => {
                      // Also update Facebook Name when Customer Name changes
                      const currentFacebookName = form.getValues('facebookName');
                      if (!currentFacebookName || currentFacebookName === '') {
                        form.setValue('facebookName', e.target.value);
                      }
                    }
                  })}
                  placeholder="Type here"
                  required
                />
              </div>
              <div>
                <Label htmlFor="facebookName">Facebook Name</Label>
                <Input
                  id="facebookName"
                  {...form.register('facebookName')}
                  placeholder="Type here"
                />
              </div>
              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  {...form.register('facebookUrl')}
                  placeholder="Place URL or Type"
                />
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...form.register('email')}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  {...form.register('phone')}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="customerCompany">Company</Label>
                <Input
                  id="customerCompany"
                  {...form.register('company')}
                  placeholder="Company name"
                />
              </div>
            </div>
            
            {/* Address Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="addressAutocomplete">Address Search (optional)</Label>
              <div className="relative">
                <Input
                  id="addressAutocomplete"
                  value={addressAutocomplete}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddressAutocomplete(value);
                    searchAddresses(value);
                  }}
                  onFocus={() => {
                    if (addressAutocomplete.length >= 3) {
                      searchAddresses(addressAutocomplete);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowAddressDropdown(false);
                    }
                  }}
                  placeholder="Start typing an address..."
                  className="pr-10"
                />
                {addressAutocomplete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setAddressAutocomplete("");
                      setAddressSuggestions([]);
                      setShowAddressDropdown(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Address suggestions dropdown */}
                {showAddressDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                    {isLoadingAddresses ? (
                      <div className="p-4 text-center text-slate-500">
                        <div className="text-sm">Searching addresses...</div>
                      </div>
                    ) : addressSuggestions.length > 0 ? (
                      <>
                        <div className="p-2 bg-slate-50 border-b text-xs text-slate-600">
                          {addressSuggestions.length} address{addressSuggestions.length !== 1 ? 'es' : ''} found
                        </div>
                        {addressSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                            onClick={() => selectAddress(suggestion)}
                          >
                            <div className="font-medium text-slate-900">
                              {suggestion.formatted}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="p-4 text-center text-slate-500">
                        <div className="text-sm">No addresses found</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Search for an official address to auto-fill the fields below
              </p>
            </div>
            
            {/* Address Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Input
                  id="shippingAddress"
                  {...form.register('address')}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="Type here"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    {...form.register('zipCode')}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...form.register('country')}
                    placeholder="Type here"
                  />
                </div>
              </div>
            </div>
            
            {/* Customer Type */}
            <div>
              <Label htmlFor="customerType">Customer Type</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value: any) => form.setValue('type', value)}
              >
                <SelectTrigger id="customerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/customers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCustomerMutation.isPending}>
            {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}