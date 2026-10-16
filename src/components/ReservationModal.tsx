import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, ChevronRight, ChevronLeft, User, CalendarDays, CreditCard, Sun, Moon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../lib/api';
import { useRooms } from '../hooks/useRooms';
import { useReservations, PaymentMethod, StayType } from '../hooks/useReservations';
import { getNights, getReservationPricing } from '../hooks/useReservations';
import { LegalModal, LegalTab } from './LegalModal';

const normalizeCustomerPhone = (phone: string) => {
  const cleaned = phone.replace(/[\s().-]/g, '');

  if (!cleaned) return '';
  // Numéro local 10 chiffres (ex: 0757180205) -> +2250757180205
  if (/^0\d{9}$/.test(cleaned)) return `+225${cleaned}`;
  // Si déjà avec +225 et 10 chiffres (ex: +2250757180205)
  if (/^\+225\d{10}$/.test(cleaned)) return cleaned;
  // Si commence par 225 avec 10 chiffres (ex: 2250757180205)
  if (/^225\d{10}$/.test(cleaned)) return `+${cleaned}`;
  // Si commence par +225 avec 9 chiffres (ex: +225757180205) -> insère le 0 manquant
  if (/^\+225\d{9}$/.test(cleaned)) return `+2250${cleaned.slice(4)}`;
  // Si commence par 225 avec 9 chiffres (ex: 225757180205)
  if (/^225\d{9}$/.test(cleaned)) return `+2250${cleaned.slice(3)}`;
  // Format international générique
  if (/^\+?\d{8,15}$/.test(cleaned)) return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;

  return '';
};

const isValidEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value.trim());

const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

const downloadReceiptPdf = (data: {
  reservationNumber: string;
  clientName: string;
  clientEmail: string;
  roomName: string;
  roomCapacity: string;
  checkIn: string;
  checkOut: string;
  stayType: StayType;
  paymentMethod: PaymentMethod;
  total: number;
  nights: number;
}) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 16;
  let y = 18;

  doc.setFillColor(140, 104, 70);
  doc.rect(0, 0, 210, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RÉSIDENCE CHELIEL', left, 11);

  doc.setTextColor(34, 34, 34);
  doc.setFontSize(22);
  doc.text('Reçu de réservation', left, y + 14);
  y += 24;

  doc.setDrawColor(229, 221, 212);
  doc.setFillColor(250, 247, 244);
  doc.roundedRect(left, y, 178, 14, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Montant payé: ${formatCurrency(data.total)}`, left + 4, y + 9);
  doc.text('Statut: En attente', 128, y + 9);
  y += 22;

  const rows = [
    ['Numéro de reçu', data.reservationNumber],
    ['Client', data.clientName],
    ['Email', data.clientEmail],
    ['Chambre', data.roomName],
    ['Capacité', data.roomCapacity || '-'],
    ['Arrivée', new Date(data.checkIn).toLocaleDateString('fr-FR')],
    ['Départ', new Date(data.checkOut).toLocaleDateString('fr-FR')],
    ['Type', data.stayType === 'nuitée' ? 'Nuitée' : 'Journée'],
    ['Paiement', data.paymentMethod],
    ['Durée', `${data.nights} ${data.stayType === 'nuitée' ? 'nuit' : 'jour'}${data.nights > 1 ? 's' : ''}`],
  ];

  doc.setFont('helvetica', 'normal');
  rows.forEach(([label, value], index) => {
    const rowY = y + Math.floor(index / 2) * 18;
    const rowX = index % 2 === 0 ? left : 107;
    doc.setFillColor(250, 247, 244);
    doc.setDrawColor(238, 227, 217);
    doc.roundedRect(rowX, rowY, 87, 15, 3, 3, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(122, 106, 91);
    doc.text(label, rowX + 4, rowY + 5.5);
    doc.setFontSize(10.5);
    doc.setTextColor(34, 34, 34);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), rowX + 4, rowY + 11);
    doc.setFont('helvetica', 'normal');
  });

  const totalY = y + 90;
  doc.setDrawColor(230, 223, 216);
  doc.line(left, totalY, 194, totalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Montant payé par le client: ${formatCurrency(data.total)}`, left, totalY + 9);
  doc.text(`Date de génération: ${new Date().toLocaleString('fr-FR')}`, left, totalY + 18);

  doc.save(`recu-${data.reservationNumber.toLowerCase()}.pdf`);
};

interface Props {
  onClose: () => void;
  initialRoomId: string | null;
}

const STEPS = [
  { id: 1, label: 'Séjour', icon: CalendarDays },
  { id: 2, label: 'Identité', icon: User },
  { id: 3, label: 'Paiement', icon: CreditCard },
];

export const ReservationModal = ({ onClose, initialRoomId }: Props) => {
  const today = new Date().toISOString().split('T')[0];
  const { addReservation } = useReservations();
  const { rooms } = useRooms();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Bloquer le scroll de la page en arrière-plan
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Remonter en haut du contenu à chaque nouvelle étape
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [alternativeRoomIds, setAlternativeRoomIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reservationNumber, setReservationNumber] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('rgcc');

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    roomId: initialRoomId || '',
    stayType: 'nuitée' as StayType,
    checkIn: '',
    checkOut: '',
    remarks: '',
    paymentMethod: 'Orange Money' as PaymentMethod
  });

  useEffect(() => {
    if (formData.roomId) return;
    if (rooms.length === 0) return;
    setFormData(prev => ({
      ...prev,
      roomId: initialRoomId && rooms.some(r => r.id === initialRoomId) ? initialRoomId : rooms[0].id,
    }));
  }, [formData.roomId, initialRoomId, rooms]);

  const selectedRoom = rooms.find(r => r.id === formData.roomId);
  const price = selectedRoom ? (formData.stayType === 'nuitée' ? selectedRoom.priceNight : selectedRoom.priceDay) : 0;
  const nights = formData.checkIn && formData.checkOut ? getNights(formData.checkIn, formData.checkOut) : 0;
  const pricing = getReservationPricing(price, nights || 1);
  const total = pricing.total;

  useEffect(() => {
    let isCurrent = true;

    const checkAvailability = async () => {
      if (!formData.roomId || !formData.checkIn) {
        setAvailabilityMessage(null);
        setAlternativeRoomIds([]);
        return;
      }

      let isAvailable: boolean | null = null;

      // 1. Appel RPC pour vérifier la disponibilité de la chambre
      // On teste d'abord avec les 2 dates si checkOut est renseigné
      if (formData.checkOut) {
        const { data, error } = await api.rpc('is_room_available_for_checkin', {
          p_room_id: formData.roomId,
          p_check_in: formData.checkIn,
          p_check_out: formData.checkOut,
        });
        if (!error && typeof data === 'boolean') {
          isAvailable = data;
        }
      }

      // Si pas de checkOut ou si l'RPC à 3 paramètres a échoué (signature 2 params sur la DB)
      if (isAvailable === null) {
        const { data, error } = await api.rpc('is_room_available_for_checkin', {
          p_room_id: formData.roomId,
          p_check_in: formData.checkIn,
        });
        if (!error && typeof data === 'boolean') {
          isAvailable = data;
        } else if (error) {
          console.warn('[ReservationModal] Erreur vérification disponibilité:', error.message);
        }
      }

      if (!isCurrent) return;

      // Si la chambre est libre
      if (isAvailable === true) {
        setAvailabilityMessage(null);
        setAlternativeRoomIds([]);
        return;
      }

      // Si la chambre est OCCUPÉE
      if (isAvailable === false) {
        const dateRangeText = formData.checkOut
          ? `du ${new Date(formData.checkIn).toLocaleDateString('fr-FR')} au ${new Date(formData.checkOut).toLocaleDateString('fr-FR')}`
          : `le ${new Date(formData.checkIn).toLocaleDateString('fr-FR')}`;

        // Recherche des alternatives disponibles
        let altRooms: string[] = [];
        const { data: availableRooms } = await api.rpc('list_available_rooms_for_checkin', {
          p_check_in: formData.checkIn,
        });

        if (Array.isArray(availableRooms)) {
          altRooms = availableRooms
            .map((r: { room_id: string }) => r.room_id)
            .filter((id: string) => id !== formData.roomId);
        }

        if (!isCurrent) return;

        if (altRooms.length > 0) {
          setAvailabilityMessage(`Cette chambre est occupée ${dateRangeText}. Vous pouvez choisir un autre appartement disponible ci-dessous :`);
          setAlternativeRoomIds(altRooms);
        } else {
          setAvailabilityMessage(`Cette chambre est occupée ${dateRangeText}. Veuillez choisir d'autres dates.`);
          setAlternativeRoomIds([]);
        }
      }
    };

    checkAvailability();

    return () => {
      isCurrent = false;
    };
  }, [formData.checkIn, formData.checkOut, formData.roomId, rooms]);

  const canNext1 = Boolean(selectedRoom && formData.checkIn && formData.checkOut && !availabilityMessage);
  const canNext2 = Boolean(formData.clientName.trim() && formData.phone.trim() && isValidEmail(formData.email));

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setReservationNumber(null);

    const normalizedPhone = normalizeCustomerPhone(formData.phone);
    if (!normalizedPhone) {
      setSubmitting(false);
      setStep(2);
      setSubmitError('Numéro de téléphone invalide. Utilisez un format local comme 05XXXXXXXX ou international comme +225XXXXXXXXX.');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setSubmitting(false);
      setStep(2);
      setSubmitError('Adresse email invalide. Elle est obligatoire pour recevoir la confirmation par email.');
      return;
    }

    // Vérification finale de sécurité avant enregistrement
    let isAvailable: boolean | null = null;
    const { data: checkWithDates, error: err1 } = await api.rpc('is_room_available_for_checkin', {
      p_room_id: formData.roomId,
      p_check_in: formData.checkIn,
      p_check_out: formData.checkOut,
    });
    if (!err1 && typeof checkWithDates === 'boolean') {
      isAvailable = checkWithDates;
    } else {
      const { data: checkSingle } = await api.rpc('is_room_available_for_checkin', {
        p_room_id: formData.roomId,
        p_check_in: formData.checkIn,
      });
      if (typeof checkSingle === 'boolean') isAvailable = checkSingle;
    }

    if (isAvailable === false) {
      setSubmitting(false);
      setStep(1);
      setAvailabilityMessage('Cette chambre est déjà occupée sur cette période. Veuillez choisir un autre appartement ou d\'autres dates.');
      const { data: availableRooms } = await api.rpc('list_available_rooms_for_checkin', {
        p_check_in: formData.checkIn,
      });
      const alternatives = ((availableRooms ?? []) as Array<{ room_id: string }>)
        .map(r => r.room_id)
        .filter(id => id !== formData.roomId);
      setAlternativeRoomIds(alternatives);
      return;
    }

    const result = await addReservation({
      clientName: formData.clientName,
      phone: normalizedPhone,
      email: formData.email,
      roomId: formData.roomId,
      stayType: formData.stayType,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      remarks: formData.remarks,
      paymentMethod: formData.paymentMethod
    });

    if (!result.ok) {
      setSubmitting(false);
      setStep(1);
      setSubmitError(result.error || "Impossible d'enregistrer la réservation.");
      return;
    }

    setReservationNumber(result.reservation.id);
    setSubmitting(false);
    setStep(4);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800 bg-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={step < 4 ? onClose : undefined}></div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg z-10 flex flex-col max-h-[85vh] overflow-hidden">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10 bg-white rounded-full p-1.5 shadow-sm transition-colors">
          <X size={20} />
        </button>

        {step < 4 ? (
          <>
            {/* Header avec étapes — FIXE */}
            <div className="bg-primary-900 px-6 pt-6 pb-5 flex-shrink-0 rounded-t-3xl">
              <h2 className="text-xl font-heading font-bold text-white mb-6">Demande de Réservation</h2>
              <div className="flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        step > s.id ? 'bg-green-500' : step === s.id ? 'bg-primary-400 ring-4 ring-primary-400/30' : 'bg-primary-800'
                      }`}>
                        {step > s.id
                          ? <CheckCircle2 size={18} className="text-white" />
                          : <s.icon size={16} className="text-white" />
                        }
                      </div>
                      <span className={`text-xs mt-1.5 font-medium ${step === s.id ? 'text-white' : 'text-primary-400'}`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 mx-2 transition-all duration-300 ${step > s.id ? 'bg-green-500' : 'bg-primary-700'}`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contenu scrollable — scrollbar cachée */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
            <div className="p-6">

              {/* Étape 1 : Séjour */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Appartement sélectionné en lecture seule */}
                  {selectedRoom && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-primary-50 border border-primary-100">
                      <div>
                        <p className="font-semibold text-gray-900">{selectedRoom.name}</p>
                        <p className="text-sm text-gray-500">{selectedRoom.capacity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-600">{price.toLocaleString()} F</p>
                        <p className="text-xs text-gray-400">/ {formData.stayType === 'nuitée' ? 'nuitée' : 'journée'}</p>
                      </div>
                    </div>
                  )}

                  {/* Type de séjour */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Type de séjour</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${
                        formData.stayType === 'nuitée' ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-100 hover:border-primary-200'
                      }`}>
                        <input type="radio" name="stayType" value="nuitée" aria-label="Nuitée (22h à 12h)" checked={formData.stayType === 'nuitée'} onChange={() => setFormData({...formData, stayType: 'nuitée'})} className="sr-only" />
                        <Moon size={22} className={formData.stayType === 'nuitée' ? 'text-primary-600' : 'text-gray-400'} />
                        <span className="font-semibold text-sm text-gray-800">Nuitée</span>
                        <span className="text-xs text-gray-500">22h → 12h</span>
                        <span className="text-xs font-bold text-primary-600">{selectedRoom?.priceNight.toLocaleString()} F</span>
                      </label>
                      <label className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${
                        formData.stayType === 'journée' ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-100 hover:border-primary-200'
                      }`}>
                        <input type="radio" name="stayType" value="journée" aria-label="Journée (12h à 12h)" checked={formData.stayType === 'journée'} onChange={() => setFormData({...formData, stayType: 'journée'})} className="sr-only" />
                        <Sun size={22} className={formData.stayType === 'journée' ? 'text-primary-600' : 'text-gray-400'} />
                        <span className="font-semibold text-sm text-gray-800">Journée</span>
                        <span className="text-xs text-gray-500">12h → 12h</span>
                        <span className="text-xs font-bold text-primary-600">{selectedRoom?.priceDay.toLocaleString()} F</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="checkIn" className="text-sm font-semibold text-gray-700 mb-2 block">Date d'arrivée</label>
                      <input id="checkIn" type="date" min={today} className={inputClass} value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value, checkOut: ''})} />
                    </div>
                    <div>
                      <label htmlFor="checkOut" className="text-sm font-semibold text-gray-700 mb-2 block">Date de départ</label>
                      <input id="checkOut" type="date" min={formData.checkIn || today} className={inputClass} value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                    </div>
                  </div>
                  {availabilityMessage && (
                    <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-sm text-red-900 space-y-3">
                      <p className="font-medium">{availabilityMessage}</p>
                      {alternativeRoomIds.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {alternativeRoomIds.map((roomId) => {
                            const altRoom = rooms.find(r => r.id === roomId);
                            if (!altRoom) return null;
                            return (
                              <button
                                key={roomId}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, roomId });
                                  setAvailabilityMessage(null);
                                  setAlternativeRoomIds([]);
                                }}
                                className="rounded-xl bg-white border border-red-200/80 px-3.5 py-2.5 text-gray-800 hover:border-primary-500 hover:bg-primary-50 transition-colors text-left shadow-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="block font-semibold text-xs text-gray-900">{altRoom.name}</span>
                                  <span className="block text-[11px] text-gray-500">{altRoom.capacity}</span>
                                </div>
                                <span className="text-xs font-bold text-primary-600">Choisir →</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}
                  {nights > 0 && (
                    <div className="bg-primary-50 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">{nights} {formData.stayType === 'nuitée' ? 'nuit' : 'jour'}{nights > 1 ? 's' : ''} · {selectedRoom?.name}</span>
                        <span className="font-medium text-gray-700">{total.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-primary-100 pt-2">
                        <span className="font-semibold text-gray-800">Total</span>
                        <span className="font-bold text-primary-700">{total.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Étape 2 : Identité */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Nom Complet *</label>
                    <input type="text" className={inputClass} value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Junior Kuimessan" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Téléphone *</label>
                    <input type="tel" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+225 00 00 00 00 00" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Email *</label>
                    <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" />
                    <p className="mt-2 text-xs text-gray-500">Obligatoire pour recevoir automatiquement l'email de confirmation.</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Demandes spéciales <span className="text-gray-400 font-normal">(optionnel)</span></label>
                    <textarea className={`${inputClass} resize-none`} rows={3} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Arrivée tardive, besoin particulier..."></textarea>
                  </div>
                </div>
              )}

              {/* Étape 3 : Paiement */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Mode de paiement souhaité</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`cursor-pointer rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === 'Orange Money' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-100 hover:border-orange-200'}`}>
                        <input type="radio" name="payment" value="Orange Money" checked={formData.paymentMethod === 'Orange Money'} onChange={() => { setFormData({...formData, paymentMethod: 'Orange Money'}); setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50); }} className="sr-only" />
                        <img src="/images/orange.png" alt="Orange Money" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-orange-600 text-sm">Orange Money</span>
                      </label>
                      <label className={`cursor-pointer rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === 'Wave' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 hover:border-blue-200'}`}>
                        <input type="radio" name="payment" value="Wave" checked={formData.paymentMethod === 'Wave'} onChange={() => { setFormData({...formData, paymentMethod: 'Wave'}); setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50); }} className="sr-only" />
                        <img src="/images/wave.png" alt="Wave" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-blue-600 text-sm">Wave</span>
                      </label>
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                    <p className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Récapitulatif</p>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Type</span><span className="font-medium text-gray-800 capitalize">{formData.stayType} ({formData.stayType === 'nuitée' ? '22h → 12h' : '12h → 12h'})</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Appartement</span><span className="font-medium text-gray-800">{selectedRoom?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Arrivée</span><span className="font-medium text-gray-800">{formData.checkIn ? new Date(formData.checkIn).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Départ</span><span className="font-medium text-gray-800">{formData.checkOut ? new Date(formData.checkOut).toLocaleDateString('fr-FR') : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Durée</span><span className="font-medium text-gray-800">{nights} {formData.stayType === 'nuitée' ? 'nuit' : 'jour'}{nights > 1 ? 's' : ''}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900">
                      <span>Total estimé</span><span className="text-primary-600">{total.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                {step > 1 ? (
                  <button onClick={() => setStep((step - 1) as 1 | 2 | 3)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors">
                    <ChevronLeft size={18} /> Retour
                  </button>
                ) : (
                  <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 font-medium transition-colors">Annuler</button>
                )}

                {step < 3 ? (
                  <button
                    onClick={() => setStep((step + 1) as 2 | 3)}
                    disabled={step === 1 ? !canNext1 : !canNext2}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                  >
                    Suivant <ChevronRight size={18} />
                  </button>
                ) : (
                  <div className="flex flex-col items-end gap-3 w-full">
                    <button
                      ref={confirmRef}
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all shadow-md hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {submitting ? 'Envoi...' : <><span>Confirmer</span><CheckCircle2 size={18} /></>}
                    </button>
                    <p className="text-[11px] text-gray-500 text-right leading-tight max-w-xs sm:max-w-md">
                      En confirmant, vous acceptez le{' '}
                      <button type="button" onClick={() => openLegal('rgcc')} className="text-primary-700 underline font-medium hover:text-primary-900">
                        Règlement Général
                      </button>
                      {' '}et la{' '}
                      <button type="button" onClick={() => openLegal('pdc')} className="text-primary-700 underline font-medium hover:text-primary-900">
                        Politique de Confidentialité
                      </button>.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </div>
          </>
        ) : (
          /* Confirmation */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-3">Demande Envoyée !</h2>
            <p className="text-gray-500 mb-2 max-w-sm leading-relaxed">
              Merci <strong className="text-gray-800">{formData.clientName}</strong>. Votre demande a été enregistrée avec succès.
            </p>
            <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
              Le numéro de réservation ci-dessous vous permettra de suivre votre dossier.
            </p>
            <div className="bg-primary-50 rounded-2xl p-4 w-full mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Numéro de réservation</span><span className="font-medium">{reservationNumber || '-'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Appartement</span><span className="font-medium">{selectedRoom?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Arrivée</span><span className="font-medium">{new Date(formData.checkIn).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Départ</span><span className="font-medium">{new Date(formData.checkOut).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-primary-100 pt-2"><span>Total</span><span className="text-primary-600">{total.toLocaleString()} FCFA</span></div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!reservationNumber || !selectedRoom) return;
                downloadReceiptPdf({
                  reservationNumber,
                  clientName: formData.clientName,
                  clientEmail: formData.email,
                  roomName: selectedRoom.name,
                  roomCapacity: selectedRoom.capacity,
                  checkIn: formData.checkIn,
                  checkOut: formData.checkOut,
                  stayType: formData.stayType,
                  paymentMethod: formData.paymentMethod,
                  total,
                  nights,
                });
              }}
              disabled={!reservationNumber || !selectedRoom}
              className="mb-4 w-full rounded-xl border border-primary-200 bg-white px-4 py-3 font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Télécharger le reçu PDF
            </button>
            <button onClick={onClose} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-medium transition-colors w-full">
              Fermer
            </button>
          </div>
          </div>
        )}
      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalTab}
      />
    </div>
  );
};
