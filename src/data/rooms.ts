export interface Room {
  id: string;
  name: string;
  price: number;
  description: string;
  amenities: string[];
  images: string[];
}

export const rooms: Room[] = [
  {
    id: "suite-prestige",
    name: "Suite Prestige",
    price: 45000,
    description: "L'élégance absolue avec un grand espace salon, chambre séparée et une décoration raffinée pour un séjour inoubliable.",
    amenities: ["Grand lit King Size", "Salon privé", "Climatisation", "Smart TV 55\"", "Wi-Fi Haut Débit", "Cuisine équipée", "Salle de bain en marbre"],
    images: ["/images/suite.jpg", "/images/hero.jpg"] // Using hero image as an alternate angle for demo
  },
  {
    id: "studio-confort",
    name: "Studio Confort",
    price: 30000,
    description: "Espace optimisé et chaleureux avec kitchenette intégrée, parfait pour les séjours professionnels ou en couple.",
    amenities: ["Lit Queen Size", "Coin repas/travail", "Climatisation", "Smart TV 43\"", "Wi-Fi", "Kitchenette", "Douche à l'italienne"],
    images: ["/images/studio.jpg", "/images/standard.jpg"]
  },
  {
    id: "chambre-standard",
    name: "Chambre Standard",
    price: 20000,
    description: "Confort essentiel et design soigné, idéale pour des séjours courts ou professionnels à petit budget.",
    amenities: ["Lit Double", "Bureau", "Climatisation", "TV Écran Plat", "Wi-Fi", "Mini-réfrigérateur", "Salle d'eau privative"],
    images: ["/images/standard.jpg", "/images/studio.jpg"]
  }
];