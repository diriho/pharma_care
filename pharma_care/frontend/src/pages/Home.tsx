import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
      className="bg-white rounded-2xl p-8 border border-[#f0f0f0] shadow-sm hover:shadow-lg transition-all"
    >
      <div className="h-12 w-12 rounded-xl bg-[#e9f7ef] flex items-center justify-center text-[#063b1e] mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-[#063b1e] mb-2">{title}</h3>
      <p className="text-[#52525b] leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fcfcfc]">
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
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-[#e9f7ef] text-[#063b1e] text-sm font-semibold">
                Gestion intelligente pour pharmacies du Burundi
              </span>
              <h1 className="text-[2.5rem] md:text-[5rem] font-bold tracking-[-0.04em] text-[#063b1e] mb-8 leading-[0.95]">
                Votre pharmacie,
                <br />
                <span className="text-[#063b1e]">parfaitement organisée.</span>
              </h1>
              <p className="max-w-2xl mx-auto mb-12 text-lg md:text-xl text-[#52525b] font-medium">
                Pharma Core centralise votre inventaire, vos ventes, vos patients
                et vos fournisseurs dans une plateforme sécurisée. Suivi en
                temps réel, alertes intelligentes et analyses détaillées —
                conçu pour les officines burundaises.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="group flex items-center gap-2 px-8 py-4 bg-[#063b1e] text-[#6eff8a] rounded-full font-bold text-lg shadow-lg hover:bg-black transition-all"
                >
                  Commencer gratuitement
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#services"
                  className="px-8 py-4 bg-white border border-[#e4e4e7] rounded-full font-bold text-lg hover:bg-[#f4f4f5] transition-colors"
                >
                  Voir les services
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="py-20 px-4 bg-white border-y border-[#f0f0f0]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-bold text-[#063b1e] mb-4 tracking-tight">
                Tout ce dont votre officine a besoin
              </h2>
              <p className="text-lg text-[#52525b] max-w-2xl mx-auto">
                Une suite complète d'outils pensés pour les pharmaciens —
                simples, rapides et fiables.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ServiceCard
                icon={<ShoppingCart className="h-6 w-6" />}
                title="Point de Vente (POS)"
                description="Caisse rapide avec lecture des stocks en temps réel, calcul automatique en FBU et tickets de vente détaillés."
              />
              <ServiceCard
                icon={<Pill className="h-6 w-6" />}
                title="Inventaire des Médicaments"
                description="Gérez votre catalogue, suivez les lots, dates de péremption et niveaux de stock avec précision."
              />
              <ServiceCard
                icon={<Users className="h-6 w-6" />}
                title="Patients & Clients"
                description="Base de données patients sécurisée avec historique d'achats, allergies et notes cliniques."
              />
              <ServiceCard
                icon={<Truck className="h-6 w-6" />}
                title="Fournisseurs & Approvisionnements"
                description="Gérez vos fournisseurs et créez des commandes de réapprovisionnement qui mettent à jour le stock automatiquement."
              />
              <ServiceCard
                icon={<BarChart3 className="h-6 w-6" />}
                title="Analyses & Rapports"
                description="Tableaux de bord avec chiffre d'affaires, médicaments les plus vendus et valorisation du stock."
              />
              <ServiceCard
                icon={<BellRing className="h-6 w-6" />}
                title="Alertes Intelligentes"
                description="Notifications automatiques pour stock bas et péremptions proches — paramétrables par pharmacie."
              />
            </div>
          </div>
        </section>

        {/* Features secondary */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-start">
              <Shield className="h-10 w-10 text-[#063b1e] mb-4" />
              <h3 className="text-2xl font-bold text-[#063b1e] mb-2">
                Données isolées par pharmacie
              </h3>
              <p className="text-[#52525b]">
                Chaque officine accède uniquement à ses propres données,
                protégées par authentification et politiques de sécurité strictes
                (Row-Level Security).
              </p>
            </div>
            <div className="flex flex-col items-start">
              <Download className="h-10 w-10 text-[#063b1e] mb-4" />
              <h3 className="text-2xl font-bold text-[#063b1e] mb-2">
                Export complet en JSON
              </h3>
              <p className="text-[#52525b]">
                Téléchargez à tout moment l'historique complet de votre pharmacie
                pour archivage, audit ou migration.
              </p>
            </div>
            <div className="flex flex-col items-start">
              <BellRing className="h-10 w-10 text-[#063b1e] mb-4" />
              <h3 className="text-2xl font-bold text-[#063b1e] mb-2">
                Alertes en temps réel
              </h3>
              <p className="text-[#52525b]">
                Stock bas ou médicaments approchant la péremption ? Pharma Core
                vous alerte au bon moment.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="py-20 px-4 bg-[#063b1e]">
          <div className="max-w-[1200px] mx-auto text-center">
            <h2 className="text-4xl md:text-[4rem] font-bold text-[#6eff8a] mb-8 tracking-[-0.02em] leading-[1.05]">
              Prêt à moderniser
              <br />
              votre officine ?
            </h2>
            <p className="text-lg text-[#cbd5e1] mb-10 max-w-xl mx-auto">
              Créez votre compte gratuit et commencez à gérer votre pharmacie en
              quelques minutes.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#063b1e] rounded-full font-bold text-lg hover:bg-[#6eff8a] transition-colors"
            >
              Créer mon compte
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
