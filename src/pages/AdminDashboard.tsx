import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useReservations, Reservation, getNights, ReservationStatus } from '../hooks/useReservations';
import { rooms } from '../data/rooms';
import { Lock, LayoutDashboard, CalendarDays, DollarSign, Users, Clock, LogOut, CheckCircle2, XCircle, Download, LucideIcon, Trash2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

const sanitizeCSVField = (value: string | number): string => {
  const str = String(value);
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
};

const exportCSV = (reservations: Reservation[]) => {
  const headers = ['ID', 'Client', 'Téléphone', 'Email', 'Chambre', 'Arrivée', 'Départ', 'Nuits', 'Paiement', 'Statut', 'Créé le'];
  const rows = reservations.map(r => {
    const room = rooms.find(rm => rm.id === r.roomId);
    const nights = getNights(r.checkIn, r.checkOut);
    return [
      r.id, r.clientName, r.phone, r.email ?? '',
      room?.name ?? r.roomId, r.checkIn, r.checkOut, nights,
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

export const AdminDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'Tous'>('Tous');

  const { reservations, storageError, updateStatus, deleteReservation } = useReservations();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Email ou mot de passe incorrect.');
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#f4f0ec] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f4f0ec] flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary-600" />
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-heading font-bold text-center text-gray-900 mb-2">Espace Administrateur</h1>
          <p className="text-gray-500 text-center mb-8">Connectez-vous pour accéder à la gestion de la Résidence Cheliel.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all tracking-widest text-xl"
                placeholder="••••••••"
                required
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20"
            >
              {loginLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">Retour au site public</Link>
          </div>
        </div>
      </div>
    );
  }

  const totalReservations = reservations.length;
  const pendingReservations = reservations.filter(r => r.status === 'En attente').length;
  const revenue = reservations
    .filter(r => r.status === 'Confirmé')
    .reduce((acc, r) => {
      const room = rooms.find(rm => rm.id === r.roomId);
      const nights = getNights(r.checkIn, r.checkOut);
      const price = room ? (r.stayType === 'journée' ? room.priceDay : room.priceNight) : 0;
      return acc + price * nights;
    }, 0);
  const occupancyRate = totalReservations === 0
    ? 0
    : Math.round((reservations.filter(r => r.status === 'Confirmé').length / totalReservations) * 100);
  const filteredReservations = statusFilter === 'Tous'
    ? reservations
    : reservations.filter(r => r.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-heading font-bold text-sm">RC</div>
            <div className="font-heading font-bold text-xl text-primary-900">Admin Cheliel</div>
          </Link>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-700 rounded-xl font-medium">
              <LayoutDashboard size={20} /> Tableau de Bord
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
              <CalendarDays size={20} /> Réservations
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
              <Users size={20} /> Clients
            </a>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3 truncate px-4">{session.user.email}</p>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors w-full">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-x-hidden">
        <div className="md:hidden flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
          <div className="font-heading font-bold text-xl text-primary-900">Admin Cheliel</div>
          <button onClick={handleLogout} className="p-2 text-red-600 bg-red-50 rounded-lg">
            <LogOut size={20} />
          </button>
        </div>

        {storageError && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <XCircle size={18} className="shrink-0" />
            {storageError}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Vue d'ensemble</h1>
            <p className="text-gray-500">Gérez vos réservations et vos revenus.</p>
          </div>
          <button
            onClick={() => exportCSV(reservations)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            <Download size={16} /> Exporter CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="Réservations" value={totalReservations.toString()} icon={CalendarDays} color="blue" />
          <StatCard title="Revenus (Confirmés)" value={`${revenue.toLocaleString()} F`} icon={DollarSign} color="green" />
          <StatCard title="Taux d'occupation" value={`${occupancyRate}%`} icon={Users} color="purple" />
          <StatCard title="En attente" value={pendingReservations.toString()} icon={Clock} color="orange" />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-heading font-bold text-gray-900">Réservations</h2>
            <div className="flex gap-2 flex-wrap">
              {(['Tous', 'En attente', 'Confirmé', 'Annulé'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
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
                {filteredReservations.map((res: Reservation) => {
                  const room = rooms.find(r => r.id === res.roomId);
                  const nights = getNights(res.checkIn, res.checkOut);
                  return (
                    <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{res.clientName}</div>
                        <div className="text-sm text-gray-500">{res.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{room?.name || 'Inconnue'}</div>
                        <div className="text-sm text-gray-500">{room?.priceNight.toLocaleString()} F/n · {nights} nuit{nights > 1 ? 's' : ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{new Date(res.checkIn).toLocaleDateString('fr-FR')}</div>
                        <div className="text-sm text-gray-500">au {new Date(res.checkOut).toLocaleDateString('fr-FR')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          res.paymentMethod === 'Orange Money' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {res.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          res.status === 'Confirmé' ? 'bg-green-100 text-green-800' :
                          res.status === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
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
                            <button onClick={() => updateStatus(res.id, 'Confirmé')} className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-lg transition-colors" title="Confirmer">
                              <CheckCircle2 size={18} />
                            </button>
                            <button onClick={() => updateStatus(res.id, 'Annulé')} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors" title="Annuler">
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                        {res.status === 'Annulé' && (
                          <button
                            onClick={() => { if (confirm('Supprimer définitivement cette réservation ?')) deleteReservation(res.id); }}
                            className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredReservations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucune réservation{statusFilter !== 'Tous' ? ` avec le statut "${statusFilter}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: LucideIcon, color: 'blue' | 'green' | 'purple' | 'orange' }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${colorStyles[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};
