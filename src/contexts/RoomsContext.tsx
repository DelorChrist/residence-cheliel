import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, DEFAULT_ROOM_AMENITIES } from '../lib/api';
import type { Room } from '../data/rooms';

interface RoomRow {
  id: string;
  name: string;
  price_night: number;
  price_day: number;
  capacity: string;
  description: string;
  long_description: string;
  amenities: string[];
  image_principale: string;
  images: string[];
  video_url?: string;
  video_urls?: string[];
}

const fromDB = (r: RoomRow): Room => {
  const vList = Array.isArray(r.video_urls) && r.video_urls.length > 0
    ? r.video_urls.filter(Boolean)
    : (r.video_url ? [r.video_url].filter(Boolean) : []);
  const amList = Array.isArray(r.amenities) && r.amenities.length > 0
    ? r.amenities
    : DEFAULT_ROOM_AMENITIES;
  return {
    id: r.id,
    name: r.name,
    priceNight: r.price_night,
    priceDay: r.price_day,
    capacity: r.capacity,
    count: 1,
    description: r.description,
    longDescription: r.long_description,
    amenities: amList,
    imagePrincipale: r.image_principale ?? '',
    images: r.images,
    videoUrl: vList[0] || '',
    videoUrls: vList,
  };
};

interface RoomsContextValue {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  totalApartments: number;
  refresh: () => Promise<void>;
}

const RoomsContext = createContext<RoomsContextValue | null>(null);

export const RoomsProvider = ({ children }: { children: ReactNode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await api
      .from('rooms')
      .select('*')
      .order('name');

    if (error) {
      setError('Impossible de charger les appartements.');
      setRooms([]);
    } else if (data) {
      setRooms((data as RoomRow[]).map(fromDB));
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    // Realtime : mise à jour automatique quand l'admin modifie les chambres
    const channel = api
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => { api.removeChannel(channel); };
  }, []);

  return (
    <RoomsContext.Provider value={{ rooms, loading, error, totalApartments: rooms.length, refresh: fetchRooms }}>
      {children}
    </RoomsContext.Provider>
  );
};

export const useRooms = (): RoomsContextValue => {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms doit être utilisé dans un <RoomsProvider>');
  return ctx;
};
