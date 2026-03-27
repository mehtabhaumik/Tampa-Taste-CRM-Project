import * as React from 'react';
import { useState, useEffect, createContext, useContext, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  User as UserIcon, 
  ShieldCheck, 
  Search,
  ChevronRight, 
  MapPin, 
  LogOut, 
  Loader2, 
  ListOrdered, 
  MessageSquare,
  ShoppingBag,
  Apple, 
  Mail, 
  Phone, 
  Key, 
  CheckCircle2, 
  Star, 
  Clock, 
  Users, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  TrendingUp,
  X,
  Globe
} from 'lucide-react';
import CustomerWebsite from './components/CustomerWebsite';
import { ChatFacility } from './components/ChatFacility';
import { 
  auth, 
  db, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  handleFirestoreError,
  OperationType,
  appleProvider,
  microsoftProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where,
  limit,
  orderBy,
  Timestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { sendEmail } from './lib/emailService';
import { getReservationEmail } from './lib/emailTemplates';
import BookingForm from './components/BookingForm';
import StaffDashboard from './components/StaffDashboard';
import FeedbackForm from './components/FeedbackForm';
import WaitlistForm from './components/WaitlistForm';
import StaffLogin from './components/StaffLogin';
import FindBooking from './components/FindBooking';
import { OrderFoodForm } from './components/OrderFoodForm';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { LanguageSelector } from './components/LanguageSelector';
import { Booking, MenuItem, UserProfile, Feedback, WaitlistEntry, Employee, Order, LoyaltyTransaction } from './types';
import { INITIAL_MENU } from './constants';
import { cn, formatCurrency } from './utils';
import { loyaltyService } from './services/loyaltyService';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary Component
class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-black/60 mb-6">We encountered an error while loading the application. Please try refreshing the page.</p>
            <pre className="text-xs bg-black/5 p-4 rounded-xl overflow-auto max-h-40 mb-6">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full p-4 bg-black text-white rounded-xl font-bold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  isAuthReady: boolean;
  bookings: Booking[];
  activeBookingsCount: number;
  menu: MenuItem[];
  feedback: Feedback[];
  waitlist: WaitlistEntry[];
  employees: Employee[];
  orders: Order[];
  loyaltyTransactions: LoyaltyTransaction[];
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
};

// Helper to safely parse dates from various formats (JS Date, Firestore Timestamp, string, number)
const parseDate = (val: any): Date | null => {
  if (!val) return null;
  try {
    if (val instanceof Date) return val;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val && typeof val === 'object' && 'seconds' in val) {
      const d = new Date(val.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setIsAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          roles: user.email === 'ui.bhaumik@gmail.com' ? ['Admin', 'Manager'] : ['Customer'],
          loyaltyPoints: 0
        };
        try {
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      }
      setIsAuthReady(true);
    }, (error) => {
      // Gracefully handle permission errors on logout or token expiration
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!isAuthReady) return;

    // Listen to Menu
    const menuUnsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const menuData = snapshot.docs.map(doc => doc.data() as MenuItem);
      
      // Sync INITIAL_MENU to Firestore if items are missing (Admin only)
      if (user?.email === 'ui.bhaumik@gmail.com') {
        INITIAL_MENU.forEach(async (item) => {
          const exists = menuData.some(m => m.id === item.id);
          if (!exists) {
            try {
              await setDoc(doc(db, 'menu', item.id), item);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `menu/${item.id}`);
            }
          }
        });
      }

      setMenu(menuData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menu');
    });

    // Listen to Bookings - Only for Staff/Admin
    let bookingsUnsubscribe = () => {};
    const isStaffOrAdmin = profile?.roles?.some(r => ['Admin', 'Manager', 'Chef', 'Waiter', 'Accountant'].includes(r));
    if (isStaffOrAdmin) {
      const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      bookingsUnsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: parseDate(data.createdAt)?.toISOString() || new Date().toISOString()
          } as Booking;
        });
        setBookings(bookingsData);
        setActiveBookingsCount(bookingsData.filter(b => b.status === 'Confirmed').length);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      });
    } else {
      // For guests: only listen to confirmed bookings count
      const q = query(
        collection(db, 'bookings'), 
        where('status', '==', 'Confirmed'),
        limit(50)
      );
      bookingsUnsubscribe = onSnapshot(q, (snapshot) => {
        setActiveBookingsCount(snapshot.size);
      }, (error) => {
        // Silent fail for guests
        console.warn('Could not fetch booking count:', error);
      });
      setLoading(false);
    }

    // Listen to Feedback - Only for Staff/Admin
    let feedbackUnsubscribe = () => {};
    if (isStaffOrAdmin) {
      const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      feedbackUnsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
        const feedbackData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: parseDate(data.createdAt)?.toISOString() || new Date().toISOString()
          } as Feedback;
        });
        setFeedback(feedbackData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'feedback');
      });
    }

    // Listen to Waitlist - Only for Staff/Admin
    let waitlistUnsubscribe = () => {};
    if (isStaffOrAdmin) {
      const waitlistQuery = query(collection(db, 'waitlist'), orderBy('createdAt', 'asc'));
      waitlistUnsubscribe = onSnapshot(waitlistQuery, (snapshot) => {
        const waitlistData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: parseDate(data.createdAt)?.toISOString() || new Date().toISOString()
          } as WaitlistEntry;
        });
        setWaitlist(waitlistData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'waitlist');
      });
    }

    // Listen to Employees - Only for Admin/Manager/Accountant
    let employeesUnsubscribe = () => {};
    const isAdminOrManager = profile?.roles?.some(r => ['Admin', 'Manager', 'Accountant'].includes(r));
    if (isAdminOrManager) {
      employeesUnsubscribe = onSnapshot(collection(db, 'employees'), (snapshot) => {
        const employeesData = snapshot.docs.map(doc => doc.data() as Employee);
        setEmployees(employeesData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'employees');
      });
    }

    // Listen to Orders - Only for Staff/Admin
    let ordersUnsubscribe = () => {};
    if (isStaffOrAdmin) {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: parseDate(data.createdAt)?.toISOString() || new Date().toISOString()
          } as Order;
        });
        setOrders(ordersData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
    }

    // Listen to Loyalty Transactions - Only for Staff/Admin or the User
    let loyaltyUnsubscribe = () => {};
    if (isStaffOrAdmin) {
      const loyaltyQuery = query(collection(db, 'loyaltyTransactions'), orderBy('createdAt', 'desc'), limit(100));
      loyaltyUnsubscribe = onSnapshot(loyaltyQuery, (snapshot) => {
        const loyaltyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: parseDate(doc.data().createdAt)?.toISOString() || new Date().toISOString()
        } as LoyaltyTransaction));
        setLoyaltyTransactions(loyaltyData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'loyaltyTransactions');
      });
    } else if (user) {
      const loyaltyQuery = query(
        collection(db, 'loyaltyTransactions'), 
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      loyaltyUnsubscribe = onSnapshot(loyaltyQuery, (snapshot) => {
        const loyaltyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: parseDate(doc.data().createdAt)?.toISOString() || new Date().toISOString()
        } as LoyaltyTransaction));
        setLoyaltyTransactions(loyaltyData);
      }, (error) => {
        console.warn('Could not fetch personal loyalty transactions:', error);
      });
    }

    return () => {
      menuUnsubscribe();
      bookingsUnsubscribe();
      feedbackUnsubscribe();
      waitlistUnsubscribe();
      employeesUnsubscribe();
      ordersUnsubscribe();
      loyaltyUnsubscribe();
    };
  }, [isAuthReady, profile]);

  return (
    <LanguageProvider>
      <FirebaseContext.Provider value={{ user, profile, setProfile, isAuthReady, bookings, activeBookingsCount, menu, feedback, waitlist, employees, orders, loyaltyTransactions, loading }}>
        {children}
      </FirebaseContext.Provider>
    </LanguageProvider>
  );
}

function MainApp() {
  const { user, profile, setProfile, isAuthReady, bookings, activeBookingsCount, menu, feedback, waitlist, employees, orders, loyaltyTransactions, loading } = useFirebase();
  const { t } = useLanguage();
  const [view, setView] = useState<'landing' | 'customer' | 'staff' | 'waitlist' | 'feedback' | 'staff-login' | 'find-booking' | 'menu' | 'order-food' | 'customer-portal'>('landing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && ['landing', 'customer', 'staff', 'waitlist', 'feedback', 'staff-login', 'find-booking', 'menu', 'order-food', 'customer-portal'].includes(viewParam)) {
      setView(viewParam as any);
    }
  }, []);

  const BOOKING_LIMIT = 24;
  const isFullyBooked = activeBookingsCount >= BOOKING_LIMIT;
  const waitingCount = waitlist.filter(w => w.status === 'Waiting').length;

  // Phone Login State
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);

  useEffect(() => {
    if (showPhoneLogin && !recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
      setRecaptchaVerifier(verifier);
    }
  }, [showPhoneLogin]);

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recaptchaVerifier) return;
    setPhoneLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
    } catch (err) {
      console.error('Phone sign in error:', err);
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setPhoneLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      setShowPhoneLogin(false);
      setConfirmationResult(null);
      setVerificationCode('');
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setPhoneLoading(false);
    }
  };

  useEffect(() => {
    const seedEmployees = async () => {
      // Only seed if user is the admin email or already has admin role
      const isAdminUser = user?.email === 'ui.bhaumik@gmail.com' || profile?.roles?.includes('Admin');
      if (!isAdminUser) return;

      try {
        const empRef = doc(db, 'employees', '1111');
        let empSnap;
        try {
          empSnap = await getDoc(empRef);
        } catch (err) {
          // Silent fail for seeding check if not authorized
          return;
        }
        
        const currentData = empSnap.data();
        const allowedRoles = ['Admin', 'Manager', 'Chef', 'Waiter', 'Accountant'];
        const hasStaffRole = currentData?.roles?.some((role: string) => allowedRoles.includes(role));

        if (!empSnap.exists() || !hasStaffRole) {
          try {
            await setDoc(empRef, {
              id: '1111',
              firstName: 'Bhaumik',
              lastName: 'Mehta',
              name: 'Bhaumik Mehta',
              employeeCode: '1111',
              designation: 'Manager',
              roles: ['Admin', 'Manager'],
              active: true,
              createdAt: Timestamp.now()
            }, { merge: true });
            console.log('Employee Bhaumik Mehta seeded/updated with staff roles.');
          } catch (err) {
            // Silent fail for seeding write if not authorized
          }
        }
      } catch (err: any) {
        console.error('Error seeding employee:', err.message);
      }
    };
    if (isAuthReady) seedEmployees();
  }, [isAuthReady, user, profile]);

  const handleLogin = async (targetView: 'customer' | 'staff' | 'waitlist' | 'feedback' | 'find-booking') => {
    try {
      if (targetView === 'staff') {
        setView('staff-login');
        return;
      }
      
      if (!user && (targetView === 'customer' || targetView === 'feedback' || targetView === 'find-booking')) {
        setView(targetView);
        return;
      }
      setView(targetView);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleStaffLoginSuccess = (roles: string[], employeeCode: string, firstName: string, lastName: string) => {
    // We don't need to manually setProfile here because the onSnapshot listener 
    // in FirebaseProvider will pick up the changes from Firestore and update the profile state.
    // This avoids race conditions where the rules might not yet see the updated users document.
    setView('staff');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('landing');
  };

  const handleBookingComplete = async (booking: Booking) => {
    const bookingData = {
      ...booking,
      uid: user?.uid || 'guest',
      createdAt: Timestamp.now()
    };
    try {
      await setDoc(doc(db, 'bookings', booking.id), bookingData);
      
      // Send confirmation email
      if (booking.customerEmail) {
        const emailHtml = getReservationEmail({
          name: booking.customerName,
          date: booking.date,
          time: booking.time,
          guests: booking.guests,
        }, false);
        
        await sendEmail(
          booking.customerEmail,
          `Reservation Confirmed - Tampa Taste #${booking.id}`,
          emailHtml
        );
      }

      // Redeem points if any
      if (booking.pointsRedeemed && booking.pointsRedeemed > 0 && user?.uid) {
        await loyaltyService.redeemPoints(
          user.uid, 
          booking.pointsRedeemed, 
          booking.id, 
          `Redeemed for booking #${booking.id}`
        );
      }

      // No longer setting view to landing here, BookingForm will show success state
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `bookings/${booking.id}`);
    }
  };

  const handleUpdateBooking = async (updated: Booking) => {
    try {
      const { id, ...data } = updated;
      
      // Convert createdAt back to Timestamp if it's a string
      if (data.createdAt && typeof data.createdAt === 'string') {
        data.createdAt = Timestamp.fromDate(new Date(data.createdAt));
      }
      
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, data);
      
      // Send modification email if status is still Confirmed
      if (updated.customerEmail && updated.status === 'Confirmed') {
        const emailHtml = getReservationEmail({
          name: updated.customerName,
          date: updated.date,
          time: updated.time,
          guests: updated.guests,
        }, true); // true for modification
        
        await sendEmail(
          updated.customerEmail,
          `Reservation Modified - Tampa Taste #${updated.id}`,
          emailHtml
        );
      }

      // Award points if fulfilled
      if (updated.status === 'Fulfilled' && updated.uid && updated.uid !== 'guest') {
        const totalAmount = updated.orderedItems.reduce((sum, item) => {
          const menuItem = menu.find(m => m.id === item.itemId);
          return sum + (menuItem?.price || 0) * item.quantity;
        }, 0);
        
        if (totalAmount > 0) {
          await loyaltyService.awardPoints(
            updated.uid, 
            totalAmount, 
            updated.id, 
            `Points earned from reservation #${updated.id.slice(-6).toUpperCase()}`
          );
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${updated.id}`);
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, { status: 'Cancelled' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      const orderRef = doc(db, 'orders', id);
      await updateDoc(orderRef, { status: 'Cancelled' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const handleToggleAvailability = async (itemId: string) => {
    const item = menu.find(m => m.id === itemId);
    if (!item) return;
    try {
      await updateDoc(doc(db, 'menu', itemId), { available: !item.available });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `menu/${itemId}`);
    }
  };

  const handleAddMenuItem = async (item: MenuItem) => {
    try {
      await setDoc(doc(db, 'menu', item.id), item);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `menu/${item.id}`);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menu', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `menu/${id}`);
    }
  };

  const handleUpdateWaitlist = async (entry: WaitlistEntry) => {
    try {
      await updateDoc(doc(db, 'waitlist', entry.id), { status: entry.status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `waitlist/${entry.id}`);
    }
  };

  const handleUpdateOrder = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: order.status });
      
      // Award points if fulfilled
      if (order.status === 'Fulfilled' && order.uid) {
        await loyaltyService.awardPoints(
          order.uid, 
          order.total, 
          order.id, 
          `Points earned from order #${order.id.slice(-6).toUpperCase()}`
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  if (!isAuthReady || (user && loading)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="w-12 h-12 animate-spin text-black mb-4" />
        <p className="text-black/40 font-bold uppercase tracking-widest text-xs">Loading Tampa Taste...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-black selection:bg-black selection:text-white">
      {/* Global Language Selector for Public Views */}
      {view !== 'staff' && (
        <div className="fixed top-6 right-6 z-[100]">
          <LanguageSelector dark={view === 'landing' || view === 'staff-login'} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden"
          >
            {/* Background Decoration */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-900/5 rounded-full blur-[120px]" />
              <img 
                src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=2070" 
                className="w-full h-full object-cover opacity-[0.03] grayscale"
                alt="Background"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full py-8 px-6">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-bold font-serif text-brand-900">Tampa Taste</span>
                </div>
                <div className="flex items-center gap-4">
                  <LanguageSelector />
                </div>
              </div>
            </header>

            {/* Main Content - Staff Login Only */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12"
            >
              <div className="w-full max-w-md">
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-brand-900 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-900/20">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight text-brand-900 font-serif mb-2">Staff Portal</h1>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Authorized Access Only</p>
                </div>

                <div className="glass p-8 sm:p-10 rounded-[3rem] shadow-2xl border border-white/20">
                  <StaffLogin 
                    onLoginSuccess={handleStaffLoginSuccess}
                  />
                </div>

                <div className="mt-12 text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Looking for the customer site?</p>
                  <button 
                    onClick={() => window.open(window.location.origin + '?view=customer-portal', '_blank')}
                    className="group flex items-center gap-4 px-8 py-5 bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all border border-slate-100 hover:border-brand-200 mx-auto"
                  >
                    <div className="w-12 h-12 bg-brand-50 text-brand-900 rounded-2xl flex items-center justify-center group-hover:bg-brand-900 group-hover:text-white transition-colors">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-brand-900 leading-none mb-1">Visit Customer Website</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Public Access • No Login Required</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-900 transition-colors" />
                  </button>
                </div>

                {user && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 flex items-center justify-center gap-4 glass p-2 pl-4 rounded-full mx-auto w-fit"
                  >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logged in as {user.email || user.phoneNumber}</span>
                    <button 
                      onClick={() => signOut(auth)}
                      className="p-2 bg-brand-900 text-white rounded-full hover:bg-brand-800 transition-all"
                    >
                      <LogOut className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Footer */}
            <footer className="relative z-10 w-full py-12 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 px-6">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <p className="text-slate-400 text-sm">
                    © {new Date().getFullYear()} Tampa Taste. All rights reserved.
                  </p>
                  <p className="text-slate-300 text-[10px] uppercase tracking-widest font-bold">
                    System Version 2.4.0
                  </p>
                </div>
                <div className="flex flex-col items-center md:items-end gap-1">
                  <p className="text-slate-400 text-sm font-medium">
                    Developed by <span className="text-brand-900">Bhaumik Mehta</span>
                  </p>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                    Powered by Google AI Studio
                  </p>
                </div>
              </div>
            </footer>

            {/* Phone Login Modal */}
            <AnimatePresence>
              {showPhoneLogin && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-900/40 backdrop-blur-md"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-md bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-white/20"
                  >
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />

                    <button 
                      onClick={() => setShowPhoneLogin(false)}
                      className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600 z-20"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6 sm:mb-10">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-900 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl shadow-brand-900/20">
                          <Phone className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-900 font-serif">Phone Sign In</h2>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brand-600">SMS Verification</p>
                        </div>
                      </div>

                      <div id="recaptcha-container"></div>

                      {!confirmationResult ? (
                        <form onSubmit={handlePhoneSignIn} className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Phone Number</label>
                            <div className="relative">
                              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                              <input
                                type="tel"
                                required
                                placeholder="+1 (555) 000-0000"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full p-5 pl-14 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 text-lg font-medium transition-all"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={phoneLoading}
                            className="w-full p-5 bg-brand-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 shadow-xl shadow-brand-900/20"
                          >
                            {phoneLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                              <>Send Verification Code <ChevronRight className="w-5 h-5" /></>
                            )}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Verification Code</label>
                            <div className="relative">
                              <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                              <input
                                type="text"
                                required
                                placeholder="Enter 6-digit code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full p-5 pl-14 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 text-lg font-medium tracking-[0.5em] text-center transition-all"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={phoneLoading}
                            className="w-full p-5 bg-brand-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 shadow-xl shadow-brand-900/20"
                          >
                            {phoneLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                              <>Verify & Login <CheckCircle2 className="w-6 h-6" /></>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmationResult(null)}
                            className="w-full text-xs font-bold text-brand-600 uppercase tracking-widest hover:underline"
                          >
                            Change Phone Number
                          </button>
                        </form>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}


        {view === 'customer-portal' && (
          <motion.div
            key="customer-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen"
          >
            <CustomerWebsite 
              menu={menu} 
              onBookingComplete={handleBookingComplete} 
              isAdmin={profile?.roles?.includes('Admin')}
              user={user}
            />
          </motion.div>
        )}

        {view === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen p-6 sm:p-12 bg-slate-50"
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-5xl font-bold tracking-tight text-brand-900 font-serif mb-2">Our Menu</h2>
                  <p className="text-slate-400">Curated excellence for every palate.</p>
                </div>
                <button
                  onClick={() => setView('landing')}
                  className="p-4 bg-white text-brand-900 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-sm border border-slate-100"
                >
                  Back to Home
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {['Appetizer', 'Main', 'Dessert', 'Drink'].map(category => (
                  <div key={category} className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-600 border-b border-brand-100 pb-2">{category}s</h3>
                    <div className="space-y-4">
                      {menu.filter(item => item.category === category).map(item => (
                        <div 
                          key={item.id}
                          className={cn(
                            "glass p-6 rounded-3xl border border-white/20 transition-all",
                            !item.available && "opacity-50 grayscale"
                          )}
                        >
                          <div className="flex gap-4">
                            <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" />
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-brand-900">{item.name}</h4>
                                <span className="font-mono text-sm font-bold text-brand-600">{formatCurrency(item.price)}</span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.description}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                                  item.available ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                                )}>
                                  {item.available ? t('available') : t('unavailable')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {view === 'customer' && (
          <motion.div
            key="customer"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="min-h-screen py-12 px-6"
          >
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setView('landing')}
                className="mb-8 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all flex items-center gap-2"
              >
                ← Back to Home
              </button>
              <BookingForm 
                onBookingComplete={handleBookingComplete} 
                onCancel={() => setView('landing')}
              />
            </div>
          </motion.div>
        )}

        {view === 'waitlist' && (
          <motion.div
            key="waitlist"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="min-h-screen py-12 px-6"
          >
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setView('landing')}
                className="mb-8 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all flex items-center gap-2"
              >
                ← Back to Home
              </button>
              <WaitlistForm />
            </div>
          </motion.div>
        )}

        {view === 'order-food' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <OrderFoodForm menu={menu} user={user} onClose={() => setView('landing')} />
          </div>
        )}

        {view === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="min-h-screen py-12 px-6"
          >
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setView('landing')}
                className="mb-8 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all flex items-center gap-2"
              >
                ← Back to Home
              </button>
              <FeedbackForm />
            </div>
          </motion.div>
        )}

        {view === 'find-booking' && (
          <motion.div
            key="find-booking"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="min-h-screen py-12 px-6"
          >
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setView('landing')}
                className="mb-8 text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-all flex items-center gap-2"
              >
                ← Back to Home
              </button>
              <FindBooking />
            </div>
          </motion.div>
        )}

        {view === 'staff-login' && (
          <StaffLogin 
            onLoginSuccess={handleStaffLoginSuccess}
            onBack={() => setView('landing')}
          />
        )}

        {view === 'staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen"
          >
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/80 backdrop-blur-md border border-black/5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-all shadow-sm"
              >
                Logout
              </button>
            </div>
            <StaffDashboard 
              bookings={bookings}
              onAddBooking={handleBookingComplete}
              onUpdateBooking={handleUpdateBooking}
              onCancelBooking={handleCancelBooking}
              onToggleAvailability={handleToggleAvailability}
              onAddMenuItem={handleAddMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              menu={menu}
              feedback={feedback}
              waitlist={waitlist}
              onUpdateWaitlist={handleUpdateWaitlist}
              profile={profile}
              employees={employees}
              orders={orders}
              onUpdateOrder={handleUpdateOrder}
              onCancelOrder={handleCancelOrder}
              loyaltyTransactions={loyaltyTransactions}
              user={user}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {view !== 'staff' && <ChatFacility />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <MainApp />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
