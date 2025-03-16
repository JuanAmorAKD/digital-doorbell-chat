import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  activeNotificationId: string | null;
}

const DoorbellContext = createContext<DoorbellContextType | undefined>(undefined);

export const DoorbellProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<DoorbellStatus>('idle');
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [doorbellId, setDoorbellId] = useState<string | null>(null);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDoorbellConfig();
    }
  }, [user]);

  useEffect(() => {
    if (!activeNotificationId) return;
    
    const messageChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `notification_id=eq.${activeNotificationId}`
        },
        (payload) => {
          if (payload.new) {
            const newMessage: Message = {
              id: payload.new.id,
              sender: payload.new.sender === 'visitor' ? 'visitor' : 'owner',
              content: payload.new.content,
              timestamp: new Date(payload.new.created_at)
            };
            
            setMessages(prev => [...prev, newMessage]);
            setLastActivity(new Date());
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [activeNotificationId]);

  useEffect(() => {
    if (status === 'chatting' && lastActivity) {
      const timeoutId = setTimeout(() => {
        resetDoorbell();
      }, 300000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [status, lastActivity]);
  
  const fetchDoorbellConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('doorbells')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching doorbell config:', error);
        return;
      }
      
      if (data) {
        setDoorbellId(data.id);
        setWebhookUrl(data.webhook_url || '');
      }
    } catch (error) {
      console.error('Error in fetchDoorbellConfig:', error);
    }
  };

  const ringDoorbell = () => {
    setStatus('ringing');
    setLastActivity(new Date());
  };

  const submitVisitorInfo = async (info: VisitorInfo) => {
    setVisitorInfo(info);
    setStatus('chatting');
    setLastActivity(new Date());
    
    if (doorbellId) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            doorbell_id: doorbellId,
            visitor_name: info.name,
            visitor_message: info.message || null,
            status: 'active'
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setActiveNotificationId(data.id);
        
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            notification_id: data.id,
            content: info.message || `${info.name} is at the door.`,
            sender: 'visitor'
          });
          
        if (messageError) throw messageError;
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('notification_id', data.id)
          .order('created_at', { ascending: true });
          
        if (messagesError) throw messagesError;
        
        const formattedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          sender: msg.sender === 'visitor' ? 'visitor' : 'owner',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(formattedMessages);
        
        await sendDiscordNotification(info, data.id);
      } catch (error) {
        console.error('Error submitting visitor info:', error);
        toast({
          title: "Error",
          description: "There was a problem with the doorbell system. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      const initialMessage: Message = {
        id: Date.now().toString(),
        sender: 'visitor',
        content: info.message || `${info.name} is at the door.`,
        timestamp: new Date()
      };
      
      setMessages([initialMessage]);
      sendDiscordNotification(info);
    }
  };

  const sendDiscordNotification = async (info: VisitorInfo, notificationId?: string) => {
    if (!webhookUrl) {
      toast({
        title: "Notification not sent",
        description: "No Discord webhook configured. The owner will not be notified.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const baseUrl = window.location.origin;
      const chatPath = notificationId ? `/chat/${notificationId}` : '/';
      const chatUrl = `${baseUrl}${chatPath}`;
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'Digital Doorbell',
          content: `🔔 **${info.name}** is at the door!`,
          embeds: [
            {
              title: 'Visitor Information',
              description: info.message || 'No message provided.',
              color: 3447003,
              fields: [
                {
                  name: '🔗 Chat Link',
                  value: `[Click here to chat with ${info.name}](${chatUrl})`,
                  inline: true
                }
              ],
              footer: {
                text: 'Reply to this message or use the chat link to talk with the visitor'
              }
            }
          ]
        })
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      toast({
        title: "Notification Error",
        description: "Failed to send Discord notification to the owner.",
        variant: "destructive",
      });
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
    
    if (activeNotificationId) {
      try {
        await supabase
          .from('messages')
          .insert({
            notification_id: activeNotificationId,
            content: content,
            sender: 'visitor'
          });
      } catch (error) {
        console.error('Error saving message to database:', error);
      }
    }
    
    if (webhookUrl && !activeNotificationId) {
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

  const receiveMessage = async (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'owner',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setLastActivity(new Date());
    
    if (activeNotificationId) {
      try {
        await supabase
          .from('messages')
          .insert({
            notification_id: activeNotificationId,
            content: content,
            sender: 'owner'
          });
      } catch (error) {
        console.error('Error saving owner message to database:', error);
      }
    }
  };

  const resetDoorbell = async () => {
    if (activeNotificationId) {
      try {
        await supabase
          .from('notifications')
          .update({ status: 'closed' })
          .eq('id', activeNotificationId);
      } catch (error) {
        console.error('Error closing notification:', error);
      }
    }
    
    setStatus('idle');
    setVisitorInfo(null);
    setMessages([]);
    setLastActivity(null);
    setActiveNotificationId(null);
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
      resetDoorbell,
      activeNotificationId
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
