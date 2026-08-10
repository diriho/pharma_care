import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ShoppingCart,
  Pill,
  Users,
  Truck,
  BarChart3,
  BellRing,
  Shield,
  Download,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

type ServiceCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function ServiceCard({ icon, title, description }: ServiceCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-[#f0f0f0] dark:border-slate-800 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="h-12 w-12 rounded-xl bg-[#e9f7ef] dark:bg-slate-800 flex items-center justify-center text-[#063b1e] dark:text-[#6eff8a] mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-2">{title}</h3>
      <p className="text-[#52525b] dark:text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Home() {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col min-h-screen bg-[#fcfcfc] dark:bg-slate-950">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 md:pt-40 pb-20 px-4">
          <div className="max-w-[1200px] mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-[#e9f7ef] dark:bg-slate-800 text-[#063b1e] dark:text-[#6eff8a] text-sm font-semibold">
                {t("home.badge")}
              </span>
              <h1 className="text-[2.5rem] md:text-[5rem] font-bold tracking-[-0.04em] text-[#063b1e] dark:text-[#6eff8a] mb-8 leading-[0.95]">
                {t("home.heroTitle1")}
                <br />
                <span className="text-[#063b1e] dark:text-[#6eff8a]">{t("home.heroTitle2")}</span>
              </h1>
              <p className="max-w-2xl mx-auto mb-12 text-lg md:text-xl text-[#52525b] dark:text-slate-400 font-medium">
                {t("home.heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="group flex items-center gap-2 px-8 py-4 bg-[#063b1e] text-[#6eff8a] rounded-full font-bold text-lg shadow-lg hover:bg-black transition-all"
                >
                  {t("home.ctaStart")}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#services"
                  className="px-8 py-4 bg-white dark:bg-slate-900 border border-[#e4e4e7] dark:border-slate-700 text-[#0f172a] dark:text-slate-100 rounded-full font-bold text-lg hover:bg-[#f4f4f5] dark:hover:bg-slate-800 transition-colors"
                >
                  {t("home.ctaSeeServices")}
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="py-20 px-4 bg-white dark:bg-slate-900 border-y border-[#f0f0f0] dark:border-slate-800">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-4 tracking-tight">
                {t("home.servicesTitle")}
              </h2>
              <p className="text-lg text-[#52525b] dark:text-slate-400 max-w-2xl mx-auto">
                {t("home.servicesSubtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ServiceCard
                icon={<ShoppingCart className="h-6 w-6" />}
                title={t("home.service.posTitle")}
                description={t("home.service.posDesc")}
              />
              <ServiceCard
                icon={<Pill className="h-6 w-6" />}
                title={t("home.service.inventoryTitle")}
                description={t("home.service.inventoryDesc")}
              />
              <ServiceCard
                icon={<Users className="h-6 w-6" />}
                title={t("home.service.patientsTitle")}
                description={t("home.service.patientsDesc")}
              />
              <ServiceCard
                icon={<Truck className="h-6 w-6" />}
                title={t("home.service.suppliersTitle")}
                description={t("home.service.suppliersDesc")}
              />
              <ServiceCard
                icon={<BarChart3 className="h-6 w-6" />}
                title={t("home.service.analyticsTitle")}
                description={t("home.service.analyticsDesc")}
              />
              <ServiceCard
                icon={<BellRing className="h-6 w-6" />}
                title={t("home.service.alertsTitle")}
                description={t("home.service.alertsDesc")}
              />
            </div>
          </div>
        </section>

        {/* Features secondary */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-start">
              <Shield className="h-10 w-10 text-[#063b1e] dark:text-[#6eff8a] mb-4" />
              <h3 className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-2">
                {t("home.feature.isolationTitle")}
              </h3>
              <p className="text-[#52525b] dark:text-slate-400">{t("home.feature.isolationDesc")}</p>
            </div>
            <div className="flex flex-col items-start">
              <Download className="h-10 w-10 text-[#063b1e] dark:text-[#6eff8a] mb-4" />
              <h3 className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-2">
                {t("home.feature.exportTitle")}
              </h3>
              <p className="text-[#52525b] dark:text-slate-400">{t("home.feature.exportDesc")}</p>
            </div>
            <div className="flex flex-col items-start">
              <BellRing className="h-10 w-10 text-[#063b1e] dark:text-[#6eff8a] mb-4" />
              <h3 className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-2">
                {t("home.feature.alertsTitle")}
              </h3>
              <p className="text-[#52525b] dark:text-slate-400">{t("home.feature.alertsDesc")}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="py-20 px-4 bg-[#063b1e]">
          <div className="max-w-[1200px] mx-auto text-center">
            <h2 className="text-4xl md:text-[4rem] font-bold text-[#6eff8a] mb-8 tracking-[-0.02em] leading-[1.05]">
              {t("home.ctaTitle1")}
              <br />
              {t("home.ctaTitle2")}
            </h2>
            <p className="text-lg text-[#cbd5e1] mb-10 max-w-xl mx-auto">{t("home.ctaSubtitle")}</p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#063b1e] rounded-full font-bold text-lg hover:bg-[#6eff8a] transition-colors"
            >
              {t("home.ctaButton")}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
