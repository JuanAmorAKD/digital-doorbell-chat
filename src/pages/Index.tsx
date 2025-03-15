
import React, { useState } from 'react';
import { DoorbellProvider, useDoorbellContext } from '@/contexts/DoorbellContext';
import DoorbellButton from '@/components/DoorbellButton';
import VisitorForm from '@/components/VisitorForm';
import ChatInterface from '@/components/ChatInterface';
import { useDiscordWebhook, useDiscordListener } from '@/lib/discordService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BellRing, Link } from 'lucide-react';

const DoorbellApp: React.FC = () => {
  const { status } = useDoorbellContext();
  const { webhookUrl, setWebhookUrl, validateWebhook, error } = useDiscordWebhook();
  const [isEditing, setIsEditing] = useState(!webhookUrl);
  
  // This simulates receiving messages from Discord
  useDiscordListener();
  
  const handleWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateWebhook(webhookUrl);
    if (isValid) {
      setIsEditing(false);
    }
  };
  
  const renderContent = () => {
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
        
        <Button 
          variant="ghost" 
          className="text-sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Link size={14} className="mr-1" />
          {isEditing ? "Cancel" : "Configure Webhook"}
        </Button>
      </header>
      
      {/* Webhook Configuration */}
      {isEditing && (
        <div className="glass-card rounded-xl p-6 mb-8 animate-fade-in">
          <h3 className="text-lg font-medium mb-4">Discord Webhook Configuration</h3>
          <form onSubmit={handleWebhookSubmit} className="space-y-4">
            <div>
              <label htmlFor="webhook" className="text-sm font-medium block mb-1">
                Discord Webhook URL
              </label>
              <Input
                id="webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full"
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Paste your Discord webhook URL to receive doorbell notifications
              </p>
            </div>
            <Button type="submit">Save Webhook</Button>
          </form>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 mt-4">
        <div className="w-full max-w-xl">
          {!isEditing && (
            <>
              <div className="text-center mb-8 animate-fade-in">
                <h2 className="text-3xl font-light mb-2">Welcome</h2>
                <p className="text-muted-foreground">
                  Use this digital doorbell to get in touch with the property owner
                </p>
              </div>
              {renderContent()}
            </>
          )}
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
    <DoorbellProvider>
      <DoorbellApp />
    </DoorbellProvider>
  );
};

export default Index;
