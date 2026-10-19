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
  imagePrincipale: string;
  images: string[];
  videoUrl?: string;
}

// Données statiques vides — toutes les chambres sont gérées depuis l'espace admin
export const rooms: Room[] = [];

export const RESIDENCE_INFO = {
  totalApartments: 0,
  kingSize: { count: 0, priceNight: 0, priceDay: 0 },
  double: { count: 0, priceNight: 0, priceDay: 0 },
};
