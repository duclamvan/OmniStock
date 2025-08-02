import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, BarChart3, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-slate-900 mb-4">
            <span className="text-primary">Davie</span> Supply
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Complete Warehouse & Order Management System
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
          >
            Login to Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Order Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Complete order lifecycle management from creation to fulfillment with multi-currency support.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Inventory Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Advanced inventory tracking with variants, SKU management, and low stock alerts.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="text-lg">Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Comprehensive dashboards with profit tracking, revenue analysis, and financial reports.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Customer Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Manage customer information with Vietnamese search support and order history tracking.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">Vietnamese Diacritics Support</h3>
                <p className="text-slate-600 text-sm">Search functionality that handles Vietnamese characters seamlessly.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">Multi-Currency Support</h3>
                <p className="text-slate-600 text-sm">Handle transactions in CZK, EUR, USD, VND, and CNY with automatic conversion.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">Real-time Notifications</h3>
                <p className="text-slate-600 text-sm">Stay updated with instant notifications for new orders and stock alerts.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">Barcode Integration</h3>
                <p className="text-slate-600 text-sm">EAN-13 barcode scanning for quick product identification and order processing.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">Comprehensive Reports</h3>
                <p className="text-slate-600 text-sm">Detailed financial reports with profit/revenue calculations and export capabilities.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">Secure Authentication</h3>
                <p className="text-slate-600 text-sm">Enterprise-grade security with role-based access control.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-slate-500">
          <p>&copy; 2024 Davie Supply Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
