import { useState, useEffect } from 'react';

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

const STORAGE_KEY = 'cheliel_reservations';

export const getNights = (checkIn: string, checkOut: string): number => {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const saveToStorage = (data: Reservation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Impossible de sauvegarder les réservations:', e);
  }
};

export const useReservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setReservations(JSON.parse(stored));
      } catch (e) {
        console.error('Données de réservations corrompues, réinitialisation.');
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      // Mock data for demo purposes
      const mock: Reservation[] = [
        {
          id: 'RES-001',
          clientName: 'Kouakou Jean',
          phone: '+225 07 01 02 03 04',
          email: 'jean.kouakou@email.com',
          roomId: 'suite-prestige',
          checkIn: '2026-05-10',
          checkOut: '2026-05-15',
          paymentMethod: 'Orange Money',
          status: 'Confirmé',
          createdAt: new Date().toISOString()
        },
        {
          id: 'RES-002',
          clientName: 'Bamba Aminata',
          phone: '+225 05 55 66 77 88',
          roomId: 'studio-confort',
          checkIn: '2026-05-12',
          checkOut: '2026-05-14',
          paymentMethod: 'Wave',
          status: 'En attente',
          createdAt: new Date().toISOString()
        }
      ];
      setReservations(mock);
      saveToStorage(mock);
    }
  }, []);

  const addReservation = (res: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => {
    const newReservation: Reservation = {
      ...res,
      id: `RES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'En attente',
      createdAt: new Date().toISOString()
    };
    
    const updated = [newReservation, ...reservations];
    setReservations(updated);
    saveToStorage(updated);
    return newReservation;
  };

  const updateStatus = (id: string, status: ReservationStatus) => {
    const updated = reservations.map(r => r.id === id ? { ...r, status } : r);
    setReservations(updated);
    saveToStorage(updated);
  };

  const deleteReservation = (id: string) => {
    const updated = reservations.filter(r => r.id !== id);
    setReservations(updated);
    saveToStorage(updated);
  };

  return {
    reservations,
    addReservation,
    updateStatus,
    deleteReservation
  };
};