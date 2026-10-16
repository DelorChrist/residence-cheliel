import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export type NotificationType = 'new' | 'confirm' | 'cancel' | 'delete' | 'conflict';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  detail?: string;
  isRead: boolean;
  createdAt: string;
}

interface RoomRef {
  id: string;
  name: string;
}

// ─── Persistance localStorage ───────────────────────────────────────────────

const STORAGE_KEY = 'cheliel_admin_notifications';
const MAX_STORED = 50;

const loadFromStorage = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (notifications: AppNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
  } catch {
    // Ignore storage errors
  }
};

// ─── Formatage du temps relatif ─────────────────────────────────────────────

export const formatRelativeTime = (isoDate: string): string => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return 'hier';
  return `il y a ${days}j`;
};

// ─── Hook principal ─────────────────────────────────────────────────────────

export const useNotifications = (rooms: RoomRef[] = []) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadFromStorage());
  // Toast queue (disparaît après 5s)
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  // Persistance à chaque changement
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const pushNotification = useCallback((notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
    const full: AppNotification = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [full, ...prev].slice(0, MAX_STORED));

    // Ajouter au toast queue
    setToasts(prev => [full, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== full.id));
    }, 5000);
  }, []);

  // ─── Synchronisation avec l'API ─────────────────────────────────────────
  // On utilise event:'*' + comparaison via ref (même pattern que useReservations)
  // Les payloads INSERT via RPC security-definer peuvent être filtrés par RLS.
  // Cette approche est 100% fiable : on re-fetch et on compare.

  const prevReservationsRef = useRef<{
    id: string; client_name: string; room_id: string;
    status: string; check_in: string;
  }[]>([]);
  const isInitializedRef = useRef(false);

  const fetchAndCompare = useCallback(async () => {
    try {
      const { data, error } = await api
        .from('reservations')
        .select('id, client_name, room_id, status, check_in')
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Notifications] Erreur fetch:', error?.message);
        return;
      }

      const prev = prevReservationsRef.current;

      if (!isInitializedRef.current) {
        // Premier chargement : juste initialiser, pas de notification
        prevReservationsRef.current = data as typeof prev;
        isInitializedRef.current = true;
        return;
      }

      // Détecter les nouveaux INSERT
      const prevIds = new Set(prev.map(r => r.id));
      const newRows = (data as typeof prev).filter(r => !prevIds.has(r.id));
      for (const row of newRows) {
        const roomName = roomsRef.current.find(r => r.id === row.room_id)?.name ?? 'Chambre inconnue';
        const checkIn = row.check_in
          ? new Date(row.check_in).toLocaleDateString('fr-FR')
          : '';
        pushNotification({
          type: 'new',
          message: `Nouvelle réservation de ${row.client_name ?? 'Client inconnu'}`,
          detail: `${roomName}${checkIn ? ` · Arrivée le ${checkIn}` : ''}`,
        });
      }

      // Détecter les UPDATE de statut
      const prevMap = new Map(prev.map(r => [r.id, r]));
      for (const row of data as typeof prev) {
        const old = prevMap.get(row.id);
        if (old && old.status !== row.status) {
          const roomName = roomsRef.current.find(r => r.id === row.room_id)?.name ?? 'Chambre inconnue';
          if (row.status === 'Confirmé') {
            pushNotification({
              type: 'confirm',
              message: `Réservation confirmée pour ${row.client_name ?? 'Client inconnu'}`,
              detail: roomName,
            });
          } else if (row.status === 'Annulé') {
            pushNotification({
              type: 'cancel',
              message: `Réservation annulée pour ${row.client_name ?? 'Client inconnu'}`,
              detail: roomName,
            });
          }
        }
      }

      // Détecter les DELETE
      const newIds = new Set((data as typeof prev).map(r => r.id));
      const deleted = prev.filter(r => !newIds.has(r.id));
      for (const row of deleted) {
        pushNotification({
          type: 'delete',
          message: `Réservation supprimée`,
          detail: row.client_name ?? 'Client inconnu',
        });
      }

      prevReservationsRef.current = data as typeof prev;
    } catch (err) {
      console.error('[Notifications] Erreur inattendue:', err);
    }
  }, [pushNotification]);

  useEffect(() => {
    // Initialiser l'état de référence immédiatement
    fetchAndCompare();

    const channel = api
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          // Re-fetch et comparer à chaque changement
          fetchAndCompare();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[Notifications] Erreur souscription Realtime:', err);
        } else {
          console.info('[Notifications] API status:', status);
        }
      });

    return () => {
      api.removeChannel(channel);
    };
  }, [fetchAndCompare]);


  // ─── Actions ──────────────────────────────────────────────────────────

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    toasts,
    unreadCount,
    markAsRead,
    markAllRead,
    removeNotification,
    clearAll,
    dismissToast,
  };
};
