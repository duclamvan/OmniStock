import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText, Shield, Users, Scale, AlertTriangle, Lock, Mail, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsOfService() {
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{t('legal.termsOfService')}</h1>
                <p className="text-blue-100 mt-1">{t('legal.lastUpdated')}: {lastUpdated}</p>
              </div>
            </div>
          </div>

          <CardContent className="px-8 py-8 space-y-8">
            <section>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.tosIntro')}
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.acceptanceTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed pl-13">
                {t('legal.acceptanceContent')}
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Building className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.serviceDescTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.serviceDescContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.serviceFeature1')}</li>
                <li>{t('legal.serviceFeature2')}</li>
                <li>{t('legal.serviceFeature3')}</li>
                <li>{t('legal.serviceFeature4')}</li>
                <li>{t('legal.serviceFeature5')}</li>
                <li>{t('legal.serviceFeature6')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.userAccountsTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.userAccountsContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.userResponsibility1')}</li>
                <li>{t('legal.userResponsibility2')}</li>
                <li>{t('legal.userResponsibility3')}</li>
                <li>{t('legal.userResponsibility4')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.dataPrivacyTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.dataPrivacyContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.dataPrivacy1')}</li>
                <li>{t('legal.dataPrivacy2')}</li>
                <li>{t('legal.dataPrivacy3')}</li>
                <li>{t('legal.dataPrivacy4')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.prohibitedTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.prohibitedContent')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                <li>{t('legal.prohibited1')}</li>
                <li>{t('legal.prohibited2')}</li>
                <li>{t('legal.prohibited3')}</li>
                <li>{t('legal.prohibited4')}</li>
                <li>{t('legal.prohibited5')}</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.limitationTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.limitationContent')}
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.intellectualTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.intellectualContent')}
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('legal.governingTitle')}</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('legal.governingContent')}
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
                {t('legal.contactContent')}
              </p>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mt-4">
                <p className="text-gray-700 dark:text-gray-300 font-medium">Davie Supply</p>
                <p className="text-gray-600 dark:text-gray-400">Email: support@daviesupply.com</p>
              </div>
            </section>

            <div className="pt-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  {t('legal.agreementNote')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/privacy-policy" className="text-blue-600 hover:underline">
            {t('auth.privacyPolicy')}
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
