import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { Message, AcknowledgmentStatus } from '@/types/message.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2, X, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const MessageHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [ackStatus, setAckStatus] = useState<AcknowledgmentStatus | null>(null);

  // Fetch messages
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['message-history'],
    queryFn: async () => {
      try {
        return await clientService.getMessages();
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        return [];
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const fetchAcknowledgmentStatus = async (messageId: number) => {
    try {
      const status = await clientService.getMessageStatus(messageId);
      setAckStatus(status);
      setSelectedMessage(messageId);
    } catch (error: any) {
      toast({
        title: "Failed to fetch status",
        description: error.response?.data?.message || "Could not load acknowledgment status",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (messageId: number) => {
    try {
      await clientService.deactivateMessage(messageId);
      toast({
        title: "Message deactivated",
        description: "The message has been deactivated.",
      });
      refetch();
      if (selectedMessage === messageId) {
        setSelectedMessage(null);
        setAckStatus(null);
      }
    } catch (error: any) {
      toast({
        title: "Failed to deactivate",
        description: error.response?.data?.message || "Could not deactivate message",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Message History</h2>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No messages sent yet</p>
            <p className="text-sm mt-1">Start by sending a broadcast or individual message</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg: Message) => (
            <Card key={msg.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">
                        {msg.title || 'No Title'}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`${getPriorityColor(msg.priority)}`}
                      >
                        {msg.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {msg.type === 'broadcast' ? '📢 Broadcast' : '📬 Individual'}
                      </Badge>
                      {msg.isActive && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-2">{msg.message}</p>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                      <span>From: {msg.sender?.name || 'Admin'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(msg.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {msg.targetRoles && msg.targetRoles.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Roles: {msg.targetRoles.join(', ')}</span>
                        </>
                      )}
                      {msg.targetUserIds && msg.targetUserIds.length > 0 && (
                        <>
                          <span>•</span>
                          <span>Users: {msg.targetUserIds.length} selected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => fetchAcknowledgmentStatus(msg.id)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Users className="w-4 h-4" />
                      View Status
                    </Button>
                    {msg.isActive && (
                      <Button
                        onClick={() => handleDeactivate(msg.id)}
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Acknowledgment Status */}
              {selectedMessage === msg.id && ackStatus && (
                <CardContent className="pt-0 border-t">
                  <div className="mt-4">
                    <h4 className="font-semibold mb-3">Acknowledgment Status</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Recipients</div>
                        <div className="text-2xl font-bold">{ackStatus.totalRecipients}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Acknowledged</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {ackStatus.acknowledgedCount}
                        </div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Pending</div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {ackStatus.pendingCount}
                        </div>
                      </div>
                    </div>
                    {ackStatus.acknowledgments && ackStatus.acknowledgments.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Acknowledged By:</h5>
                        <div className="space-y-2">
                          {ackStatus.acknowledgments.map((ack) => (
                            <div
                              key={ack.id}
                              className="text-sm text-muted-foreground flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <span>
                                {(() => {
                                  // Try multiple possible field names for user name
                                  const userName = ack.user?.name ||
                                                   (ack.user as any)?.fullname ||
                                                   (ack as any)?.userName ||
                                                   (ack as any)?.name ||
                                                   (ack.user as any)?.fullName ||
                                                   'Unknown User';
                                  const role = (ack.user as any)?.role ||
                                               (ack as any)?.userRole ||
                                               (ack.user as any)?.userRole ||
                                               'Unknown';
                                  return `${userName} (${role})`;
                                })()}
                              </span>
                              <span className="text-xs flex items-center gap-2">
                                <span>{format(new Date(ack.acknowledgedAt), "MMM d, h:mm a")}</span>
                                <Badge variant="outline" className="text-xs">
                                  {ack.acknowledgmentMethod}
                                </Badge>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
