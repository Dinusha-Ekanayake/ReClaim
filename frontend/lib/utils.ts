// import { clsx, type ClassValue } from 'clsx';
// import { twMerge } from 'tailwind-merge';
// import { formatDistanceToNow, format } from 'date-fns';

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs));
// }

// export function timeAgo(date: string | Date) {
//   return formatDistanceToNow(new Date(date), { addSuffix: true });
// }

// export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
//   return format(new Date(date), fmt);
// }

// export function getMatchScoreColor(score: number) {
//   if (score >= 70) return 'match-score-high';
//   if (score >= 40) return 'match-score-medium';
//   return 'match-score-low';
// }

// export function getMatchScoreLabel(score: number) {
//   if (score >= 70) return 'Strong match';
//   if (score >= 50) return 'Good match';
//   if (score >= 30) return 'Possible match';
//   return 'Weak match';
// }

// export function getStatusColor(status: string) {
//   const map: Record<string, string> = {
//     ACTIVE: 'bg-blue-100 text-blue-700',
//     MATCHED: 'bg-purple-100 text-purple-700',
//     CLAIM_PENDING: 'bg-yellow-100 text-yellow-700',
//     RETURNED: 'bg-green-100 text-green-700',
//     CLOSED: 'bg-gray-100 text-gray-600',
//     REJECTED: 'bg-red-100 text-red-700',
//   };
//   return map[status] || 'bg-gray-100 text-gray-600';
// }

// export function getStatusLabel(status: string) {
//   const map: Record<string, string> = {
//     ACTIVE: 'Active',
//     MATCHED: 'Matched',
//     CLAIM_PENDING: 'Claim Pending',
//     RETURNED: 'Returned ✓',
//     CLOSED: 'Closed',
//     REJECTED: 'Rejected',
//   };
//   return map[status] || status;
// }

// export const CATEGORIES = [
//   { value: 'Electronics', label: 'Electronics', icon: '💻' },
//   { value: 'Bags & Wallets', label: 'Bags & Wallets', icon: '👜' },
//   { value: 'Clothing & Accessories', label: 'Clothing & Accessories', icon: '👗' },
//   { value: 'Jewelry', label: 'Jewelry', icon: '💍' },
//   { value: 'Keys', label: 'Keys', icon: '🔑' },
//   { value: 'Documents & Cards', label: 'Documents & Cards', icon: '📄' },
//   { value: 'Books & Stationery', label: 'Books & Stationery', icon: '📚' },
//   { value: 'Sports Equipment', label: 'Sports Equipment', icon: '⚽' },
//   { value: 'Pets', label: 'Pets', icon: '🐾' },
//   { value: 'Vehicles', label: 'Vehicles', icon: '🚗' },
//   { value: 'Musical Instruments', label: 'Musical Instruments', icon: '🎵' },
//   { value: 'Toys & Games', label: 'Toys & Games', icon: '🧸' },
//   { value: 'Other', label: 'Other', icon: '📦' },
// ];

// export const COLORS = [
//   'Black', 'White', 'Gray', 'Silver', 'Red', 'Blue', 'Navy',
//   'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Gold', 'Multicolor',
// ];

// export function getAvatarFallback(name: string) {
//   return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
// }

// export function truncate(str: string, length = 100) {
//   return str.length > length ? str.slice(0, length) + '...' : str;
// }

// export function buildImageUrl(path: string) {
//   if (!path) return '/placeholder-item.png';
//   if (path.startsWith('http')) return path;
//   return path;
// }

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseValidDate(date?: string | Date | null): Date | null {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

export function timeAgo(date?: string | Date | null) {
  const parsedDate = parseValidDate(date);

  if (!parsedDate) return 'N/A';

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function formatDate(
  date?: string | Date | null,
  fmt = 'MMM d, yyyy'
) {
  const parsedDate = parseValidDate(date);

  if (!parsedDate) return 'N/A';

  return format(parsedDate, fmt);
}

export function getMatchScoreColor(score: number) {
  if (score >= 70) return 'match-score-high';
  if (score >= 40) return 'match-score-medium';
  return 'match-score-low';
}

export function getMatchScoreLabel(score: number) {
  if (score >= 70) return 'Strong match';
  if (score >= 50) return 'Good match';
  if (score >= 30) return 'Possible match';
  return 'Weak match';
}

export function getStatusColor(status?: string | null) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-blue-100 text-blue-700',
    MATCHED: 'bg-purple-100 text-purple-700',
    CLAIM_PENDING: 'bg-yellow-100 text-yellow-700',
    RETURNED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return status ? map[status] || 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600';
}

export function getStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    ACTIVE: 'Active',
    MATCHED: 'Matched',
    CLAIM_PENDING: 'Claim Pending',
    RETURNED: 'Returned ✓',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
  };

  return status ? map[status] || status : 'Unknown';
}

export const CATEGORIES = [
  { value: 'Electronics', label: 'Electronics', icon: '💻' },
  { value: 'Bags & Wallets', label: 'Bags & Wallets', icon: '👜' },
  { value: 'Clothing & Accessories', label: 'Clothing & Accessories', icon: '👗' },
  { value: 'Jewelry', label: 'Jewelry', icon: '💍' },
  { value: 'Keys', label: 'Keys', icon: '🔑' },
  { value: 'Documents & Cards', label: 'Documents & Cards', icon: '📄' },
  { value: 'Books & Stationery', label: 'Books & Stationery', icon: '📚' },
  { value: 'Sports Equipment', label: 'Sports Equipment', icon: '⚽' },
  { value: 'Pets', label: 'Pets', icon: '🐾' },
  { value: 'Vehicles', label: 'Vehicles', icon: '🚗' },
  { value: 'Musical Instruments', label: 'Musical Instruments', icon: '🎵' },
  { value: 'Toys & Games', label: 'Toys & Games', icon: '🧸' },
  { value: 'Other', label: 'Other', icon: '📦' },
];

export const COLORS = [
  'Black',
  'White',
  'Gray',
  'Silver',
  'Red',
  'Blue',
  'Navy',
  'Green',
  'Yellow',
  'Orange',
  'Purple',
  'Pink',
  'Brown',
  'Gold',
  'Multicolor',
];

export function getAvatarFallback(name?: string | null) {
  if (!name) return 'U';

  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str?: string | null, length = 100) {
  if (!str) return '';

  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function buildImageUrl(path?: string | null) {
  if (!path) return '/placeholder-item.png';
  if (path.startsWith('http')) return path;
  return path;
}