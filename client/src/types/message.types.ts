export type MessageType = 'broadcast' | 'individual';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type AcknowledgmentMethod = 'button' | 'timer';

export interface Message {
  id: number;
  type: MessageType;
  title?: string;
  message: string;
  priority: MessagePriority;
  createdAt: string;
  updatedAt?: string;
  isActive?: boolean;
  sender?: {
    id: number;
    name: string;
    role: string;
  };
  targetRoles?: string[];
  targetUserIds?: number[];
  read?: boolean;
  acknowledged?: boolean;
}

export interface MessageAcknowledgment {
  id: number;
  messageId: number;
  userId: number;
  acknowledgedAt: string;
  acknowledgmentMethod: AcknowledgmentMethod;
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface AcknowledgmentStatus {
  messageId: number;
  totalRecipients: number;
  acknowledgedCount: number;
  pendingCount: number;
  acknowledgments: MessageAcknowledgment[];
}

export interface CreateBroadcastMessageInput {
  title?: string;
  message: string;
  targetRoles: string[]; // ['manager', 'counsellor']
  priority?: MessagePriority;
}

export interface CreateIndividualMessageInput {
  title?: string;
  message: string;
  targetUserIds: number[]; // [5, 10, 15]
  priority?: MessagePriority;
}

export interface User {
  id: number;
  name: string;
  email?: string;
  role: string;
  fullname?: string;
}
