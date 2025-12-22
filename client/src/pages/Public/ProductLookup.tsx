import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Package, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface ProductInfo {
  id: string;
  name: string;
  vietnameseName?: string | null;
  sku?: string | null;
  barcode?: string | null;
}

export default function ProductLookup() {
  const [, params] = useRoute("/p/:code");
  const [, navigate] = useLocation();
  const { user, isLoading: userLoading } = useAuth();
  const code = params?.code ? decodeURIComponent(params.code) : "";

  const { data: product, isLoading: productLoading } = useQuery<ProductInfo | null>({
    queryKey: ["/api/products/lookup", code],
    queryFn: async () => {
      if (!code) return null;
      const response = await fetch(`/api/products/lookup/${encodeURIComponent(code)}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!code && !user,
  });

  useEffect(() => {
    if (!userLoading && user && code) {
      navigate(`/stock?q=${encodeURIComponent(code)}`);
    }
  }, [user, userLoading, code, navigate]);

  if (userLoading || productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-gray-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Information</h1>
              <p className="text-gray-500 mt-1">Scanned from warehouse label</p>
            </div>

            <div className="bg-gray-100 rounded-lg p-6 space-y-4">
              {product?.sku && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">SKU</p>
                  <p className="font-mono text-2xl font-bold text-gray-900 mt-1">{product.sku}</p>
                </div>
              )}
              
              {product?.barcode && product.barcode !== product.sku && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Barcode</p>
                  <p className="font-mono text-xl font-bold text-gray-900 mt-1">{product.barcode}</p>
                </div>
              )}
              
              {!product?.sku && !product?.barcode && code && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Product Code</p>
                  <p className="font-mono text-2xl font-bold text-gray-900 mt-1">{code}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-4">
                For detailed product information, please log in to the warehouse management system.
              </p>
              <Button 
                onClick={() => navigate("/login")} 
                className="w-full"
                data-testid="button-login"
              >
                <Package className="h-4 w-4 mr-2" />
                Log In to WMS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
