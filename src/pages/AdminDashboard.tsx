import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { useReservations, Reservation, getNights, getReservationPricing, ReservationStatus } from '../hooks/useReservations';
import { useRooms } from '../hooks/useRooms';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationCenter, NotificationToasts } from '../components/NotificationCenter';
import { SettingsTab } from '../components/SettingsTab';
import {
  Lock, LayoutDashboard, CalendarDays, DollarSign, Users, Clock,
  LogOut, CheckCircle2, XCircle, Download, LucideIcon, Trash2, Mail,
  Phone, Search, AlertTriangle, ChevronLeft, ChevronRight,
  BedDouble, Plus, Pencil, Save, X, Upload, ImageIcon, ClipboardList,
  MessageSquare, Eye, EyeOff, Settings, Video, Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
type Session = { access_token: string; user: { id: number; email: string } };

type AdminTab = 'dashboard' | 'reservations' | 'clients' | 'planning' | 'chambres' | 'audit' | 'settings';

const BUCKET = 'room-images';

type DashboardRoom = {
  id: string;
  name: string;
  price_night: number;
  price_day: number;
};

// ─── Utilitaires ───────────────────────────────────────────────────────────

const formatPhone = (phone?: string | null): string => {
  if (!phone) return '—';
  const raw = phone.trim();
  const cleaned = raw.replace(/[\s\-\.\(\)]/g, '');

  // Format international +225 avec 9 chiffres (ex: +225757180205 -> +225 07 57 18 02 05)
  if (/^\+225\d{9}$/.test(cleaned)) {
    const num = cleaned.slice(4);
    return `+225 0${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7)}`;
  }

  // Format international 225 avec 9 chiffres (ex: 225757180205 -> +225 07 57 18 02 05)
  if (/^225\d{9}$/.test(cleaned)) {
    const num = cleaned.slice(3);
    return `+225 0${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7)}`;
  }

  // Format international +225 avec 10 chiffres (ex: +2250757180205 -> +225 07 57 18 02 05)
  if (/^\+225\d{10}$/.test(cleaned)) {
    const num = cleaned.slice(4);
    return `+225 ${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 6)} ${num.slice(6, 8)} ${num.slice(8)}`;
  }

  // Format international 225 avec 10 chiffres (ex: 2250757180205 -> +225 07 57 18 02 05)
  if (/^225\d{10}$/.test(cleaned)) {
    const num = cleaned.slice(3);
    return `+225 ${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 6)} ${num.slice(6, 8)} ${num.slice(8)}`;
  }

  // Format local 10 chiffres (ex: 0757180205 -> +225 07 57 18 02 05)
  if (/^0\d{9}$/.test(cleaned)) {
    return `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }

  // Format local 8 chiffres (ancien format -> +225 XX XX XX XX)
  if (/^\d{8}$/.test(cleaned)) {
    return `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6)}`;
  }

  return raw.startsWith('+') ? raw : `+${raw}`;
};

const sanitizeCSVField = (value: string | number): string => {
  const str = String(value);
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
};

const exportCSV = (reservations: Reservation[], rooms: DashboardRoom[]) => {
  if (reservations.length === 0) { alert('Aucune réservation à exporter.'); return; }
  const headers = ['ID', 'Client', 'Téléphone', 'Email', 'Chambre', 'Type', 'Arrivée', 'Départ', 'Durée', 'Demandes spéciales', 'Paiement', 'Statut', 'Créé le'];
  const rows = reservations.map(r => {
    const room = rooms.find(rm => rm.id === r.roomId);
    const nights = getNights(r.checkIn, r.checkOut);
    return [
      r.id, r.clientName, r.phone, r.email ?? '',
      room?.name ?? r.roomId, r.stayType, r.checkIn, r.checkOut, nights,
      r.remarks ?? '',
      r.paymentMethod, r.status,
      new Date(r.createdAt).toLocaleDateString('fr-FR')
    ].map(sanitizeCSVField).join(';');
  });
  const csv = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reservations-cheliel-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Retourne true si deux réservations actives se chevauchent sur le même appartement */
const hasConflict = (a: Reservation, b: Reservation): boolean => {
  if (a.id === b.id || a.roomId !== b.roomId) return false;
  if (a.status === 'Annulé' || b.status === 'Annulé') return false;
  return a.checkIn < b.checkOut && a.checkOut > b.checkIn;
};

/** Retourne l'ensemble des IDs en conflit */
const getConflictIds = (reservations: Reservation[]): Set<string> => {
  const ids = new Set<string>();
  for (let i = 0; i < reservations.length; i++) {
    for (let j = i + 1; j < reservations.length; j++) {
      if (hasConflict(reservations[i], reservations[j])) {
        ids.add(reservations[i].id);
        ids.add(reservations[j].id);
      }
    }
  }
  return ids;
};

// ─── Composant de Recherche Globale Admin ──────────────────────────────────
const AdminGlobalSearch = ({
  reservations,
  rooms,
  onNavigateTab,
}: {
  reservations: Reservation[];
  rooms: DashboardRoom[];
  onNavigateTab: (tab: AdminTab) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const q = query.trim().toLowerCase();

  const resResults = useMemo(() => {
    if (!q) return [];
    return reservations.filter(r => {
      const room = rooms.find(rm => rm.id === r.roomId);
      return (
        r.clientName.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.remarks?.toLowerCase().includes(q) ?? false) ||
        (room?.name.toLowerCase().includes(q) ?? false)
      );
    }).slice(0, 5);
  }, [q, reservations, rooms]);

  const clientResults = useMemo(() => {
    if (!q) return [];
    const clientMap = new Map<string, { name: string; phone: string; count: number }>();
    for (const r of reservations) {
      const existing = clientMap.get(r.phone);
      if (existing) {
        existing.count += 1;
      } else {
        clientMap.set(r.phone, { name: r.clientName, phone: r.phone, count: 1 });
      }
    }
    return Array.from(clientMap.values()).filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 4);
  }, [q, reservations]);

  const roomResults = useMemo(() => {
    if (!q) return [];
    return rooms.filter(rm => rm.name.toLowerCase().includes(q)).slice(0, 3);
  }, [q, rooms]);

  const totalResults = resResults.length + clientResults.length + roomResults.length;

  return (
    <div ref={containerRef} className="relative">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Rechercher"
          className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-500 hover:text-primary-700 hover:bg-primary-50/50 hover:border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all flex items-center justify-center cursor-pointer"
          title="Rechercher"
        >
          <Search size={18} />
        </button>
      ) : (
        <div className="relative flex items-center bg-white border border-primary-200 ring-2 ring-primary-500/10 rounded-xl px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-72 sm:w-80 md:w-96 transition-all duration-300 ease-out animate-in fade-in zoom-in-95">
          <Search size={16} className="text-primary-600 mr-2 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher réservation, client, chambre..."
            className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mr-1 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setIsOpen(false); setQuery(''); }}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition-colors shrink-0"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Dropdown des résultats */}
      {isOpen && q.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden max-h-[420px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden z-50 divide-y divide-gray-100 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2">
          {resResults.length > 0 && (
            <div className="p-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1">
                Réservations ({resResults.length})
              </p>
              {resResults.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onNavigateTab('reservations');
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-xs text-gray-900 group-hover:text-primary-700 truncate">
                      {r.clientName}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {rooms.find(rm => rm.id === r.roomId)?.name || 'Chambre'} · {new Date(r.checkIn).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      r.status === 'Confirmé'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'En attente'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {clientResults.length > 0 && (
            <div className="p-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1">
                Clients ({clientResults.length})
              </p>
              {clientResults.map(c => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => {
                    onNavigateTab('clients');
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-xs text-gray-900 group-hover:text-primary-700 truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{c.phone}</div>
                  </div>
                  <span className="text-[10px] text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full shrink-0">
                    {c.count} séjour{c.count > 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {roomResults.length > 0 && (
            <div className="p-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1">
                Appartements ({roomResults.length})
              </p>
              {roomResults.map(rm => (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => {
                    onNavigateTab('chambres');
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="font-semibold text-xs text-gray-900 group-hover:text-primary-700 truncate">
                    {rm.name}
                  </div>
                  <span className="text-[11px] font-bold text-primary-600 shrink-0">
                    {rm.price_night.toLocaleString()} F
                  </span>
                </button>
              ))}
            </div>
          )}

          {totalResults === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">
              Aucun résultat pour « {query} »
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── 1. Vue Tableau de Bord ────────────────────────────────────────────────
const OverviewTab = ({ reservations, conflictIds, rooms, onTabChange, headerActions }: {
  reservations: Reservation[];
  conflictIds: Set<string>;
  rooms: DashboardRoom[];
  onTabChange: (tab: AdminTab) => void;
  headerActions?: React.ReactNode;
}) => {
  const totalReservations = reservations.length;
  const pendingReservations = reservations.filter(r => r.status === 'En attente').length;
  const conflictCount = conflictIds.size;
  const revenue = reservations
    .filter(r => r.status === 'Confirmé')
    .reduce((acc, r) => {
      const room = rooms.find(rm => rm.id === r.roomId);
      const nights = getNights(r.checkIn, r.checkOut);
      const price = room ? (r.stayType === 'journée' ? room.price_day : room.price_night) : 0;
      return acc + getReservationPricing(price, nights).total;
    }, 0);
  const pendingRevenue = reservations
    .filter(r => r.status === 'En attente')
    .reduce((acc, r) => {
      const room = rooms.find(rm => rm.id === r.roomId);
      const nights = getNights(r.checkIn, r.checkOut);
      const price = room ? (r.stayType === 'journée' ? room.price_day : room.price_night) : 0;
      return acc + getReservationPricing(price, nights).total;
    }, 0);
  const occupancyRate = totalReservations === 0
    ? 0
    : Math.round((reservations.filter(r => r.status === 'Confirmé').length / totalReservations) * 100);
  const recent = reservations.slice(0, 5);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Vue d'ensemble</h1>
          <p className="text-gray-500">Bienvenue dans votre espace de gestion.</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {headerActions}
        </div>
      </div>

      {/* Alerte conflits */}
      {conflictCount > 0 && (
        <button type="button" onClick={() => onTabChange('reservations')}
          className="w-full mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium hover:bg-red-100 transition-colors text-left">
          <AlertTriangle size={20} className="shrink-0 text-red-500" />
          <span><strong>{conflictCount} réservation{conflictCount > 1 ? 's' : ''}</strong> en conflit de dates détectée{conflictCount > 1 ? 's' : ''}. Cliquez pour voir.</span>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <StatCard title="Réservations" value={totalReservations.toString()} icon={CalendarDays} color="blue" />
        <StatCard title="Revenus confirmés" value={`${revenue.toLocaleString('fr-FR')} FCFA`} icon={DollarSign} color="green" />
        <StatCard title="Taux d'occupation" value={`${occupancyRate}%`} icon={Users} color="purple" />
        <StatCard title="En attente" value={pendingReservations.toString()} icon={Clock} color="orange" />
      </div>

      {/* Revenus potentiels */}
      {pendingRevenue > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-700 text-sm">
            <Clock size={18} className="shrink-0" />
            <span>Revenus potentiels (réservations en attente)</span>
          </div>
          <span className="font-bold text-amber-700">{pendingRevenue.toLocaleString()} F</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-heading font-bold text-gray-900">Dernières réservations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Chambre</th>
                <th className="px-6 py-3 font-medium">Arrivée</th>
                <th className="px-6 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map(res => {
                const room = rooms.find(r => r.id === res.roomId);
                const isConflict = conflictIds.has(res.id);
                return (
                  <tr key={res.id} className={`hover:bg-gray-50/50 ${isConflict ? 'bg-red-50/40' : ''}`}>
                    <td className="px-6 py-3 text-sm">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {res.clientName}
                        {isConflict && <AlertTriangle size={13} className="text-red-500" />}
                      </div>
                      {res.remarks && (
                        <div className="mt-1 flex items-start gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded max-w-[220px]" title={res.remarks}>
                          <MessageSquare size={11} className="text-amber-600 shrink-0 mt-0.5" />
                          <span className="truncate">{res.remarks}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-sm">{room?.name || 'Inconnue'}</td>
                    <td className="px-6 py-3 text-gray-500 text-sm">{new Date(res.checkIn).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        res.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                        res.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>{res.status}</span>
                    </td>
                  </tr>
                );
              })}
              {recent.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">Aucune réservation.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Vue Réservations (avec conflits) ─────────────────────────────────────
const ReservationsTab = ({ reservations, conflictIds, rooms, updateStatus, deleteReservation, headerActions }: {
  reservations: Reservation[];
  conflictIds: Set<string>;
  rooms: DashboardRoom[];
  updateStatus: (id: string, status: ReservationStatus) => void;
  deleteReservation: (id: string) => void;
  headerActions?: React.ReactNode;
}) => {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'Tous' | 'Conflits'>('Tous');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [conflictBlockData, setConflictBlockData] = useState<{ target: Reservation; conflicting: Reservation[] } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (deleteConfirmId || conflictBlockData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deleteConfirmId, conflictBlockData]);

  const handleConfirmReservation = (res: Reservation) => {
    // Vérifie s'il existe déjà une réservation CONFIRMÉE sur la même chambre qui chevauche les dates
    const overlapping = reservations.filter(other =>
      other.id !== res.id &&
      other.roomId === res.roomId &&
      other.status === 'Confirmé' &&
      other.checkIn < res.checkOut &&
      other.checkOut > res.checkIn
    );

    if (overlapping.length > 0) {
      setConflictBlockData({ target: res, conflicting: overlapping });
      return;
    }

    updateStatus(res.id, 'Confirmé');
  };

  const isArrivalPassedOrToday = (checkIn: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const checkInStr = checkIn.slice(0, 10);
    return checkInStr <= todayStr;
  };

  const handleCancelReservation = (res: Reservation) => {
    if (isArrivalPassedOrToday(res.checkIn)) {
      alert("Impossible d'annuler cette réservation : le jour d'arrivée est déjà atteint ou passé.");
      return;
    }
    updateStatus(res.id, 'Annulé');
  };

  const filtered = reservations
    .filter(r => {
      if (statusFilter === 'Conflits') return conflictIds.has(r.id);
      if (statusFilter === 'Tous') return true;
      return r.status === statusFilter;
    })
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const room = rooms.find(rm => rm.id === r.roomId);
      return r.clientName.toLowerCase().includes(q) || r.phone.includes(q) || (r.remarks?.toLowerCase().includes(q) ?? false) || (room?.name.toLowerCase().includes(q) ?? false);
    });

  return (
    <div>
      {/* Modal de Confirmation de Suppression */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10">
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Supprimer la réservation ?</h3>
            <p className="text-gray-500 text-sm mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">Annuler</button>
              <button type="button" onClick={() => { deleteReservation(deleteConfirmId); setDeleteConfirmId(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'Alerte Conflit — Style sobre et direct */}
      {conflictBlockData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setConflictBlockData(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full z-10 border border-gray-100">
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Chambre déjà occupée</h3>
            <p className="text-gray-600 text-sm mb-4">
              La <strong>{rooms.find(rm => rm.id === conflictBlockData.target.roomId)?.name || 'chambre'}</strong> est déjà confirmée sur cette période :
            </p>
            <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 mb-5 space-y-2 text-sm">
              {conflictBlockData.conflicting.map(conf => (
                <div key={conf.id}>
                  <p className="font-semibold text-gray-900">{conf.clientName} <span className="font-normal text-gray-500 text-xs">({formatPhone(conf.phone)})</span></p>
                  <p className="text-xs text-gray-600 mt-0.5">Du {new Date(conf.checkIn).toLocaleDateString('fr-FR')} au {new Date(conf.checkOut).toLocaleDateString('fr-FR')} ({getNights(conf.checkIn, conf.checkOut)} {conf.stayType === 'journée' ? 'jour' : 'nuit'}{getNights(conf.checkIn, conf.checkOut) > 1 ? 's' : ''})</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConflictBlockData(null)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Réservations</h1>
          <p className="text-gray-500">{reservations.length} réservation{reservations.length > 1 ? 's' : ''} au total
            {conflictIds.size > 0 && <span className="ml-2 text-red-600 font-medium">· {conflictIds.size} conflit{conflictIds.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {headerActions}
          </div>
          <button type="button" onClick={() => exportCSV(reservations, rooms)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-colors text-sm">
            <Download size={16} /> Exporter CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher client, chambre, demande..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['Tous', 'En attente', 'Confirmé', 'Annulé', 'Conflits'] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === s
                  ? s === 'Conflits' ? 'bg-red-600 text-white' : 'bg-primary-600 text-white'
                  : s === 'Conflits' ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {s === 'Conflits' && <AlertTriangle size={13} />}{s}
              {s === 'Conflits' && conflictIds.size > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{conflictIds.size}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="sticky left-0 z-20 bg-gray-50 px-5 py-4 whitespace-nowrap border-r border-gray-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)]">Client</th>
                <th className="px-5 py-4 whitespace-nowrap">Téléphone</th>
                <th className="px-5 py-4 whitespace-nowrap">Email</th>
                <th className="px-5 py-4 min-w-[180px]">Demande spéciale</th>
                <th className="px-5 py-4 whitespace-nowrap">Chambre</th>
                <th className="px-5 py-4 whitespace-nowrap">Tarif / Type</th>
                <th className="px-5 py-4 whitespace-nowrap">Arrivée</th>
                <th className="px-5 py-4 whitespace-nowrap">Départ</th>
                <th className="px-5 py-4 whitespace-nowrap">Durée</th>
                <th className="px-5 py-4 whitespace-nowrap">Montant Total</th>
                <th className="px-5 py-4 whitespace-nowrap">Paiement</th>
                <th className="px-5 py-4 whitespace-nowrap">Statut</th>
                <th className="px-5 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((res: Reservation) => {
                const room = rooms.find(r => r.id === res.roomId);
                const nights = getNights(res.checkIn, res.checkOut);
                const price = room ? (res.stayType === 'journée' ? room.price_day : room.price_night) : 0;
                const total = getReservationPricing(price, nights).total;
                const isConflict = conflictIds.has(res.id);
                const isPastArrival = isArrivalPassedOrToday(res.checkIn);
                return (
                  <tr key={res.id} className={`group hover:bg-gray-50/70 transition-colors ${isConflict ? 'bg-red-50/50' : 'bg-white'}`}>
                    {/* 1. Client (Colonne Fixe) */}
                    <td className={`sticky left-0 z-10 px-5 py-4 whitespace-nowrap font-medium text-gray-900 border-r border-gray-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors ${
                      isConflict ? 'bg-red-50 group-hover:bg-red-100/70' : 'bg-white group-hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{res.clientName}</span>
                        {isConflict && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle size={11} /> Conflit
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Téléphone */}
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-700">
                      {formatPhone(res.phone)}
                    </td>

                    {/* 3. Email */}
                    <td className="px-5 py-4 whitespace-nowrap text-gray-500">
                      {res.email || <span className="text-gray-400">—</span>}
                    </td>

                    {/* 4. Demandes spéciales */}
                    <td className="px-5 py-4 min-w-[180px] max-w-xs">
                      {res.remarks ? (
                        <div className="inline-flex items-start gap-1.5 text-xs text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2.5 py-1.5 rounded-xl">
                          <MessageSquare size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{res.remarks}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </td>

                    {/* 5. Chambre */}
                    <td className="px-5 py-4 whitespace-nowrap font-bold text-gray-900">
                      {room?.name || 'Inconnue'}
                    </td>

                    {/* 6. Tarif / Type */}
                    <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                      <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-lg font-medium">
                        {price.toLocaleString()} F / {res.stayType === 'journée' ? 'jour' : 'nuit'}
                      </span>
                    </td>

                    {/* 7. Arrivée */}
                    <td className="px-5 py-4 whitespace-nowrap text-gray-800 font-medium">
                      {new Date(res.checkIn).toLocaleDateString('fr-FR')}
                    </td>

                    {/* 8. Départ */}
                    <td className="px-5 py-4 whitespace-nowrap text-gray-800 font-medium">
                      {new Date(res.checkOut).toLocaleDateString('fr-FR')}
                    </td>

                    {/* 9. Durée */}
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      {nights} {res.stayType === 'journée' ? 'jour' : 'nuit'}{nights > 1 ? 's' : ''}
                    </td>

                    {/* 10. Montant Total */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-primary-800 font-bold text-base">
                        {total.toLocaleString()} F
                      </span>
                    </td>

                    {/* 11. Paiement */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        res.paymentMethod === 'Orange Money' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {res.paymentMethod}
                      </span>
                    </td>

                    {/* 12. Statut */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        res.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                        res.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {res.status === 'Confirmé' && <CheckCircle2 size={12} />}
                        {res.status === 'En attente' && <Clock size={12} />}
                        {res.status === 'Annulé' && <XCircle size={12} />}
                        {res.status}
                      </span>
                    </td>

                    {/* 13. Actions */}
                    <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                      {res.status === 'En attente' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleConfirmReservation(res)}
                            aria-label="Confirmer et envoyer l'email"
                            title="Confirmer la réservation et envoyer l'email"
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          {!isPastArrival && (
                            <button
                              type="button"
                              onClick={() => handleCancelReservation(res)}
                              aria-label="Annuler la réservation"
                              title="Annuler cette réservation"
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </div>
                      )}
                      {res.status === 'Confirmé' && (
                        !isPastArrival ? (
                          <button
                            type="button"
                            onClick={() => handleCancelReservation(res)}
                            aria-label="Annuler la réservation"
                            title="Annuler cette réservation confirmée (libère la chambre)"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-red-200/60"
                          >
                            <XCircle size={14} />
                            <span>Annuler</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg select-none"
                            title="Annulation non autorisée : la date d'arrivée est déjà atteinte ou passée"
                          >
                            Séjour en cours / passé
                          </span>
                        )
                      )}
                      {res.status === 'Annulé' && (
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPastArrival && (
                            <button
                              type="button"
                              onClick={() => updateStatus(res.id, 'En attente')}
                              aria-label="Remettre en attente"
                              title="Remettre cette réservation en attente"
                              className="text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <Clock size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(res.id)}
                            aria-label="Supprimer définitivement"
                            title="Supprimer définitivement"
                            className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="px-6 py-8 text-center text-gray-400">Aucune réservation trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── 2. Vue Planning / Calendrier ─────────────────────────────────────────
const PlanningTab = ({ reservations, conflictIds, rooms, headerActions }: { reservations: Reservation[]; conflictIds: Set<string>; rooms: DashboardRoom[]; headerActions?: React.ReactNode }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  // Réservations actives ce mois
  const activeRes = reservations.filter(r => r.status !== 'Annulé');

  const isOccupied = (roomId: string, day: Date): Reservation | null => {
    const d = day.toISOString().split('T')[0];
    return activeRes.find(r => {
      // Normalise les dates pour éviter les problèmes de format/timezone
      const ci = r.checkIn.slice(0, 10);
      const co = r.checkOut.slice(0, 10);
      return r.roomId === roomId && ci <= d && co > d;
    }) ?? null;
  };

  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Afficher max 7 jours à la fois sur mobile, tous sur desktop
  const [startDay, setStartDay] = useState(0);
  const visibleDays = days.slice(startDay, startDay + 7);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Planning</h1>
          <p className="text-gray-500 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden md:flex items-center gap-3">
            {headerActions}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={prevMonth} aria-label="Mois précédent" className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-colors"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => { setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setStartDay(0); }} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors">Aujourd'hui</button>
            <button type="button" onClick={nextMonth} aria-label="Mois suivant" className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs font-medium">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400 inline-block" />Confirmé</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />En attente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Conflit</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />Libre</span>
      </div>

      {/* Navigation semaine (mobile) */}
      <div className="flex items-center justify-between mb-2 md:hidden">
        <button type="button" aria-label="Semaine précédente" onClick={() => setStartDay(Math.max(0, startDay - 7))} disabled={startDay === 0} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="text-sm text-gray-500">Jours {startDay + 1}–{Math.min(startDay + 7, daysInMonth)}</span>
        <button type="button" aria-label="Semaine suivante" onClick={() => setStartDay(Math.min(daysInMonth - 7, startDay + 7))} disabled={startDay + 7 >= daysInMonth} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[140px]">Appartement</th>
                {/* Desktop: tous les jours */}
                {days.map(d => {
                  const isToday = d.toDateString() === today.toDateString();
                  return (
                    <th key={d.toISOString()} className={`px-1 py-3 text-center font-medium min-w-[36px] hidden md:table-cell ${isToday ? 'text-primary-600' : 'text-gray-400'}`}>
                      <div>{d.getDate()}</div>
                      <div className="text-[10px] opacity-60">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                    </th>
                  );
                })}
                {/* Mobile: 7 jours */}
                {visibleDays.map(d => {
                  const isToday = d.toDateString() === today.toDateString();
                  return (
                    <th key={`m-${d.toISOString()}`} className={`px-1 py-3 text-center font-medium min-w-[40px] md:hidden ${isToday ? 'text-primary-600' : 'text-gray-400'}`}>
                      <div>{d.getDate()}</div>
                      <div className="text-[10px] opacity-60">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map(room => (
                <tr key={room.id} className="hover:bg-gray-50/30">
                  <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-100 text-xs">{room.name}</td>
                  {/* Desktop */}
                  {days.map(d => {
                    const res = isOccupied(room.id, d);
                    const isConflict = res ? conflictIds.has(res.id) : false;
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <td key={d.toISOString()} className={`px-0.5 py-1.5 text-center hidden md:table-cell ${isToday ? 'bg-primary-50/40' : ''}`}>
                        {res ? (
                          <div className={`h-6 rounded mx-0.5 flex items-center justify-center ${
                            isConflict ? 'bg-red-400' : res.status === 'Confirmé' ? 'bg-green-400' : 'bg-yellow-400'
                          }`} title={`${res.clientName} (${res.status})`} />
                        ) : (
                          <div className="h-6 rounded mx-0.5 bg-gray-50 border border-gray-100" />
                        )}
                      </td>
                    );
                  })}
                  {/* Mobile */}
                  {visibleDays.map(d => {
                    const res = isOccupied(room.id, d);
                    const isConflict = res ? conflictIds.has(res.id) : false;
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <td key={`m-${d.toISOString()}`} className={`px-0.5 py-1.5 text-center md:hidden ${isToday ? 'bg-primary-50/40' : ''}`}>
                        {res ? (
                          <div className={`h-6 rounded mx-0.5 ${isConflict ? 'bg-red-400' : res.status === 'Confirmé' ? 'bg-green-400' : 'bg-yellow-400'}`} title={res.clientName} />
                        ) : (
                          <div className="h-6 rounded mx-0.5 bg-gray-50 border border-gray-100" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Vue Clients ───────────────────────────────────────────────────────────
const ClientsTab = ({ reservations, rooms, headerActions }: { reservations: Reservation[]; rooms: DashboardRoom[]; headerActions?: React.ReactNode }) => {
  const [search, setSearch] = useState('');

  const clientsMap = new Map<string, { name: string; phone: string; email?: string; count: number; lastVisit: string; totalSpent: number }>();
  reservations.forEach(r => {
    const room = rooms.find(rm => rm.id === r.roomId);
    const nights = getNights(r.checkIn, r.checkOut);
    const price = room ? (r.stayType === 'journée' ? room.price_day : room.price_night) : 0;
    const total = getReservationPricing(price, nights).total;
    const existing = clientsMap.get(r.phone);
    if (existing) {
      existing.count += 1;
      existing.totalSpent += total;
      if (r.checkIn > existing.lastVisit) existing.lastVisit = r.checkIn;
    } else {
      clientsMap.set(r.phone, {
        name: r.clientName,
        phone: r.phone,
        email: r.email,
        count: 1,
        lastVisit: r.checkIn,
        totalSpent: total,
      });
    }
  });

  const clients = Array.from(clientsMap.values())
    .filter(c => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email?.toLowerCase().includes(q) ?? false);
    })
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Clients</h1>
          <p className="text-gray-500">{clients.length} client{clients.length > 1 ? 's' : ''} enregistré{clients.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerActions}
        </div>
      </div>
      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map(client => (
          <div key={client.phone} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-heading font-bold text-sm shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">{client.count} séjour{client.count > 1 ? 's' : ''}</span>
            </div>
            <p className="font-heading font-bold text-gray-900 mb-1">{client.name}</p>
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone size={13} className="text-primary-400 shrink-0" />
                <a href={`tel:${client.phone}`} className="hover:text-primary-600 transition-colors font-medium">{formatPhone(client.phone)}</a>
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail size={13} className="text-primary-400 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Dernier séjour</p>
                <p className="text-sm font-medium text-gray-700">{new Date(client.lastVisit).toLocaleDateString('fr-FR')}</p>
              </div>
              {client.totalSpent > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total dépensé</p>
                  <p className="text-sm font-bold text-primary-600">{client.totalSpent.toLocaleString()} F</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucun client trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 4. Vue Chambres (CRUD depuis l'admin) ────────────────────────────────
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
}

const emptyRoom = (): Omit<RoomRow, 'id'> => ({
  name: '', price_night: 0, price_day: 0, capacity: '',
  description: '', long_description: '', amenities: [],
  image_principale: '', images: [],
  video_url: '',
});

/** Galerie d'images avec image principale + images complémentaires */
const ImagePickerWithMain = ({
  mainImage,
  extraImages,
  onChangeMain,
  onChangeExtra,
}: {
  mainImage: string;
  extraImages: string[];
  onChangeMain: (url: string) => void;
  onChangeExtra: (urls: string[]) => void;
}) => {
  const [gallery, setGallery] = useState<{ id: string; url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'main' | 'extra'>('main');
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = useCallback(async () => {
    setLoadingGallery(true);
    const { data, error } = await api.from('gallery').select('*').order('created_at', { ascending: false });
    if (error) { setError("Impossible de charger la galerie."); setGallery([]); }
    else if (data) { setGallery(data); setError(null); }
    setLoadingGallery(false);
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true); setError(null);
    const uploadErrors: string[] = [];
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadedFile, error } = await api.storage.from(BUCKET).upload(filePath, file);
      if (!error && uploadedFile?.path) {
        const { error: ge } = await api.from('gallery').insert({ url: uploadedFile.path, name: file.name });
        if (ge) uploadErrors.push(`${file.name}: erreur galerie`);
        else uploadedUrls.push(uploadedFile.path);
      } else {
        uploadErrors.push(`${file.name}: ${error?.message ?? 'erreur upload'}`);
      }
    }
    await fetchGallery();
    if (uploadedUrls.length) {
      if (mode === 'main') {
        onChangeMain(uploadedUrls[0]);
      } else {
        onChangeExtra([...extraImages, ...uploadedUrls]);
      }
    }
    setUploading(false);
    if (uploadErrors.length) setError(uploadErrors.join(' '));
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDeleteFromGallery = async (id: string, url: string) => {
    const path = url.split(`/${BUCKET}/`)[1];
    if (path) await api.storage.from(BUCKET).remove([path]);
    await api.from('gallery').delete().eq('id', id);
    if (mainImage === url) onChangeMain('');
    onChangeExtra(extraImages.filter(u => u !== url));
    await fetchGallery();
  };

  const handleSelect = (url: string) => {
    if (mode === 'main') {
      onChangeMain(url);
    } else {
      if (extraImages.includes(url)) {
        onChangeExtra(extraImages.filter(u => u !== url));
      } else {
        onChangeExtra([...extraImages, url]);
      }
    }
  };

  const isSelected = (url: string) => mode === 'main' ? mainImage === url : extraImages.includes(url);

  return (
    <div className="space-y-4">
      {/* Onglets mode sélection */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('main')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'main' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Image principale
        </button>
        <button type="button" onClick={() => setMode('extra')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'extra' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Images complémentaires ({extraImages.length})
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {mode === 'main'
          ? 'Cliquez sur une image pour la définir comme image principale (affichée en premier).'
          : 'Cliquez sur les images pour les ajouter/retirer des images complémentaires.'}
      </p>

      {/* Upload */}
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-primary-400 transition-colors cursor-pointer"
        onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} aria-label="Uploader des images" />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary-600 text-sm">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /> Upload en cours...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Upload size={20} />
            <span className="text-sm font-medium">Uploader des images</span>
            <span className="text-xs">JPG, PNG, WEBP</span>
          </div>
        )}
      </div>

      {/* Galerie */}
      {loadingGallery ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : gallery.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          <ImageIcon size={28} className="mx-auto mb-2 opacity-30" />
          Aucune image. Uploadez-en pour commencer.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-1">
          {gallery.map(img => {
            const sel = isSelected(img.url);
            const isMain = mainImage === img.url;
            return (
              <div key={img.id}
                className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                  isMain ? 'border-yellow-400' : sel ? 'border-primary-500' : 'border-transparent'
                }`}
                onClick={() => handleSelect(img.url)}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                {isMain && (
                  <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center">
                    <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">PRINCIPALE</span>
                  </div>
                )}
                {sel && !isMain && (
                  <div className="absolute inset-0 bg-primary-600/20 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-white drop-shadow" />
                  </div>
                )}
                <button type="button" aria-label="Supprimer de la galerie"
                  onClick={e => { e.stopPropagation(); handleDeleteFromGallery(img.id, img.url); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Résumé sélection */}
      <div className="space-y-2">
        {mainImage && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
            <img src={mainImage} alt="principale" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-yellow-200" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-yellow-800">Image principale</p>
              <p className="text-xs text-yellow-600 truncate">{mainImage.split('/').pop()}</p>
            </div>
            <button type="button" aria-label="Retirer l'image principale" onClick={() => onChangeMain('')} className="text-yellow-500 hover:text-red-500 shrink-0"><X size={14} /></button>
          </div>
        )}
        {extraImages.length > 0 && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-primary-800 mb-2">{extraImages.length} image{extraImages.length > 1 ? 's' : ''} complémentaire{extraImages.length > 1 ? 's' : ''}</p>
            <div className="flex gap-1.5 flex-wrap">
              {extraImages.map((url, i) => (
                <div key={url} className="relative w-10 h-10 rounded-lg overflow-hidden border border-primary-200 shrink-0 group">
                  <img src={url} alt={`extra ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" aria-label="Retirer cette image"
                    onClick={() => onChangeExtra(extraImages.filter(u => u !== url))}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Sélecteur et uploader de vidéo de présentation */
const VideoPicker = ({
  videoUrl,
  onChange,
}: {
  videoUrl: string;
  onChange: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 120 * 1024 * 1024) {
      setError('La vidéo dépasse la taille maximale autorisée (120 Mo).');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const { data, error: upErr } = await api.storage.uploadVideo(file);
      if (upErr || !data?.url) {
        setError(upErr?.message || 'Erreur lors de l’upload de la vidéo.');
      } else {
        onChange(data.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible d’uploader la vidéo.';
      setError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetUrl = () => {
    if (customUrl.trim()) {
      onChange(customUrl.trim());
      setCustomUrl('');
      setShowUrlInput(false);
      setError(null);
    }
  };

  return (
    <div className="space-y-3">
      {videoUrl ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                <Video size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900">Vidéo de présentation configurée</p>
                <p className="text-[11px] text-gray-500 truncate max-w-xs">{videoUrl}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-red-600 hover:text-red-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1 transition-colors shrink-0"
            >
              <Trash2 size={13} /> Retirer
            </button>
          </div>

          {/* Lecteur vidéo intégré de test */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center hover:border-primary-400 transition-colors bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.webm,.mov"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            aria-label="Choisir une vidéo de présentation"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-700">Téléversement de la vidéo en cours...</p>
              <p className="text-xs text-gray-400">Veuillez patienter pendant le transfert (max 120 Mo)</p>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Video size={24} />
              </div>
              <p className="text-sm font-semibold text-gray-800">Ajouter une vidéo de présentation</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Visite guidée de l'appartement (MP4, WebM, MOV jusqu'à 120 Mo) ou URL
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Upload size={14} /> Téléverser une vidéo
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-xl transition-colors"
                >
                  {showUrlInput ? 'Annuler saisie URL' : 'Saisir une URL'}
                </button>
              </div>

              {showUrlInput && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="Ex: /images/chambre_1/video.mp4 ou https://..."
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSetUrl())}
                  />
                  <button
                    type="button"
                    onClick={handleSetUrl}
                    className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700"
                  >
                    Valider
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
};

const ChambresTab = ({ headerActions }: { headerActions?: React.ReactNode } = {}) => {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<RoomRow, 'id'>>(emptyRoom());
  const [amenityInput, setAmenityInput] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    const { data } = await api.from('rooms').select('*').order('name');
    if (data) setRooms(data as RoomRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    if (editing || deleteConfirmId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editing, deleteConfirmId]);

  const openEdit = (room: RoomRow) => {
    setEditing(room);
    setIsNew(false);
    setForm({
      name: room.name,
      price_night: room.price_night,
      price_day: room.price_day,
      capacity: room.capacity,
      description: room.description,
      long_description: room.long_description,
      amenities: [...room.amenities],
      image_principale: room.image_principale,
      images: [...room.images],
      video_url: room.video_url || '',
    });
  };

  const openNew = () => {
    setEditing({ id: '', ...emptyRoom() });
    setIsNew(true);
    setForm(emptyRoom());
  };

  const closeEdit = () => { setEditing(null); setAmenityInput(''); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (isNew) {
      const id = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
      await api.from('rooms').insert({ id, ...form });
    } else if (editing) {
      await api.from('rooms').update(form).eq('id', editing.id);
    }
    await fetchRooms();
    setSaving(false);
    closeEdit();
  };

  const handleDelete = async (id: string) => {
    await api.from('rooms').delete().eq('id', id);
    await fetchRooms();
    setDeleteConfirmId(null);
  };

  const addAmenity = () => {
    if (amenityInput.trim()) { setForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] })); setAmenityInput(''); }
  };
  const removeAmenity = (i: number) => setForm(f => ({ ...f, amenities: f.amenities.filter((_, idx) => idx !== i) }));

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-sm transition-all";

  return (
    <div>
      {/* Modal suppression */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full z-10">
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Supprimer l'appartement ?</h3>
            <p className="text-gray-500 text-sm mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={() => handleDelete(deleteConfirmId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau d'édition */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl z-10 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
              <h3 className="font-heading font-bold text-gray-900 text-lg">{isNew ? 'Nouvel appartement' : 'Modifier l\'appartement'}</h3>
              <button type="button" onClick={closeEdit} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom *</label>
                  <input type="text" className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Suite Prestige" />
                </div>
                <div>
                  <label htmlFor="room-price-night" className="text-sm font-semibold text-gray-700 mb-1.5 block">Prix / nuitée (FCFA)</label>
                  <input id="room-price-night" type="number" className={inputCls} value={form.price_night} onChange={e => setForm(f => ({ ...f, price_night: +e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="room-price-day" className="text-sm font-semibold text-gray-700 mb-1.5 block">Prix / journée (FCFA)</label>
                  <input id="room-price-day" type="number" className={inputCls} value={form.price_day} onChange={e => setForm(f => ({ ...f, price_day: +e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="room-capacity" className="text-sm font-semibold text-gray-700 mb-1.5 block">Capacité</label>
                  <input id="room-capacity" type="text" className={inputCls} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="2 personnes" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="room-desc" className="text-sm font-semibold text-gray-700 mb-1.5 block">Description</label>
                  <textarea id="room-desc" className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de l'appartement..." />
                </div>
              </div>

              {/* Équipements */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Équipements</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" aria-label="Ajouter un équipement" className={inputCls} value={amenityInput} onChange={e => setAmenityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())} placeholder="Ex: Climatisation" />
                  <button type="button" aria-label="Ajouter équipement" onClick={addAmenity} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 shrink-0"><Plus size={16} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.amenities.map((a, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-medium">
                      {a}
                      <button type="button" onClick={() => removeAmenity(i)} aria-label="Supprimer" className="hover:text-red-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Images</label>
                <ImagePickerWithMain
                  mainImage={form.image_principale}
                  extraImages={form.images}
                  onChangeMain={url => setForm(f => ({ ...f, image_principale: url }))}
                  onChangeExtra={imgs => setForm(f => ({ ...f, images: imgs }))}
                />
              </div>

              {/* Vidéo de présentation */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Video size={16} className="text-primary-600" />
                    Vidéo de présentation (visite guidée)
                  </span>
                  <span className="text-xs font-normal text-gray-400">Optionnel</span>
                </label>
                <VideoPicker
                  videoUrl={form.video_url || ''}
                  onChange={url => setForm(f => ({ ...f, video_url: url }))}
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button type="button" onClick={closeEdit} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium disabled:opacity-50 transition-colors">
                <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Appartements</h1>
          <p className="text-gray-500">{rooms.length} appartement{rooms.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {headerActions}
          </div>
          <button type="button" onClick={openNew} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md">
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rooms.map(room => (
            <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {(room.image_principale || room.images[0]) && (
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img src={room.image_principale || room.images[0]} alt={room.name} className="w-full h-full object-cover" loading="lazy" />
                  {room.video_url && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      <Video size={12} className="text-yellow-400" />
                      <span>Vidéo incluse</span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-heading font-bold text-gray-900">{room.name}</h3>
                  <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium shrink-0 ml-2">{room.capacity}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="font-bold text-primary-600">{room.price_night.toLocaleString()} F <span className="font-normal text-gray-400">/ nuit</span></span>
                  <span className="text-gray-400">{room.price_day.toLocaleString()} F / jour</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => openEdit(room)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 text-sm font-medium transition-colors">
                    <Pencil size={14} /> Modifier
                  </button>
                  <button type="button" onClick={() => setDeleteConfirmId(room.id)} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-3 py-16 text-center text-gray-400">
              <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucun appartement. Cliquez sur "Ajouter" pour commencer.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Vue Audit Log ────────────────────────────────────────────────────────
interface AuditEntry {
  id: string | number;
  admin_id: string | null;
  admin_email?: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const parseAuditData = (val: unknown): Record<string, unknown> | null => {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(val));
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
};

const AuditTab = ({ headerActions }: { headerActions?: React.ReactNode } = {}) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (Array.isArray(data)) setLogs(data as AuditEntry[]);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const actionStyle = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'LOGOUT': return 'bg-slate-100 text-slate-700 border border-slate-200/60';
      case 'LOGIN_FAILED': return 'bg-amber-50 text-amber-700 border border-amber-200/60 font-medium';
      case 'LOGIN_BLOCKED': return 'bg-rose-50 text-rose-700 border border-rose-300 font-bold';
      case 'INSERT': return 'bg-green-50 text-green-700 border border-green-200/60';
      case 'UPDATE': return 'bg-blue-50 text-blue-700 border border-blue-200/60';
      case 'DELETE': return 'bg-red-50 text-red-700 border border-red-200/60';
      case 'CHANGE_PASSWORD': return 'bg-purple-50 text-purple-700 border border-purple-200/60';
      case 'CREATE_ADMIN': return 'bg-purple-50 text-purple-700 border border-purple-200/60';
      case 'DATABASE_RESET': return 'bg-red-700 text-white font-bold animate-pulse';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200/60';
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'Connexion';
      case 'LOGOUT': return 'Déconnexion';
      case 'LOGIN_FAILED': return 'Échec connexion';
      case 'LOGIN_BLOCKED': return 'Blocage IP';
      case 'INSERT': return 'Création';
      case 'UPDATE': return 'Modification';
      case 'DELETE': return 'Suppression';
      case 'CHANGE_PASSWORD': return 'Mot de passe';
      case 'CREATE_ADMIN': return 'Nouvel admin';
      case 'DATABASE_RESET': return 'Purge BDD';
      default: return action;
    }
  };

  const tableLabel = (tableName: string) => {
    switch (tableName) {
      case 'auth': return { label: 'Session & Sécurité', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100' };
      case 'reservations': return { label: 'Réservation', badge: 'bg-amber-50 text-amber-700 border border-amber-100' };
      case 'rooms': return { label: 'Appartement', badge: 'bg-cyan-50 text-cyan-700 border border-cyan-100' };
      case 'gallery': return { label: 'Galerie', badge: 'bg-teal-50 text-teal-700 border border-teal-100' };
      case 'admins': return { label: 'Comptes Admin', badge: 'bg-purple-50 text-purple-700 border border-purple-100' };
      case 'DATABASE': return { label: 'Base BDD', badge: 'bg-red-100 text-red-800 border border-red-200' };
      default: return { label: tableName, badge: 'bg-gray-100 text-gray-700 border border-gray-200' };
    }
  };

  const getLogDetail = (log: AuditEntry, oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) => {
    const ip = (newData?.ip || oldData?.ip || (log.table_name === 'auth' && log.record_id && !isNaN(Number(log.record_id)) ? null : log.record_id)) as string | null;

    if (log.action === 'LOGIN') {
      return (
        <span className="flex items-center flex-wrap gap-2">
          <span>Connexion réussie ({String(newData?.email || log.admin_email || 'administrateur')})</span>
          {ip ? <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200/60">IP: {ip}</span> : null}
        </span>
      );
    }
    if (log.action === 'LOGOUT') {
      return (
        <span className="flex items-center flex-wrap gap-2">
          <span>Déconnexion ({String(newData?.email || log.admin_email || 'administrateur')})</span>
          {ip ? <span className="font-mono text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">IP: {ip}</span> : null}
        </span>
      );
    }
    if (log.action === 'LOGIN_FAILED') {
      const attempt = newData?.attempt ? `(tentative ${newData.attempt}/3)` : '';
      return (
        <span className="flex items-center flex-wrap gap-2 text-amber-900">
          <span>Tentative échouée pour "{String(newData?.email || 'inconnu')}" {attempt}</span>
          {ip ? <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 font-semibold">IP: {ip}</span> : null}
        </span>
      );
    }
    if (log.action === 'LOGIN_BLOCKED') {
      const mins = newData?.lockoutMinutes ? `${newData.lockoutMinutes} min` : '5 min';
      return (
        <span className="flex items-center flex-wrap gap-2 text-rose-900 font-medium">
          <span>Verrouillage de sécurité activé (3 échecs, ban {mins}) pour "{String(newData?.email || 'inconnu')}"</span>
          {ip ? <span className="font-mono text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-300 font-bold">IP: {ip}</span> : null}
        </span>
      );
    }
    if (log.action === 'CHANGE_PASSWORD') {
      return 'Mot de passe administrateur modifié';
    }
    if (log.action === 'CREATE_ADMIN') {
      return `Création d’un nouvel administrateur : ${newData?.email || 'compte'}`;
    }
    if (log.action === 'DATABASE_RESET') {
      return `Purge complète exécutée par ${newData?.reset_by || log.admin_email || 'administrateur'}`;
    }

    if (log.table_name === 'reservations') {
      const client = oldData?.client_name || newData?.client_name;
      if (log.action === 'UPDATE' && oldData?.status !== newData?.status) {
        return (
          <span>
            Statut : <span className="font-semibold text-gray-700">{String(oldData?.status ?? '—')}</span>
            {' → '}
            <span className="font-semibold text-primary-700">{String(newData?.status ?? '—')}</span>
            {client ? <span className="text-gray-400 ml-1.5 font-normal">({String(client)})</span> : null}
          </span>
        );
      }
      if (log.action === 'DELETE') {
        return <span>Réservation supprimée {client ? <span className="text-gray-400">({String(client)})</span> : null}</span>;
      }
      if (log.action === 'INSERT') {
        return <span>Nouvelle réservation {client ? <span className="text-gray-400">({String(client)})</span> : null}</span>;
      }
    }

    if (log.table_name === 'rooms') {
      const name = newData?.name || oldData?.name || log.record_id;
      if (log.action === 'INSERT') return `Appartement "${name}" créé`;
      if (log.action === 'UPDATE') return `Appartement "${name}" modifié`;
      if (log.action === 'DELETE') return `Appartement "${name}" supprimé`;
    }

    if (log.table_name === 'gallery') {
      const name = newData?.name || oldData?.name || 'Image';
      if (log.action === 'INSERT') return `Photo "${name}" ajoutée`;
      if (log.action === 'DELETE') return `Photo "${name}" supprimée`;
    }

    return `Action ${log.action} sur ${log.table_name} (#${log.record_id})`;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterModule !== 'all') {
        if (filterModule === 'auth' && log.table_name !== 'auth') return false;
        if (filterModule === 'reservations' && log.table_name !== 'reservations') return false;
        if (filterModule === 'rooms' && log.table_name !== 'rooms') return false;
        if (filterModule === 'gallery' && log.table_name !== 'gallery') return false;
        if (filterModule === 'security' && !['admins', 'DATABASE'].includes(log.table_name)) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const email = (log.admin_email || '').toLowerCase();
        const action = log.action.toLowerCase();
        const recId = log.record_id.toLowerCase();
        const table = log.table_name.toLowerCase();
        const rawNew = typeof log.new_data === 'string' ? log.new_data.toLowerCase() : JSON.stringify(log.new_data || '').toLowerCase();
        return email.includes(q) || action.includes(q) || recId.includes(q) || table.includes(q) || rawNew.includes(q);
      }
      return true;
    });
  }, [logs, filterModule, searchTerm]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Journal d'audit</h1>
          <p className="text-gray-500">Traçabilité complète des actions : connexions, modifications et suppressions.</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {headerActions}
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterModule('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterModule === 'all'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tous ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterModule('auth')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterModule === 'auth'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Connexions
          </button>
          <button
            type="button"
            onClick={() => setFilterModule('reservations')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterModule === 'reservations'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Réservations
          </button>
          <button
            type="button"
            onClick={() => setFilterModule('rooms')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterModule === 'rooms'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Appartements
          </button>
          <button
            type="button"
            onClick={() => setFilterModule('gallery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterModule === 'gallery'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Galerie
          </button>
          <button
            type="button"
            onClick={() => setFilterModule('security')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterModule === 'security'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Sécurité
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par email, action..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-3xl border border-gray-100">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune action enregistrée pour ces critères.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5 font-medium whitespace-nowrap">Date & Heure</th>
                  <th className="px-5 py-3.5 font-medium whitespace-nowrap">Auteur (Qui ?)</th>
                  <th className="px-5 py-3.5 font-medium whitespace-nowrap">Module</th>
                  <th className="px-5 py-3.5 font-medium whitespace-nowrap">Action</th>
                  <th className="px-5 py-3.5 font-medium">Détails de l'opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map(log => {
                  const oldData = parseAuditData(log.old_data);
                  const newData = parseAuditData(log.new_data);
                  const tbl = tableLabel(log.table_name);
                  const author = log.admin_email;

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {author ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {author.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 text-xs">{author}</span>
                          </div>
                        ) : log.table_name === 'auth' ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                              <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                              Tentative externe
                            </span>
                            {newData?.ip ? (
                              <span className="font-mono text-[10px] text-gray-500 pl-4">{String(newData.ip)}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Système</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${tbl.badge}`}>
                          {tbl.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${actionStyle(log.action)}`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {getLogDetail(log, oldData, newData)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── 3. Dashboard principal avec notifications temps réel ─────────────────
const DashboardContent = ({ session, onLogout }: { session: Session; onLogout: () => void }) => {
  const { reservations, storageError, updateStatus, deleteReservation } = useReservations();
  const { rooms: dbRooms } = useRooms();
  const rooms: DashboardRoom[] = dbRooms.map(r => ({
    id: r.id,
    name: r.name,
    price_night: r.priceNight,
    price_day: r.priceDay,
  }));
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Détection des conflits — mémoïsé pour éviter O(n²) à chaque render
  const conflictIds = useMemo(() => getConflictIds(reservations), [reservations]);

  // ─── Système de notifications temps réel ─────────────────────────────
  const {
    notifications,
    toasts,
    unreadCount,
    markAsRead,
    markAllRead,
    removeNotification,
    clearAll,
    dismissToast,
  } = useNotifications(rooms);

  const navItems: { id: AdminTab; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'reservations', label: 'Réservations', icon: CalendarDays },
    { id: 'planning', label: 'Planning', icon: CalendarDays },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'chambres', label: 'Appartements', icon: BedDouble },
    { id: 'audit', label: 'Journal d\'audit', icon: ClipboardList },
  ];

  const headerActions = (
    <div className="flex items-center gap-3">
      <AdminGlobalSearch
        reservations={reservations}
        rooms={rooms}
        onNavigateTab={setActiveTab}
      />
      <NotificationCenter
        notifications={notifications}
        toasts={toasts}
        unreadCount={unreadCount}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllRead}
        onRemove={removeNotification}
        onClearAll={clearAll}
        onDismissToast={dismissToast}
        onNavigate={(tab) => setActiveTab(tab as AdminTab)}
      />
    </div>
  );

  return (
    <div className="h-screen h-[100dvh] bg-gray-50 flex overflow-hidden">
      {/* Toasts fixes — rendu unique dans l’arbre */}
      <NotificationToasts toasts={toasts} onDismissToast={dismissToast} />

      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-full shrink-0 justify-between select-none">
        <div className="p-4 lg:p-5">
          <div className="flex items-center gap-2 mb-4 lg:mb-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-heading font-bold text-sm">RC</div>
              <div className="font-heading font-bold text-xl text-primary-900">Admin Cheliel</div>
            </Link>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left relative ${activeTab === item.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <item.icon size={19} /> {item.label}
                {item.id === 'reservations' && conflictIds.size > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{conflictIds.size}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 lg:p-5 border-t border-gray-100 space-y-1">
          <p className="text-xs text-gray-400 mb-2 truncate px-3">{session.user.email}</p>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              activeTab === 'settings'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Settings size={19} /> Paramètres
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors text-left"
          >
            <LogOut size={19} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto overflow-x-hidden h-full">
        {/* Mobile header */}
        <div className="md:hidden mb-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-4">
            <div className="font-heading font-bold text-xl text-primary-900">Admin Cheliel</div>
            <div className="flex items-center gap-2">
              <AdminGlobalSearch
                reservations={reservations}
                rooms={rooms}
                onNavigateTab={setActiveTab}
              />
              <NotificationCenter
                notifications={notifications}
                toasts={toasts}
                unreadCount={unreadCount}
                onMarkRead={markAsRead}
                onMarkAllRead={markAllRead}
                onRemove={removeNotification}
                onClearAll={clearAll}
                onDismissToast={dismissToast}
                onNavigate={(tab) => setActiveTab(tab as AdminTab)}
              />
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                aria-label="Paramètres"
                title="Paramètres"
                className={`p-2 rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? 'text-primary-700 bg-primary-100'
                    : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Settings size={20} />
              </button>
              <button type="button" onClick={onLogout} aria-label="Déconnexion" className="p-2 text-red-600 bg-red-50 rounded-lg"><LogOut size={20} /></button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map(item => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors relative ${activeTab === item.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                <item.icon size={15} /> {item.label}
                {item.id === 'reservations' && conflictIds.size > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{conflictIds.size}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {storageError && (
          <div className="mb-6 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <div className="flex items-center gap-2">
              <XCircle size={18} className="shrink-0" />
              <span>{storageError}</span>
            </div>
            {storageError.toLowerCase().includes('non autorisé') && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                Se reconnecter
              </button>
            )}
          </div>
        )}


        {activeTab === 'dashboard' && <OverviewTab reservations={reservations} conflictIds={conflictIds} rooms={rooms} onTabChange={setActiveTab} headerActions={headerActions} />}
        {activeTab === 'reservations' && <ReservationsTab reservations={reservations} conflictIds={conflictIds} rooms={rooms} updateStatus={updateStatus} deleteReservation={deleteReservation} headerActions={headerActions} />}
        {activeTab === 'planning' && <PlanningTab reservations={reservations} conflictIds={conflictIds} rooms={rooms} headerActions={headerActions} />}
        {activeTab === 'clients' && <ClientsTab reservations={reservations} rooms={rooms} headerActions={headerActions} />}
        {activeTab === 'chambres' && <ChambresTab headerActions={headerActions} />}
        {activeTab === 'audit' && <AuditTab headerActions={headerActions} />}
        {activeTab === 'settings' && (
          <SettingsTab
            session={session}
            headerActions={headerActions}
            onDatabaseReset={() => window.location.reload()}
          />
        )}
      </main>
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────
export const AdminDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    api.auth.getSession().then(({ data }) => { setSession(data.session); setSessionLoading(false); });
    const { data: { subscription } } = api.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setError('');
    const { error } = await api.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message || 'Email ou mot de passe incorrect.');
    setLoginLoading(false);
  };

  if (sessionLoading) return (
    <div className="min-h-screen bg-[#f4f0ec] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="min-h-screen bg-[#f4f0ec] flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary-600" />
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600"><Lock size={32} /></div>
        </div>
        <h1 className="text-3xl font-heading font-bold text-center text-gray-900 mb-2">Espace Administrateur</h1>
        <p className="text-gray-500 text-center mb-8">Connectez-vous pour accéder à la gestion de la Résidence Cheliel.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <label htmlFor="admin-email" className="sr-only">Adresse email</label>
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="admin@example.com" required />
          </div>
          <div>
            <label htmlFor="admin-password" className="sr-only">Mot de passe</label>
            <div className="relative">
              <input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 pr-12 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all tracking-widest text-xl"
              placeholder="••••••••" required />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2 text-center" role="alert">{error}</p>}
          </div>
          <button type="submit" disabled={loginLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20">
            {loginLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">Retour au site public</Link>
        </div>
      </div>
    </div>
  );

  return <DashboardContent session={session} onLogout={() => api.auth.signOut()} />;
};

// ─── StatCard ──────────────────────────────────────────────────────────────
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/10',
    green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10',
    purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-500/10',
    orange: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/10',
  };

  return (
    <div className="bg-white p-5 lg:p-6 rounded-2xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm transition-all flex flex-col justify-between min-w-0">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider truncate">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorStyles[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <p className="text-2xl lg:text-3xl font-bold font-heading text-gray-900 tracking-tight whitespace-nowrap">
          {value}
        </p>
      </div>
    </div>
  );
};

