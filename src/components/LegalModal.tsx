import { useState, useEffect } from 'react';
import { X, Shield, FileText, Scale, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';

export type LegalTab = 'rgcc' | 'pdc' | 'mentions' | 'faq';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: LegalTab;
}

export const LegalModal = ({ isOpen, onClose, defaultTab = 'rgcc' }: LegalModalProps) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#faf9f8] border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
              <Scale size={20} />
            </div>
            <div>
              <h2 id="legal-modal-title" className="font-heading font-bold text-xl text-gray-900">
                Informations & Règlements
              </h2>
              <p className="text-xs text-gray-500">Résidence Cheliel — Morofé, Yamoussoukro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Onglets */}
        <div className="px-6 border-b border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('rgcc')}
            className={`py-3.5 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'rgcc'
                ? 'border-primary-600 text-primary-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText size={16} />
            <span>Règlement Général</span>
          </button>
          <button
            onClick={() => setActiveTab('pdc')}
            className={`py-3.5 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'pdc'
                ? 'border-primary-600 text-primary-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Shield size={16} />
            <span>Politique de Confidentialité</span>
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={`py-3.5 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'mentions'
                ? 'border-primary-600 text-primary-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Scale size={16} />
            <span>Mentions Légales</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-3.5 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'faq'
                ? 'border-primary-600 text-primary-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HelpCircle size={16} />
            <span>FAQ & Annulation</span>
          </button>
        </div>

        {/* Contenu Déroulant */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-gray-600 leading-relaxed">
          {activeTab === 'rgcc' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  1. Objet et Champ d'Application
                </h3>
                <p>
                  Le présent Règlement Général et Conditions Contractuelles régit l'ensemble des réservations 
                  et séjours au sein de la <strong>Résidence Cheliel</strong>, située à Yamoussoukro, Morofé à 100m du foyer des jeunes. 
                  Toute confirmation de réservation implique l'adhésion pleine et entière du client aux présentes conditions.
                </p>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  2. Horaires d'Arrivée et de Départ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                  <div className="p-4 rounded-xl bg-primary-50/60 border border-primary-100">
                    <span className="font-bold text-primary-900 block text-xs uppercase tracking-wider mb-1">Arrivée (Check-in)</span>
                    <span className="text-gray-800 font-medium">À partir de 14h00</span>
                    <p className="text-xs text-gray-500 mt-1">Accueil 24h/24 sur préavis horaire.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary-50/60 border border-primary-100">
                    <span className="font-bold text-primary-900 block text-xs uppercase tracking-wider mb-1">Départ (Check-out)</span>
                    <span className="text-gray-800 font-medium">Jusqu'à 12h00</span>
                    <p className="text-xs text-gray-500 mt-1">Départ tardif possible selon disponibilité.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  3. Modalités de Paiement
                </h3>
                <p>
                  Les réservations sont payables en Francs CFA (FCFA). Les modes de paiement acceptés sont :
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Wave Mobile Money</strong> (+225 07 79 27 79 24 / +225 07 06 60 12 20)</li>
                  <li><strong>Orange Money</strong> (+225 07 79 27 79 24 / +225 07 06 60 12 20)</li>
                  <li>Espèces à la réception (sur confirmation préalable)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  4. Règles de Vie et Sécurité
                </h3>
                <ul className="space-y-2 mt-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary-600 shrink-0 mt-0.5" />
                    <span><strong>Calme nocturne :</strong> Le respect de la tranquillité des résidents est exigé entre 22h00 et 07h00.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary-600 shrink-0 mt-0.5" />
                    <span><strong>Interdiction de fumer :</strong> Tous les appartements sont non-fumeurs. Des espaces extérieurs sont prévus.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary-600 shrink-0 mt-0.5" />
                    <span><strong>Accès sécurisé :</strong> L'accès à la résidence est surveillé 24h/24 par notre personnel de sécurité.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary-600 shrink-0 mt-0.5" />
                    <span><strong>Capacité :</strong> Le nombre de résidents ne doit pas dépasser la capacité stipulée lors de la réservation.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  5. Caution et Responsabilité
                </h3>
                <p>
                  Une pièce d'identité valide (CNI, Passeport, Attestation) est requise à l'arrivée. Le client est responsable 
                  de l'état des lieux, du mobilier et des équipements mis à sa disposition. Toute dégradation pourra faire l'objet 
                  d'une facturation compensatoire.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'pdc' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  1. Protection des Données Personnelles
                </h3>
                <p>
                  La <strong>Résidence Cheliel</strong> s'engage à protéger la vie privée de ses clients et utilisateurs. 
                  Cette Politique de Confidentialité détaille la manière dont nous collectons, utilisons et protégeons 
                  vos informations personnelles conformément aux réglementations applicables en Côte d'Ivoire et aux standards internationaux (RGPD).
                </p>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  2. Données Collectées
                </h3>
                <p>Dans le cadre de votre réservation, nous collectons strictement les données nécessaires :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Nom et prénom du client</li>
                  <li>Numéro de téléphone mobile (utilisé pour la confirmation et le suivi du séjour)</li>
                  <li>Adresse email (envoi du reçu PDF et notification de réservation)</li>
                  <li>Dates de séjour et préférences sélectionnées</li>
                </ul>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  3. Utilisation et Confidentialité
                </h3>
                <p>
                  Vos informations sont exclusivement destinées à la gestion de vos réservations, à votre accueil à la résidence 
                  et à la communication d'informations relatives à votre séjour. 
                  <strong> Elles ne sont en aucun cas vendues, cédées ou transmises à des tiers à des fins publicitaires.</strong>
                </p>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  4. Sécurité des Données et PWA
                </h3>
                <p>
                  Les données transmises sur notre site web et notre application PWA sont chiffrées de bout en bout via le protocole sécurisé 
                  <strong> HTTPS / TLS</strong>. Notre API est protégée par un pare-feu Cloudflare Turnstile contre les abus et les attaques automatisées.
                </p>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  5. Vos Droits
                </h3>
                <p>
                  Vous disposez d'un droit d'accès, de modification ou de suppression de vos données personnelles. 
                  Pour toute demande, vous pouvez nous contacter directement par WhatsApp au <strong>+225 07 79 27 79 24</strong> ou par email à la direction.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'mentions' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  1. Éditeur de l'Application
                </h3>
                <p>
                  <strong>Résidence Cheliel</strong><br />
                  Établissement hôtelier & résidences meublées haut standing.<br />
                  Localisation : Morofé, à 100m du foyer des jeunes, Yamoussoukro, Côte d'Ivoire.<br />
                  Téléphones : +225 07 06 60 12 20 / +225 07 79 27 79 24<br />
                  Site officiel : <a href="https://residencescheliel.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">residencescheliel.com</a>
                </p>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  2. Hébergement
                </h3>
                <p>
                  Le site web et l'API de Résidence Cheliel sont hébergés sur les infrastructures sécurisées de :<br />
                  <strong>o2switch SARL</strong><br />
                  Chemin des Pardiaux, 63000 Clermont-Ferrand, France.<br />
                  Site web : <a href="https://www.o2switch.fr" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">www.o2switch.fr</a>
                </p>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2">
                  3. Propriété Intellectuelle
                </h3>
                <p>
                  L'ensemble des contenus (textes, photographies des appartements, logo, identité graphique, structure) 
                  sont la propriété exclusive de la Résidence Cheliel. Toute reproduction partielle ou totale sans autorisation 
                  préalable est formellement interdite.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-4 animate-fade-in">
              {[
                {
                  q: "Comment réserver un appartement aux Résidences Cheliel ?",
                  a: "Vous pouvez réserver directement en ligne sur notre site en cliquant sur 'Réserver', en choisissant vos dates et votre mode de paiement (Wave ou Orange Money). Vous pouvez aussi réserver directement par WhatsApp au +225 07 79 27 79 24."
                },
                {
                  q: "Quelles sont les conditions d'annulation ?",
                  a: "L'annulation est gratuite jusqu'à 24 heures avant l'heure d'arrivée prévue. En cas d'annulation tardive ou de non-présentation, la première nuitée pourra être retenue."
                },
                {
                  q: "Le Wi-Fi et la climatisation sont-ils inclus ?",
                  a: "Oui, tous nos appartements disposent du Wi-Fi haut débit par fibre optique, de la climatisation intégrale, d'un chauffe-eau et des chaînes Canal+ sans supplément."
                },
                {
                  q: "La piscine et le bar lounge sont-ils accessibles ?",
                  a: "Absolument. La piscine est accessible à tous nos résidents selon les horaires d'ouverture affichés. Notre bar lounge propose une sélection de rafraîchissements."
                },
                {
                  q: "Puis-je consulter ou modifier ma réservation ?",
                  a: "Oui, l'onglet 'Mes Réservations' vous permet de saisir votre numéro de téléphone pour retrouver l'historique de vos réservations, leur statut et télécharger votre reçu au format PDF."
                }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#faf9f8] border border-gray-100">
                  <h4 className="font-heading font-bold text-gray-900 text-sm mb-1.5 flex items-center gap-2">
                    <ChevronRight size={16} className="text-primary-600 shrink-0" />
                    {item.q}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm pl-6 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <p className="text-xs text-gray-500">
            Besoin d'aide ? Appelez le <a href="tel:+2250779277924" className="text-primary-700 font-semibold underline">+225 07 79 27 79 24</a>
          </p>
          <button
            onClick={onClose}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
