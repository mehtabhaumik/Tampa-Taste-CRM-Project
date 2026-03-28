import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  Calendar, 
  ShoppingBag, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  ArrowUp,
  GripVertical,
  Settings
} from 'lucide-react';
import { cn } from '../utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import BookingForm from './BookingForm';
import { OrderFoodForm } from './OrderFoodForm';
import FeedbackForm from './FeedbackForm';
import WaitlistForm from './WaitlistForm';
import FindBooking from './FindBooking';
import { LanguageSelector } from './LanguageSelector';
import { MenuItem, Booking } from '../types';
import { useLanguage } from './LanguageContext';

interface Section {
  id: string;
  label: string;
  enabled: boolean;
}

interface CustomerWebsiteProps {
  menu: MenuItem[];
  onBookingComplete: (booking: Booking) => void;
  isAdmin?: boolean;
  user: User | null;
}

const DEFAULT_SECTIONS: Section[] = [
  { id: 'hero', label: 'Hero Section', enabled: true },
  { id: 'menu', label: 'Our Menu', enabled: true },
  { id: 'reservations', label: 'Reservations', enabled: true },
  { id: 'waitlist', label: 'Waitlist', enabled: true },
  { id: 'manage-booking', label: 'Manage Booking', enabled: true },
  { id: 'order', label: 'Order Food', enabled: true },
  { id: 'feedback', label: 'Feedback', enabled: true },
  { id: 'contact', label: 'Contact Us', enabled: true },
  { id: 'footer', label: 'Footer', enabled: true },
];

export default function CustomerWebsite({ menu, onBookingComplete, isAdmin = false, user }: CustomerWebsiteProps) {
  const { t } = useLanguage();
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [showConfig, setShowConfig] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isTodayFull, setIsTodayFull] = useState(false);

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', today),
      where('status', '==', 'Confirmed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentHour = new Date().getHours();
      const isNotClosed = currentHour < 22;
      
      const timeSlots = ['17:00', '18:00', '19:00', '20:00', '21:00'];
      const totalCapacity = timeSlots.length * 8;
      const currentBookings = snapshot.docs.length;
      
      const isFull = currentBookings >= totalCapacity;
      setIsTodayFull(isFull && isNotClosed);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'customer_portal'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.sections) {
          setSections(data.sections);
        }
      }
    });
    return unsubscribe;
  }, []);

  const handleSaveSections = async (newSections: Section[]) => {
    try {
      await setDoc(doc(db, 'settings', 'customer_portal'), { sections: newSections });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/customer_portal');
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections);
    handleSaveSections(newSections);
  };

  const toggleSection = (id: string) => {
    const newSections = sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setSections(newSections);
    handleSaveSections(newSections);
  };

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-500 selection:text-white relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
            <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center shadow-lg">
              <Utensils className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold font-serif tracking-tight">Tampa Taste</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {sections.filter(s => s.enabled && s.id !== 'hero' && s.id !== 'footer' && (s.id !== 'waitlist' || isTodayFull || isAdmin)).map(section => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  "text-sm font-bold uppercase tracking-widest transition-colors",
                  activeSection === section.id ? "text-brand-600" : "text-slate-400 hover:text-slate-900"
                )}
              >
                {t(section.id as any) || section.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                title="Configure Website Layout"
              >
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Admin Config Panel */}
      <AnimatePresence>
        {isAdmin && showConfig && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-6 top-24 bottom-6 w-80 bg-white shadow-2xl rounded-3xl border border-slate-100 z-[60] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Website Layout</h3>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Reorder Sections</p>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {sections.map((section, index) => (
                <div 
                  key={section.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    section.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-transparent opacity-50"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3 rotate-180" />
                    </button>
                    <button 
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-bold">{section.label}</p>
                  </div>

                  <button 
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      section.enabled ? "bg-brand-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                      section.enabled ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center font-medium">Changes are saved automatically and visible to all customers.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Website Content */}
      <div className="pt-20">
        {sections.filter(s => s.enabled).map((section) => (
          <section key={section.id} id={section.id} className="relative">
            {section.id === 'hero' && <HeroSection onScrollTo={scrollTo} />}
            {section.id === 'menu' && <MenuSection menu={menu} onOrderClick={() => setShowOrderModal(true)} />}
            {section.id === 'reservations' && (
              <div className="py-24 bg-slate-50">
                <div className="max-w-3xl mx-auto px-6">
                  <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold font-serif mb-4">{t('bookYourTable')}</h2>
                    <p className="text-slate-500">{t('joinUsExperience')}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                    <BookingForm onBookingComplete={onBookingComplete} />
                  </div>
                </div>
              </div>
            )}
            {section.id === 'waitlist' && (isTodayFull || isAdmin) && (
              <div className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-6">
                  <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold font-serif mb-4">{t('joinWaitlist')}</h2>
                    <p className="text-slate-500">{t('joinWaitlistDesc')}</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <WaitlistForm />
                  </div>
                </div>
              </div>
            )}
            {section.id === 'manage-booking' && (
              <div className="py-24 bg-slate-50">
                <div className="max-w-3xl mx-auto px-6">
                  <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold font-serif mb-4">{t('manageReservation')}</h2>
                    <p className="text-slate-500">{t('needToChange')}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                    <FindBooking />
                  </div>
                </div>
              </div>
            )}
            {section.id === 'order' && (
              <div className="py-24 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                      <h2 className="text-5xl font-bold font-serif mb-6 leading-tight">Crave it. Order it.<br /><span className="text-brand-500">Enjoy it.</span></h2>
                      <p className="text-white/60 text-lg mb-8">{t('deliveryInfo')}</p>
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-brand-500" />
                          </div>
                          <div>
                            <p className="font-bold">{t('fastDelivery')}</p>
                            <p className="text-xs text-white/40">{t('under30mins')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-brand-500" />
                          </div>
                          <div>
                            <p className="font-bold">{t('freshFood')}</p>
                            <p className="text-xs text-white/40">{t('cookedToOrder')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-brand-500/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] text-center">
                        <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20">
                          <ShoppingBag className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">{t('readyToEat')}</h3>
                        <p className="text-white/60 mb-8">{t('browseMenu')}</p>
                        <button 
                          onClick={() => setShowOrderModal(true)}
                          className="w-full py-5 bg-white text-slate-900 rounded-2xl font-bold text-lg hover:bg-brand-500 hover:text-white transition-all shadow-xl"
                        >
                          {t('startOrder')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {section.id === 'feedback' && (
              <div className="py-24 bg-slate-50">
                <div className="max-w-3xl mx-auto px-6">
                  <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold font-serif mb-4">{t('shareExperience')}</h2>
                    <p className="text-slate-500">{t('feedbackDesc')}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                    <FeedbackForm />
                  </div>
                </div>
              </div>
            )}
            {section.id === 'contact' && <ContactSection />}
            {section.id === 'footer' && <Footer />}
          </section>
        ))}
      </div>

      {/* Order Food Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <OrderFoodForm 
              menu={menu} 
              user={user} 
              onClose={() => setShowOrderModal(false)} 
            />
          </div>
        )}
      </AnimatePresence>

      {/* Scroll to Top */}
      <button 
        onClick={() => scrollTo('hero')}
        className="fixed bottom-6 right-6 w-12 h-12 bg-brand-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40"
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </div>
  );
}

function HeroSection({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="relative h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070" 
          className="w-full h-full object-cover"
          alt="Hero Background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block px-4 py-2 bg-brand-500/20 backdrop-blur-md border border-brand-500/30 text-brand-400 text-xs font-bold uppercase tracking-[0.3em] rounded-full mb-8">
            {t('culinaryExcellence')}
          </span>
          <h1 className="text-6xl md:text-8xl font-bold text-white font-serif mb-8 leading-tight">
            {t('symphonyOfFlavors')}
          </h1>
          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            {t('discoverArt')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => onScrollTo('reservations')}
              className="px-10 py-5 bg-brand-500 text-white rounded-2xl font-bold text-lg hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 w-full sm:w-auto"
            >
              {t('bookTable')}
            </button>
            <button 
              onClick={() => onScrollTo('menu')}
              className="px-10 py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all w-full sm:w-auto"
            >
              {t('exploreMenu')}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="text-white/50 w-8 h-8" />
      </div>
    </div>
  );
}

function MenuSection({ menu, onOrderClick }: { menu: MenuItem[], onOrderClick: () => void }) {
  const { t } = useLanguage();
  const categories = ['All', ...Array.from(new Set(menu.map(item => item.category)))];
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredMenu = activeCategory === 'All' 
    ? menu 
    : menu.filter(item => item.category === activeCategory);

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-4 block">{t('culinaryCreations')}</span>
          <h2 className="text-5xl font-bold font-serif mb-6">{t('discoverMenu')}</h2>
          <div className="w-24 h-1 bg-brand-500 mx-auto rounded-full" />
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-8 py-3 rounded-2xl text-sm font-bold transition-all",
                activeCategory === cat 
                  ? "bg-brand-900 text-white shadow-xl" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMenu.map((item, idx) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 hover:shadow-2xl transition-all"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={item.image} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={item.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl font-bold text-brand-900 shadow-lg">
                  ${item.price.toFixed(2)}
                </div>
                {!item.available && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="text-white font-bold uppercase tracking-widest text-sm border-2 border-white px-6 py-2 rounded-full">{t('soldOut')}</span>
                  </div>
                )}
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{item.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-1 rounded-md">{item.category}</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{item.description}</p>
                <button 
                  disabled={!item.available}
                  onClick={() => onOrderClick()}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-brand-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('addToOrder')}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactSection() {
  const { t } = useLanguage();
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <span className="text-brand-600 text-xs font-bold uppercase tracking-[0.3em] mb-4 block">{t('getInTouch')}</span>
            <h2 className="text-5xl font-bold font-serif mb-8">{t('visitUsToday')}</h2>
            <p className="text-slate-500 text-lg mb-12 leading-relaxed">
              {t('locationDesc')}
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">{t('ourLocation')}</p>
                  <p className="text-slate-500">123 Culinary Ave, Food District, Tampa, FL 33602</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">{t('phoneNumber')}</p>
                  <p className="text-slate-500">+1 (813) 555-0123</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">{t('emailAddress')}</p>
                  <p className="text-slate-500">hello@tampataste.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
            <img 
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1974" 
              className="w-full h-full object-cover"
              alt="Restaurant Interior"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-slate-900 text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                <Utensils className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold font-serif">{t('welcome')}</span>
            </div>
            <p className="text-white/40 leading-relaxed">
              {t('tagline')}
            </p>
            <div className="flex gap-4">
              <button className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-brand-500 transition-colors">
                <Instagram className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-brand-500 transition-colors">
                <Facebook className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-brand-500 transition-colors">
                <Twitter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-8">{t('quickLinks')}</h4>
            <ul className="space-y-4 text-white/40">
              <li><button className="hover:text-brand-500 transition-colors">{t('ourMenu')}</button></li>
              <li><button className="hover:text-brand-500 transition-colors">{t('reservations')}</button></li>
              <li><button className="hover:text-brand-500 transition-colors">{t('orderFood')}</button></li>
              <li><button className="hover:text-brand-500 transition-colors">{t('giftCards')}</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-8">{t('openingHours')}</h4>
            <ul className="space-y-4 text-white/40">
              <li className="flex justify-between"><span>{t('monThu')}</span> <span>11:00 - 22:00</span></li>
              <li className="flex justify-between"><span>{t('friSat')}</span> <span>11:00 - 23:30</span></li>
              <li className="flex justify-between"><span>{t('sunday')}</span> <span>10:00 - 21:00</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-8">{t('newsletter')}</h4>
            <p className="text-white/40 mb-6">{t('subscribeDesc')}</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder={t('yourEmail')}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button className="p-3 bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
          <p>© 2025 {t('welcome')}. {t('allRightsReserved')}</p>
          <div className="flex gap-8">
            <p className="text-[9px]">{t('developedBy')} <span className="text-white/40">Bhaumik Mehta</span></p>
            <p>{t('poweredBy')} <span className="text-white/40">Google AI Studio</span></p>
          </div>
        </div>
      </div>
    </footer>
  );
}
