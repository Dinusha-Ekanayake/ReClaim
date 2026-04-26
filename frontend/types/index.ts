// ─── Domain Models ────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type ItemType = 'LOST' | 'FOUND';
export type ItemStatus =
  | 'ACTIVE'
  | 'MATCHED'
  | 'CLAIM_PENDING'
  | 'RETURNED'
  | 'CLOSED'
  | 'REJECTED';
export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
export type NotificationType =
  | 'MATCH_FOUND'
  | 'NEW_MESSAGE'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'ITEM_RETURNED'
  | 'COMMENT_ADDED'
  | 'SYSTEM';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  phone?: string;
  showPhone?: boolean;
  bio?: string;
  location?: string;
  isVerified?: boolean;
  isBanned?: boolean;
  createdAt: string;
  _count?: { items: number };
}

export interface ItemImage {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
}

export interface Item {
  id: string;
  type: ItemType;
  status: ItemStatus;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  brand?: string;
  color?: string;
  size?: string;
  locationLabel: string;
  locationLat?: number;
  locationLng?: number;
  locationArea?: string;
  dateLostFound: string;
  showContactInfo: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: Partial<User>;
  images?: ItemImage[];
  verificationHints?: string[];
  _count?: { comments: number; claims: number };
}

export interface Match {
  id: string;
  lostItemId: string;
  foundItemId: string;
  score: number;
  breakdown: Record<string, number>;
  lostItem?: Item;
  foundItem?: Item;
  createdAt: string;
}

export interface Comment {
  id: string;
  itemId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  user?: Partial<User>;
  replies?: Comment[];
}

export interface Claim {
  id: string;
  itemId: string;
  claimantId: string;
  status: ClaimStatus;
  verificationAnswers: Record<string, string>;
  message?: string;
  adminNote?: string;
  createdAt: string;
  item?: Item;
  claimant?: Partial<User>;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  lastReadAt: string;
  user?: Partial<User>;
}

export interface Chat {
  id: string;
  itemId?: string;
  createdAt: string;
  updatedAt: string;
  participants?: ChatParticipant[];
  messages?: Message[];
  _count?: { messages: number };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: Partial<User>;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  itemId: string;
  reporterId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  adminNote?: string;
  createdAt: string;
  item?: Partial<Item>;
  reporter?: Partial<User>;
  itemOwner?: Partial<User>;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}
