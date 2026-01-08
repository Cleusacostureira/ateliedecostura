export const readOrdersFromStorage = (rawStr?: string) => {
  try {
    const raw = rawStr !== undefined ? rawStr : localStorage.getItem('orders');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) return parsed.payload;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) { return []; }
};

export const readDeletedOrders = () => {
  try {
    const raw = localStorage.getItem('deletedOrders');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
};
