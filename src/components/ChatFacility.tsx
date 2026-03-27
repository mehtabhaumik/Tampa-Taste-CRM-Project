import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, Bot } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export const ChatFacility: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTime = () => {
      // Chat is now available 24/7 for better customer support
      setIsChatOpen(true);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Show welcome animation after a short delay
    const timer = setTimeout(() => {
      if (isChatOpen) {
        setShowWelcome(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isChatOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getBotResponse = (input: string): string => {
    const text = input.toLowerCase();
    
    if (text.includes('menu') || text.includes('food') || text.includes('eat') || text.includes('dish')) {
      return "You can explore our full menu on the landing page! We offer a variety of elevated dishes, from Everglades Gator Bites to our signature Gasparilla Rum Punch.";
    }
    if (text.includes('book') || text.includes('reserve') || text.includes('reservation') || text.includes('table')) {
      return "To book a table, simply click the 'Book a Table' button on our home screen. You can choose your preferred date, time, and party size.";
    }
    if (text.includes('waitlist') || text.includes('waiting') || text.includes('queue')) {
      return "If we're fully booked, you can join our digital waitlist directly from the landing page. We'll notify you as soon as your table is ready!";
    }
    if (text.includes('hour') || text.includes('open') || text.includes('time') || text.includes('close')) {
      return "We are open daily from 12:00 PM to 10:00 PM. Our chat support is available from 8:00 AM to 11:00 PM.";
    }
    if (text.includes('location') || text.includes('address') || text.includes('where') || text.includes('find')) {
      return "We are located in the heart of Tampa! You can find our exact address and a map in the 'Visit Us' section at the bottom of the page.";
    }
    if (text.includes('contact') || text.includes('phone') || text.includes('call') || text.includes('email')) {
      return "You can reach us at (813) 555-0123 or email us at hello@tampataste.com. We're always happy to help!";
    }
    if (text.includes('staff') || text.includes('job') || text.includes('work') || text.includes('hiring')) {
      return "We're always looking for passionate individuals to join our team! Please send your resume to careers@tampataste.com.";
    }
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      return "Hello! I'm Sarah from Tampa Taste support. How can I assist you with your dining experience today?";
    }
    if (text.includes('thank')) {
      return "You're very welcome! Is there anything else I can help you with?";
    }
    
    return "I'm not sure I understand that. Would you like to know about our menu, how to book a table, or our opening hours?";
  };

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInputValue('');
    setIsTyping(true);

    // Mock bot response with delay
    setTimeout(() => {
      const botResponse = getBotResponse(userMessage);
      setMessages(prev => [...prev, { 
        text: botResponse, 
        sender: 'bot' 
      }]);
      setIsTyping(false);
    }, 1500);
  };

  if (!isChatOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[110] flex flex-col items-end gap-4">
      {/* Welcome Message Animation */}
      <AnimatePresence>
        {showWelcome && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white text-brand-900 px-4 py-2 rounded-2xl shadow-xl text-sm font-medium mb-2 relative border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {t('chatOpen')}
            </div>
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-slate-100 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="w-[380px] h-[600px] bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden mb-4 border-t-4 border-t-brand-900"
          >
            {/* Header */}
            <div className="bg-white p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-900 shadow-inner overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" 
                    className="w-full h-full object-cover"
                    alt="Sarah"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-brand-900">Sarah</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Customer Support
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-slate-50 p-2 rounded-xl transition-all text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar"
            >
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none max-w-[85%] text-sm shadow-sm text-slate-600 leading-relaxed">
                  {t('chatWelcome')}
                </div>
              </div>

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-brand-900 text-white rounded-tr-none shadow-brand-900/20' 
                      : 'bg-white border border-slate-100 text-slate-600 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-slate-50 flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('typeMessage')}
                className="flex-1 bg-slate-50 px-5 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all border-none"
              />
              <button
                onClick={handleSend}
                className="bg-brand-900 text-white p-3 rounded-2xl hover:bg-brand-800 transition-all shadow-lg shadow-brand-900/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          setShowWelcome(false);
        }}
        className="w-16 h-16 bg-brand-900 text-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex items-center justify-center hover:shadow-brand-900/40 transition-all"
        id="chat-toggle-button"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
      </motion.button>
    </div>
  );
};
