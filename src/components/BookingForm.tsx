import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, Clock, Utensils, Table as TableIcon, CheckCircle2, ChevronRight, Star, Loader2 } from 'lucide-react';
import { Booking, MenuItem } from '../types';
import { TABLES } from '../constants';
import { cn, formatCurrency } from '../utils';
import { useFirebase } from '../App';
import { useLanguage } from './LanguageContext';
import { loyaltyService } from '../services/loyaltyService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface BookingFormProps {
  onBookingComplete: (booking: Booking) => void;
  onCancel?: () => void;
  initialData?: Booking;
  isEditing?: boolean;
}

export default function BookingForm({ onBookingComplete, onCancel, initialData, isEditing }: BookingFormProps) {
  const { menu, user, profile } = useFirebase();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [pointsToRedeem, setPointsToRedeem] = useState(initialData?.pointsRedeemed || 0);
  const [bookedTables, setBookedTables] = useState<number[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedId] = useState(() => initialData?.id || (() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  })());
  const [formData, setFormData] = useState({
    name: initialData?.customerName || user?.displayName || '',
    email: initialData?.customerEmail || user?.email || '',
    phoneNumber: initialData?.phoneNumber || user?.phoneNumber || '',
    guests: initialData?.guests || 2,
    date: initialData?.date || '',
    time: initialData?.time || '',
    tableNumber: initialData?.tableNumber || 0,
    orderedItems: initialData?.orderedItems || [] as { itemId: string; quantity: number }[]
  });

  const fetchAvailability = async () => {
    if (!formData.date || !formData.time) return;
    setLoadingTables(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('date', '==', formData.date),
        where('time', '==', formData.time),
        where('status', '==', 'Confirmed')
      );
      const snapshot = await getDocs(q);
      const booked = snapshot.docs
        .map(doc => doc.data() as Booking)
        .filter(b => b.id !== initialData?.id) // Don't count current booking if editing
        .map(b => b.tableNumber);
      setBookedTables(booked);
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      await fetchAvailability();
    }
    setStep(s => s + 1);
  };
  const handleBack = () => setStep(s => s - 1);

  const toggleMenuItem = (itemId: string) => {
    setFormData(prev => {
      const existing = prev.orderedItems.find(i => i.itemId === itemId);
      if (existing) {
        return {
          ...prev,
          orderedItems: prev.orderedItems.filter(i => i.itemId !== itemId)
        };
      } else {
        return {
          ...prev,
          orderedItems: [...prev.orderedItems, { itemId, quantity: 1 }]
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingTables(true); // Reuse loading state for submission
    try {
      const newBooking: Booking = {
        ...initialData,
        id: generatedId,
        uid: initialData?.uid || user?.uid || 'guest',
        customerName: formData.name,
        customerEmail: formData.email,
        phoneNumber: formData.phoneNumber,
        tableNumber: formData.tableNumber,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        status: initialData?.status || 'Confirmed',
        orderedItems: formData.orderedItems,
        pointsRedeemed: pointsToRedeem,
        createdAt: initialData?.createdAt || new Date().toISOString()
      };
      await onBookingComplete(newBooking);
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting booking:', err);
      // You might want to show an error message here
    } finally {
      setLoadingTables(false);
    }
  };

  const subtotal = formData.orderedItems.reduce((acc, item) => {
    const menuItem = menu.find(m => m.id === item.itemId);
    return acc + (menuItem?.price || 0) * item.quantity;
  }, 0);

  const availablePoints = profile?.loyaltyPoints || 0;
  const maxRedeemable = Math.min(availablePoints, Math.floor(subtotal));
  const totalPrice = Math.max(0, subtotal - pointsToRedeem);

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-10 bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-brand-900 mb-4">
          {isEditing ? 'Reservation Updated!' : 'Reservation Confirmed!'}
        </h2>
        <p className="text-slate-600 mb-8">
          {isEditing 
            ? `Your changes for reservation #${generatedId} have been saved.`
            : `Thank you for choosing Tampa Taste. Your reservation #${generatedId} is confirmed.`}
          <br />
          A confirmation email has been sent to {formData.email}.
        </p>
        <div className="bg-slate-50 p-6 rounded-2xl mb-8 text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Date & Time</span>
            <span className="font-bold text-brand-900">{formData.date} at {formData.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Table</span>
            <span className="font-bold text-brand-900">Table {formData.tableNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Guests</span>
            <span className="font-bold text-brand-900">{formData.guests} Guests</span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-full p-5 bg-brand-900 text-white rounded-2xl font-bold hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
      
      <div className="relative z-10">
        <div className="flex justify-between mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                step >= i 
                  ? "bg-brand-900 text-white border-brand-900 shadow-lg shadow-brand-900/20" 
                  : "bg-slate-50 text-slate-300 border-slate-100"
              )}
            >
              {i}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-4xl font-bold tracking-tight text-brand-900 font-serif mb-2">
                  {isEditing ? 'Update Your Reservation' : 'Reserve Your Table'}
                </h2>
                <p className="text-slate-400">
                  {isEditing ? 'Modify your booking details below.' : "Start by telling us who you are and when you'd like to visit."}
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Guests</label>
                    <div className="relative">
                      <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <select
                        value={formData.guests}
                        onChange={e => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                        className="w-full p-5 pl-14 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 appearance-none font-medium"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                          <option key={n} value={n}>{n} Guests</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <select
                        required
                        value={formData.time}
                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                        className="w-full p-5 pl-14 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 appearance-none font-medium"
                      >
                        <option value="">Select Time</option>
                        {['17:00', '18:00', '19:00', '20:00', '21:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      required
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-5 pl-14 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 p-5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!formData.name || !formData.email || !formData.date || !formData.time}
                  className="flex-1 p-5 bg-brand-900 text-white rounded-2xl font-bold hover:bg-brand-800 disabled:opacity-50 transition-all shadow-xl shadow-brand-900/20 flex items-center justify-center gap-2"
                >
                  Choose Your Table <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-brand-900 font-serif mb-2">Select a Table</h2>
              <p className="text-slate-400">Pick your favorite spot in the house.</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-4">
              {loadingTables ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Checking availability...</p>
                </div>
              ) : (
                TABLES.map((table) => {
                  const isBooked = bookedTables.includes(table.number);
                  return (
                    <button
                      key={table.number}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setFormData({ ...formData, tableNumber: table.number })}
                      className={cn(
                        "aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative",
                        formData.tableNumber === table.number
                          ? "border-brand-900 bg-brand-900 text-white shadow-xl scale-105"
                          : "border-slate-100 bg-slate-50 text-slate-400 hover:border-brand-200",
                        isBooked && "opacity-40 grayscale cursor-not-allowed border-red-100 bg-red-50"
                      )}
                    >
                      <TableIcon className="w-6 h-6 mb-1" />
                      <span className="text-xs font-bold">T-{table.number}</span>
                      <span className="text-[10px] opacity-60">{table.capacity} seats</span>
                      {isBooked && (
                        <span className="absolute top-2 right-2 text-[8px] font-black text-red-600 uppercase tracking-tighter">Booked</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 p-5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={formData.tableNumber === 0}
                className="flex-1 p-5 bg-brand-900 text-white rounded-2xl font-bold hover:bg-brand-800 disabled:opacity-50 transition-all shadow-xl shadow-brand-900/20"
              >
                Pre-order Menu
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-brand-900 font-serif mb-2">Pre-order Menu</h2>
              <p className="text-slate-400">Skip the wait and order your favorites now.</p>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {menu.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleMenuItem(item.id)}
                  disabled={!item.available}
                  className={cn(
                    "w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all text-left",
                    formData.orderedItems.find(i => i.itemId === item.id)
                      ? "border-brand-900 bg-brand-50"
                      : "border-slate-100 hover:border-brand-200",
                    !item.available && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-brand-900">{item.name}</h4>
                      <span className="font-mono text-sm font-bold text-brand-600">{formatCurrency(item.price)}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mb-1">{item.description}</p>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block",
                      item.available ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                    )}>
                      {item.available ? t('available') : t('unavailable')}
                    </span>
                  </div>
                  {formData.orderedItems.find(i => i.itemId === item.id) && (
                    <CheckCircle2 className="w-6 h-6 text-brand-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 bg-brand-50 rounded-2xl flex justify-between items-center border border-brand-100">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Total Pre-order</span>
              <span className="text-2xl font-mono font-bold text-brand-900">{formatCurrency(totalPrice)}</span>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 p-5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 p-5 bg-brand-900 text-white rounded-2xl font-bold hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20"
              >
                Review & Confirm
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-brand-900 font-serif mb-2">Confirm Booking</h2>
              <p className="text-slate-400">Review your details before confirming.</p>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-[2rem] space-y-6 border border-slate-100">
              {availablePoints > 0 && (
                <div className="p-6 bg-brand-50 rounded-2xl border border-brand-100 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-brand-600 fill-brand-600" />
                      <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Loyalty Rewards</span>
                    </div>
                    <span className="text-sm font-bold text-brand-900">{availablePoints} points available</span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max={maxRedeemable}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
                      className="w-full h-2 bg-brand-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-brand-400 uppercase tracking-widest">
                      <span>0 pts</span>
                      <span className="text-brand-600 font-black">Redeem {pointsToRedeem} pts (-{formatCurrency(pointsToRedeem)})</span>
                      <span>{maxRedeemable} pts</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-200 pb-4">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Booking ID</span>
                <span className="font-mono font-bold text-brand-900">#{generatedId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-4">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Customer</span>
                <span className="font-bold text-brand-900">{formData.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-4">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Date & Time</span>
                <span className="font-bold text-brand-900">{formData.date} at {formData.time}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-4">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Table & Guests</span>
                <span className="font-bold text-brand-900">Table {formData.tableNumber} ({formData.guests} guests)</span>
              </div>
              {pointsToRedeem > 0 && (
                <div className="flex justify-between border-b border-slate-200 pb-4 text-brand-600">
                  <span className="font-bold text-xs uppercase tracking-widest">Loyalty Discount</span>
                  <span className="font-bold">-{formatCurrency(pointsToRedeem)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Pre-order Total</span>
                <span className="font-bold text-2xl font-mono text-brand-900">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 p-5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loadingTables}
                className="flex-1 p-5 bg-brand-900 text-white rounded-2xl font-bold hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingTables ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {isEditing ? 'Save Changes' : 'Confirm Reservation'}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  </div>
);
}
