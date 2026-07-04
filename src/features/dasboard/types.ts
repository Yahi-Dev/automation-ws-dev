export interface DashboardStats {
  messagesSent: number;
  delivered: number;
  read: number;
  failed: number;
  pendingMessages: number;
  activeContacts: number;
  deliveryRate: number;
  readRate: number;
}

export interface MessageActivity {
  date: string;
  enviados: number;
  fallidos: number;
  pendientes: number;
}

export interface StatusBreakdown {
  name: string;
  value: number;
}

export interface RecentContact {
  id: number;
  name: string;
  phone: string;
  status: string;
  lastMessage: string;
}

export interface ScheduledMessage {
  id: number;
  contact: string;
  message: string;
  time: string;
  date: string;
  status: 'pending' | 'scheduled';
}

export interface DashboardData {
  stats: DashboardStats;
  messageActivity: MessageActivity[];
  statusBreakdown: StatusBreakdown[];
  recentContacts: RecentContact[];
  scheduledMessages: ScheduledMessage[];
}
