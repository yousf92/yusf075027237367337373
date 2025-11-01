import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  createdAt: Timestamp;
  startDate?: Timestamp;
  counterImage?: string;
  isAdmin?: boolean;
  isMuted?: boolean;
  commitmentDocument?: string;
  blockedUsers?: string[];
  emergencyIndex?: number;
  urgeIndex?: number;
  storyIndex?: number;
  role?: 'supervisor';
}

export interface Message {
  id: string;
  text: string;
  timestamp: Timestamp;
  uid: string;
  displayName: string;
  photoURL: string;
  reactions?: { [key: string]: string[] };
  replyTo?: {
    id: string;
    text: string;
    displayName: string;
  };
}

export interface PinnedMessage {
    id: string;
    text: string;
    uid: string;
    displayName: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Timestamp;
}

export interface JournalEntry {
    id:string;
    text: string;
    mood: string;
    timestamp: Timestamp;
}

export interface Conversation {
    uid: string;
    displayName: string;
    photoURL?: string;
    lastMessageTimestamp: Timestamp;
    hasUnread: boolean;
}

export interface Group {
    id: string;
    name: string;
    description?: string;
    type: 'public' | 'private';
    photoURL?: string;
    createdBy: string;
    createdAt: Timestamp;
    members: string[];
    supervisors?: string[];
    lastMessage?: string;
    lastMessageTimestamp?: Timestamp;
    unreadStatus?: { [key: string]: boolean };
    pinnedMessage?: PinnedMessage;
    joinRequests?: string[];
}

export interface Badge {
  days: number;
  name: string;
  icon: string;
  message?: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  createdAt: Timestamp;
  logs: { [date: string]: boolean };
}

export type FollowUpStatus = 'relapse' | 'slip_up' | 'success' | 'absent';

export interface FollowUpLog {
    // The ID will be the date string YYYY-MM-DD
    status: FollowUpStatus;
    timestamp: Timestamp;
}


export type AlertType = 'success' | 'error';
export interface AlertContent {
  message: string;
  type: AlertType;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  fileUrl: string;
  uploaderUid: string;
  createdAt: Timestamp;
  categoryId?: string;
}

export interface LibraryCategory {
    id: string;
    name: string;
    createdAt: Timestamp;
}

export type Tab = 'home' | 'journal' | 'habits' | 'settings' | 'counter-settings' | 'follow-up' | 'library';