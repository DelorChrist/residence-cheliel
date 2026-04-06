import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { rooms } from '../data/rooms';
import { useReservations, PaymentMethod } from '../hooks/useReservations';

const today = new Date().toISOString().split('T')[0];

interface Props {
  onClose: () => void;
  initialRoomId: string | null;
}

export const ReservationModal = ({ onClose, initialRoomId }: Props) => {
  const { addReservation } = useReservations();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    roomId: initialRoomId || rooms[0].id,
    checkIn: '',
    checkOut: '',
    remarks: '',
    paymentMethod: 'Orange Money' as PaymentMethod
  });

  const isValid = formData.clientName && formData.phone && formData.checkIn && formData.checkOut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      addReservation({
        clientName: formData.clientName,
        phone: formData.phone,
        email: formData.email,
        roomId: formData.roomId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        remarks: formData.remarks,
        paymentMethod: formData.paymentMethod
      });
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={step === 1 ? onClose : undefined}></div>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 z-10 bg-white/80 rounded-full p-1">
          <X size={24} />
        </button>

        {step === 1 ? (
          <div className="p-8 md:p-10">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-2">Demande de Réservation</h2>
            <p className="text-gray-600 mb-8">Remplissez ce formulaire pour sécuriser votre séjour.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nom Complet *</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Téléphone *</label>
                  <input required type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+225 00 00 00 00 00" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email (Optionnel)</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Type d'appartement *</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white" value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})}>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} — {r.capacity} — {r.price.toLocaleString()} F/24h</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date d'arrivée *</label>
                  <input required type="date" min={today} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value, checkOut: ''})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date de départ *</label>
                  <input required type="date" min={formData.checkIn || today} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mode de paiement *</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'Orange Money' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
                    <input type="radio" name="payment" value="Orange Money" checked={formData.paymentMethod === 'Orange Money'} onChange={() => setFormData({...formData, paymentMethod: 'Orange Money'})} className="sr-only" />
                    <img src="/images/orange.png" alt="Orange Money" className="w-8 h-8 object-contain mb-1" />
                    <span className="font-bold text-orange-600 text-sm">Orange Money</span>
                  </label>
                  <label className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'Wave' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                    <input type="radio" name="payment" value="Wave" checked={formData.paymentMethod === 'Wave'} onChange={() => setFormData({...formData, paymentMethod: 'Wave'})} className="sr-only" />
                    <img src="/images/wave.png" alt="Wave" className="w-8 h-8 object-contain mb-1" />
                    <span className="font-bold text-blue-600 text-sm">Wave</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Demandes spéciales</label>
                <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none" rows={3} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} placeholder="Arrivée tardive, besoin particulier..."></textarea>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">Annuler</button>
                <button type="submit" disabled={!isValid} className="px-8 py-3 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/20">
                  Confirmer la demande
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-4">Demande Envoyée !</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Merci <strong>{formData.clientName}</strong>. Votre demande a été enregistrée. Notre équipe vous contactera au <strong>{formData.phone}</strong> pour le paiement via <strong>{formData.paymentMethod}</strong>.
            </p>
            <button onClick={onClose} className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-medium transition-colors">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
