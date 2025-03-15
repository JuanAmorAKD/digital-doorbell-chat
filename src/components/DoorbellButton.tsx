
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useDoorbellContext } from '@/contexts/DoorbellContext';

const DoorbellButton: React.FC = () => {
  const { ringDoorbell } = useDoorbellContext();
  const [isPressed, setIsPressed] = useState(false);
  
  const handleRing = () => {
    setIsPressed(true);
    
    // Visual animation effect
    setTimeout(() => {
      setIsPressed(false);
      ringDoorbell();
    }, 500);
  };
  
  return (
    <div className="flex flex-col items-center gap-6 mt-8">
      <div className="text-muted-foreground text-sm font-medium tracking-wide uppercase mb-2">
        Press to ring
      </div>
      
      <button
        onClick={handleRing}
        disabled={isPressed}
        className={`
          relative w-36 h-36 rounded-full 
          bg-gradient-to-br from-blue-400 to-blue-600
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          doorbell-glow
          ${isPressed ? 'scale-95 opacity-80' : 'hover:scale-105'}
        `}
      >
        {isPressed && (
          <div className="absolute inset-0 rounded-full ring-effect"></div>
        )}
        
        <Bell size={64} className="text-white" strokeWidth={1.5} />
      </button>
      
      <p className="text-muted-foreground text-sm mt-6 max-w-md text-center">
        Ring the bell to get in touch with the property owner.
        They will receive a notification in Discord.
      </p>
    </div>
  );
};

export default DoorbellButton;
