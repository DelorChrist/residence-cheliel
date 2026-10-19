import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Lock, Users, Info, AlertTriangle, CheckCircle2,
  AlertCircle, Eye, EyeOff, Loader2, Database, ShieldCheck, UserPlus
} from 'lucide-react';

interface SettingsTabProps {
  session: { access_token: string; user: { id: number; email: string } };
  headerActions?: React.ReactNode;
  onDatabaseReset?: () => void;
}

type SubTab = 'password' | 'admins' | 'system' | 'danger';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  session,
  headerActions,
  onDatabaseReset,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('password');

  // État Mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // État Administrateurs
  const [adminsList, setAdminsList] = useState<Array<{ id: number; email: string; created_at?: string }>>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  // État Système
  const [systemInfo, setSystemInfo] = useState<{
    reservations: number;
    rooms: number;
    admins: number;
    auditLogs: number;
    galleryImages: number;
    nodeVersion: string;
    platform: string;
    uptimeMinutes: number;
    dbStatus: string;
    serverTime: string;
  } | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);

  // État Danger
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerConfirmText, setDangerConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerError, setDangerError] = useState('');
  const [dangerSuccess, setDangerSuccess] = useState('');

  useEffect(() => {
    if (activeSubTab === 'admins') {
      loadAdmins();
    } else if (activeSubTab === 'system') {
      loadSystemInfo();
    }
  }, [activeSubTab]);

  const loadAdmins = async () => {
    setAdminsLoading(true);
    setAdminError('');
    const res = await api.settings.getAdmins();
    if (res.data) setAdminsList(res.data);
    else setAdminError(res.error?.message || 'Erreur lors du chargement des administrateurs.');
    setAdminsLoading(false);
  };

  const loadSystemInfo = async () => {
    setSystemLoading(true);
    const res = await api.settings.getSystemInfo();
    if (res.data) setSystemInfo(res.data);
    setSystemLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setPassLoading(true);
    const res = await api.settings.changePassword({ currentPassword, newPassword });
    setPassLoading(false);

    if (res.error) {
      setPassError(res.error.message);
    } else {
      setPassSuccess('Votre mot de passe a été modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!newAdminEmail.trim() || !newAdminPassword) {
      setAdminError('Veuillez remplir tous les champs.');
      return;
    }

    setCreateAdminLoading(true);
    const res = await api.settings.createAdmin({
      email: newAdminEmail.trim(),
      password: newAdminPassword,
    });
    setCreateAdminLoading(false);

    if (res.error) {
      setAdminError(res.error.message);
    } else {
      setAdminSuccess(`L’administrateur ${newAdminEmail.trim()} a été créé.`);
      setNewAdminEmail('');
      setNewAdminPassword('');
      loadAdmins();
    }
  };

  const handleResetDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setDangerError('');
    setDangerSuccess('');

    if (!dangerConfirmText.trim()) {
      setDangerError('Code de validation requis.');
      return;
    }
    if (!dangerPassword) {
      setDangerError('Clé d’authentification requise.');
      return;
    }

    setDangerLoading(true);
    const res = await api.settings.resetDatabase({
      password: dangerPassword,
      confirmationText: dangerConfirmText.trim(),
    });
    setDangerLoading(false);

    if (res.error) {
      setDangerError(res.error.message);
    } else {
      setDangerSuccess(res.data?.message || 'La base de données a été vidée avec succès.');
      setDangerPassword('');
      setDangerConfirmText('');
      if (onDatabaseReset) {
        onDatabaseReset();
      }
    }
  };

  return (
    <div>
      {/* En-tête de vue principale */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-1">Paramètres</h1>
          <p className="text-gray-500">Gestion du compte, des administrateurs et maintenance de la résidence.</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {headerActions}
        </div>
      </div>

      {/* Barre de navigation simple des sous-onglets fixée au défilement */}
      <div className="sticky -top-6 lg:-top-10 z-20 bg-gray-50/95 backdrop-blur-md -mx-6 px-6 lg:-mx-10 lg:px-10 pt-6 pb-3 mb-6 border-b border-gray-200/80 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setActiveSubTab('password'); setPassError(''); setPassSuccess(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'password'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Lock size={16} /> Mot de passe
        </button>
        <button
          type="button"
          onClick={() => { setActiveSubTab('admins'); setAdminError(''); setAdminSuccess(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'admins'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Users size={16} /> Administrateurs
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'system'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Info size={16} /> Informations système
        </button>
        <button
          type="button"
          onClick={() => { setActiveSubTab('danger'); setDangerError(''); setDangerSuccess(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeSubTab === 'danger'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
            }`}
        >
          <AlertTriangle size={16} /> Zone de danger
        </button>
      </div>

      {/* Contenu de l'onglet sélectionné */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        {/* 1. Mot de passe */}
        {activeSubTab === 'password' && (
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Modifier mon mot de passe</h2>
            <p className="text-sm text-gray-500 mb-6">
              Connecté en tant que <span className="font-semibold text-gray-900">{session.user.email}</span>.
            </p>

            {passError && (
              <div className="mb-5 p-3.5 bg-red-50 text-red-700 rounded-xl flex items-start gap-2.5 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="mb-5 p-3.5 bg-green-50 text-green-700 rounded-xl flex items-start gap-2.5 text-sm">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nouveau mot de passe (min. 6 caractères)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="mt-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 text-sm"
              >
                {passLoading && <Loader2 size={16} className="animate-spin" />}
                Enregistrer le mot de passe
              </button>
            </form>
          </div>
        )}

        {/* 2. Administrateurs */}
        {activeSubTab === 'admins' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Gestion des administrateurs</h2>
              <p className="text-sm text-gray-500">Ajoutez de nouveaux comptes ou consultez les accès existants.</p>
            </div>

            {adminError && (
              <div className="p-3.5 bg-red-50 text-red-700 rounded-xl flex items-start gap-2.5 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            {adminSuccess && (
              <div className="p-3.5 bg-green-50 text-green-700 rounded-xl flex items-start gap-2.5 text-sm">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>{adminSuccess}</span>
              </div>
            )}

            {/* Formulaire ajout admin */}
            <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl max-w-2xl">
              <div className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-4">
                <UserPlus size={18} className="text-primary-600" />
                Créer un nouvel administrateur
              </div>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Adresse email</label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="admin2@cheliel.ci"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mot de passe temporaire</label>
                    <input
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="min. 6 caractères"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={createAdminLoading}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {createAdminLoading && <Loader2 size={16} className="animate-spin" />}
                  Ajouter l’administrateur
                </button>
              </form>
            </div>

            {/* Liste des administrateurs */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider text-xs">
                Comptes administrateurs actifs ({adminsList.length})
              </h3>
              {adminsLoading ? (
                <div className="flex justify-center py-8 text-gray-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white max-w-2xl">
                  {adminsList.map((adm) => {
                    const isMe = adm.email.toLowerCase() === session.user.email.toLowerCase();
                    return (
                      <div key={adm.id} className="p-4 flex items-center justify-between text-sm hover:bg-gray-50/70">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-sm">
                            {adm.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {adm.email}
                              {isMe && (
                                <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-md text-[11px] font-bold">
                                  Votre compte
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">Identifiant #{adm.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-1 rounded-full font-medium">
                          <ShieldCheck size={14} /> Actif
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Système */}
        {activeSubTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Informations système & Base de données</h2>
              <p className="text-sm text-gray-500">Vue d'ensemble technique et statistiques des données.</p>
            </div>

            {systemLoading ? (
              <div className="flex justify-center py-12 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
              </div>
            ) : systemInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5">
                    <Database size={16} className="text-primary-600" /> Base de données
                  </div>
                  <div className="text-base font-bold text-gray-900">{systemInfo.dbStatus}</div>
                  <div className="text-xs text-green-600 mt-2 flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse"></span> Service actif
                  </div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-xs text-gray-500 mb-1.5">Réservations</div>
                  <div className="text-3xl font-heading font-bold text-gray-900">{systemInfo.reservations}</div>
                  <div className="text-xs text-gray-400 mt-1">enregistrées au total</div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-xs text-gray-500 mb-1.5">Appartements</div>
                  <div className="text-3xl font-heading font-bold text-gray-900">{systemInfo.rooms}</div>
                  <div className="text-xs text-gray-400 mt-1">configurés et disponibles</div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-xs text-gray-500 mb-1.5">Comptes administrateurs</div>
                  <div className="text-3xl font-heading font-bold text-gray-900">{systemInfo.admins}</div>
                  <div className="text-xs text-gray-400 mt-1">accès de gestion autorisés</div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-xs text-gray-500 mb-1.5">Journal d’audit</div>
                  <div className="text-3xl font-heading font-bold text-gray-900">{systemInfo.auditLogs}</div>
                  <div className="text-xs text-gray-400 mt-1">actions tracées (jamais effacées)</div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="text-xs text-gray-500 mb-1.5">Photos dans la galerie</div>
                  <div className="text-3xl font-heading font-bold text-gray-900">{systemInfo.galleryImages}</div>
                  <div className="text-xs text-gray-400 mt-1">fichiers hébergés</div>
                </div>

                <div className="p-5 bg-gray-50 border border-gray-100 rounded-2xl sm:col-span-2 lg:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
                    <div>Durée d’activité serveur : <span className="font-semibold text-gray-900">{systemInfo.uptimeMinutes} minutes</span></div>
                    <div>Horloge serveur : <span className="font-semibold text-gray-900">{new Date(systemInfo.serverTime).toLocaleString('fr-FR')}</span></div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 4. Danger */}
        {activeSubTab === 'danger' && (
          <div className="max-w-2xl bg-zinc-950 text-zinc-100 rounded-3xl p-7 md:p-9 border border-red-900/60 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-2xl bg-red-950/90 border border-red-800/80 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle size={22} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-widest text-red-500 font-mono uppercase">
                  Zone Critique & Verrouillée
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono tracking-wider">
                  PROTOCOLE DE SÉCURITÉ MAÎTRE // ACCÈS ULTRA-RESTREINT
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-xs text-red-300/90 leading-relaxed font-mono">
              AVERTISSEMENT : La procédure de suppression du système est destructive et irréversible. Toute exécution non autorisée sera tracée et sanctionnée au journal de sécurité.
            </div>

            {dangerError && (
              <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-300 rounded-xl flex items-start gap-2.5 text-xs font-mono">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span>{dangerError}</span>
              </div>
            )}

            {dangerSuccess && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl flex items-start gap-2.5 text-xs font-mono">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{dangerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetDatabase} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Clé d’authentification
                </label>
                <input
                  type="password"
                  value={dangerPassword}
                  onChange={(e) => setDangerPassword(e.target.value)}
                  required
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Code de validation système
                </label>
                <input
                  type="password"
                  value={dangerConfirmText}
                  onChange={(e) => setDangerConfirmText(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent font-mono tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={dangerLoading || !dangerConfirmText || !dangerPassword}
                className="w-full mt-2 bg-red-700 hover:bg-red-600 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:cursor-not-allowed text-white font-mono uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 border border-red-600 text-xs shadow-lg shadow-red-950"
              >
                {dangerLoading && <Loader2 size={16} className="animate-spin" />}
                Procéder à la suppression
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
