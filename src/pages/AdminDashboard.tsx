import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useReservations, Reservation, getNights, ReservationStatus } from '../hooks/useReservations';
import { rooms as staticRooms } from '../data/rooms';
import {
  Lock, LayoutDashboard, CalendarDays, DollarSign, Users, Clock,
  LogOut, CheckCircle2, XCircle, Download, LucideIcon, Trash2, Mail,
  Phone, Search, AlertTriangle, Bell, ChevronLeft, ChevronRight,
  BedDouble, Plus, Pencil, Save, X, Upload, ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

type AdminTab = 'dashboard' | 'reservations' | 'clients' | 'planning' | 'chambres';

const BUCKET = 'room-images';

// ─── Utilitaires ───────────────────────────────────────────────────────────

const sanitizeCSVField = (value: string | number): string => {
  const str = String(value);
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
};

const exportCSV = (reservations: Reservation[]) => {
  if (reservations.length === 0) { alert('Aucune réservation à exporter.'); return; }
  const headers = ['ID', 'Client', 'Téléphone', 'Email', 'Chambre', 'Type', 'Arrivée', 'Départ', 'Durée', 'Paiement', 'Statut', 'Créé le'];
  const rows = reservations.map(r => {
    const room = staticRooms.find(rm => rm.id === r.roomId);
    const nights = getNights(r.checkIn, r.checkOut);
    return [
      r.id, r.clientName, r.phone, r.email ?? '',
      room?.name ?? r.roomId, r.stayType, r.checkIn, r.checkOut, nights,
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

// ─── 1. Vue Tableau de Bord ────────────────────────────────────────────────
const OverviewTab = ({ reservations, conflictIds, onTabChange }: {
  reservations: Reservation[];
  conflictIds: Set<string>;
  onTabChange: (tab: AdminTab) => void;
}) => {
  const totalReservations = reservations.length;
  const pendingReservations = reservations.filter(r => r.status === 'En attente').length;
  const conflictCount = conflictIds.size;
  const revenue = reservations
    .filter(r => r.status === 'Confirmé')
    .reduce((acc, r) => {
      const room = staticRooms.find(rm => rm.id === r.roomId);
      const nights = getNights(r.checkIn, r.checkOut);
      const price = room ? (r.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
      return acc + price * nights;
    }, 0);
  const pendingRevenue = reservations
    .filter(r => r.status === 'En attente')
    .reduce((acc, r) => {
      const room = staticRooms.find(rm => rm.id === r.roomId);
      const nights = getNights(r.checkIn, r.checkOut);
      const price = room ? (r.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
      return acc + price * nights;
    }, 0);
  const occupancyRate = totalReservations === 0
    ? 0
    : Math.round((reservations.filter(r => r.status === 'Confirmé').length / totalReservations) * 100);
  const recent = reservations.slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Vue d'ensemble</h1>
        <p className="text-gray-500">Bienvenue dans votre espace de gestion.</p>
      </div>

      {/* Alerte conflits */}
      {conflictCount > 0 && (
        <button type="button" onClick={() => onTabChange('reservations')}
          className="w-full mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium hover:bg-red-100 transition-colors text-left">
          <AlertTriangle size={20} className="shrink-0 text-red-500" />
          <span><strong>{conflictCount} réservation{conflictCount > 1 ? 's' : ''}</strong> en conflit de dates détectée{conflictCount > 1 ? 's' : ''}. Cliquez pour voir.</span>
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Réservations" value={totalReservations.toString()} icon={CalendarDays} color="blue" />
        <StatCard title="Revenus confirmés" value={`${revenue.toLocaleString()} F`} icon={DollarSign} color="green" />
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

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
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
                const room = staticRooms.find(r => r.id === res.roomId);
                const isConflict = conflictIds.has(res.id);
                return (
                  <tr key={res.id} className={`hover:bg-gray-50/50 ${isConflict ? 'bg-red-50/40' : ''}`}>
                    <td className="px-6 py-3 text-sm">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {res.clientName}
                        {isConflict && <AlertTriangle size={13} className="text-red-500" />}
                      </div>
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
const ReservationsTab = ({ reservations, conflictIds, updateStatus, deleteReservation }: {
  reservations: Reservation[];
  conflictIds: Set<string>;
  updateStatus: (id: string, status: ReservationStatus) => void;
  deleteReservation: (id: string) => void;
}) => {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'Tous' | 'Conflits'>('Tous');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = reservations
    .filter(r => {
      if (statusFilter === 'Conflits') return conflictIds.has(r.id);
      if (statusFilter === 'Tous') return true;
      return r.status === statusFilter;
    })
    .filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const room = staticRooms.find(rm => rm.id === r.roomId);
      return r.clientName.toLowerCase().includes(q) || r.phone.includes(q) || (room?.name.toLowerCase().includes(q) ?? false);
    });

  return (
    <div>
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Réservations</h1>
          <p className="text-gray-500">{reservations.length} réservation{reservations.length > 1 ? 's' : ''} au total
            {conflictIds.size > 0 && <span className="ml-2 text-red-600 font-medium">· {conflictIds.size} conflit{conflictIds.size > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button type="button" onClick={() => exportCSV(reservations)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher client, chambre..." value={search} onChange={e => setSearch(e.target.value)}
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Chambre</th>
                <th className="px-6 py-4 font-medium">Dates</th>
                <th className="px-6 py-4 font-medium">Paiement</th>
                <th className="px-6 py-4 font-medium">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((res: Reservation) => {
                const room = staticRooms.find(r => r.id === res.roomId);
                const nights = getNights(res.checkIn, res.checkOut);
                const price = room ? (res.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
                const unit = res.stayType === 'journée' ? 'j' : 'n';
                const isConflict = conflictIds.has(res.id);
                return (
                  <tr key={res.id} className={`hover:bg-gray-50/50 transition-colors ${isConflict ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {res.clientName}
                        {isConflict && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle size={11} /> Conflit
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{res.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{room?.name || 'Inconnue'}</div>
                      <div className="text-sm text-gray-500">{price.toLocaleString()} F/{unit} · {nights} {res.stayType === 'journée' ? 'jour' : 'nuit'}{nights > 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{new Date(res.checkIn).toLocaleDateString('fr-FR')}</div>
                      <div className="text-sm text-gray-500">au {new Date(res.checkOut).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${res.paymentMethod === 'Orange Money' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                        {res.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        res.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                        res.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {res.status === 'Confirmé' && <CheckCircle2 size={12} />}
                        {res.status === 'En attente' && <Clock size={12} />}
                        {res.status === 'Annulé' && <XCircle size={12} />}
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {res.status === 'En attente' && (
                        <>
                          <button type="button" onClick={() => updateStatus(res.id, 'Confirmé')} aria-label="Confirmer" className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-lg transition-colors"><CheckCircle2 size={18} /></button>
                          <button type="button" onClick={() => updateStatus(res.id, 'Annulé')} aria-label="Annuler" className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors"><XCircle size={18} /></button>
                        </>
                      )}
                      {res.status === 'Annulé' && (
                        <button type="button" onClick={() => setDeleteConfirmId(res.id)} aria-label="Supprimer" className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Aucune réservation trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── 2. Vue Planning / Calendrier ─────────────────────────────────────────
const PlanningTab = ({ reservations, conflictIds }: { reservations: Reservation[]; conflictIds: Set<string> }) => {
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
    return activeRes.find(r => r.roomId === roomId && r.checkIn <= d && r.checkOut > d) ?? null;
  };

  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Afficher max 7 jours à la fois sur mobile, tous sur desktop
  const [startDay, setStartDay] = useState(0);
  const visibleDays = days.slice(startDay, startDay + 7);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Planning</h1>
          <p className="text-gray-500 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} aria-label="Mois précédent" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => { setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setStartDay(0); }} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">Aujourd'hui</button>
          <button type="button" onClick={nextMonth} aria-label="Mois suivant" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><ChevronRight size={18} /></button>
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
              {staticRooms.map(room => (
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
const ClientsTab = ({ reservations }: { reservations: Reservation[] }) => {
  const [search, setSearch] = useState('');

  const clientsMap = new Map<string, { name: string; phone: string; email?: string; count: number; lastVisit: string; totalSpent: number }>();
  reservations.forEach(r => {
    const room = staticRooms.find(rm => rm.id === r.roomId);
    const nights = getNights(r.checkIn, r.checkOut);
    const price = room ? (r.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
    const spent = r.status === 'Confirmé' ? price * nights : 0;
    const existing = clientsMap.get(r.phone);
    if (existing) {
      existing.count += 1;
      existing.totalSpent += spent;
      if (r.createdAt > existing.lastVisit) existing.lastVisit = r.createdAt;
    } else {
      clientsMap.set(r.phone, { name: r.clientName, phone: r.phone, email: r.email, count: 1, lastVisit: r.createdAt, totalSpent: spent });
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
                <a href={`tel:${client.phone}`} className="hover:text-primary-600 transition-colors">{client.phone}</a>
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
  images: string[];
}

const emptyRoom = (): Omit<RoomRow, 'id'> => ({
  name: '', price_night: 0, price_day: 0, capacity: '',
  description: '', long_description: '', amenities: [], images: [],
});

/** Galerie d'images Supabase Storage avec upload et sélection */
const ImagePicker = ({ selected, onChange }: { selected: string[]; onChange: (imgs: string[]) => void }) => {
  const [gallery, setGallery] = useState<{ id: string; url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGallery = useCallback(async () => {
    setLoadingGallery(true);
    const { data } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    if (data) setGallery(data);
    setLoadingGallery(false);
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
        await supabase.from('gallery').insert({ url: publicUrl, name: file.name });
      }
    }
    await fetchGallery();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDeleteFromGallery = async (id: string, url: string) => {
    // Extraire le path depuis l'URL publique
    const path = url.split(`/${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from('gallery').delete().eq('id', id);
    onChange(selected.filter(s => s !== url));
    await fetchGallery();
  };

  const toggle = (url: string) => {
    onChange(selected.includes(url) ? selected.filter(s => s !== url) : [...selected, url]);
  };

  return (
    <div>
      {/* Upload */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center hover:border-primary-400 transition-colors cursor-pointer mb-4"
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} aria-label="Uploader des images" />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-primary-600 text-sm">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            Upload en cours...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload size={22} />
            <span className="text-sm font-medium">Cliquez pour uploader des images</span>
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
          {gallery.map(img => {
            const isSelected = selected.includes(img.url);
            return (
              <div key={img.id} className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-primary-500' : 'border-transparent'}`}
                onClick={() => toggle(img.url)}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                {/* Overlay sélection */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary-600/30 flex items-center justify-center">
                    <CheckCircle2 size={22} className="text-white drop-shadow" />
                  </div>
                )}
                {/* Bouton supprimer */}
                <button
                  type="button"
                  aria-label="Supprimer de la galerie"
                  onClick={e => { e.stopPropagation(); handleDeleteFromGallery(img.id, img.url); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Images sélectionnées (ordre) */}
      {selected.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">{selected.length} image{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''} (ordre d'affichage)</p>
          <div className="flex gap-2 flex-wrap">
            {selected.map((url, i) => (
              <div key={url} className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-primary-300 shrink-0">
                <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChambresTab = () => {
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
    const { data } = await supabase.from('rooms').select('*').order('name');
    if (data) setRooms(data as RoomRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const openEdit = (room: RoomRow) => {
    setEditing(room);
    setIsNew(false);
    setForm({ name: room.name, price_night: room.price_night, price_day: room.price_day, capacity: room.capacity, description: room.description, long_description: room.long_description, amenities: [...room.amenities], images: [...room.images] });
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
      await supabase.from('rooms').insert({ id, ...form });
    } else if (editing) {
      await supabase.from('rooms').update(form).eq('id', editing.id);
    }
    await fetchRooms();
    setSaving(false);
    closeEdit();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('rooms').delete().eq('id', id);
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
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Supprimer cet appartement ?</h3>
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
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
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
                  <label htmlFor="room-desc" className="text-sm font-semibold text-gray-700 mb-1.5 block">Description courte</label>
                  <textarea id="room-desc" className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="room-longdesc" className="text-sm font-semibold text-gray-700 mb-1.5 block">Description longue</label>
                  <textarea id="room-longdesc" className={`${inputCls} resize-none`} rows={3} value={form.long_description} onChange={e => setForm(f => ({ ...f, long_description: e.target.value }))} />
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
                <ImagePicker selected={form.images} onChange={imgs => setForm(f => ({ ...f, images: imgs }))} />
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Appartements</h1>
          <p className="text-gray-500">{rooms.length} appartement{rooms.length > 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={openNew} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-md">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rooms.map(room => (
            <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {room.images[0] && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" loading="lazy" />
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

// ─── 3. Dashboard principal avec notifications temps réel ─────────────────
const DashboardContent = ({ session, onLogout }: { session: Session; onLogout: () => void }) => {
  const { reservations, storageError, updateStatus, deleteReservation } = useReservations();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);
  const prevCountRef = useRef<number | null>(null);

  // Détection des conflits
  const conflictIds = getConflictIds(reservations);

  // Notifications temps réel : nouvelle réservation
  useEffect(() => {
    if (prevCountRef.current === null) { prevCountRef.current = reservations.length; return; }
    if (reservations.length > prevCountRef.current) {
      const newest = reservations[0];
      const room = staticRooms.find(r => r.id === newest?.roomId);
      const notif = { id: Date.now().toString(), message: `Nouvelle réservation de ${newest?.clientName} — ${room?.name ?? newest?.roomId}` };
      setNotifications(n => [notif, ...n].slice(0, 5));
      setTimeout(() => setNotifications(n => n.filter(x => x.id !== notif.id)), 6000);
    }
    prevCountRef.current = reservations.length;
  }, [reservations.length]);

  const navItems: { id: AdminTab; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'reservations', label: 'Réservations', icon: CalendarDays },
    { id: 'planning', label: 'Planning', icon: CalendarDays },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'chambres', label: 'Appartements', icon: BedDouble },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Notifications toast */}
      <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-3 text-sm text-gray-800 max-w-xs animate-fade-in pointer-events-auto">
            <Bell size={16} className="text-primary-500 shrink-0" />
            {n.message}
          </div>
        ))}
      </div>

      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-heading font-bold text-sm">RC</div>
            <div className="font-heading font-bold text-xl text-primary-900">Admin Cheliel</div>
          </Link>
          <nav className="space-y-1">
            {navItems.map(item => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left relative ${activeTab === item.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <item.icon size={20} /> {item.label}
                {item.id === 'reservations' && conflictIds.size > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{conflictIds.size}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3 truncate px-4">{session.user.email}</p>
          <button type="button" onClick={onLogout} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors w-full">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-x-hidden">
        {/* Mobile header */}
        <div className="md:hidden mb-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-4">
            <div className="font-heading font-bold text-xl text-primary-900">Admin Cheliel</div>
            <button type="button" onClick={onLogout} aria-label="Déconnexion" className="p-2 text-red-600 bg-red-50 rounded-lg"><LogOut size={20} /></button>
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
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <XCircle size={18} className="shrink-0" /> {storageError}
          </div>
        )}

        {activeTab === 'dashboard' && <OverviewTab reservations={reservations} conflictIds={conflictIds} onTabChange={setActiveTab} />}
        {activeTab === 'reservations' && <ReservationsTab reservations={reservations} conflictIds={conflictIds} updateStatus={updateStatus} deleteReservation={deleteReservation} />}
        {activeTab === 'planning' && <PlanningTab reservations={reservations} conflictIds={conflictIds} />}
        {activeTab === 'clients' && <ClientsTab reservations={reservations} />}
        {activeTab === 'chambres' && <ChambresTab />}
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
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setSessionLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Email ou mot de passe incorrect.');
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
            <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all tracking-widest text-xl"
              placeholder="••••••••" required />
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

  return <DashboardContent session={session} onLogout={() => supabase.auth.signOut()} />;
};

// ─── StatCard ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: LucideIcon; color: 'blue' | 'green' | 'purple' | 'orange' }) => {
  const colorStyles = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${colorStyles[color]}`}><Icon size={24} /></div>
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};
