import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation('system');
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row mb-4 gap-3 sm:gap-2 items-start sm:items-center">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('notFound.title')}</h1>
          </div>

          <p className="mt-4 text-sm sm:text-base text-gray-600">
            {t('notFound.message')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
