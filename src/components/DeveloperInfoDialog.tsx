import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, parseDate, validateEmail, validateNoNumerics, formatPhoneNumber } from '../utils';
import { exportInstructionsToPDF } from '../lib/exportUtils';
import { 
  X, 
  Utensils, 
  ShieldCheck, 
  Users, 
  Calendar, 
  ShoppingBag, 
  Star, 
  Globe,
  Info,
  ChevronRight,
  CheckCircle2,
  Key,
  ListOrdered,
  Smartphone,
  LayoutDashboard,
  Zap,
  MessageSquare,
  CreditCard,
  Clock,
  Download,
  Loader2
} from 'lucide-react';

interface DeveloperInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeveloperInfoDialog({ isOpen, onClose }: DeveloperInfoDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    try {
      const sections = [
        {
          title: 'A Production-Grade Hospitality Ecosystem',
          content: [
            'This CRM is more than a demo—it\'s a fully integrated platform designed to handle the complexities of modern restaurant management.',
            'Key features include real-time table orchestration, automated loyalty loops, and granular staff management.',
            'System metrics: ~140ms Sync Latency, 99.99% Uptime, RBAC Security, PWA Ready.'
          ]
        },
        {
          title: 'Quick Login Codes',
          content: [
            'Super Admin: 1111 (Full Control)',
            'Admin: 4444 (Staff Management)',
            'Manager: 2222 (Operations)',
            'Waiter: 3333 (Service)'
          ]
        },
        {
          title: 'Role Permissions Matrix',
          content: [
            'Super Admin (1111): Full Control. Manage all staff & roles, full system configuration, financial & performance reports.',
            'Admin (4444): Staff Management. Manage other staff & roles, view all operational reports, manage menu items & pricing.',
            'Manager (2222): Operations. Manage daily reservations, handle order workflows, update menu availability.',
            'Waiter (3333): Service. View live reservations, update order status, view menu details.'
          ]
        },
        {
          title: 'Customer Experience Workflows',
          content: [
            'Smart Reservations: Booking engine with dynamic table availability.',
            'Dynamic Waitlist: Automated waitlist when tables are full.',
            'Loyalty Loop: Points accrual (1:10 ratio) and redemption logic.'
          ]
        },
        {
          title: 'Staff Operations Workflows',
          content: [
            'Order Orchestration: Real-time order status updates.',
            'Menu Agility: Instant menu availability toggling.',
            'Staff Directory: Role-based access control and employee management.'
          ]
        },
        {
          title: 'Step-by-Step Testing Guide',
          content: [
            '1. Customer Journey: Book a table, log in to see loyalty points, place an order.',
            '2. Staff Operations: Log in as Manager (2222), mark orders as delivered, check reservations.',
            '3. Advanced Features: Trigger waitlist by booking all tables, redeem points at checkout.'
          ]
        },
        {
          title: 'Technical Highlights',
          content: [
            'Built with React 18, Firestore, Tailwind CSS, and Motion.',
            'Atomic Transactions: Ensures data integrity during high-concurrency events.',
            'Multi-device Sync: State is synchronized across all active sessions instantly.',
            'Sentiment Analysis: Customer feedback is processed for operational insights.'
          ]
        }
      ];

      exportInstructionsToPDF('CRM Experience Guide', sections, 'Tampa_Taste_CRM_Guide');
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-950/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-7xl h-full max-h-[95vh] bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header Controls */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 z-[110]">
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="h-10 md:h-14 px-4 md:px-8 bg-white/80 backdrop-blur-md md:bg-brand-900 text-brand-900 md:text-white rounded-2xl md:rounded-full flex items-center justify-center gap-2 transition-all group shadow-lg md:shadow-brand-900/20 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-xs md:text-sm font-bold">
                  {isDownloading ? 'Downloading...' : 'PDF Guide'}
                </span>
              </button>

              <button 
                onClick={onClose}
                className="w-10 h-10 md:w-14 md:h-14 bg-white/80 backdrop-blur-md md:bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all group shadow-lg md:shadow-none"
              >
                <X className="w-5 h-5 md:w-7 md:h-7 text-slate-600 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Middle Section: Sidebar + Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Sidebar - Navigation/Context */}
              <div className="w-full md:w-96 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-6 md:p-12 flex flex-col shrink-0 overflow-y-auto max-h-[30vh] md:max-h-none">
                <div className="mb-12">
                  <div className="w-14 h-14 bg-brand-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-900/20 mb-6">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-slate-900 leading-tight">CRM Experience Guide</h2>
                  <p className="text-sm text-slate-500 mt-2">Version 2.0 • Production Ready</p>
                </div>

                <nav className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Access</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-600 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                          <Users className="w-4 h-4 text-brand-900" />
                        </div>
                        <span>Staff Portal</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-600 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                          <Utensils className="w-4 h-4 text-brand-900" />
                        </div>
                        <span>Customer Site</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 bg-brand-900 rounded-3xl text-white shadow-xl shadow-brand-900/20">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <Zap className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold mb-2">Pro Tip</h5>
                      <p className="text-xs text-brand-100 leading-relaxed">Use the <span className="font-bold text-white">Manager (2222)</span> role for the most comprehensive testing experience.</p>
                    </div>
                  </div>
                </nav>

                <div className="mt-auto pt-8 border-t border-slate-200">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    This guide is designed to help you navigate the full-stack CRM and Customer Experience.
                  </p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-16 lg:p-24">
                <div className="max-w-5xl space-y-16 md:space-y-24">
                {/* Introduction & Quick Stats */}
                <div className="space-y-8">
                  <h3 className="text-4xl font-bold text-slate-900 font-serif leading-tight">
                    A Production-Grade Hospitality Ecosystem
                  </h3>
                  <p className="text-xl text-slate-600 leading-relaxed font-light">
                    This CRM is more than a demo—it's a fully integrated platform designed to handle the complexities of modern restaurant management. From <span className="text-brand-600 font-medium underline decoration-brand-200 underline-offset-4">real-time table orchestration</span> to <span className="text-brand-600 font-medium underline decoration-brand-200 underline-offset-4">automated loyalty loops</span>, every feature is built for scale and reliability.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-slate-100">
                    {[
                      { label: 'Sync Latency', value: '~140ms', icon: Zap },
                      { label: 'Uptime', value: '99.99%', icon: Clock },
                      { label: 'Security', value: 'RBAC', icon: ShieldCheck },
                      { label: 'Mobile', value: 'PWA Ready', icon: Smartphone },
                    ].map((stat) => (
                      <div key={stat.label} className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <stat.icon className="w-3 h-3" />
                          {stat.label}
                        </div>
                        <div className="text-lg font-bold text-slate-900">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Access Grid */}
                <section>
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-px flex-1 bg-slate-100" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Quick Login Codes</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                      { role: 'Super Admin', code: '1111', desc: 'Full Control', icon: ShieldCheck, color: 'bg-slate-900', text: 'text-white' },
                      { role: 'Admin', code: '4444', desc: 'Staff Management', icon: ShieldCheck, color: 'bg-white', text: 'text-slate-900' },
                      { role: 'Manager', code: '2222', desc: 'Operations', icon: Users, color: 'bg-white', text: 'text-slate-900' },
                      { role: 'Waiter', code: '3333', desc: 'Service', icon: Utensils, color: 'bg-white', text: 'text-slate-900' },
                    ].map((login) => (
                      <div key={login.role} className="group cursor-default">
                        <div className={cn(
                          "p-6 sm:p-8 rounded-2xl border transition-all duration-500",
                          login.color === 'bg-slate-900' 
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105" 
                            : "bg-white border-slate-100 hover:border-brand-200 hover:shadow-xl text-slate-900"
                        )}>
                          <div className="flex items-center justify-between mb-6">
                            <login.icon className={cn("w-5 h-5", login.color === 'bg-slate-900' ? "text-brand-400" : "text-slate-300")} />
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          </div>
                          <div className="text-4xl sm:text-5xl font-bold mb-1 font-mono tracking-tight">{login.code}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{login.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Role Permissions Matrix */}
                <section>
                  <div className="flex items-center gap-4 mb-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Role Permissions Matrix</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      {
                        role: 'Super Admin',
                        code: '1111',
                        can: ['Manage all staff & roles', 'Full system configuration', 'Financial & performance reports', 'Complete menu & inventory control', 'Override any reservation'],
                        cannot: ['None - Root access'],
                        color: 'bg-slate-900',
                        badge: 'text-brand-400'
                      },
                      {
                        role: 'Admin',
                        code: '4444',
                        can: ['Manage other staff & roles', 'View all operational reports', 'Manage menu items & pricing', 'Orchestrate reservations', 'Process customer orders'],
                        cannot: ['Modify Super Admin or Admin accounts', 'Change system security rules'],
                        color: 'bg-brand-50',
                        badge: 'text-brand-600'
                      },
                      {
                        role: 'Manager',
                        code: '2222',
                        can: ['Manage daily reservations', 'Handle order workflows', 'Update menu availability', 'View staff directory'],
                        cannot: ['Access financial reports', 'Add/Remove staff members', 'Modify system settings'],
                        color: 'bg-slate-50',
                        badge: 'text-slate-600'
                      },
                      {
                        role: 'Waiter',
                        code: '3333',
                        can: ['View live reservations', 'Update order status (Preparing/Delivered)', 'View menu details'],
                        cannot: ['Delete any records', 'Modify menu pricing', 'Access reports', 'Manage other staff'],
                        color: 'bg-slate-50',
                        badge: 'text-slate-600'
                      }
                    ].map((item) => (
                      <div key={item.role} className={cn("p-8 rounded-[2rem] border transition-all", item.role === 'Super Admin' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100")}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                          <div className="flex items-center gap-4">
                            <div className={cn("px-6 h-12 rounded-2xl flex items-center justify-center font-mono font-bold text-xl shadow-sm", item.role === 'Super Admin' ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900")}>
                              {item.code}
                            </div>
                            <div>
                              <h4 className={cn("text-xl font-bold", item.role === 'Super Admin' ? "text-white" : "text-slate-900")}>{item.role}</h4>
                              <p className={cn("text-xs uppercase tracking-widest font-bold opacity-50")}>Access Level</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h5 className={cn("text-[10px] font-bold uppercase tracking-widest", item.role === 'Super Admin' ? "text-brand-400" : "text-green-600")}>Capabilities</h5>
                            <ul className="space-y-3">
                              {item.can.map((ability, i) => (
                                <li key={i} className="flex gap-3 items-start text-sm">
                                  <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", item.role === 'Super Admin' ? "text-brand-400" : "text-green-500")} />
                                  <span className={item.role === 'Super Admin' ? "text-slate-300" : "text-slate-600"}>{ability}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-4">
                            <h5 className={cn("text-[10px] font-bold uppercase tracking-widest", item.role === 'Super Admin' ? "text-slate-500" : "text-red-500")}>Restrictions</h5>
                            <ul className="space-y-3">
                              {item.cannot.map((restriction, i) => (
                                <li key={i} className="flex gap-3 items-start text-sm">
                                  <X className={cn("w-4 h-4 shrink-0 mt-0.5", item.role === 'Super Admin' ? "text-slate-600" : "text-red-400")} />
                                  <span className={item.role === 'Super Admin' ? "text-slate-500" : "text-slate-500"}>{restriction}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Deep Dive: Testing Workflows */}
                <section>
                  <div className="flex items-center gap-4 mb-12">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Deep Dive: Testing Workflows</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Customer Side */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                          <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-slate-900">Customer Experience</h4>
                          <p className="text-xs text-slate-400 font-medium">Front-end Interaction</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { 
                            title: 'Smart Reservations', 
                            desc: 'Test the booking engine. Try selecting a date and time—notice how it dynamically fetches table availability and prevents overlaps.',
                            icon: Calendar
                          },
                          { 
                            title: 'Dynamic Waitlist', 
                            desc: 'When all 8 tables are booked for a slot, the system automatically prompts customers to join the real-time waitlist.',
                            icon: ListOrdered
                          },
                          { 
                            title: 'Loyalty Loop', 
                            desc: 'Place an order as a logged-in user. Watch points accrue instantly (1:10 ratio) and test the redemption logic at checkout.',
                            icon: Star
                          }
                        ].map((step, i) => (
                          <div key={i} className="group p-6 bg-white border border-slate-100 rounded-2xl hover:border-brand-200 hover:shadow-md transition-all">
                            <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                                <step.icon className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h5>
                                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Staff Side */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                          <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-slate-900">Staff Operations</h4>
                          <p className="text-xs text-slate-400 font-medium">Back-office Management</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { 
                            title: 'Order Orchestration', 
                            desc: 'Manage live orders. Move them through "Preparing" to "Delivered"—watch the customer portal update in real-time.',
                            icon: ShoppingBag
                          },
                          { 
                            title: 'Menu Agility', 
                            desc: 'Toggle item availability in the dashboard. The change propagates to the customer menu in <200ms.',
                            icon: Utensils
                          },
                          { 
                            title: 'Staff Directory', 
                            desc: 'As Super Admin, add new employees and assign roles. Test the granular permissions for Waiters vs. Managers.',
                            icon: Users
                          }
                        ].map((step, i) => (
                          <div key={i} className="group p-6 bg-white border border-slate-100 rounded-2xl hover:border-brand-200 hover:shadow-md transition-all">
                            <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 transition-colors">
                                <step.icon className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h5>
                                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Step-by-Step Testing Guide */}
                <section>
                  <div className="flex items-center gap-4 mb-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Step-by-Step Testing Guide</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  
                  <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-brand-50 text-brand-900 rounded-2xl flex items-center justify-center font-bold text-xl">1</div>
                        <h4 className="text-lg font-bold text-slate-900">Customer Journey</h4>
                        <ul className="space-y-3 text-xs text-slate-500">
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>Go to <span className="text-slate-900 font-bold">Reservations</span> and book a table for any date.</span>
                          </li>
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>Log in as a customer to see your <span className="text-slate-900 font-bold">Loyalty Points</span>.</span>
                          </li>
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>Place a food order and watch your points increase.</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-brand-50 text-brand-900 rounded-2xl flex items-center justify-center font-bold text-xl">2</div>
                        <h4 className="text-lg font-bold text-slate-900">Staff Operations</h4>
                        <ul className="space-y-3 text-xs text-slate-500">
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>Log in to CRM with code <span className="text-slate-900 font-bold">2222</span> (Manager).</span>
                          </li>
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>Go to <span className="text-slate-900 font-bold">Orders</span> and mark a pending order as "Delivered".</span>
                          </li>
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>Check <span className="text-slate-900 font-bold">Reservations</span> to see real-time table status.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-brand-50 text-brand-900 rounded-2xl flex items-center justify-center font-bold text-xl">3</div>
                        <h4 className="text-lg font-bold text-slate-900">Advanced Features</h4>
                        <ul className="space-y-3 text-xs text-slate-500">
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span><span className="text-slate-900 font-bold">Waitlist:</span> Book all 8 tables for a specific time slot to trigger the waitlist.</span>
                          </li>
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span><span className="text-slate-900 font-bold">Loyalty:</span> Redeem points at checkout for a discount on your next order.</span>
                          </li>
                          <li className="flex gap-2 items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span><span className="text-slate-900 font-bold">Feedback:</span> Submit a review and see it appear in the Staff Dashboard.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Advanced Testing Scenarios */}
                <section>
                  <div className="flex items-center gap-4 mb-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap">Advanced Testing Scenarios</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Zap className="w-4 h-4 text-brand-600" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Conflict Resolution</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Open the <span className="text-slate-900 font-bold">Reservations</span> section in two different browsers. Try to book the <span className="text-slate-900 font-bold">same table</span> at the <span className="text-slate-900 font-bold">same time</span>. Watch how the system's optimistic locking and real-time validation prevent race conditions.
                      </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Smartphone className="w-4 h-4 text-brand-600" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Mobile-First Responsiveness</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Resize your browser to <span className="text-slate-900 font-bold">mobile or tablet dimensions</span>. Notice how the CRM dashboard and customer website adapt their layouts, ensuring a professional experience for both staff on-the-go and customers on their phones.
                      </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Star className="w-4 h-4 text-brand-600" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Loyalty Loop & Rewards</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Log in as a customer, place an order for <span className="text-slate-900 font-bold">$50+</span>. You'll earn 500 points. On your next booking, use the <span className="text-slate-900 font-bold">Loyalty Slider</span> at checkout to redeem those points for a $5 discount.
                      </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <LayoutDashboard className="w-4 h-4 text-brand-600" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">Staff Orchestration</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        As a <span className="text-slate-900 font-bold">Manager (2222)</span>, update an order to "Delivered". Then, log in as the <span className="text-slate-900 font-bold">Customer</span> and check your "Manage Booking" section to see the status update in real-time.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Technical Highlights */}
                <section className="bg-slate-900 rounded-[2.5rem] p-10 sm:p-16 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/5 rounded-full -ml-32 -mb-32 blur-3xl" />
                  
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                      <h3 className="text-3xl sm:text-4xl font-bold font-serif mb-6 leading-tight">Built for the Modern Web</h3>
                      <p className="text-white/60 text-lg font-light leading-relaxed mb-8">
                        Leveraging a cutting-edge stack to deliver a seamless, reactive experience across all devices.
                      </p>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          { label: 'Real-time', value: 'Firestore' },
                          { label: 'Frontend', value: 'React 18' },
                          { label: 'Styling', value: 'Tailwind' },
                          { label: 'Animation', value: 'Motion' }
                        ].map(stat => (
                          <div key={stat.label}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{stat.label}</p>
                            <p className="text-lg font-bold">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-6">
                      {[
                        { icon: ShieldCheck, title: 'Atomic Transactions', desc: 'Ensures data integrity during high-concurrency booking events.' },
                        { icon: Globe, title: 'Multi-device Sync', desc: 'State is synchronized across all active sessions instantly.' },
                        { icon: MessageSquare, title: 'Sentiment Analysis', desc: 'Customer feedback is processed for operational insights.' }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                          <item.icon className="w-5 h-5 text-brand-400 shrink-0" />
                          <div>
                            <h5 className="text-sm font-bold mb-1">{item.title}</h5>
                            <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </div>

          {/* Footer */}
            <div className="p-8 sm:p-12 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                  <Info className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Ready to explore?</p>
                  <p className="text-xs text-slate-500">Launch the demo to begin your tour.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-full sm:w-auto px-16 py-5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
              >
                Launch Experience
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
