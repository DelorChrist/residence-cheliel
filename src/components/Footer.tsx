import { useState } from 'react';
import { MapPin, Phone, Download, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePWAContext } from '../contexts/PWAContext';
import { LegalModal, LegalTab } from './LegalModal';

export const Footer = () => {
  const { isInstalled, openInstallDialog } = usePWAContext();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('rgcc');

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <>
      <footer id="footer" className="bg-primary-900 text-primary-100 py-16">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1 : Marque & Présentation */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img src="/images/logo.png" alt="Logo Résidence Cheliel" className="w-12 h-12 rounded-xl object-cover shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-white/10" />
              <div className="font-heading font-bold text-2xl text-white">Résidence Cheliel</div>
            </div>
            <p className="text-primary-200 mb-6 leading-relaxed text-sm">
              Venez vivre l'art de vivre et l'élégance à Yamoussoukro. Un cadre d'exception à Morofé, à 100m du foyer des jeunes.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full bg-[#1877F2] hover:bg-[#0d6efd] flex items-center justify-center transition-all hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://www.instagram.com/residence_cheliel" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 bg-[radial-gradient(circle_at_30%_107%,_#fdf497_0%,_#fdf497_5%,_#fd5949_45%,_#d6249f_60%,_#285AEB_90%)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://wa.me/2250779277924" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] flex items-center justify-center transition-all hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@cheliel_residence?_r=1&_t=ZS-95IWZjo3QhQ" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
              </a>
            </div>
          </div>

          {/* Col 2 : Coordonnées */}
          <div>
            <h4 className="text-white font-heading font-bold mb-5 text-base uppercase tracking-wider">Contact & Accès</h4>
            <ul className="space-y-4 text-primary-200 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="shrink-0 text-primary-400 mt-0.5" />
                <span className="leading-relaxed">Morofé, à 100m du foyer des jeunes,<br />Yamoussoukro, Côte d'Ivoire</span>
              </li> 
              <li className="flex items-center gap-3">
                <Phone size={18} className="shrink-0 text-primary-400" />
                <a href="tel:+2250706601220" className="hover:text-white transition-colors">+225 07 06 60 12 20</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="shrink-0 text-primary-400" />
                <a href="tel:+2250779277924" className="hover:text-white transition-colors">+225 07 79 27 79 24</a>
              </li>
            </ul>
          </div>

          {/* Col 3 : Accès Rapide */}
          <div>
            <h4 className="text-white font-heading font-bold mb-5 text-base uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-3 text-primary-200 text-sm">
              <li><Link to="/" className="hover:text-white hover:pl-1 transition-all">Accueil</Link></li>
              <li><Link to="/chambres" className="hover:text-white hover:pl-1 transition-all">Nos Chambres</Link></li>
              <li><Link to="/a-propos" className="hover:text-white hover:pl-1 transition-all">À Propos</Link></li>
              <li><Link to="/mes-reservations" className="hover:text-white hover:pl-1 transition-all">Mes Réservations</Link></li>
              <li><a href="#footer" className="hover:text-white hover:pl-1 transition-all">Nous Contacter</a></li>
              {!isInstalled && (
                <li>
                  <button
                    onClick={openInstallDialog}
                    className="flex items-center gap-1.5 text-primary-300 hover:text-white hover:pl-1 transition-all font-medium"
                  >
                    <Download size={14} />
                    <span>Installer l'application</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4 : Règlements & Légal */}
          <div>
            <h4 className="text-white font-heading font-bold mb-5 text-base uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-400" />
              <span>Règlements & Légal</span>
            </h4>
            <ul className="space-y-3 text-primary-200 text-sm">
              <li>
                <button
                  onClick={() => openLegal('rgcc')}
                  className="text-left hover:text-white hover:pl-1 transition-all flex items-center gap-1.5 text-primary-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                  <span>Règlement Général</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => openLegal('pdc')}
                  className="text-left hover:text-white hover:pl-1 transition-all flex items-center gap-1.5 text-primary-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                  <span>Politique de Confidentialité</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => openLegal('mentions')}
                  className="text-left hover:text-white hover:pl-1 transition-all flex items-center gap-1.5 text-primary-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                  <span>Mentions Légales</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => openLegal('faq')}
                  className="text-left hover:text-white hover:pl-1 transition-all flex items-center gap-1.5 text-primary-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                  <span>FAQ & Politique d'Annulation</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-6 mt-12 pt-8 border-t border-primary-800/80 flex flex-col sm:flex-row items-center justify-between text-primary-300 text-xs gap-4">
          <div>
            &copy; {new Date().getFullYear()} Résidence Cheliel. Tous droits réservés.
          </div>
          <div className="flex gap-4">
            <button onClick={() => openLegal('rgcc')} className="hover:text-white transition-colors">Règlement Général</button>
            <span>•</span>
            <button onClick={() => openLegal('pdc')} className="hover:text-white transition-colors">Politique de Confidentialité</button>
            <span>•</span>
            <button onClick={() => openLegal('mentions')} className="hover:text-white transition-colors">Mentions Légales</button>
            <span>•</span>
            <button onClick={() => openLegal('faq')} className="hover:text-white transition-colors">FAQ</button>
          </div>
        </div>
      </footer>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalTab}
      />
    </>
  );
};

