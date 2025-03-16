
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ChatInterface from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { BellRing, ArrowLeft, RefreshCw } from 'lucide-react';

interface Notification {
  id: string;
  doorbell_id: string;
  visitor_name: string;
  visitor_message: string | null;
  status: string;
  created_at: string;
}

interface Message {
  id: string;
  notification_id: string;
  content: string;
  sender: string;
  created_at: string;
}

const ChatPage = () => {
  const { notificationId } = useParams<{ notificationId: string }>();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view this page",
        variant: "destructive",
      });
      navigate('/auth', { replace: true });
      return;
    }

    if (notificationId && isAuthenticated) {
      fetchNotificationDetails();
    }
    
    if (notificationId) {
      // Set up realtime subscription for new messages
      const messagesChannel = supabase
        .channel('specific-messages-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `notification_id=eq.${notificationId}`
          },
          (payload) => {
            if (payload.new) {
              setMessages(prev => [...prev, payload.new as Message]);
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [notificationId, isAuthenticated, authLoading]);

  const fetchNotificationDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch notification details
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select(`
          *,
          doorbells (
            id,
            user_id
          )
        `)
        .eq('id', notificationId)
        .single();
      
      if (notificationError) throw notificationError;
      
      setNotification(notificationData);
      
      // Fetch messages for this notification
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      setMessages(messagesData);
      
      // Update notification status to 'read' if it was unread
      if (notificationData.status === 'unread') {
        await supabase
          .from('notifications')
          .update({ status: 'read' })
          .eq('id', notificationId);
      }
    } catch (error: any) {
      console.error('Error fetching notification details:', error);
      setError(error.message || 'Failed to load notification details');
      toast({
        title: "Error",
        description: "Failed to load chat details. The notification may not exist or you don't have permission to view it.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !notification) return;
    
    try {
      await supabase
        .from('messages')
        .insert({
          notification_id: notification.id,
          content: content,
          sender: 'owner'
        });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Message Failed",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndChat = async () => {
    if (!notification) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ status: 'closed' })
        .eq('id', notification.id);
      
      toast({
        title: "Chat Ended",
        description: "This conversation has been closed.",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error ending chat:', error);
      toast({
        title: "Error",
        description: "Failed to end the chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-red-600">Error Loading Chat</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
        </div>
        
        <Button onClick={() => navigate('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Return Home
        </Button>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold">Notification Not Found</h2>
          <p className="text-muted-foreground mt-2">The chat you're looking for doesn't exist or has been removed.</p>
        </div>
        
        <Button onClick={() => navigate('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative p-6 md:p-10">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 -z-10" />
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex items-center">
            <BellRing className="text-blue-500 mr-2" size={24} />
            <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Digital Doorbell
            </h1>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchNotificationDetails}
          title="Refresh messages"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 mt-4">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-3xl font-light mb-2">
              Chat with {notification.visitor_name}
            </h2>
            <p className="text-muted-foreground">
              This visitor rang your doorbell at {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
          
          <div className="animate-scale-in h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">
                Conversation
              </h2>
              
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleEndChat}
                className="flex items-center gap-1"
              >
                End Chat
              </Button>
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
                      <div key={msg.id} className={`flex ${msg.sender === 'visitor' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`
                          max-w-[80%] rounded-2xl px-4 py-3 
                          ${msg.sender === 'visitor' 
                            ? 'bg-white border border-gray-100 shadow-sm rounded-tl-none' 
                            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none'
                          }
                        `}>
                          <div className="text-sm">{msg.content}</div>
                          <div className={`text-xs mt-1 ${msg.sender === 'visitor' ? 'text-gray-400' : 'text-blue-100'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('message') as HTMLInputElement;
                if (input.value.trim()) {
                  handleSendMessage(input.value);
                  input.value = '';
                }
              }} className="flex items-center space-x-2">
                <input
                  name="message"
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Type your response..."
                  autoFocus
                />
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-16 text-center text-muted-foreground text-xs">
        <p>© {new Date().getFullYear()} Digital Doorbell System</p>
      </footer>
    </div>
  );
};

export default ChatPage;
