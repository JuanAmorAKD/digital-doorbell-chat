
import React, { useState } from 'react';
import { DoorbellProvider, useDoorbellContext } from '@/contexts/DoorbellContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import DoorbellButton from '@/components/DoorbellButton';
import VisitorForm from '@/components/VisitorForm';
import ChatInterface from '@/components/ChatInterface';
import AdminLogin from '@/components/AdminLogin';
import AdminPanel from '@/components/AdminPanel';
import { useDiscordListener } from '@/lib/discordService';
import { BellRing, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const DoorbellApp: React.FC = () => {
  const { status } = useDoorbellContext();
  const { isAuthenticated } = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);
  
  // This simulates receiving messages from Discord
  useDiscordListener();
  
  const renderContent = () => {
    // Admin panel section
    if (isAdminView) {
      return isAuthenticated ? <AdminPanel /> : <AdminLogin />;
    }
    
    // Doorbell section
    switch (status) {
      case 'ringing':
        return <VisitorForm />;
      case 'chatting':
        return <ChatInterface />;
      case 'idle':
      default:
        return <DoorbellButton />;
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col relative p-6 md:p-10">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 -z-10" />
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <BellRing className="text-blue-500 mr-2" size={24} />
          <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Digital Doorbell
          </h1>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" title="Settings">
              <Settings size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="py-6">
              <h2 className="text-xl font-semibold mb-6">Doorbell Settings</h2>
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setIsAdminView(false)}
                >
                  Use Doorbell
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setIsAdminView(true)}
                >
                  Admin Panel
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      
      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 mt-4">
        <div className="w-full max-w-xl">
          <>
            <div className="text-center mb-8 animate-fade-in">
              <h2 className="text-3xl font-light mb-2">
                {isAdminView ? 'Admin Area' : 'Welcome'}
              </h2>
              <p className="text-muted-foreground">
                {isAdminView 
                  ? 'Manage your doorbell settings' 
                  : 'Use this digital doorbell to get in touch with the property owner'
                }
              </p>
            </div>
            {renderContent()}
          </>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="mt-16 text-center text-muted-foreground text-xs">
        <p>© {new Date().getFullYear()} Digital Doorbell System</p>
      </footer>
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <AuthProvider>
      <DoorbellProvider>
        <DoorbellApp />
      </DoorbellProvider>
    </AuthProvider>
  );
};

export default Index;
