import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, X, CheckCheck, Trash2, BellOff,
  CalendarPlus, CheckCircle2, XCircle, Trash, AlertTriangle,
} from 'lucide-react';
import type { AppNotification, NotificationType } from '../hooks/useNotifications';
import { formatRelativeTime } from '../hooks/useNotifications';

// ─── Config visuelle par type ──────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  dotClass: string;
  label: string;
}> = {
  new: {
    icon: CalendarPlus,
    iconClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    dotClass: 'bg-emerald-500',
    label: 'Nouvelle réservation',
  },
  confirm: {
    icon: CheckCircle2,
    iconClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    dotClass: 'bg-blue-500',
    label: 'Confirmée',
  },
  cancel: {
    icon: XCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50',
    dotClass: 'bg-red-500',
    label: 'Annulée',
  },
  delete: {
    icon: Trash,
    iconClass: 'text-gray-500',
    bgClass: 'bg-gray-100',
    dotClass: 'bg-gray-400',
    label: 'Supprimée',
  },
  conflict: {
    icon: AlertTriangle,
    iconClass: 'text-orange-500',
    bgClass: 'bg-orange-50',
    dotClass: 'bg-orange-500',
    label: 'Conflit',
  },
};

// ─── Toast individuel ─────────────────────────────────────────────────────

const Toast = ({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: (id: string) => void;
}) => {
  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <div
      className="notification-toast flex items-start gap-3 bg-white border border-gray-200 shadow-xl rounded-2xl px-4 py-3.5 max-w-sm w-full pointer-events-auto"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.bgClass}`}>
        <Icon size={17} className={config.iconClass} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{notification.message}</p>
        {notification.detail && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{notification.detail}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(notification.id)}
        aria-label="Fermer la notification"
        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Élément de liste dans le panneau ────────────────────────────────────

const NotificationItem = ({
  notification,
  onClick,
  onRemove,
}: {
  notification: AppNotification;
  onClick: () => void;
  onRemove: (id: string) => void;
}) => {
  const config = TYPE_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer ${!notification.isRead ? 'bg-primary-50/40' : ''}`}
      onClick={onClick}
    >
      {/* Dot non-lu */}
      {!notification.isRead && (
        <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      )}

      {/* Icône */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.bgClass}`}>
        <Icon size={16} className={config.iconClass} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
          {notification.message}
        </p>
        {notification.detail && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{notification.detail}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>

      {/* Supprimer */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(notification.id); }}
        aria-label="Supprimer cette notification"
        className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ─── Panneau principal ────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

const NotificationPanel = ({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRemove,
  onClearAll,
  onClose,
  onNavigate,
}: NotificationPanelProps) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const visible = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const handleItemClick = (notification: AppNotification) => {
    onMarkRead(notification.id);
    if (onNavigate) {
      onNavigate('reservations');
    }
    onClose();
  };

  return (
    <div
      className="notification-panel absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden z-[300] transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2"
    >
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-bold text-gray-900 text-base">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              title="Tout marquer comme lu"
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
            >
              <CheckCheck size={14} />
              Tout lire
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              title="Tout effacer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Trash2 size={14} />
              Effacer
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex px-5 pt-3 gap-3 border-b border-gray-100">
        {(['all', 'unread'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === tab
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'all' ? 'Toutes' : 'Non lues'}
            {tab === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste avec isolation complète du scroll */}
      <div
        className="overflow-y-auto max-h-[380px] divide-y divide-gray-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain"
        onWheel={(e) => {
          const el = e.currentTarget;
          const isScrollingUp = e.deltaY < 0;
          const isScrollingDown = e.deltaY > 0;
          if (isScrollingUp && el.scrollTop <= 0) {
            e.preventDefault();
          } else if (isScrollingDown && el.scrollTop + el.clientHeight >= el.scrollHeight) {
            e.preventDefault();
          }
          e.stopPropagation();
        }}
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <BellOff size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {filter === 'unread' ? 'Tout est lu !' : 'Aucune notification'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'unread' ? 'Vous êtes à jour.' : 'Les événements apparaîtront ici.'}
            </p>
          </div>
        ) : (
          visible.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={() => handleItemClick(n)}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* Pied */}
      {visible.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Composant principal exporté ──────────────────────────────────────────

// ─── Composant principal exporté (cloche + panneau + toasts) ─────────────────

interface NotificationCenterProps {
  notifications: AppNotification[];
  toasts: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onDismissToast: (id: string) => void;
  onNavigate?: (tab: string) => void;
}

/** Toasts seuls (fixed, rendu une seule fois dans l’arbre) */
export const NotificationToasts = ({
  toasts,
  onDismissToast,
}: Pick<NotificationCenterProps, 'toasts' | 'onDismissToast'>) => (
  <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <Toast key={t.id} notification={t} onDismiss={onDismissToast} />
    ))}
  </div>
);

/** Cloche + panneau seulement (sans toasts, à placer dans la sidebar/header) */
export const NotificationCenter = ({
  notifications,
  toasts: _toasts,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onRemove,
  onClearAll,
  onDismissToast: _onDismissToast,
  onNavigate,
}: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const prevUnreadRef = useRef(unreadCount);
  const containerRef = useRef<HTMLDivElement>(null);

  // Secouer la cloche à chaque nouvelle notification
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 700);
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        className={`relative p-2.5 rounded-xl border border-gray-100 bg-white text-gray-500 hover:text-primary-700 hover:bg-primary-50/50 hover:border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all flex items-center justify-center cursor-pointer ${shake ? 'bell-shake' : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 badge-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onRemove={onRemove}
          onClearAll={onClearAll}
          onClose={() => setIsOpen(false)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
