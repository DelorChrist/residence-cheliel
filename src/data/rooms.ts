export interface Room {
  id: string;
  name: string;
  price: number;
  capacity: string;
  count: number;
  description: string;
  longDescription: string;
  amenities: string[];
  images: string[];
}

export const rooms: Room[] = [
  {
    id: "appartement-king",
    name: "Appartement King Size",
    price: 30000,
    capacity: "3 personnes",
    count: 5,
    description: "Spacieux appartement avec lit King Size 3 places, idéal pour les familles ou groupes souhaitant profiter d'un confort haut de gamme à Yamoussoukro.",
    longDescription: "Nos 5 appartements King Size sont conçus pour offrir un espace généreux et raffiné. Chaque appartement dispose d'un grand lit King Size pouvant accueillir jusqu'à 3 personnes, d'une cuisine entièrement équipée, d'une salle de bain privative avec eau chaude et d'une climatisation silencieuse. La décoration soignée et les équipements modernes font de ces appartements le choix idéal pour un séjour en famille, entre amis ou en groupe professionnel à Yamoussoukro.",
    amenities: ["Lit King Size 3 places", "Climatisation", "Smart TV", "Wi-Fi Haut Débit", "Cuisine équipée", "Salle de bain privative", "Eau chaude", "Réfrigérateur", "Ustensiles de cuisine", "Parking sécurisé"],
    images: ["/images/chambre1.jpg", "/images/chambre2.jpg", "/images/chambre3.jpg"]
  },
  {
    id: "appartement-double",
    name: "Appartement Double",
    price: 25000,
    capacity: "2 personnes",
    count: 2,
    description: "Appartement confortable avec lit double 2 places, parfait pour les couples ou voyageurs professionnels en quête de calme et d'élégance.",
    longDescription: "Nos 2 appartements Double sont pensés pour les couples et voyageurs en solo ou en duo. Chaque appartement offre un lit double confortable, une cuisine équipée pour préparer vos repas, une salle de bain privative et une connexion Wi-Fi haut débit. Dans un cadre calme et sécurisé à Morofé, ces appartements sont idéaux pour les séjours professionnels ou romantiques à Yamoussoukro.",
    amenities: ["Lit Double 2 places", "Climatisation", "Smart TV", "Wi-Fi Haut Débit", "Cuisine équipée", "Salle de bain privative", "Eau chaude", "Réfrigérateur", "Bureau de travail", "Parking sécurisé"],
    images: ["/images/chambre4.jpeg", "/images/chambre5.jpeg", "/images/chambre6.jpeg"]
  }
];

export const RESIDENCE_INFO = {
  totalApartments: 7,
  kingSize: { count: 5, price: 30000 },
  double: { count: 2, price: 25000 },
};
