
import { useEffect, useState } from 'react';
import { useDoorbellContext } from '@/contexts/DoorbellContext';

export const useDiscordWebhook = () => {
  const { webhookUrl, setWebhookUrl } = useDoorbellContext();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateWebhook = async (url: string) => {
    if (!url) return false;
    
    try {
      setIsValidating(true);
      setError(null);
      
      // For webhook validation, we could make a small request
      // but most Discord webhooks don't support GET requests,
      // so we'll just do basic validation
      
      const isDiscordWebhook = url.startsWith('https://discord.com/api/webhooks/') || 
                              url.startsWith('https://discordapp.com/api/webhooks/');
      
      if (!isDiscordWebhook) {
        setError('Please enter a valid Discord webhook URL');
        return false;
      }
      
      return true;
    } catch (err) {
      setError('Failed to validate the webhook');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    webhookUrl,
    setWebhookUrl,
    validateWebhook,
    error,
    isValidating
  };
};

// In a real application, we would set up a server to listen for Discord interactions
// This is a simplified simulation of receiving messages from Discord
export const useDiscordListener = () => {
  const { visitorInfo, receiveMessage } = useDoorbellContext();
  const [hasResponded, setHasResponded] = useState(false);
  
  // This is a simulation - in a real app, we'd use WebSockets or a server to handle this
  // For demo purposes, we'll simulate an owner response after a short delay but only once
  useEffect(() => {
    if (!visitorInfo || hasResponded) return;
    
    // Simulate an automatic response from the owner - only once
    const timeoutId = setTimeout(() => {
      receiveMessage(`Hello ${visitorInfo.name}, I received your message. How can I help you today?`);
      setHasResponded(true);
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [visitorInfo, receiveMessage, hasResponded]);
};
