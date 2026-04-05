import { useState, useEffect } from 'react';

export type PaymentMethod = 'Orange Money' | 'Wave';
export type ReservationStatus = 'Confirmé' | 'En attente' | 'Annulé';

export interface Reservation {
  id: string;
  clientName: string;
  phone: string;
  email?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  remarks?: string;
  paymentMethod: PaymentMethod;
  status: ReservationStatus;
  createdAt: string;
}

const STORAGE_KEY = 'cheliel_reservations';

export const useReservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setReservations(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse reservations');
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
    }
  }, []);

  const addReservation = (res: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => {
    const newReservation: Reservation = {
      ...res,
      id: `RES-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      status: 'En attente',
      createdAt: new Date().toISOString()
    };
    
    const updated = [newReservation, ...reservations];
    setReservations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newReservation;
  };

  const updateStatus = (id: string, status: ReservationStatus) => {
    const updated = reservations.map(r => r.id === id ? { ...r, status } : r);
    setReservations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return {
    reservations,
    addReservation,
    updateStatus
  };
};