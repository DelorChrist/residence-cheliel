import React, { useState, useEffect, useRef } from 'react';
import { api, CadreConfig, CadreItem, DEFAULT_CADRE_CONFIG } from '../lib/api';
import {
  Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Upload, Save, RotateCcw,
  Video as VideoIcon, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2,
  Eye, Star, ExternalLink, RefreshCw, X, Layers
} from 'lucide-react';

interface CadreAdminTabProps {
  headerActions?: React.ReactNode;
}

export const CadreAdminTab: React.FC<CadreAdminTabProps> = ({ headerActions }) => {
  const [config, setConfig] = useState<CadreConfig>(DEFAULT_CADRE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal d'ajout / modification de média
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CadreItem | null>(null);

  // Formulaire d'ajout/édition
  const [itemType, setItemType] = useState<'image' | 'video'>('image');
  const [itemUrl, setItemUrl] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemSubtitle, setItemSubtitle] = useState('');
  const [itemTag, setItemTag] = useState('');
  const [itemThumbnail, setItemThumbnail] = useState('');
  const [itemFeatured, setItemFeatured] = useState(false);

  // Upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Quick preset tags
  const PRESET_TAGS = ['Piscine Principale', 'Bains de soleil', 'Bar au bord de l’eau', 'Soirée & Lounge', 'Vue Aérienne', 'Détente VIP'];

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setErrorMsg('');
    const res = await api.cadre.get();
    if (res.data) {
      setConfig({
        ...DEFAULT_CADRE_CONFIG,
        ...res.data,
        items: res.data.items && res.data.items.length > 0 ? res.data.items : DEFAULT_CADRE_CONFIG.items,
      });
    } else {
      setErrorMsg(res.error?.message || 'Erreur lors du chargement des données.');
    }
    setLoading(false);
  };

  const handleSave = async (customConfig?: CadreConfig) => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const payload = customConfig || config;
    const res = await api.cadre.update(payload);
    if (res.data) {
      setSuccessMsg('Les modifications de la section « Notre cadre » ont été enregistrées avec succès.');
      if (customConfig) setConfig(customConfig);
      setTimeout(() => setSuccessMsg(''), 4500);
    } else {
      setErrorMsg(res.error?.message || 'Erreur lors de l’enregistrement.');
    }
    setSaving(false);
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Voulez-vous réinitialiser la section « Notre cadre » aux photos et textes d’origine de la Résidence Chéliel ?')) {
      return;
    }
    await handleSave(DEFAULT_CADRE_CONFIG);
  };

  // Upload Bannière
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setErrorMsg('');
    const res = await api.storage.from('gallery').upload(file.name, file);
    if (res.data?.path) {
      setConfig(prev => ({ ...prev, bannerUrl: res.data!.path }));
      setSuccessMsg('Bannière téléchargée avec succès. N’oubliez pas d’enregistrer.');
    } else {
      setErrorMsg(res.error?.message || 'Erreur lors du téléversement de la bannière.');
    }
    setUploadingBanner(false);
    if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
  };

  // Upload Média (Image ou Vidéo)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setErrorMsg('');

    if (itemType === 'video') {
      const res = await api.storage.uploadVideo(file);
      if (res.data?.url) {
        setItemUrl(res.data.url);
        if (!itemTitle) setItemTitle(file.name.replace(/\.[^/.]+$/, ''));
      } else {
        setErrorMsg(res.error?.message || 'Erreur lors du téléversement de la vidéo.');
      }
    } else {
      const res = await api.storage.from('gallery').upload(file.name, file);
      if (res.data?.path) {
        setItemUrl(res.data.path);
        if (!itemTitle) setItemTitle(file.name.replace(/\.[^/.]+$/, ''));
      } else {
        setErrorMsg(res.error?.message || 'Erreur lors du téléversement de l’image.');
      }
    }
    setUploadingMedia(false);
    if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
  };

  // Ouvrir modal d'ajout
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemType('image');
    setItemUrl('');
    setItemTitle('');
    setItemSubtitle('');
    setItemTag(PRESET_TAGS[0]);
    setItemThumbnail('');
    setItemFeatured(false);
    setIsModalOpen(true);
  };

  // Ouvrir modal d'édition
  const handleOpenEditModal = (item: CadreItem) => {
    setEditingItem(item);
    setItemType(item.type);
    setItemUrl(item.url);
    setItemTitle(item.title);
    setItemSubtitle(item.subtitle || '');
    setItemTag(item.tag || '');
    setItemThumbnail(item.thumbnailUrl || '');
    setItemFeatured(Boolean(item.featured));
    setIsModalOpen(true);
  };

  // Soumission du média
  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemUrl.trim()) {
      setErrorMsg('Veuillez fournir une URL ou téléverser un fichier.');
      return;
    }
    if (!itemTitle.trim()) {
      setErrorMsg('Veuillez donner un titre au média.');
      return;
    }

    const newItem: CadreItem = {
      id: editingItem ? editingItem.id : `cadre-${Date.now()}`,
      type: itemType,
      url: itemUrl.trim(),
      title: itemTitle.trim(),
      subtitle: itemSubtitle.trim() || undefined,
      tag: itemTag.trim() || undefined,
      thumbnailUrl: itemThumbnail.trim() || undefined,
      featured: itemFeatured,
    };

    let updatedItems: CadreItem[];
    if (editingItem) {
      updatedItems = config.items.map(it => it.id === editingItem.id ? newItem : it);
    } else {
      updatedItems = [newItem, ...config.items];
    }

    const updatedConfig = { ...config, items: updatedItems };
    setConfig(updatedConfig);
    setIsModalOpen(false);
    handleSave(updatedConfig);
  };

  // Supprimer un média
  const handleDeleteItem = (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet élément de « Notre cadre » ?')) return;
    const updated = { ...config, items: config.items.filter(it => it.id !== id) };
    setConfig(updated);
    handleSave(updated);
  };

  // Déplacer vers le haut / bas
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newItems = [...config.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    const updated = { ...config, items: newItems };
    setConfig(updated);
    handleSave(updated);
  };

  // Toggle Featured
  const handleToggleFeatured = (id: string) => {
    const updated = {
      ...config,
      items: config.items.map(it => it.id === id ? { ...it, featured: !it.featured } : it),
    };
    setConfig(updated);
    handleSave(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-500">
        <Loader2 className="animate-spin mb-3 text-primary-600" size={32} />
        <p className="text-sm">Chargement de la section « Notre cadre »...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-600" />
            <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">Mise en valeur</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">
            Section « Notre cadre » (Piscine & Espaces)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gérez les photos, vidéos et la bannière de la magnifique piscine de Yamoussoukro affichée sur la page d’accueil.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
            title="Réinitialiser aux photos d’origine"
          >
            <RotateCcw size={14} />
            Réinitialiser
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {/* Alertes */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bloc 1 : Configuration des textes & Bannière */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Sparkles size={18} className="text-primary-600" />
          <h2 className="text-base font-bold text-gray-900 font-heading">
            Bannière de fond & Textes de présentation
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aperçu Bannière */}
          <div className="lg:col-span-1 space-y-3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Bannière arrière-plan (Piscine)
            </label>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-stone-900 group">
              <img
                src={config.bannerUrl || DEFAULT_CADRE_CONFIG.bannerUrl}
                alt="Bannière Notre Cadre"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/90 text-stone-900 text-xs font-semibold hover:bg-white flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Upload size={13} />
                  Changer
                </button>
              </div>
              {uploadingBanner && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xs gap-2">
                  <Loader2 size={16} className="animate-spin text-primary-400" />
                  Téléversement...
                </div>
              )}
            </div>

            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />

            {/* Presets rapides de bannières disponibles */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-400">Presets :</span>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, bannerUrl: '/images/piscine/longue_banniere.jpg' }))}
                className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  config.bannerUrl === '/images/piscine/longue_banniere.jpg' || config.bannerUrl === '/images/piscine/longue_banniere.png'
                    ? 'bg-primary-50 border-primary-500 text-primary-800 font-bold shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                🏊 Piscine (Bannière officielle)
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, bannerUrl: '/images/piscine.jpg' }))}
                className={`text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                  config.bannerUrl === '/images/piscine.jpg'
                    ? 'bg-primary-50 border-primary-500 text-primary-800 font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Piscine vue d'angle
              </button>
            </div>
          </div>

          {/* Formulaire Textes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Titre principal de la section
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={e => setConfig({ ...config, title: e.target.value })}
                  placeholder="Notre cadre"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Badge / Surtitre
                </label>
                <input
                  type="text"
                  value={config.badge}
                  onChange={e => setConfig({ ...config, badge: e.target.value })}
                  placeholder="L'OASIS DE YAMOUSSOUKRO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Sous-titre / Texte descriptif de la piscine
              </label>
              <textarea
                rows={3}
                value={config.subtitle}
                onChange={e => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="Décrivez ce qui fait de la piscine de Chéliel la plus belle de Yamoussoukro..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 2 : Liste des Photos & Vidéos */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary-600" />
            <h2 className="text-base font-bold text-gray-900 font-heading">
              Médias de la grille ({config.items.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus size={15} />
            Ajouter une photo ou vidéo
          </button>
        </div>

        {/* Grille des médias administrés */}
        {config.items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Aucun média configuré. Cliquez sur « Ajouter une photo ou vidéo » pour en insérer une.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.items.map((item, index) => {
              const isVideo = item.type === 'video';
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all overflow-hidden bg-gray-50/50 flex flex-col justify-between ${
                    item.featured ? 'border-primary-300 ring-1 ring-primary-300/40 shadow-xs' : 'border-gray-200'
                  }`}
                >
                  {/* Visuel */}
                  <div className="relative aspect-video bg-black overflow-hidden group">
                    {isVideo ? (
                      item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.url} className="w-full h-full object-cover opacity-80" preload="metadata" />
                      )
                    ) : (
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    )}

                    {/* Badge type */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-xs ${
                        isVideo ? 'bg-amber-500 text-stone-950' : 'bg-primary-700 text-white'
                      }`}>
                        {isVideo ? <VideoIcon size={11} /> : <ImageIcon size={11} />}
                        {isVideo ? 'Vidéo' : 'Photo'}
                      </span>
                      {item.tag && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs">
                          {item.tag}
                        </span>
                      )}
                    </div>

                    {/* Étoile Vedette */}
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(item.id)}
                      title={item.featured ? 'Retirer de la vedette' : 'Mettre en vedette (grand format)'}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                        item.featured
                          ? 'bg-amber-400 text-amber-950 shadow-md'
                          : 'bg-black/40 text-white/70 hover:text-white'
                      }`}
                    >
                      <Star size={13} className={item.featured ? 'fill-current' : ''} />
                    </button>
                  </div>

                  {/* Détails */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-sm text-gray-900 truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-gray-400 font-medium">#{index + 1}</span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Barre d'actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          title="Déplacer vers la gauche / le haut"
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === config.items.length - 1}
                          title="Déplacer vers la droite / le bas"
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium cursor-pointer transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Ajout / Édition Média */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-heading font-bold text-lg text-gray-900">
                {editingItem ? 'Modifier le média' : 'Ajouter un média à « Notre cadre »'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitItem} className="space-y-4">
              {/* Type de média */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Type de média
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setItemType('image')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      itemType === 'image'
                        ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ImageIcon size={16} />
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType('video')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      itemType === 'video'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-xs'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <VideoIcon size={16} />
                    Vidéo
                  </button>
                </div>
              </div>

              {/* Fichier / URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    {itemType === 'video' ? 'Fichier ou lien de la vidéo' : 'Fichier ou lien de la photo'}
                  </label>
                  <button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingMedia ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingMedia ? 'Téléversement en cours...' : `Téléverser un fichier ${itemType === 'video' ? 'vidéo' : 'image'}`}
                  </button>
                </div>

                <input
                  ref={mediaFileInputRef}
                  type="file"
                  accept={itemType === 'video' ? 'video/*' : 'image/*'}
                  className="hidden"
                  onChange={handleMediaUpload}
                />

                <input
                  type="text"
                  required
                  value={itemUrl}
                  onChange={e => setItemUrl(e.target.value)}
                  placeholder={itemType === 'video' ? '/uploads/video.mp4 ou https://...' : '/images/... ou https://...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                />
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Titre du média *
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  placeholder="Ex : Plongeon au soleil, Piscine féerique de nuit..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                />
              </div>

              {/* Tag / Catégorie */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tag / Catégorie
                </label>
                <input
                  type="text"
                  value={itemTag}
                  onChange={e => setItemTag(e.target.value)}
                  placeholder="Ex: Piscine Principale, Bains de soleil..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TAGS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setItemTag(t)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description / Sous-titre */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description courte (facultatif)
                </label>
                <input
                  type="text"
                  value={itemSubtitle}
                  onChange={e => setItemSubtitle(e.target.value)}
                  placeholder="Ex : Un bassin turquoise étincelant pour se détendre"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm"
                />
              </div>

              {/* Option En Vedette */}
              <div className="p-3.5 rounded-xl bg-primary-50/60 border border-primary-100 flex items-center justify-between cursor-pointer" onClick={() => setItemFeatured(!itemFeatured)}>
                <div className="flex items-center gap-2.5">
                  <Star size={18} className={itemFeatured ? 'text-amber-500 fill-amber-500' : 'text-gray-400'} />
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Mettre en vedette</h5>
                    <p className="text-[11px] text-gray-500">Affiche ce média dans un grand format Bento prominent</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={itemFeatured}
                  onChange={e => setItemFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {editingItem ? 'Enregistrer les modifications' : 'Ajouter le média'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
