import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ChevronRight, ChevronLeft, MapPin, CreditCard, Banknote, CheckCircle2, Trash2, Plus, Minus, Star } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { MenuItem, Order } from '../types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';
import { useFirebase } from '../App';
import { loyaltyService } from '../services/loyaltyService';
import { sendEmail } from '../lib/emailService';
import { getOrderEmail } from '../lib/emailTemplates';
import { cn, formatPhoneNumber, validateEmail, validateNoNumerics } from '../utils';

interface OrderFoodFormProps {
  menu: MenuItem[];
  user: User | null;
  onClose: () => void;
}

type Step = 'menu' | 'details' | 'checkout' | 'success';

export const OrderFoodForm: React.FC<OrderFoodFormProps> = ({ menu, user, onClose }) => {
  const { t } = useLanguage();
  const { profile } = useFirebase();
  const [step, setStep] = useState<Step>('menu');
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [details, setDetails] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    address: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card'>('Cash');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const availablePoints = profile?.loyaltyPoints || 0;
  const maxRedeemable = Math.min(availablePoints, Math.floor(cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0)));

  const getCardType = (number: string) => {
    const cleanNumber = number.replace(/\s+/g, '');
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    return 'unknown';
  };

  const cardLogos: Record<string, string> = {
    visa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/512px-Visa_Inc._logo.svg.png',
    mastercard: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
    amex: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
    discover: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg',
  };

  const cardType = getCardType(cardDetails.number);

  const isCardValid = () => {
    if (paymentMethod === 'Cash') return true;
    const cleanNumber = cardDetails.number.replace(/\s+/g, '');
    const isNumberValid = cleanNumber.length >= 13 && cleanNumber.length <= 19;
    const isMonthValid = parseInt(cardDetails.expiryMonth) >= 1 && parseInt(cardDetails.expiryMonth) <= 12;
    const isYearValid = parseInt(cardDetails.expiryYear) >= new Date().getFullYear() % 100;
    const cvvLength = cardType === 'amex' ? 4 : 3;
    const isCvvValid = cardDetails.cvv.length === cvvLength;
    return isNumberValid && isMonthValid && isYearValid && isCvvValid;
  };

  const subtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const deliveryFee = subtotal >= 100 ? 0 : 5;
  const discount = pointsToRedeem; // 1 point = $1
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const handleDetailsNext = () => {
    const newErrors: { [key: string]: string } = {};
    if (!validateEmail(details.email)) newErrors.email = 'Invalid email address';
    if (!validateNoNumerics(details.name)) newErrors.name = 'Name cannot contain numbers';
    if (details.phone.replace(/[^\d]/g, '').length < 10) newErrors.phone = 'Invalid phone number';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep('checkout');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const orderData: Omit<Order, 'id'> = {
        ...(user?.uid && { uid: user.uid }),
        customerName: details.name,
        customerEmail: details.email,
        phoneNumber: details.phone,
        address: details.address,
        items: cart.map(i => ({ itemId: i.item.id, quantity: i.quantity })),
        total,
        pointsRedeemed: pointsToRedeem,
        paymentMethod,
        ...(paymentMethod === 'Credit Card' && { 
          cardDetails: {
            number: cardDetails.number,
            expiry: `${cardDetails.expiryMonth}/${cardDetails.expiryYear}`,
            cvv: cardDetails.cvv
          } 
        }),
        status: 'Pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Send order email
      if (details.email) {
        const emailHtml = getOrderEmail({
          customerName: details.name,
          items: cart.map(i => ({ 
            name: i.item.name, 
            quantity: i.quantity, 
            price: i.item.price 
          })),
          total: total
        });
        
        await sendEmail(
          details.email,
          `Order Received - Tampa Taste #${docRef.id.slice(0, 6).toUpperCase()}`,
          emailHtml
        );
      }

      if (pointsToRedeem > 0 && user?.uid) {
        await loyaltyService.redeemPoints(user.uid, pointsToRedeem, docRef.id, `Redeemed for order #${docRef.id.slice(0, 6)}`);
      }
      
      setStep('success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('orderFood')}</h2>
              <p className="text-sm text-gray-500">{t('deliveryInfo')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Stepper */}
        {step !== 'success' && (
          <div className="px-6 py-4 bg-white border-b flex justify-center gap-8">
            {[
              { id: 'menu', label: t('stepMenu') },
              { id: 'details', label: t('stepDetails') },
              { id: 'checkout', label: t('stepCheckout') }
            ].map((s, idx, arr) => {
              const currentIdx = arr.findIndex(item => item.id === step);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              
              return (
                <button 
                  key={s.id} 
                  onClick={() => isPast && setStep(s.id as Step)}
                  disabled={!isPast}
                  className={`flex items-center gap-2 transition-all ${isPast ? 'hover:text-orange-600 cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isCurrent ? 'bg-orange-600 text-white' : isPast ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${isCurrent ? 'text-gray-900' : isPast ? 'text-orange-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                  {idx < 2 && <ChevronRight size={16} className="text-gray-300 ml-2" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t('ourMenu')}</h3>
                  {menu.filter(item => item.available).map(item => (
                    <div key={item.id} className="flex gap-4 p-3 rounded-2xl border hover:border-orange-200 transition-colors group">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-orange-600">${item.price.toFixed(2)}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Summary */}
                <div className="bg-gray-50 rounded-3xl p-6 h-fit sticky top-0">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ShoppingBag size={20} />
                    {t('yourOrder')}
                  </h3>
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Your cart is empty</p>
                  ) : (
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.item.id} className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.item.name}</p>
                            <p className="text-xs text-gray-500">${item.item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
                            <button onClick={() => updateQuantity(item.item.id, -1)} className="p-1 hover:bg-gray-100 rounded"><Minus size={14} /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.item.id, 1)} className="p-1 hover:bg-gray-100 rounded"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Delivery Fee</span>
                          <span className="font-medium">{deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2">
                          <span>{t('total')}</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                        {subtotal < 100 && (
                          <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg text-center">
                            Add ${(100 - subtotal).toFixed(2)} more for FREE delivery!
                          </p>
                        )}
                        <button
                          onClick={() => setStep('details')}
                          disabled={cart.length === 0}
                          className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 mt-4"
                        >
                          {t('checkout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-md mx-auto space-y-6"
              >
                <h3 className="text-xl font-bold text-gray-900">{t('deliveryAddress')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={details.name}
                      onChange={e => {
                        setDetails({ ...details, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all",
                        errors.name && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-widest">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={details.email}
                      onChange={e => {
                        setDetails({ ...details, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                      }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all",
                        errors.email && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="john@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-widest">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={details.phone}
                      onChange={e => {
                        setDetails({ ...details, phone: formatPhoneNumber(e.target.value) });
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all",
                        errors.phone && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="(555) 000-0000"
                    />
                    {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase tracking-widest">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                    <textarea
                      required
                      value={details.address}
                      onChange={e => setDetails({ ...details, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all h-24 resize-none"
                      placeholder="Street address, Apartment, Suite, etc."
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setStep('menu')}
                    className="flex-1 py-3 rounded-xl font-bold border hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleDetailsNext}
                    disabled={!details.name || !details.email || !details.phone || !details.address}
                    className="flex-[2] bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    Continue to Payment
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-md mx-auto space-y-6"
              >
                <h3 className="text-xl font-bold text-gray-900">{t('paymentMethod')}</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                      paymentMethod === 'Cash' ? 'border-orange-600 bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${paymentMethod === 'Cash' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Banknote size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{t('payAtHome')}</p>
                      <p className="text-sm text-gray-500">Pay when your food arrives</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('Credit Card')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                      paymentMethod === 'Credit Card' ? 'border-orange-600 bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${paymentMethod === 'Credit Card' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <CreditCard size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{t('creditCard')}</p>
                      <p className="text-sm text-gray-500">Secure online payment</p>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'Credit Card' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard size={18} />
                        Card Details
                      </h4>
                      <div className="flex gap-2 items-center">
                        {Object.entries(cardLogos).map(([type, url]) => (
                          <div key={type} className="h-5 w-8 flex items-center justify-center">
                            <img 
                              src={url} 
                              alt={type} 
                              className={`max-h-full max-w-full object-contain transition-all ${cardType === type ? 'grayscale-0 scale-125' : 'grayscale opacity-30'}`}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Card Number"
                          value={cardDetails.number}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                            setCardDetails({ ...cardDetails, number: val });
                          }}
                          maxLength={19}
                          className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all pr-12"
                        />
                        {cardType !== 'unknown' && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-8 flex items-center justify-center">
                            <img 
                              src={cardLogos[cardType]} 
                              className="max-h-full max-w-full object-contain" 
                              alt="card type"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                          <input
                            type="text"
                            list="months"
                            placeholder="MM"
                            value={cardDetails.expiryMonth}
                            onChange={e => setCardDetails({ ...cardDetails, expiryMonth: e.target.value.slice(0, 2) })}
                            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                          />
                          <datalist id="months">
                            {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            list="years"
                            placeholder="YY"
                            value={cardDetails.expiryYear}
                            onChange={e => setCardDetails({ ...cardDetails, expiryYear: e.target.value.slice(0, 2) })}
                            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                          />
                          <datalist id="years">
                            {Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() + i).toString().slice(-2)).map(y => (
                              <option key={y} value={y} />
                            ))}
                          </datalist>
                        </div>
                        <input
                          type="text"
                          placeholder={cardType === 'amex' ? 'CVV (4)' : 'CVV (3)'}
                          value={cardDetails.cvv}
                          onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') })}
                          maxLength={cardType === 'amex' ? 4 : 3}
                          className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                  {availablePoints > 0 && (
                    <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-brand-600 fill-brand-600" />
                          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Loyalty Points</span>
                        </div>
                        <span className="text-sm font-bold text-brand-900">{availablePoints} available</span>
                      </div>
                      <div className="space-y-2">
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
                          <span className="text-brand-600">Redeem {pointsToRedeem} pts (-${pointsToRedeem})</span>
                          <span>{maxRedeemable} pts</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Summary</p>
                    {cart.map(item => (
                      <div key={item.item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.quantity}x {item.item.name}</span>
                        <span className="font-medium text-gray-900">${(item.item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery Fee</span>
                      <span className="font-medium text-gray-900">{deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}</span>
                    </div>
                    {pointsToRedeem > 0 && (
                      <div className="flex justify-between text-sm text-brand-600 font-bold">
                        <span>Loyalty Discount</span>
                        <span>-${pointsToRedeem.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setStep('details')}
                    className="flex-1 py-3 rounded-xl font-bold border hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSubmitting || !isCardValid()}
                    className="flex-[2] bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Processing...' : t('placeOrder')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={48} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900">{t('orderSuccess')} 🍕🍔🍟</h3>
                  <p className="text-gray-500 mt-2">Your delicious meal is on its way! 🛵💨</p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                >
                  {t('backToHome')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Your Order</h3>
                <p className="text-gray-500 mb-8">Are you sure you want to place this order for ${total.toFixed(2)}?</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold border hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      handleSubmit();
                    }}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </motion.div>
  );
};
