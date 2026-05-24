import React, { useState, useRef, useEffect } from "react";
import { aiApi } from "../lib/api";
import { MessageCircle, X, Send, Bot, User, Film, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', content: string, action?: any }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'ai',
        content: "Hi! I'm your ShowTime AI Assistant 🍿. Ask me to find movies, give recommendations, or help you book tickets!"
      }]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const newHistory: {role: 'user'|'ai', content: string}[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await aiApi.chat(userMessage, messages.map(m => ({ role: m.role, content: m.content })));
      const result = response.data;
      
      if (result.success && result.data) {
        setMessages([...newHistory, { 
          role: 'ai', 
          content: result.data.text,
          action: result.data.action
        }]);
      } else {
        throw new Error(result.message || "Failed to get response");
      }
    } catch (error) {
      setMessages([...newHistory, { 
        role: 'ai', 
        content: "Sorry, I'm having trouble connecting to my database right now. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookingAction = (movie: any) => {
    setIsOpen(false);
    navigate(`/movies/${movie.id}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 sm:w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 rounded-full">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">ShowTime AI</h3>
                  <p className="text-xs text-slate-400">Movie Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                  
                  {/* Action Renderers */}
                  {msg.action && msg.action.type === 'BOOKING_INTENT' && (
                    <div className="mt-2 ml-10 mr-2 max-w-[85%] bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-3">
                      <div className="flex gap-3">
                        {msg.action.data.posterUrl ? (
                          <img src={msg.action.data.posterUrl} alt="Poster" className="w-12 h-16 object-cover rounded-md" />
                        ) : (
                          <div className="w-12 h-16 bg-slate-700 rounded-md flex items-center justify-center">
                            <Film className="w-6 h-6 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">{msg.action.data.title}</p>
                          <p className="text-slate-400 text-xs mt-1">Ready to book tickets?</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleBookingAction(msg.action.data)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Ticket className="w-4 h-4" />
                        Select Seats
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2 max-w-[85%] flex-row items-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="px-4 py-3 bg-slate-800 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900/50">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-full px-4 py-2.5 pr-12 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
