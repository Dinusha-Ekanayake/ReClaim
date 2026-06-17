// Curated Unsplash imagery for ReClaim. Centralised so we can swap sources easily.
// All URLs use Unsplash's CDN with explicit sizing for performance.

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const IMAGES = {
  // Hero — a person finding/returning belongings; warm, hopeful, community feel
  heroPrimary: U('photo-1521791136064-7986c2920216', 1400, 1000), // handshake / connection
  heroSecondary: U('photo-1556742502-ec7c0e9f34b1', 800, 600),    // wallet / lost item

  // How it works / feature illustrations
  search: U('photo-1454165804606-c3d57bc86b40', 800, 600),        // searching desk
  match: U('photo-1551288049-bebda4e38f71', 800, 600),            // analytics / data
  chat: U('photo-1577563908411-5077b6dc7624', 800, 600),          // conversation
  reunite: U('photo-1521737604893-d14cc237f11d', 800, 600),       // happy people

  // Category mood images (browse / empty states)
  electronics: U('photo-1498049794561-7780e7231661', 600, 400),
  bags: U('photo-1553062407-98eeb64c6a62', 600, 400),
  keys: U('photo-1582879304171-8c2e3b6e2b6c', 600, 400),
  documents: U('photo-1568667256549-094345857637', 600, 400),

  // CTA / banners
  community: U('photo-1529156069898-49953e39b3ac', 1400, 700),    // community crowd

  // Generic placeholder for items with no photo
  placeholder: U('photo-1586023492125-27b2c045efd7', 600, 400),
};

// Build a deterministic Unsplash mood image per category for cards without photos
export function categoryImage(category: string, w = 600, h = 400): string {
  const map: Record<string, string> = {
    Electronics: 'photo-1498049794561-7780e7231661',
    'Bags & Wallets': 'photo-1553062407-98eeb64c6a62',
    'Clothing & Accessories': 'photo-1489987707025-afc232f7ea0f',
    Jewelry: 'photo-1515562141207-7a88fb7ce338',
    Keys: 'photo-1582879304171-8c2e3b6e2b6c',
    'Documents & Cards': 'photo-1568667256549-094345857637',
    'Books & Stationery': 'photo-1481627834876-b7833e8f5570',
    'Sports Equipment': 'photo-1517649763962-0c623066013b',
    Pets: 'photo-1450778869180-41d0601e046e',
    Vehicles: 'photo-1503376780353-7e6692767b70',
    'Musical Instruments': 'photo-1511671782779-c97d3d27a1d4',
    'Toys & Games': 'photo-1566576912321-d58ddd7a6088',
    Other: 'photo-1586023492125-27b2c045efd7',
  };
  const id = map[category] ?? map.Other;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}
