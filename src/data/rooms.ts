export interface Room {
  id: string;
  name: string;
  priceNight: number;
  priceDay: number;
  capacity: string;
  count: number;
  description: string;
  longDescription: string;
  amenities: string[];
  images: string[];
}

export const rooms: Room[] = [
  {
    id: 'appartement-king-1',
    name: 'Suite Prestige',
    priceNight: 30000,
    priceDay: 30000,
    capacity: '3 personnes',
    count: 1,
    description: 'Suite haut de gamme avec lit King Size 3 places, décoration raffinée et vue dégagée pour un séjour d\'exception.',
    longDescription: 'La Suite Prestige est notre appartement phare. Avec son grand lit King Size 3 places, sa décoration soignée et ses équipements modernes, elle offre une expérience de luxe incomparable à Yamoussoukro. Idéale pour les familles ou les groupes souhaitant le meilleur confort.',
    amenities: ['Lit King Size 3 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Ustensiles de cuisine', 'Parking sécurisé'],
    images: ['/images/suite.jpg', '/images/chambre1.jpg', '/images/chambre2.jpg']
  },
  {
    id: 'appartement-king-2',
    name: 'Appartement King Deluxe',
    priceNight: 30000,
    priceDay: 30000,
    capacity: '3 personnes',
    count: 1,
    description: 'Appartement spacieux avec lit King Size 3 places, idéal pour les familles ou groupes en quête de confort et d\'espace.',
    longDescription: 'L\'Appartement King Deluxe offre tout le confort nécessaire pour un séjour agréable. Son grand lit King Size, sa cuisine entièrement équipée et sa salle de bain privative en font un choix idéal pour les familles ou les groupes professionnels.',
    amenities: ['Lit King Size 3 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Ustensiles de cuisine', 'Parking sécurisé'],
    images: ['/images/chambre3.jpg', '/images/chambre1.jpg', '/images/suite.jpg']
  },
  {
    id: 'appartement-king-3',
    name: 'Appartement King Confort',
    priceNight: 30000,
    priceDay: 30000,
    capacity: '3 personnes',
    count: 1,
    description: 'Appartement confortable avec lit King Size 3 places, parfait pour un séjour en famille ou entre amis à Yamoussoukro.',
    longDescription: 'L\'Appartement King Confort allie espace et modernité. Avec son lit King Size pouvant accueillir 3 personnes, sa cuisine équipée et son cadre paisible à Morofé, il est parfait pour les séjours prolongés en famille ou entre amis.',
    amenities: ['Lit King Size 3 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Ustensiles de cuisine', 'Parking sécurisé'],
    images: ['/images/chambre2.jpg', '/images/chambre3.jpg', '/images/chambre1.jpg']
  },
  {
    id: 'appartement-king-4',
    name: 'Appartement King Premium',
    priceNight: 30000,
    priceDay: 30000,
    capacity: '3 personnes',
    count: 1,
    description: 'Appartement premium avec lit King Size 3 places, équipements haut de gamme et ambiance chaleureuse.',
    longDescription: 'L\'Appartement King Premium vous accueille dans un cadre élégant et chaleureux. Son lit King Size, ses équipements premium et sa décoration soignée en font un choix de prédilection pour les voyageurs exigeants.',
    amenities: ['Lit King Size 3 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Ustensiles de cuisine', 'Parking sécurisé'],
    images: ['/images/chambre4.jpeg', '/images/chambre5.jpeg', '/images/chambre6.jpeg']
  },
  {
    id: 'appartement-king-5',
    name: 'Appartement King Élégance',
    priceNight: 30000,
    priceDay: 30000,
    capacity: '3 personnes',
    count: 1,
    description: 'Appartement élégant avec lit King Size 3 places, idéal pour les séjours professionnels ou familiaux de longue durée.',
    longDescription: 'L\'Appartement King Élégance est pensé pour les longs séjours. Son espace généreux, son lit King Size et ses équipements complets vous permettront de vous sentir comme chez vous tout en profitant du confort d\'un hébergement haut de gamme.',
    amenities: ['Lit King Size 3 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Ustensiles de cuisine', 'Parking sécurisé'],
    images: ['/images/chambre5.jpeg', '/images/chambre6.jpeg', '/images/chambre4.jpeg']
  },
  {
    id: 'appartement-double-1',
    name: 'Studio Double Confort',
    priceNight: 25000,
    priceDay: 25000,
    capacity: '2 personnes',
    count: 1,
    description: 'Studio confortable avec lit double 2 places, parfait pour les couples ou voyageurs professionnels.',
    longDescription: 'Le Studio Double Confort est idéal pour les couples et les voyageurs en solo ou en duo. Son lit double confortable, sa cuisine équipée et son ambiance cosy en font un nid douillet au cœur de Yamoussoukro.',
    amenities: ['Lit Double 2 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Bureau de travail', 'Parking sécurisé'],
    images: ['/images/studio.jpg', '/images/chambre6.jpeg', '/images/standard.jpg']
  },
  {
    id: 'appartement-double-2',
    name: 'Chambre Standard Double',
    priceNight: 25000,
    priceDay: 25000,
    capacity: '2 personnes',
    count: 1,
    description: 'Chambre standard avec lit double 2 places, idéale pour les séjours courts ou professionnels.',
    longDescription: 'La Chambre Standard Double offre tout l\'essentiel pour un séjour confortable. Son lit double, sa salle de bain privative et sa connexion Wi-Fi haut débit en font un choix pratique et abordable pour les voyageurs professionnels ou les couples.',
    amenities: ['Lit Double 2 places', 'Climatisation', 'Smart TV', 'Wi-Fi Haut Débit', 'Cuisine équipée', 'Salle de bain privative', 'Eau chaude', 'Réfrigérateur', 'Bureau de travail', 'Parking sécurisé'],
    images: ['/images/standard.jpg', '/images/studio.jpg', '/images/chambre5.jpeg']
  }
];

export const RESIDENCE_INFO = {
  totalApartments: 7,
  kingSize: { count: 5, priceNight: 30000, priceDay: 30000 },
  double: { count: 2, priceNight: 25000, priceDay: 25000 },
};
