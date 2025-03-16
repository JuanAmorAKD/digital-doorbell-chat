
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDoorbellContext } from '@/contexts/DoorbellContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Save, Link } from 'lucide-react';
import { useDiscordWebhook } from '@/lib/discordService';

const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const { webhookUrl, setWebhookUrl, validateWebhook, error } = useDiscordWebhook();
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  
  const handleWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    
    try {
      const isValid = await validateWebhook(webhookUrl);
      if (isValid) {
        toast({
          title: "Settings saved",
          description: "Your Discord webhook has been updated successfully.",
        });
      }
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Admin Panel</h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        
        <Button variant="outline" onClick={logout}>
          <LogOut size={16} className="mr-2" />
          Sign Out
        </Button>
      </div>
      
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Link size={18} className="mr-2 text-blue-500" />
          Discord Webhook Configuration
        </h3>
        
        <form onSubmit={handleWebhookSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook">Discord Webhook URL</Label>
            <Input
              id="webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Paste your Discord webhook URL to receive doorbell notifications.
              The webhook will be used to send messages when someone rings your doorbell.
            </p>
          </div>
          
          <Button 
            type="submit" 
            disabled={isValidating}
            className="flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save Settings
          </Button>
        </form>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
        <h4 className="font-medium mb-1">Coming Soon:</h4>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Multi-user management</li>
          <li>Multiple doorbells configuration</li>
          <li>Building/apartment management</li>
          <li>Custom notification settings</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;
