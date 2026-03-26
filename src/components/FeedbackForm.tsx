import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { useFirebase } from '../App';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../utils';

export default function FeedbackForm() {
  const { user } = useFirebase();
  const [rating, setRating] = useState(0);
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    const feedbackId = Math.random().toString(36).substr(2, 9);
    const feedbackData = {
      id: feedbackId,
      uid: user?.uid || 'guest',
      customerName: customerName || user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
      rating,
      comment,
      createdAt: Timestamp.now()
    };

    try {
      await setDoc(doc(db, 'feedback', feedbackId), feedbackData);
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `feedback/${feedbackId}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] text-center border border-slate-100 shadow-2xl max-w-2xl mx-auto"
      >
        <div className="w-24 h-24 bg-brand-50 text-brand-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-brand-900/10">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h3 className="text-4xl font-bold mb-3 text-brand-900 font-serif">Thank You!</h3>
        <p className="text-slate-400 text-lg">Your feedback helps us make Tampa Taste even better.</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-white p-8 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-2xl max-w-2xl mx-auto relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
      
      <div className="relative z-10">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3 text-brand-900 font-serif">How was your visit?</h2>
        <p className="text-slate-400 mb-10 text-lg">We'd love to hear about your experience at Tampa Taste.</p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {!user && (
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-6 block">Your Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full p-8 bg-slate-50 rounded-[2rem] border-none focus:ring-2 focus:ring-brand-500 text-lg font-medium placeholder:text-slate-300 transition-all"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-6 block">Rating</label>
            <div className="flex gap-3 sm:gap-6 justify-center sm:justify-start">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="group transition-all"
                >
                  <Star 
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 transition-all",
                      star <= rating ? "fill-brand-500 text-brand-500 scale-125 drop-shadow-lg" : "text-slate-200 group-hover:text-brand-200"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-6 block">Your Comments</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you liked or how we can improve..."
              className="w-full p-8 bg-slate-50 rounded-[2rem] border-none focus:ring-2 focus:ring-brand-500 min-h-[180px] text-lg font-medium placeholder:text-slate-300 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full p-6 bg-brand-900 text-white rounded-[2rem] font-bold text-xl flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-900/20"
          >
            {loading ? 'Submitting...' : (
              <>
                Submit Feedback <Send className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
