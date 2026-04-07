import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type PaymentMethod = 'Orange Money' | 'Wave';
export type ReservationStatus = 'Confirmé' | 'En attente' | 'Annulé';
export type StayType = 'nuitée' | 'journée';

export interface Reservation {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  roomId: string;
  stayType: StayType;
  checkIn: string;
  checkOut: string;
  remarks?: string;
  paymentMethod: PaymentMethod;
  status: ReservationStatus;
  createdAt: string;
}

export const getNights = (checkIn: string, checkOut: string): number => {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
};

// Convertir snake_case Supabase → camelCase
const fromDB = (r: any): Reservation => ({
  id: r.id,
  clientName: r.client_name,
  phone: r.phone,
  email: r.email,
  roomId: r.room_id,
  stayType: r.stay_type,
  checkIn: r.check_in,
  checkOut: r.check_out,
  remarks: r.remarks,
  paymentMethod: r.payment_method,
  status: r.status,
  createdAt: r.created_at,
});

// Convertir camelCase → snake_case Supabase
const toDB = (r: Omit<Reservation, 'createdAt'>) => ({
  id: r.id,
  client_name: r.clientName,
  phone: r.phone,
  email: r.email || null,
  room_id: r.roomId,
  stay_type: r.stayType,
  check_in: r.checkIn,
  check_out: r.checkOut,
  remarks: r.remarks || null,
  payment_method: r.paymentMethod,
  status: r.status,
});

export const useReservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();

    // Écoute en temps réel
    const channel = supabase
      .channel('reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchReservations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setStorageError(error.message);
    } else if (data) {
      setReservations(data.map(fromDB));
      setStorageError(null);
    }
    setLoading(false);
  };

  const addReservation = async (res: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => {
    const newReservation: Omit<Reservation, 'createdAt'> = {
      ...res,
      id: `RES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'En attente',
    };

    const { error } = await supabase.from('reservations').insert(toDB(newReservation));
    if (error) console.error('Erreur ajout réservation:', error);
    else await fetchReservations();

    return newReservation;
  };

  const updateStatus = async (id: string, status: ReservationStatus) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);

    if (error) console.error('Erreur mise à jour statut:', error);
    else await fetchReservations();
  };

  const deleteReservation = async (id: string) => {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (error) console.error('Erreur suppression:', error);
    else await fetchReservations();
  };

  return {
    reservations,
    loading,
    storageError,
    addReservation,
    updateStatus,
    deleteReservation,
  };
};
