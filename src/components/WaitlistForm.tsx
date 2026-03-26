import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Phone, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useFirebase } from '../App';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../utils';

export default function WaitlistForm() {
  const { user } = useFirebase();
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    partySize: 2,
    phoneNumber: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const entryId = Math.random().toString(36).substr(2, 9);
    const entryData = {
      id: entryId,
      customerName: formData.name,
      partySize: formData.partySize,
      phoneNumber: formData.phoneNumber,
      status: 'Waiting',
      estimatedWaitTime: 15, // Default estimate
      createdAt: Timestamp.now()
    };

    try {
      await setDoc(doc(db, 'waitlist', entryId), entryData);
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `waitlist/${entryId}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-[3rem] text-center border border-slate-100 shadow-2xl max-w-2xl mx-auto"
      >
        <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-brand-900/10">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h3 className="text-4xl font-bold mb-3 text-brand-900 font-serif">You're on the list!</h3>
        <p className="text-slate-400 mb-8 text-lg">We'll notify you when your table is ready. Estimated wait: 15 mins.</p>
        <div className="flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest text-brand-600 bg-brand-50 py-3 px-6 rounded-2xl inline-flex mx-auto">
          <Clock className="w-4 h-4" />
          Joined at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl max-w-2xl mx-auto relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
      
      <div className="relative z-10">
        <h2 className="text-5xl font-bold tracking-tight mb-3 text-brand-900 font-serif">Join the Waitlist</h2>
        <p className="text-slate-400 mb-10 text-lg">No table available? Join our digital waitlist and we'll text you when it's ready.</p>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-4 block">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your Name"
                className="w-full p-6 bg-slate-50 rounded-[2rem] border-none focus:ring-2 focus:ring-brand-500 text-lg font-medium transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-4 block">Party Size</label>
              <div className="flex items-center bg-slate-50 rounded-[2rem] p-2 border border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partySize: Math.max(1, formData.partySize - 1) })}
                  className="w-14 h-14 flex items-center justify-center text-2xl font-bold hover:bg-white hover:shadow-md rounded-[1.5rem] transition-all text-brand-900"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-xl flex items-center justify-center gap-3 text-brand-900">
                  <Users className="w-6 h-6 text-brand-400" />
                  {formData.partySize}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partySize: Math.min(20, formData.partySize + 1) })}
                  className="w-14 h-14 flex items-center justify-center text-2xl font-bold hover:bg-white hover:shadow-md rounded-[1.5rem] transition-all text-brand-900"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-4 block">Phone Number (for SMS notification)</label>
            <div className="relative">
              <Phone className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300" />
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="(555) 000-0000"
                className="w-full p-6 pl-20 bg-slate-50 rounded-[2rem] border-none focus:ring-2 focus:ring-brand-500 text-lg font-medium transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-6 bg-brand-900 text-white rounded-[2rem] font-bold text-xl flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-900/20"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Join Waitlist <Clock className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
