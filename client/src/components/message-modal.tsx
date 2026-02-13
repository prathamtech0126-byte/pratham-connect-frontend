import React, { useState } from 'react';
import { AlertTriangle, Megaphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Message, AcknowledgmentMethod } from '@/types/message.types';

interface MessageModalProps {
  message: Message;
  onAcknowledge: (messageId: number, method?: AcknowledgmentMethod) => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  message,
  onAcknowledge,
}) => {
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const handleAcknowledge = async (method: AcknowledgmentMethod = 'button') => {
    if (isAcknowledged) return;

    try {
      await onAcknowledge(message.id, method);
      setIsAcknowledged(true);
    } catch (error) {
      console.error('Failed to acknowledge message:', error);
    }
  };

  // Priority styling for modal
  const getPriorityStyle = () => {
    switch (message.priority) {
      case 'urgent':
        return 'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100';
      case 'high':
        return 'bg-orange-50 border-orange-500 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-100';
      case 'normal':
        return 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100';
      case 'low':
        return 'bg-gray-50 border-gray-500 text-gray-900 dark:bg-gray-900/30 dark:border-gray-700 dark:text-gray-100';
    }
  };

  // Background overlay color matching priority
  const getBackgroundOverlay = () => {
    switch (message.priority) {
      case 'urgent':
        return 'bg-red-100/90 dark:bg-red-950/90';
      case 'high':
        return 'bg-orange-100/90 dark:bg-orange-950/90';
      case 'normal':
        return 'bg-blue-100/90 dark:bg-blue-950/90';
      case 'low':
        return 'bg-gray-100/90 dark:bg-gray-950/90';
      default:
        return 'bg-blue-100/90 dark:bg-blue-950/90';
    }
  };

  const getTypeIcon = () => {
    if (message.priority === 'urgent') {
      return <AlertTriangle className="w-6 h-6" />;
    }
    if (message.type === 'broadcast') {
      return <Megaphone className="w-6 h-6" />;
    }
    return <Megaphone className="w-6 h-6" />;
  };

  const sender = message.sender || {
    id: 0,
    name: 'Admin',
    role: 'superadmin',
  };

  return (
    <div className={cn("fixed inset-0 z-[9999] flex items-center justify-center", getBackgroundOverlay())}>
      <div className={cn(
        "relative w-full max-w-lg mx-4 rounded-lg shadow-2xl border-2",
        getPriorityStyle()
      )}>
        {/* Header */}
        <div className="p-6 border-b border-current/20">
          <div className="flex items-center gap-3 mb-2">
            {getTypeIcon()}
            <h2 className="text-xl font-bold">
              {message.title || 'New Message'}
            </h2>
          </div>
          {/* <p className="text-sm opacity-75">
            From: {sender.name} ({sender.role})
            {message.type === 'broadcast' && ' • Broadcast'}
            {message.type === 'individual' && ' • Direct Message'}
          </p> */}
        </div>

        {/* Message Content */}
        <div className="p-6">
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-current/20 bg-white/50 dark:bg-black/20">
          <Button
            onClick={() => handleAcknowledge('button')}
            disabled={isAcknowledged}
            className={cn(
              isAcknowledged
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isAcknowledged ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Acknowledged
              </>
            ) : (
              'Acknowledge'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
