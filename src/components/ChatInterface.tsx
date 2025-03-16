
import React, { useState, useEffect, useRef } from 'react';
import { useDoorbellContext, Message } from '@/contexts/DoorbellContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Clock, ArrowLeft, X } from 'lucide-react';
import { format } from 'date-fns';

const ChatInterface: React.FC = () => {
  const { 
    visitorInfo, 
    messages, 
    lastActivity, 
    sendMessage, 
    resetDoorbell 
  } = useDoorbellContext();
  
  const [newMessage, setNewMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Timer countdown
  useEffect(() => {
    if (!lastActivity) return;
    
    const intervalId = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - lastActivity.getTime()) / 1000);
      const secondsLeft = Math.max(0, 20 - secondsPassed);
      setTimeLeft(secondsLeft);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [lastActivity]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    sendMessage(newMessage);
    setNewMessage('');
  };
  
  return (
    <div className="animate-scale-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={resetDoorbell}
          >
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-xl font-medium">
            Chat with {visitorInfo?.name}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock size={16} className="mr-1" />
            <span>Session expires in {timeLeft}s</span>
          </div>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={resetDoorbell}
            className="flex items-center gap-1"
          >
            <X size={16} />
            <span>End Chat</span>
          </Button>
        </div>
      </div>
      
      <div className="glass-card rounded-xl flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 overflow-y-auto mb-4 pr-2">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No messages yet
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white/80 backdrop-blur-sm transition-all"
            autoFocus
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isVisitor = message.sender === 'visitor';
  
  return (
    <div className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[80%] rounded-2xl px-4 py-3 
          ${isVisitor 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none' 
            : 'bg-white border border-gray-100 shadow-sm rounded-tl-none'
          }
        `}
      >
        <div className="text-sm">{message.content}</div>
        <div className={`text-xs mt-1 ${isVisitor ? 'text-blue-100' : 'text-gray-400'}`}>
          {format(message.timestamp, 'HH:mm')}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
