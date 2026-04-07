import { useState } from 'react';
import { X, CheckCircle2, ChevronRight, ChevronLeft, User, CalendarDays, CreditCard, Sun, Moon } from 'lucide-react';
import { useRooms } from '../hooks/useRooms';
import { useReservations, PaymentMethod, StayType } from '../hooks/useReservations';
import { getNights } from '../hooks/useReservations';

const today = new Date().toISOString().split('T')[0];

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
  const { addReservation } = useReservations();
  const { rooms } = useRooms();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    roomId: initialRoomId || rooms[0].id,
    stayType: 'nuitée' as StayType,
    checkIn: '',
    checkOut: '',
    remarks: '',
    paymentMethod: 'Orange Money' as PaymentMethod
  });

  const selectedRoom = rooms.find(r => r.id === formData.roomId);
  const price = selectedRoom ? (formData.stayType === 'nuitée' ? selectedRoom.priceNight : selectedRoom.priceDay) : 0;
  const nights = formData.checkIn && formData.checkOut ? getNights(formData.checkIn, formData.checkOut) : 0;
  const total = price * (nights || 1);

  const canNext1 = formData.roomId && formData.checkIn && formData.checkOut;
  const canNext2 = formData.clientName && formData.phone;

  const handleSubmit = () => {
    addReservation({
      clientName: formData.clientName,
      phone: formData.phone,
      email: formData.email,
      roomId: formData.roomId,
      stayType: formData.stayType,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      remarks: formData.remarks,
      paymentMethod: formData.paymentMethod
    });
    setStep(4);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-gray-800 bg-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={step < 4 ? onClose : undefined}></div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg z-10 overflow-hidden max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10 bg-white rounded-full p-1.5 shadow-sm transition-colors">
          <X size={20} />
        </button>

        {step < 4 ? (
          <>
            {/* Header avec étapes */}
            <div className="bg-primary-900 px-6 pt-6 pb-5">
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

            {/* Contenu */}
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
                  {nights > 0 && (
                    <div className="bg-primary-50 rounded-2xl p-4 flex items-center justify-between">
                      <span className="text-gray-600 text-sm">{nights} {formData.stayType === 'nuitée' ? 'nuit' : 'jour'}{nights > 1 ? 's' : ''} · {selectedRoom?.name}</span>
                      <span className="font-bold text-primary-700">{total.toLocaleString()} FCFA</span>
                    </div>
                  )}
                </div>
              )}

              {/* Étape 2 : Identité */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Nom Complet *</label>
                    <input type="text" className={inputClass} value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Jean Dupont" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Téléphone *</label>
                    <input type="tel" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+225 00 00 00 00 00" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Email <span className="text-gray-400 font-normal">(optionnel)</span></label>
                    <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" />
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
                        <input type="radio" name="payment" value="Orange Money" checked={formData.paymentMethod === 'Orange Money'} onChange={() => setFormData({...formData, paymentMethod: 'Orange Money'})} className="sr-only" />
                        <img src="/images/orange.png" alt="Orange Money" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-orange-600 text-sm">Orange Money</span>
                      </label>
                      <label className={`cursor-pointer rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === 'Wave' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 hover:border-blue-200'}`}>
                        <input type="radio" name="payment" value="Wave" checked={formData.paymentMethod === 'Wave'} onChange={() => setFormData({...formData, paymentMethod: 'Wave'})} className="sr-only" />
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
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all shadow-md hover:scale-105 transform"
                  >
                    Confirmer <CheckCircle2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Confirmation */
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-3">Demande Envoyée !</h2>
            <p className="text-gray-500 mb-2 max-w-sm leading-relaxed">
              Merci <strong className="text-gray-800">{formData.clientName}</strong>. Votre demande a été enregistrée avec succès.
            </p>
            <p className="text-gray-500 mb-8 max-w-sm leading-relaxed">
              Notre équipe vous contactera au <strong className="text-gray-800">{formData.phone}</strong> pour le paiement via <strong className="text-gray-800">{formData.paymentMethod}</strong>.
            </p>
            <div className="bg-primary-50 rounded-2xl p-4 w-full mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Appartement</span><span className="font-medium">{selectedRoom?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Arrivée</span><span className="font-medium">{new Date(formData.checkIn).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Départ</span><span className="font-medium">{new Date(formData.checkOut).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-primary-100 pt-2"><span>Total</span><span className="text-primary-600">{total.toLocaleString()} FCFA</span></div>
            </div>
            <button onClick={onClose} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-medium transition-colors w-full">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
