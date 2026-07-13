const publicUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
};

const primaryImageSelect = {
  where: { isPrimary: true },
  take: 1,
  select: { id: true, url: true, isPrimary: true },
};

const publicItemSelect = {
  id: true,
  type: true,
  status: true,
  title: true,
  description: true,
  category: true,
  subcategory: true,
  brand: true,
  color: true,
  size: true,
  locationArea: true,
  dateLostFound: true,
  showContactInfo: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
};

const ownerItemSelect = {
  ...publicItemSelect,
  locationLabel: true,
  locationLat: true,
  locationLng: true,
};

function withPublicLocation(item) {
  return {
    ...item,
    locationLabel: item.locationArea || 'Location shared privately',
  };
}

module.exports = {
  publicUserSelect,
  primaryImageSelect,
  publicItemSelect,
  ownerItemSelect,
  withPublicLocation,
};
