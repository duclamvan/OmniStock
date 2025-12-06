import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Shield, Eye, Database, Share2, Lock, Settings, Bell, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const lastUpdated = "December 6, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              {t('legal.backToLogin')}
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl border-0 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{t('legal.privacyPolicy')}</h1>
                <p className="text-indigo-100 mt-1">{t('legal.lastUpdated')}: {lastUpdated}</p>
              </div>
            </div>
          </div>

          <CardContent className="px-8 py-8 space-y-8">
            <section>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.privacyIntro')}
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.dataCollectionTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.dataCollectionContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.dataType1')}</li>
                <li>{t('legal.dataType2')}</li>
                <li>{t('legal.dataType3')}</li>
                <li>{t('legal.dataType4')}</li>
                <li>{t('legal.dataType5')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.dataUsageTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.dataUsageContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.dataUsage1')}</li>
                <li>{t('legal.dataUsage2')}</li>
                <li>{t('legal.dataUsage3')}</li>
                <li>{t('legal.dataUsage4')}</li>
                <li>{t('legal.dataUsage5')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.dataSharingTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.dataSharingContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.dataSharing1')}</li>
                <li>{t('legal.dataSharing2')}</li>
                <li>{t('legal.dataSharing3')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.dataSecurityTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.dataSecurityContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.security1')}</li>
                <li>{t('legal.security2')}</li>
                <li>{t('legal.security3')}</li>
                <li>{t('legal.security4')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.yourRightsTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.yourRightsContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.right1')}</li>
                <li>{t('legal.right2')}</li>
                <li>{t('legal.right3')}</li>
                <li>{t('legal.right4')}</li>
                <li>{t('legal.right5')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.cookiesTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.cookiesContent')}
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.contactTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.privacyContactContent')}
              </p>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mt-4">
                <p className="text-gray-700 dark:text-gray-300 font-medium">Davie Supply</p>
                <p className="text-gray-600 dark:text-gray-400">Email: privacy@daviesupply.com</p>
              </div>
            </section>

            <div className="pt-6">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 text-center">
                  {t('legal.privacyAgreementNote')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/terms-of-service" className="text-blue-600 hover:underline">
            {t('auth.termsOfService')}
          </Link>
          {" "}&bull;{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            {t('legal.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
