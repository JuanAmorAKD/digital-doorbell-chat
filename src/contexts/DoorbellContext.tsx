import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { formatDiscordNotification } from '@/lib/discordService';

export type Message = {
  id: string;
  sender: 'visitor' | 'owner';
  content: string;
  timestamp: Date;
};

export type VisitorInfo = {
  name: string;
  message: string;
};

type DoorbellStatus = 'idle' | 'ringing' | 'chatting';

interface DoorbellContextType {
  status: DoorbellStatus;
  visitorInfo: VisitorInfo | null;
  messages: Message[];
  lastActivity: Date | null;
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  ringDoorbell: () => void;
  submitVisitorInfo: (info: VisitorInfo) => void;
  sendMessage: (content: string) => void;
  receiveMessage: (content: string) => void;
  resetDoorbell: () => void;
}

const DoorbellContext = createContext<DoorbellContextType | undefined>(undefined);

export const DoorbellProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<DoorbellStatus>('idle');
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('discordWebhookUrl') || '';
  });

  useEffect(() => {
    localStorage.setItem('discordWebhookUrl', webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    if (status === 'chatting' && lastActivity) {
      const timeoutId = setTimeout(() => {
        resetDoorbell();
      }, 20000);

      return () => clearTimeout(timeoutId);
    }
  }, [status, lastActivity]);

  const ringDoorbell = () => {
    setStatus('ringing');
    setLastActivity(new Date());
  };

  const submitVisitorInfo = (info: VisitorInfo) => {
    setVisitorInfo(info);
    setStatus('chatting');
    setLastActivity(new Date());
    
    const initialMessage: Message = {
      id: Date.now().toString(),
      sender: 'visitor',
      content: info.message || `${info.name} is at the door.`,
      timestamp: new Date()
    };
    
    setMessages([initialMessage]);
    
    sendDiscordNotification(info);
  };

  const sendDiscordNotification = async (info: VisitorInfo) => {
    if (!webhookUrl) return;
    
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formatDiscordNotification(info))
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !visitorInfo) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'visitor',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setLastActivity(new Date());
    
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: visitorInfo.name,
            content: content
          })
        });
      } catch (error) {
        console.error('Failed to send message to Discord:', error);
      }
    }
  };

  const receiveMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'owner',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setLastActivity(new Date());
  };

  const resetDoorbell = () => {
    setStatus('idle');
    setVisitorInfo(null);
    setMessages([]);
    setLastActivity(null);
  };

  return (
    <DoorbellContext.Provider value={{
      status,
      visitorInfo,
      messages,
      lastActivity,
      webhookUrl,
      setWebhookUrl,
      ringDoorbell,
      submitVisitorInfo,
      sendMessage,
      receiveMessage,
      resetDoorbell
    }}>
      {children}
    </DoorbellContext.Provider>
  );
};

export const useDoorbellContext = () => {
  const context = useContext(DoorbellContext);
  if (context === undefined) {
    throw new Error('useDoorbellContext must be used within a DoorbellProvider');
  }
  return context;
};
