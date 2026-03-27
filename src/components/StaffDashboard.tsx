import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Utensils, 
  Users, 
  TrendingUp, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronRight,
  Plus,
  MessageSquare,
  ListOrdered,
  Star,
  Loader2,
  Hash,
  Pencil,
  ShoppingBag,
  Globe
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Booking, MenuItem, Feedback, WaitlistEntry, UserProfile, Employee, UserRole, Order, LoyaltyTransaction } from '../types';
import { User } from 'firebase/auth';
import BookingForm from './BookingForm';
import CustomerWebsite from './CustomerWebsite';
import { INITIAL_MENU } from '../constants';
import { cn, formatCurrency } from '../utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

interface StaffDashboardProps {
  bookings: Booking[];
  onAddBooking?: (booking: Booking) => void;
  onUpdateBooking: (booking: Booking) => void;
  onCancelBooking: (id: string) => void;
  onToggleAvailability: (itemId: string) => void;
  onAddMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (id: string) => void;
  menu: MenuItem[];
  feedback: Feedback[];
  waitlist: WaitlistEntry[];
  onUpdateWaitlist: (entry: WaitlistEntry) => void;
  profile: UserProfile | null;
  employees: Employee[];
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onCancelOrder: (id: string) => void;
  loyaltyTransactions: LoyaltyTransaction[];
  user: User | null;
}

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

export default function StaffDashboard({ 
  bookings, 
  onAddBooking,
  onUpdateBooking, 
  onCancelBooking,
  onToggleAvailability,
  onAddMenuItem,
  onDeleteMenuItem,
  menu,
  feedback,
  waitlist,
  onUpdateWaitlist,
  profile,
  employees,
  orders,
  onUpdateOrder,
  onCancelOrder,
  loyaltyTransactions,
  user
}: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'menu' | 'waitlist' | 'feedback' | 'staff' | 'orders' | 'loyalty' | 'customer-portal'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrderDate, setSelectedOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWaitlistDate, setSelectedWaitlistDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [trendDays, setTrendDays] = useState(7);

  const isSuperAdmin = profile?.roles?.includes('Super Admin') || profile?.employeeCode === '1111';
  const isAdmin = profile?.roles?.includes('Admin') || isSuperAdmin;
  const isAdminOrManager = profile?.roles?.some(r => ['Admin', 'Manager', 'Accountant', 'Super Admin'].includes(r)) || profile?.employeeCode === '1111';
  
  // Find current employee details from the employees list to keep sidebar in sync
  const currentEmployee = useMemo(() => {
    if (!profile?.employeeCode) return null;
    const emp = employees.find(e => e.employeeCode === profile.employeeCode);
    if (profile.employeeCode === '1111' && emp && !emp.roles.includes('Super Admin')) {
      // Ensure 1111 has Super Admin role in the list too
      return { ...emp, roles: [...new Set([...emp.roles, 'Super Admin' as UserRole])] };
    }
    return emp;
  }, [employees, profile?.employeeCode]);

  const canAddEmployee = isSuperAdmin || profile?.roles?.some(r => ['Admin', 'Manager'].includes(r));
  const canManageBookings = isAdminOrManager;
  const canManageWaitlist = isAdminOrManager;

  // Employee Form State
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleBookingComplete = async (booking: Booking) => {
    if (editingBooking) {
      await onUpdateBooking(booking);
    } else {
      await onAddBooking?.(booking);
    }
  };

  const handleBookingCancel = () => {
    setShowBookingForm(false);
    setEditingBooking(null);
  };
  const [showOrderDeleteConfirm, setShowOrderDeleteConfirm] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newWaitlistEntry, setNewWaitlistEntry] = useState({
    customerName: '',
    partySize: 2,
    phoneNumber: ''
  });
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    roles: [] as UserRole[],
    active: true
  });
  const [adminCode, setAdminCode] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Menu Form State
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main' as MenuItem['category'],
    image: '',
    available: true
  });

  const handleCloseEmployeeForm = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setAdminCode('');
    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      designation: '',
      roles: [] as UserRole[],
      active: true
    });
  };

  const handleOpenEmployeeForm = (emp: Employee | null = null) => {
    setAdminCode('');
    if (emp) {
      setEditingEmployee(emp);
      setNewEmployee({
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        email: emp.email || '',
        phone: emp.phone || '',
        address: emp.address || '',
        designation: emp.designation || '',
        roles: emp.roles || [],
        active: emp.active !== false
      });
    } else {
      setEditingEmployee(null);
      setNewEmployee({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        designation: '',
        roles: [] as UserRole[],
        active: true
      });
    }
    setShowEmployeeForm(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Authorization check
    if (editingEmployee) {
      const isTargetSuperAdmin = editingEmployee.roles.includes('Super Admin') || editingEmployee.employeeCode === '1111';
      if (!isSuperAdmin && isTargetSuperAdmin) {
        alert('Only a Super Admin can update another Super Admin.');
        return;
      }
      if (!isAdmin && !isSuperAdmin) {
        alert('You do not have permission to update employees.');
        return;
      }
    } else {
      if (!canAddEmployee) {
        alert('You do not have permission to add new employees.');
        return;
      }
    }

    // Check for special code for ALL updates or if setting privileged roles
    const isSettingPrivileged = newEmployee.roles.some(r => ['Super Admin', 'Admin'].includes(r));
    
    if ((editingEmployee || isSettingPrivileged) && adminCode !== '9999') {
      alert('Security Code "9999" is required for all employee updates and for assigning Admin/Super Admin roles.');
      return;
    }

    // Mutually exclusive roles check
    if (newEmployee.roles.includes('Super Admin') && newEmployee.roles.includes('Admin')) {
      alert('An employee cannot have both "Super Admin" and "Admin" roles simultaneously.');
      return;
    }

    setFormLoading(true);

    try {
      if (editingEmployee) {
        const employeeData: any = {
          id: editingEmployee.id,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          name: `${newEmployee.firstName} ${newEmployee.lastName}`,
          employeeCode: editingEmployee.employeeCode,
          designation: newEmployee.designation,
          roles: newEmployee.roles,
          active: newEmployee.active,
          createdAt: editingEmployee.createdAt || Timestamp.now(),
          createdBy: editingEmployee.createdBy || profile?.employeeCode || 'System'
        };

        if (newEmployee.email.trim()) employeeData.email = newEmployee.email.trim();
        if (newEmployee.phone.trim()) employeeData.phone = newEmployee.phone.trim();
        if (newEmployee.address.trim()) employeeData.address = newEmployee.address.trim();

        await setDoc(doc(db, 'employees', editingEmployee.id), employeeData);
        alert('Employee updated successfully!');
      } else {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const id = code; // Using code as ID for simplicity
        const employeeData: any = {
          id,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          name: `${newEmployee.firstName} ${newEmployee.lastName}`,
          employeeCode: code,
          designation: newEmployee.designation,
          roles: newEmployee.roles,
          active: newEmployee.active,
          createdBy: profile?.employeeCode || 'System',
          createdAt: Timestamp.now()
        };

        if (newEmployee.email.trim()) employeeData.email = newEmployee.email.trim();
        if (newEmployee.phone.trim()) employeeData.phone = newEmployee.phone.trim();
        if (newEmployee.address.trim()) employeeData.address = newEmployee.address.trim();

        await setDoc(doc(db, 'employees', id), employeeData);
        alert(`Employee created successfully! Employee Code: ${code}`);
      }
      
      handleCloseEmployeeForm();
    } catch (error) {
      handleFirestoreError(error, editingEmployee ? OperationType.UPDATE : OperationType.CREATE, 'employees');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrManager) return;
    setFormLoading(true);

    try {
      const itemData: MenuItem = {
        id: editingMenuItem?.id || Math.random().toString(36).substr(2, 9),
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: parseFloat(newMenuItem.price),
        category: newMenuItem.category,
        image: newMenuItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000',
        available: newMenuItem.available
      };

      onAddMenuItem(itemData);
      setShowMenuForm(false);
      setEditingMenuItem(null);
      setNewMenuItem({
        name: '',
        description: '',
        price: '',
        category: 'Main',
        image: '',
        available: true
      });
    } catch (error) {
      console.error('Error saving menu item:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.date === today);
    const totalRevenue = bookings.reduce((acc, b) => {
      return acc + b.orderedItems.reduce((sum, item) => {
        const menuItem = menu.find(m => m.id === item.itemId);
        return sum + (menuItem?.price || 0) * item.quantity;
      }, 0);
    }, 0);

    return {
      totalBookings: bookings.length,
      todayBookings: todayBookings.length,
      totalRevenue,
      averageGuests: bookings.length ? (bookings.reduce((acc, b) => acc + b.guests, 0) / bookings.length).toFixed(1) : 0
    };
  }, [bookings, menu]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: trendDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return days.map(date => ({
      name: date.split('-').slice(1).join('/'),
      bookings: bookings.filter(b => b.date === date).length,
      revenue: bookings.filter(b => b.date === date).reduce((acc, b) => {
        return acc + b.orderedItems.reduce((sum, item) => {
          const menuItem = menu.find(m => m.id === item.itemId);
          return sum + (menuItem?.price || 0) * item.quantity;
        }, 0);
      }, 0)
    }));
  }, [bookings, menu, trendDays]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const sections = [
      { id: 'overview', label: 'Overview Dashboard', tab: 'overview' },
      { id: 'bookings', label: 'Reservations & Bookings', tab: 'bookings' },
      { id: 'waitlist', label: 'Customer Waitlist', tab: 'waitlist' },
      { id: 'menu', label: 'Menu Management', tab: 'menu' },
      { id: 'feedback', label: 'Customer Feedback', tab: 'feedback' },
      { id: 'loyalty', label: 'Loyalty Program', tab: 'loyalty' },
      { id: 'customer-portal', label: 'Customer Portal', tab: 'customer-portal' },
      ...(isAdminOrManager ? [{ id: 'staff', label: 'Staff Management', tab: 'staff' }] : []),
    ];
    return sections.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, isAdminOrManager]);

  const isPast = (date: string, time: string) => {
    if (!date || !time) return false;
    const now = new Date();
    // Ensure time has seconds for better compatibility
    const timeStr = time.length === 5 ? `${time}:00` : time;
    const bookingDate = new Date(`${date}T${timeStr}`);
    if (isNaN(bookingDate.getTime())) return false;
    return bookingDate < now;
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           b.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = b.date === selectedDate;
      return matchesSearch && matchesDate;
    }).sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0));
  }, [bookings, searchQuery, selectedDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           o.id.toLowerCase().includes(searchQuery.toLowerCase());
      const orderDate = parseDate(o.createdAt)?.toISOString()?.split('T')[0] || '';
      const matchesDate = orderDate === selectedOrderDate;
      return matchesSearch && matchesDate;
    }).sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0));
  }, [orders, searchQuery, selectedOrderDate]);

  const filteredWaitlist = useMemo(() => {
    return waitlist.filter(w => {
      const matchesSearch = w.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const entryDate = parseDate(w.createdAt)?.toISOString()?.split('T')[0] || '';
      const matchesDate = entryDate === selectedWaitlistDate;
      return matchesSearch && matchesDate;
    }).sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0));
  }, [waitlist, searchQuery, selectedWaitlistDate]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-[60] w-14 h-14 bg-brand-900 text-white rounded-full shadow-2xl flex items-center justify-center"
      >
        {isSidebarOpen ? <XCircle className="w-6 h-6" /> : <LayoutDashboard className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-brand-900 border-r border-white/5 flex flex-col p-6 text-white transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
            <Utensils className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight font-serif">Tampa Taste</h1>
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Staff Portal</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
            { id: 'bookings', icon: CalendarIcon, label: 'Reservations' },
            { id: 'orders', icon: ShoppingBag, label: 'Food Orders' },
            { id: 'waitlist', icon: ListOrdered, label: 'Waitlist' },
            { id: 'menu', icon: Utensils, label: 'Menu Manager' },
            { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
            { id: 'loyalty', icon: Star, label: 'Loyalty Program' },
            { id: 'customer-portal', icon: Globe, label: 'Customer Portal' },
            ...(isAdminOrManager ? [{ id: 'staff', icon: Users, label: 'Staff Management' }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium",
                activeTab === item.id 
                  ? "bg-white text-brand-900 shadow-xl" 
                  : "text-white/60 hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
              {currentEmployee?.firstName?.charAt(0) || profile?.firstName?.charAt(0) || profile?.email?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="text-xs">
              <p className="font-bold truncate max-w-[120px]">
                {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.displayName || profile?.email?.split('@')[0] || 'Staff')}
              </p>
              <p className="text-white/40 text-[10px] font-mono">ID: {profile?.employeeCode || 'N/A'}</p>
              <p className="text-white/40 truncate max-w-[120px] text-[10px]">{currentEmployee?.roles?.join(', ') || profile?.roles?.join(', ') || 'Employee'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight capitalize text-brand-900 font-serif">{activeTab}</h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Welcome back{activeTab === 'overview' && profile?.firstName ? `, ${profile.firstName} ${profile.lastName}` : ''}! Here's what's happening today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search sections..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-64"
              />
              
              <AnimatePresence>
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] overflow-hidden"
                  >
                    {searchSuggestions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setActiveTab(s.tab as any);
                          setSearchQuery('');
                          setShowSearchSuggestions(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                          <Search className="w-4 h-4 text-brand-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{s.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all self-end sm:self-auto">
              <Filter className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'customer-portal' && (
            <motion.div
              key="customer-portal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full -m-4 sm:-m-6 lg:-m-8 bg-white overflow-hidden rounded-none lg:rounded-[2.5rem] shadow-2xl border border-black/5 relative"
            >
              <button 
                onClick={() => window.open(`${window.location.origin}${window.location.pathname}?view=customer-portal`, '_blank')}
                className="absolute top-6 right-6 z-10 p-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg hover:bg-white transition-all flex items-center gap-2 text-sm font-bold text-brand-900"
              >
                <Globe className="w-4 h-4" />
                Open in New Tab
              </button>
              <div className="h-full overflow-y-auto custom-scrollbar">
                <CustomerWebsite 
                  menu={menu} 
                  onBookingComplete={onAddBooking || (() => {})} 
                  isAdmin={isAdmin}
                  user={user}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { label: 'Total Bookings', value: stats.totalBookings, icon: CalendarIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Today\'s Guests', value: stats.todayBookings, icon: Users, color: 'text-orange-500', bg: 'bg-orange-50' },
                  { label: 'Avg Party Size', value: stats.averageGuests, icon: Utensils, color: 'text-purple-500', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold font-mono text-brand-900">{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-lg">Revenue & Bookings Trend</h3>
                    <select 
                      value={trendDays}
                      onChange={(e) => setTrendDays(parseInt(e.target.value))}
                      className="text-xs font-bold bg-black/5 border-none rounded-lg p-2 focus:ring-0 cursor-pointer"
                    >
                      <option value={7}>Last 7 Days</option>
                      <option value={30}>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000005" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#00000040', fontWeight: 600 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#00000040', fontWeight: 600 }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#000" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorRev)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="font-bold text-lg mb-8">Popular Times</h3>
                  <div className="space-y-6">
                    {['18:00', '19:00', '20:00', '21:00'].map((time, i) => (
                      <div key={time} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-black/40">{time}</span>
                          <span>{Math.floor(Math.random() * 40 + 60)}%</span>
                        </div>
                        <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.floor(Math.random() * 40 + 60)}%` }}
                            className="h-full bg-black"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-black/5 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Recent Reservations</h3>
                  <button onClick={() => setActiveTab('bookings')} className="text-xs font-bold text-black/40 hover:text-black transition-all flex items-center gap-1">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/[0.02] text-[10px] font-bold uppercase tracking-widest text-black/40">
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Date & Time</th>
                        <th className="px-6 py-4">Guests</th>
                        <th className="px-6 py-4">Table</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {bookings.slice(0, 5).map((booking) => (
                        <tr key={booking.id} className="hover:bg-black/[0.01] transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-xs">
                                {booking.customerName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{booking.customerName}</p>
                                <p className="text-[10px] text-black/40">{booking.customerEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <CalendarIcon className="w-3 h-3 text-black/40" />
                              {booking.date}
                              <Clock className="w-3 h-3 text-black/40 ml-2" />
                              {booking.time}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold">{booking.guests}</td>
                          <td className="px-6 py-4 text-xs font-bold">T-{booking.tableNumber}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                              booking.status === 'Confirmed' ? "bg-blue-50 text-blue-600" :
                              booking.status === 'Completed' ? "bg-emerald-50 text-emerald-600" :
                              "bg-red-50 text-red-600"
                            )}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              {canManageBookings && (
                                <>
                                  {booking.status === 'Confirmed' && (
                                    <button 
                                      onClick={() => onUpdateBooking({ ...booking, status: 'Fulfilled' })}
                                      className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                                      title="Mark as Fulfilled"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {!isPast(booking.date, booking.time) && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setEditingBooking(booking);
                                          setShowBookingForm(true);
                                        }}
                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                                        title="Update Booking"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setShowDeleteConfirm(booking.id)}
                                        className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                                        title="Cancel Booking"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">Food Orders</h3>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-black/40" />
                  <input 
                    type="date" 
                    value={selectedOrderDate}
                    onChange={(e) => setSelectedOrderDate(e.target.value)}
                    className="text-xs font-bold bg-black/5 border-none rounded-lg px-3 py-2 focus:ring-0"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/[0.02] text-[10px] font-bold uppercase tracking-widest text-black/40">
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Items</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Payment</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-black/[0.01] transition-all">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-brand-900">#{order.id.slice(-6).toUpperCase()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold">{order.customerName}</p>
                            <p className="text-[10px] text-black/40">{order.phoneNumber}</p>
                            <p className="text-[10px] text-black/40 truncate max-w-[150px]">{order.address}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {order.items.map((item, idx) => {
                              const menuItem = menu.find(m => m.id === item.itemId);
                              return (
                                <p key={idx} className="text-[10px] font-medium">
                                  {item.quantity}x {menuItem?.name || 'Unknown Item'}
                                </p>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-black/60">
                            {order.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            order.status === 'Pending' ? "bg-orange-50 text-orange-600" :
                            order.status === 'Preparing' ? "bg-blue-50 text-blue-600" :
                            order.status === 'Delivered' ? "bg-emerald-50 text-emerald-600" :
                            order.status === 'Fulfilled' ? "bg-emerald-100 text-emerald-700" :
                            "bg-red-50 text-red-600"
                          )} style={order.status === 'Cancelled' ? { color: 'red' } : {}}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {order.status !== 'Cancelled' && order.status !== 'Fulfilled' && (
                              <>
                                {parseDate(order.createdAt)?.toDateString() === new Date().toDateString() ? (
                                  <>
                                    {order.status === 'Pending' && (
                                      <button 
                                        onClick={() => onUpdateOrder({ ...order, status: 'Preparing' })}
                                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all"
                                      >
                                        Prepare
                                      </button>
                                    )}
                                    {order.status === 'Preparing' && (
                                      <button 
                                        onClick={() => onUpdateOrder({ ...order, status: 'Delivered' })}
                                        className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all"
                                      >
                                        Deliver
                                      </button>
                                    )}
                                    {order.status === 'Delivered' && (
                                      <button 
                                        onClick={() => onUpdateOrder({ ...order, status: 'Fulfilled' })}
                                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-200 transition-all"
                                      >
                                        Fulfilled
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => onUpdateOrder({ ...order, status: 'Fulfilled' })}
                                    className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-200 transition-all"
                                  >
                                    Fulfilled
                                  </button>
                                )}
                                <button 
                                  onClick={() => setShowOrderDeleteConfirm(order.id)}
                                  className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                                  title="Cancel Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No orders found for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">All Reservations</h3>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-black/40" />
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-xs font-bold bg-black/5 border-none rounded-lg px-3 py-2 focus:ring-0"
                    />
                  </div>
                  {canManageBookings && (
                    <button 
                      onClick={() => {
                        setEditingBooking(null);
                        setShowBookingForm(true);
                      }}
                      className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> New Booking
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/[0.02] text-[10px] font-bold uppercase tracking-widest text-black/40">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Guests</th>
                      <th className="px-6 py-4">Table</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-black/[0.01] transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-mono font-bold text-brand-900">{booking.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-xs">
                              {booking.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{booking.customerName}</p>
                              <p className="text-[10px] text-black/40">{booking.customerEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">{booking.date} at {booking.time}</td>
                        <td className="px-6 py-4 text-xs font-bold">{booking.guests}</td>
                        <td className="px-6 py-4 text-xs font-bold">T-{booking.tableNumber}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            booking.status === 'Confirmed' ? "bg-blue-50 text-blue-600" :
                            booking.status === 'Completed' ? "bg-emerald-50 text-emerald-600" :
                            booking.status === 'Fulfilled' ? "bg-emerald-100 text-emerald-700" :
                            "bg-red-50 text-red-600"
                          )} style={booking.status === 'Cancelled' ? { color: 'red' } : {}}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canManageBookings && booking.status !== 'Cancelled' && booking.status !== 'Fulfilled' && (
                              <>
                                {booking.status === 'Confirmed' && (
                                  <button 
                                    onClick={() => onUpdateBooking({ ...booking, status: isPast(booking.date, booking.time) ? 'Fulfilled' : 'Completed' })}
                                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                                    title={isPast(booking.date, booking.time) ? "Mark as Fulfilled" : "Mark as Completed"}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {!isPast(booking.date, booking.time) && (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setEditingBooking(booking);
                                        setShowBookingForm(true);
                                      }}
                                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                                      title="Update Booking"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => onCancelBooking(booking.id)}
                                      className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                                      title="Cancel Booking"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No reservations found for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Menu Management</h3>
                {isAdminOrManager && (
                  <button 
                    onClick={() => {
                      setEditingMenuItem(null);
                      setNewMenuItem({
                        name: '',
                        description: '',
                        price: '',
                        category: 'Main',
                        image: '',
                        available: true
                      });
                      setShowMenuForm(true);
                    }}
                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Menu Item
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {menu.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex gap-6 items-center relative group">
                    <img src={item.image} alt={item.name} className="w-24 h-24 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold">{item.name}</h4>
                        <span className="font-mono text-sm font-bold">{formatCurrency(item.price)}</span>
                      </div>
                      <p className="text-xs text-black/40 mb-4 line-clamp-2">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                          item.available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        )}>
                          {item.available ? 'Available' : 'Sold Out'}
                        </span>
                        <div className="flex gap-2">
                          {isAdminOrManager && (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingMenuItem(item);
                                  setNewMenuItem({
                                    name: item.name || '',
                                    description: item.description || '',
                                    price: (item.price || 0).toString(),
                                    category: item.category || 'Main',
                                    image: item.image || '',
                                    available: item.available ?? true
                                  });
                                  setShowMenuForm(true);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this menu item?')) {
                                    onDeleteMenuItem(item.id);
                                  }
                                }}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => onToggleAvailability(item.id)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                              item.available ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            )}
                          >
                            {item.available ? 'Mark Sold Out' : 'Mark Available'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'waitlist' && (
            <motion.div
              key="waitlist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">Digital Waitlist</h3>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-black/40" />
                    <input 
                      type="date" 
                      value={selectedWaitlistDate}
                      onChange={(e) => setSelectedWaitlistDate(e.target.value)}
                      className="text-xs font-bold bg-black/5 border-none rounded-lg px-3 py-2 focus:ring-0"
                    />
                  </div>
                  <span className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-black/40">
                    {filteredWaitlist.filter(w => w.status === 'Waiting').length} Waiting
                  </span>
                  {canManageWaitlist && (
                    <button
                      onClick={() => setShowWaitlistForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/20"
                    >
                      <Plus className="w-4 h-4" /> Add Entry
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/[0.02] text-[10px] font-bold uppercase tracking-widest text-black/40">
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Party Size</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Wait Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredWaitlist.map((entry) => (
                      <tr key={entry.id} className="hover:bg-black/[0.01] transition-all">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">{entry.customerName}</p>
                          <p className="text-[10px] text-black/40">Joined {parseDate(entry.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold">{entry.partySize} Guests</td>
                        <td className="px-6 py-4 text-xs font-medium">{entry.phoneNumber || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs font-bold">{entry.estimatedWaitTime} mins</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            entry.status === 'Waiting' ? "bg-orange-50 text-orange-600" :
                            entry.status === 'Notified' ? "bg-blue-50 text-blue-600" :
                            entry.status === 'Seated' ? "bg-emerald-50 text-emerald-600" :
                            "bg-red-50 text-red-600"
                          )}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canManageWaitlist && entry.status !== 'Cancelled' && (
                              <>
                                {entry.status === 'Waiting' && (
                                  <button
                                    onClick={() => onUpdateWaitlist({ ...entry, status: 'Notified' })}
                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all"
                                  >
                                    Notify
                                  </button>
                                )}
                                {(entry.status === 'Waiting' || entry.status === 'Notified') && (
                                  <button
                                    onClick={() => onUpdateWaitlist({ ...entry, status: 'Seated' })}
                                    className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
                                  >
                                    Seat
                                  </button>
                                )}
                                <button
                                  onClick={() => onUpdateWaitlist({ ...entry, status: 'Cancelled' })}
                                  className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                                  title="Cancel Entry"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredWaitlist.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                          No waitlist entries for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm text-center">
                  <p className="text-black/40 text-xs font-bold uppercase tracking-widest mb-2">Average Rating</p>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-4xl font-bold">
                      {(feedback.reduce((acc, f) => acc + f.rating, 0) / (feedback.length || 1)).toFixed(1)}
                    </h3>
                    <Star className="w-8 h-8 fill-black text-black" />
                  </div>
                  <p className="text-xs text-black/40 font-medium">Based on {feedback.length} reviews</p>
                </div>
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">Rating Distribution</h3>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = feedback.filter(f => f.rating === star).length;
                      const percentage = (count / (feedback.length || 1)) * 100;
                      return (
                        <div key={star} className="flex items-center gap-4">
                          <span className="text-xs font-bold w-4">{star}</span>
                          <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="h-full bg-black"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-black/40 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-black/5">
                  <h3 className="font-bold text-lg">Customer Reviews</h3>
                </div>
                <div className="divide-y divide-black/5">
                  {feedback.map((f) => (
                    <div key={f.id} className="p-6 hover:bg-black/[0.01] transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-bold">
                            {f.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{f.customerName}</p>
                            <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold">
                              {parseDate(f.createdAt)?.toLocaleDateString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-4 h-4",
                                i < f.rating ? "fill-black text-black" : "text-black/10"
                              )} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-black/60 leading-relaxed">{f.comment || 'No comment provided.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'loyalty' && (
            <motion.div
              key="loyalty"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-black/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Loyalty Transactions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-black/[0.02] text-[10px] font-bold uppercase tracking-widest text-black/40">
                          <th className="px-6 py-4">Customer UID</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {loyaltyTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-black/[0.01] transition-all">
                            <td className="px-6 py-4 text-xs font-mono">{tx.uid.slice(0, 8)}...</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                                tx.type === 'Earned' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                              )}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold">
                              {tx.type === 'Earned' ? '+' : '-'}{tx.amount} pts
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">{tx.description}</td>
                            <td className="px-6 py-4 text-xs text-slate-400">
                              {parseDate(tx.createdAt)?.toLocaleString() || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <h3 className="font-bold text-lg mb-6">Loyalty Overview</h3>
                  <div className="space-y-6">
                    <div className="p-6 bg-brand-50 rounded-2xl border border-brand-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-1">Total Points Issued</p>
                      <h4 className="text-3xl font-bold text-brand-900 font-mono">
                        {loyaltyTransactions.filter(t => t.type === 'Earned').reduce((acc, t) => acc + t.amount, 0)}
                      </h4>
                    </div>
                    <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1">Total Points Redeemed</p>
                      <h4 className="text-3xl font-bold text-orange-900 font-mono">
                        {loyaltyTransactions.filter(t => t.type === 'Redeemed').reduce((acc, t) => acc + t.amount, 0)}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && isAdminOrManager && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-black/5 flex justify-between items-center">
                  <h3 className="font-bold text-lg">Staff Directory</h3>
                  <button 
                    onClick={() => handleOpenEmployeeForm()}
                    className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Employee
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-black/[0.02] text-[10px] font-bold uppercase tracking-widest text-black/40">
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">First Name</th>
                        <th className="px-6 py-4">Last Name</th>
                        <th className="px-6 py-4">Code</th>
                        <th className="px-6 py-4">Designation</th>
                        <th className="px-6 py-4">Roles</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Created By</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-black/[0.01] transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-xs">
                                {emp.firstName?.charAt(0) || emp.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{emp.name}</p>
                                <p className="text-[10px] text-black/40">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium">{emp.firstName}</td>
                          <td className="px-6 py-4 text-xs font-medium">{emp.lastName}</td>
                          <td className="px-6 py-4 text-xs font-mono font-bold">{emp.employeeCode}</td>
                          <td className="px-6 py-4 text-xs font-medium">{emp.designation}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {emp.roles.map(role => (
                                <span key={role} className="text-[8px] font-bold px-1.5 py-0.5 bg-black/5 rounded-full uppercase tracking-tighter">
                                  {role}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter",
                              emp.active !== false ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {emp.active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-black/40">#{emp.createdBy || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">
                            {(() => {
                              const isTargetSuperAdmin = emp.roles.includes('Super Admin') || emp.employeeCode === '1111';
                              const canEdit = isSuperAdmin || (isAdmin && !isTargetSuperAdmin);
                              
                              if (!canEdit) return null;
                              if (profile?.roles?.some(r => ['Manager', 'Accountant'].includes(r)) && emp.employeeCode === profile.employeeCode && !isSuperAdmin) return null;

                              return (
                                <button 
                                  onClick={() => handleOpenEmployeeForm(emp)}
                                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Modals */}
        <AnimatePresence>
          {showDeleteConfirm && (
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
                <h2 className="text-2xl font-bold mb-2 font-serif text-brand-900">Cancel Booking?</h2>
                <p className="text-slate-400 mb-8">Are you sure you want to cancel this reservation? The status will be updated to "Cancelled".</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Keep Booking
                  </button>
                  <button 
                    onClick={() => {
                      onCancelBooking(showDeleteConfirm);
                      setShowDeleteConfirm(null);
                    }}
                    className="flex-1 p-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOrderDeleteConfirm && (
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
                <h2 className="text-2xl font-bold mb-2 font-serif text-brand-900">Cancel Order?</h2>
                <p className="text-slate-400 mb-8">Are you sure you want to cancel this order? The status will be updated to "Cancelled".</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowOrderDeleteConfirm(null)}
                    className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Keep Order
                  </button>
                  <button 
                    onClick={() => {
                      onCancelOrder(showOrderDeleteConfirm);
                      setShowOrderDeleteConfirm(null);
                    }}
                    className="flex-1 p-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showWaitlistForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowWaitlistForm(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-black/5 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="text-2xl font-bold text-brand-900 font-serif">Add to Waitlist</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">New Customer Entry</p>
                  </div>
                  <button 
                    onClick={() => setShowWaitlistForm(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-2 block">Customer Name</label>
                    <input
                      type="text"
                      value={newWaitlistEntry.customerName}
                      onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, customerName: e.target.value })}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 font-medium"
                      placeholder="Enter name"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-2 block">Party Size</label>
                    <div className="flex items-center bg-slate-50 rounded-2xl p-1 border border-slate-100">
                      <button
                        onClick={() => setNewWaitlistEntry({ ...newWaitlistEntry, partySize: Math.max(1, newWaitlistEntry.partySize - 1) })}
                        className="w-12 h-12 flex items-center justify-center text-xl font-bold hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center font-bold text-lg flex items-center justify-center gap-2">
                        <Users className="w-5 h-5 text-brand-400" />
                        {newWaitlistEntry.partySize}
                      </div>
                      <button
                        onClick={() => setNewWaitlistEntry({ ...newWaitlistEntry, partySize: Math.min(20, newWaitlistEntry.partySize + 1) })}
                        className="w-12 h-12 flex items-center justify-center text-xl font-bold hover:bg-white hover:shadow-sm rounded-xl transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-brand-600 mb-2 block">Phone Number</label>
                    <input
                      type="tel"
                      value={newWaitlistEntry.phoneNumber}
                      onChange={(e) => setNewWaitlistEntry({ ...newWaitlistEntry, phoneNumber: e.target.value })}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-brand-500 font-medium"
                      placeholder="(555) 000-0000"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!newWaitlistEntry.customerName) return;
                      setFormLoading(true);
                      const entryId = Math.random().toString(36).substr(2, 9);
                      const entryData = {
                        id: entryId,
                        customerName: newWaitlistEntry.customerName,
                        partySize: newWaitlistEntry.partySize,
                        phoneNumber: newWaitlistEntry.phoneNumber,
                        status: 'Waiting',
                        estimatedWaitTime: 15,
                        createdAt: Timestamp.now()
                      };
                      try {
                        await setDoc(doc(db, 'waitlist', entryId), entryData);
                        setShowWaitlistForm(false);
                        setNewWaitlistEntry({ customerName: '', partySize: 2, phoneNumber: '' });
                      } catch (error) {
                        handleFirestoreError(error, OperationType.CREATE, `waitlist/${entryId}`);
                      } finally {
                        setFormLoading(false);
                      }
                    }}
                    disabled={formLoading || !newWaitlistEntry.customerName}
                    className="w-full p-5 bg-brand-900 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-brand-800 transition-all disabled:opacity-50 shadow-xl shadow-brand-900/20"
                  >
                    {formLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Add to Waitlist'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEmployeeForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={handleCloseEmployeeForm}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-6 font-serif">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>

                <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Address</label>
                    <input
                      type="text"
                      value={newEmployee.address}
                      onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Designation</label>
                    <input
                      type="text"
                      required
                      value={newEmployee.designation}
                      onChange={(e) => setNewEmployee({...newEmployee, designation: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {['Super Admin', 'Admin', 'Manager', 'Chef', 'Waiter', 'Accountant'].map(role => {
                        const isSuperAdminRole = role === 'Super Admin';
                        const isAdminRole = role === 'Admin';
                        
                        // Disable Super Admin option if not Super Admin
                        const isDisabled = isSuperAdminRole && !isSuperAdmin;
                        
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              let roles = [...newEmployee.roles];
                              if (roles.includes(role as UserRole)) {
                                roles = roles.filter(r => r !== role);
                              } else {
                                // Mutually exclusive check
                                if (isSuperAdminRole) {
                                  roles = roles.filter(r => r !== 'Admin');
                                } else if (isAdminRole) {
                                  roles = roles.filter(r => r !== 'Super Admin');
                                }
                                roles.push(role as UserRole);
                              }
                              setNewEmployee({...newEmployee, roles});
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                              newEmployee.roles.includes(role as UserRole)
                                ? "bg-black text-white"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200",
                              isDisabled && "opacity-30 cursor-not-allowed"
                            )}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {(editingEmployee || newEmployee.roles.some(r => ['Super Admin', 'Admin'].includes(r))) && (
                    <div className="md:col-span-2">
                      <label className={cn(
                        "block text-[10px] font-bold uppercase tracking-widest mb-2 transition-colors",
                        adminCode === '9999' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {adminCode === '9999' ? 'Security Code Verified' : 'Security Code Required'}
                      </label>
                      <input
                        type="password"
                        required
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="Enter 4-digit code"
                        className={cn(
                          "w-full p-4 rounded-xl border-2 transition-all font-mono",
                          adminCode === '9999' 
                            ? "bg-emerald-50 border-emerald-200 focus:ring-emerald-500 text-emerald-900" 
                            : "bg-red-50 border-red-100 focus:ring-red-500"
                        )}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Account Status</label>
                    <button
                      type="button"
                      onClick={() => setNewEmployee({...newEmployee, active: !newEmployee.active})}
                      className={cn(
                        "w-full p-4 rounded-xl font-bold flex items-center justify-between transition-all border-2",
                        newEmployee.active 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                          : "bg-red-50 border-red-100 text-red-600"
                      )}
                    >
                      <span className="text-xs uppercase tracking-widest">
                        {newEmployee.active ? 'Active Account' : 'Inactive Account'}
                      </span>
                      <div className={cn(
                        "w-10 h-5 rounded-full p-1 transition-all",
                        newEmployee.active ? "bg-emerald-500" : "bg-red-500"
                      )}>
                        <div className={cn(
                          "w-3 h-3 bg-white rounded-full transition-all transform",
                          newEmployee.active ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  </div>
                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={
                        formLoading || 
                        newEmployee.roles.length === 0 || 
                        (editingEmployee 
                          ? adminCode !== '9999' 
                          : (newEmployee.roles.some(r => ['Admin', 'Super Admin'].includes(r)) && adminCode !== '9999'))
                      }
                      className="w-full p-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>{editingEmployee ? 'Update Employee' : 'Create Employee'} <ChevronRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBookingForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowBookingForm(false);
                  setEditingBooking(null);
                }
              }}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={() => {
                    setShowBookingForm(false);
                    setEditingBooking(null);
                  }}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 z-[110]"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <BookingForm 
                  initialData={editingBooking || undefined}
                  isEditing={!!editingBooking}
                  onBookingComplete={handleBookingComplete}
                  onCancel={handleBookingCancel}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMenuForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <button 
                  onClick={() => setShowMenuForm(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-6 font-serif">{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>

                <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Item Name</label>
                    <input
                      type="text"
                      required
                      value={newMenuItem.name}
                      onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newMenuItem.description}
                      onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem({...newMenuItem, price: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Category</label>
                    <select
                      value={newMenuItem.category}
                      onChange={(e) => setNewMenuItem({...newMenuItem, category: e.target.value as any})}
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    >
                      <option value="Appetizer">Appetizer</option>
                      <option value="Main">Main</option>
                      <option value="Dessert">Dessert</option>
                      <option value="Drink">Drink</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Image URL</label>
                    <input
                      type="url"
                      value={newMenuItem.image}
                      onChange={(e) => setNewMenuItem({...newMenuItem, image: e.target.value})}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>{editingMenuItem ? 'Update Item' : 'Add Item'} <ChevronRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
