import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, BarChart3, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const { t } = useTranslation('common');
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-3 sm:mb-4">
            <span className="text-primary">Davie</span> Supply
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 px-4">
            {t('landing.subtitle')}
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg w-full sm:w-auto"
          >
            {t('landing.loginButton')}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">{t('landing.features.orderManagement.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                {t('landing.features.orderManagement.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">{t('landing.features.inventoryControl.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                {t('landing.features.inventoryControl.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="text-lg">{t('landing.features.analytics.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                {t('landing.features.analytics.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">{t('landing.features.customerManagement.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                {t('landing.features.customerManagement.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">{t('landing.keyFeaturesTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('landing.keyFeatures.vietnameseSupport.title')}</h3>
                <p className="text-slate-600 text-sm">{t('landing.keyFeatures.vietnameseSupport.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('landing.keyFeatures.multiCurrency.title')}</h3>
                <p className="text-slate-600 text-sm">{t('landing.keyFeatures.multiCurrency.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('landing.keyFeatures.notifications.title')}</h3>
                <p className="text-slate-600 text-sm">{t('landing.keyFeatures.notifications.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('landing.keyFeatures.barcode.title')}</h3>
                <p className="text-slate-600 text-sm">{t('landing.keyFeatures.barcode.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('landing.keyFeatures.reports.title')}</h3>
                <p className="text-slate-600 text-sm">{t('landing.keyFeatures.reports.description')}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <h3 className="font-semibold">{t('landing.keyFeatures.security.title')}</h3>
                <p className="text-slate-600 text-sm">{t('landing.keyFeatures.security.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-16 text-slate-500 text-sm sm:text-base px-4">
          <p>{t('landing.footer.copyright')}</p>
        </div>
      </div>
    </div>
  );
}
