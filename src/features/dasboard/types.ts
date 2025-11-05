export interface DashboardStats {
  messagesSent: number;
  activeContacts: number;
  pendingMessages: number;
  deliveryRate: number;
  changes: {
    messagesSent: string;
    activeContacts: string;
    pendingMessages: string;
    deliveryRate: string;
  };
}

export interface MessageActivity {
  date: string;
  enviados: number;
  pendientes: number;
}

export interface ScheduleActivity {
  hora: string;
  actividad: number;
}

export interface RecentContact {
  id: number;
  name: string;
  phone: string;
  status: 'activo' | 'pausado';
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
  scheduleActivity: ScheduleActivity[];
  recentContacts: RecentContact[];
  scheduledMessages: ScheduledMessage[];
}