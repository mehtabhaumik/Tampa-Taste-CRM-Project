import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Clock, Users, Table as TableIcon, X, AlertCircle, CheckCircle2, Trash2, Edit3, Loader2, Utensils } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { Booking } from '../types';
import { cn, formatCurrency, formatPhoneNumber } from '../utils';
import { sendEmail } from '../lib/emailService';
import { getReservationEmail } from '../lib/emailTemplates';
import BookingForm from './BookingForm';
import { useFirebase } from '../App';

export default function FindBooking() {
  const { menu } = useFirebase();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBooking(null);
    setSuccessMessage(null);

    try {
      // 1. Try searching by ID first
      const docRef = doc(db, 'bookings', searchQuery);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
      } else {
        // 2. Try searching by Phone Number
        const q = query(
          collection(db, 'bookings'), 
          where('phoneNumber', '==', searchQuery),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Take the most recent one if multiple exist
          const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
          setBooking(docs[0]);
        } else {
          setError('No booking found with that ID or phone number.');
        }
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'bookings');
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isModifiable = (bookingDate: string, bookingTime: string) => {
    const now = new Date();
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    const diffInMs = bookingDateTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours > 1;
  };

  const isPast = (bookingDate: string, bookingTime: string) => {
    const now = new Date();
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    return bookingDateTime < now;
  };

  const handleRating = async (rating: number) => {
    if (!booking) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { rating });
      setBooking({ ...booking, rating });
      setSuccessMessage('Thank you for your rating!');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      setError('Failed to save rating.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setShowCancelConfirm(false);

    setLoading(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'Cancelled' });
      setBooking({ ...booking, status: 'Cancelled' });
      setSuccessMessage('Your booking has been successfully cancelled.');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
      setError('Failed to cancel booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedBooking: Booking) => {
    setLoading(true);
    try {
      const { id, ...data } = updatedBooking;
      await updateDoc(doc(db, 'bookings', id), data);
      
      // Send update email if status is still Confirmed
      if (updatedBooking.customerEmail && updatedBooking.status === 'Confirmed') {
        const emailHtml = getReservationEmail({
          name: updatedBooking.customerName,
          date: updatedBooking.date,
          time: updatedBooking.time,
          guests: updatedBooking.guests,
        }, true);
        
        await sendEmail(
          updatedBooking.customerEmail,
          `Reservation Updated - Tampa Taste #${updatedBooking.id}`,
          emailHtml
        );
      }

      setBooking(updatedBooking);
      setIsEditing(false);
      setSuccessMessage('Your booking has been successfully updated.');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${updatedBooking.id}`);
      setError('Failed to update booking.');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing && booking) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-brand-900 font-serif">Edit Reservation</h2>
          <button 
            onClick={() => setIsEditing(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <BookingForm 
          initialData={booking} 
          isEditing={true} 
          onBookingComplete={handleUpdate} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-brand-900 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-brand-900/20">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand-900 font-serif">Find My Booking</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Manage Your Reservation</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-6 mb-10">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="text"
                required
                placeholder="Enter Booking ID or Phone Number"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  // If it's mostly digits, try formatting as phone
                  if (val.replace(/[^\d]/g, '').length > 0 && !val.startsWith('BK-')) {
                    setSearchQuery(formatPhoneNumber(val));
                  } else {
                    setSearchQuery(val);
                  }
                }}
                className="w-full p-5 pl-14 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 text-lg font-bold text-slate-900 placeholder:text-slate-400 transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full p-5 bg-brand-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 shadow-xl shadow-brand-900/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Search Booking'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl flex items-center gap-3 text-sm font-medium mb-6">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          <AnimatePresence>
            {booking && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      booking.status === 'Confirmed' ? "bg-green-100 text-green-600" :
                      booking.status === 'Cancelled' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</span>
                      <p className="font-bold text-brand-900">{booking.customerName}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Booking ID</span>
                      <p className="font-mono text-sm font-bold text-brand-900">{booking.id}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date & Time</span>
                      <div className="flex items-center gap-2 font-bold text-brand-900">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        {booking.date} at {booking.time}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Party Size</span>
                      <div className="flex items-center gap-2 font-bold text-brand-900">
                        <Users className="w-4 h-4 text-brand-600" />
                        {booking.guests} Guests
                      </div>
                    </div>
                  </div>

                  {booking.orderedItems && booking.orderedItems.length > 0 && (
                    <div className="pt-4 border-t border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">Pre-ordered Items</span>
                      <div className="space-y-2">
                        {booking.orderedItems.map((item, idx) => {
                          const menuItem = menu.find(m => m.id === item.itemId);
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-brand-50 text-brand-900 rounded-lg flex items-center justify-center text-[10px] font-bold">
                                  {item.quantity}x
                                </span>
                                <span className="font-medium text-brand-900">{menuItem?.name || 'Unknown Item'}</span>
                              </div>
                              <span className="font-mono text-slate-400">
                                {menuItem ? formatCurrency(menuItem.price * item.quantity) : '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {booking.status === 'Confirmed' && (
                    <div className="pt-6 mt-6 border-t border-slate-200 flex flex-col gap-4">
                      {isPast(booking.date, booking.time) ? (
                        <button
                          onClick={() => handleUpdate({ ...booking, status: 'Fulfilled' })}
                          disabled={loading}
                          className="w-full p-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark as Fulfilled
                        </button>
                      ) : isModifiable(booking.date, booking.time) ? (
                        <>
                          <div className="flex gap-4">
                            <button
                              onClick={() => setIsEditing(true)}
                              disabled={loading}
                              className="flex-1 p-4 bg-brand-50 text-brand-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-100 transition-all"
                            >
                              <Edit3 className="w-4 h-4" /> Edit Booking
                            </button>
                            <button
                              onClick={() => setShowCancelConfirm(true)}
                              disabled={loading}
                              className="flex-1 p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" /> Cancel Booking
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 italic text-center mt-2 w-full">
                            Modifications allowed up to 1 hour before booking.
                          </p>
                        </>
                      ) : (
                        <div className="w-full p-4 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-medium">
                          This booking can no longer be modified online (less than 1 hour remaining).
                        </div>
                      )}
                    </div>
                  )}

                  {booking.status === 'Fulfilled' && isPast(booking.date, booking.time) && (
                    <div className="pt-6 mt-6 border-t border-slate-200">
                      <div className="p-6 bg-brand-50 rounded-2xl border border-brand-100 text-center">
                        <p className="text-sm font-bold text-brand-900 mb-4">How was your experience?</p>
                        <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRating(star)}
                              className={cn(
                                "p-1 transition-all hover:scale-110",
                                (booking.rating || 0) >= star ? "text-yellow-400" : "text-slate-300"
                              )}
                            >
                              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        {booking.rating && (
                          <p className="text-xs font-bold text-brand-600 mt-4 uppercase tracking-widest">
                            You rated this {booking.rating} stars
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2 font-serif text-brand-900">Cancel Reservation?</h2>
              <p className="text-slate-400 mb-8">Are you sure you want to cancel this reservation? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  No, Keep It
                </button>
                <button 
                  onClick={handleCancel}
                  className="flex-1 p-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
