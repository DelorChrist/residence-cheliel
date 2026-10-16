import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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

// Type strict correspondant à la ligne de la base de données
interface ReservationRow {
  id: string;
  client_name: string;
  phone: string;
  email: string | null;
  room_id: string;
  stay_type: StayType;
  check_in: string;
  check_out: string;
  remarks: string | null;
  payment_method: PaymentMethod;
  status: ReservationStatus;
  created_at: string;
}

export const getNights = (checkIn: string, checkOut: string): number => {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
};

export const getReservationPricing = (unitPrice: number, nights: number) => {
  const safeNights = Math.max(1, nights);
  const total = unitPrice * safeNights;
  return { subtotal: total, discount: 0, total };
};

// snake_case → camelCase (typé strictement)
const fromDB = (r: ReservationRow): Reservation => ({
  id: r.id,
  clientName: r.client_name,
  phone: r.phone,
  email: r.email ?? undefined,
  roomId: r.room_id,
  stayType: r.stay_type,
  checkIn: r.check_in,
  checkOut: r.check_out,
  remarks: r.remarks ?? undefined,
  paymentMethod: r.payment_method,
  status: r.status,
  createdAt: r.created_at,
});

// camelCase → snake_case (sans id, généré par le backend)
const toDB = (r: Omit<Reservation, 'id' | 'createdAt'>) => ({
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

  const isAuthenticated = async () => {
    const { data } = await api.auth.getSession();
    return Boolean(data.session);
  };

  useEffect(() => {
    let channel: ReturnType<typeof api.channel> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      if (!(await isAuthenticated())) { setLoading(false); return; }
      await fetchReservations();

      channel = api
        .channel('reservations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
          fetchReservations();
        })
        .subscribe((status, err) => {
          if (err) console.warn('[useReservations] Realtime error:', err);
          else console.info('[useReservations] Realtime status:', status);
        });
      // Polling de sécurité toutes les 15s (fallback si Realtime non activé)
      pollInterval = setInterval(() => fetchReservations(), 15_000);
    };

    init();
    return () => {
      if (channel) api.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);


  const fetchReservations = async () => {
    setLoading(true);
    const { data, error } = await api
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setStorageError(error.message);
    } else if (data) {
      setReservations((data as ReservationRow[]).map(fromDB));
      setStorageError(null);
    }
    setLoading(false);
  };

  const addReservation = async (res: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => {
    const payload = toDB({ ...res, status: 'En attente' });

    // Utilise une RPC security definer pour contourner la RLS SELECT
    const { data, error } = await api.rpc('insert_reservation', payload);

    if (error) {
      console.error('Erreur ajout réservation:', error);
      return { ok: false as const, error: error.message };
    }

    if (await isAuthenticated()) await fetchReservations();

    const reservation: Reservation = {
      ...res,
      id: (data as string) ?? '—',
      status: 'En attente',
      createdAt: new Date().toISOString(),
    };

    return { ok: true as const, reservation };
  };

  const updateStatus = async (id: string, status: ReservationStatus) => {
    const { error } = await api
      .from('reservations')
      .update({ status })
      .eq('id', id);
    if (error) console.error('Erreur mise à jour statut:', error);
    else await fetchReservations();
  };

  const deleteReservation = async (id: string) => {
    const { error } = await api
      .from('reservations')
      .delete()
      .eq('id', id);
    if (error) console.error('Erreur suppression:', error);
    else await fetchReservations();
  };

  return { reservations, loading, storageError, addReservation, updateStatus, deleteReservation };
};
