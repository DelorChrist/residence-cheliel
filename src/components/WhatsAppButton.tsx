const MESSAGE = encodeURIComponent('Bonjour, je souhaite réserver une chambre à la Résidence Cheliel.');

export const WhatsAppButton = () => (
  <a
    href={`https://wa.me/2250706601220?text=${MESSAGE}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Contacter via WhatsApp"
    className="fixed bottom-6 right-6 z-50 flex items-center overflow-hidden rounded-full shadow-2xl shadow-green-900/30 bg-gradient-to-r from-green-500 to-green-400 w-14 hover:w-60 h-14 transition-all duration-500 ease-in-out group border-2 border-white/20"
  >
    {/* Icône */}
    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ml-2 ring-2 ring-white/30">
      <img src="/images/whatsapp.jpeg" alt="WhatsApp" className="w-full h-full object-cover" />
    </div>

    {/* Texte */}
    <div className="flex flex-col justify-center pl-3 pr-4 overflow-hidden">
      <span className="text-white font-bold text-sm whitespace-nowrap translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 delay-150 leading-tight">
        Contactez-nous
      </span>
      <span className="text-green-100 text-xs whitespace-nowrap translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 delay-200 leading-tight">
        sur WhatsApp
      </span>
    </div>
  </a>
);
