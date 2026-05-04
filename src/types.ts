export type UserRole = 'user' | 'developer';
export type UserStatus = 'online' | 'offline' | 'away';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  themeColor?: string;
  interfaceMode?: 'nexus' | 'minimal' | 'cyber';
  isPrivate: boolean;
  dndMode: boolean;
  status: UserStatus;
  lastSeen: string;
  createdAt: string;
  role: UserRole;
  followersCount: number;
  followingCount: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: any;
  updatedAt: string;
  metadata?: {
    name?: string;
    icon?: string;
    createdBy?: string;
    isRequest?: boolean;
    isBlocked?: boolean;
    acceptedAt?: any;
  };
}

export interface Message {
  id: string;
  convId: string;
  senderId: string;
  text?: string;
  encryptedContent?: string;
  type: 'text' | 'image' | 'file' | 'challenge';
  fileUrl?: string;
  fileName?: string;
  gameData?: {
    type: string;
    invitedBy: string;
  };
  readBy: string[];
  createdAt: string;
  isUnsent?: boolean;
  deletedBy: string[];
}

export interface MusicMetadata {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  music?: MusicMetadata;
  filter?: string;
  fontStyle?: string;
  createdAt: string;
  expiresAt: string;
}

export interface Post {
  id: string;
  userId: string;
  caption?: string;
  imageUrl: string;
  likesCount: number;
  commentsCount?: number;
  music?: MusicMetadata;
  filter?: string;
  fontStyle?: string;
  createdAt: string;
}

export interface PostComment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface FollowRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}
