
import React, { useState } from 'react';
import { useDoorbellContext } from '@/contexts/DoorbellContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send } from 'lucide-react';

const VisitorForm: React.FC = () => {
  const { submitVisitorInfo, resetDoorbell } = useDoorbellContext();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate a slight delay for better UX
    setTimeout(() => {
      submitVisitorInfo({ name: name.trim(), message: message.trim() });
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="animate-scale-in">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={resetDoorbell}
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-medium">Please introduce yourself</h2>
      </div>
      
      <div className="glass-card rounded-xl p-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Your Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="transition-all duration-200 focus:ring-2 focus:ring-primary"
              required
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message (Optional)
            </label>
            <Textarea
              id="message"
              placeholder="What would you like to say?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span>Continue</span>
                <Send size={16} className="ml-2" />
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VisitorForm;
