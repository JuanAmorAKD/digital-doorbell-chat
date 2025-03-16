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

// Function to create and format the Discord notification
export const formatDiscordNotification = (info: { name: string; message: string }) => {
  // In a real implementation, this would include the actual URL to your app
  const chatUrl = window.location.href;
  
  return {
    username: 'Digital Doorbell',
    content: `🔔 **${info.name}** is at the door!`,
    embeds: [
      {
        title: 'Visitor Information',
        description: info.message || 'No message provided.',
        color: 3447003, // Blue color
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
  };
};
