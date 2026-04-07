import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  images: string[];
}

const fromDB = (r: RoomRow): Room => ({
  id: r.id,
  name: r.name,
  priceNight: r.price_night,
  priceDay: r.price_day,
  capacity: r.capacity,
  count: 1,
  description: r.description,
  longDescription: r.long_description,
  amenities: r.amenities,
  images: r.images,
});

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('rooms')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setRooms((data as RoomRow[]).map(fromDB));
        setLoading(false);
      });
  }, []);

  const totalApartments = rooms.length;

  return { rooms, loading, totalApartments };
};
