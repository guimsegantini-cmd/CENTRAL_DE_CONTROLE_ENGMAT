const STORAGE_KEYS = {
  QUOTES: 'engmat_quotes',
  ORDERS: 'engmat_orders',
  SETTINGS: 'engmat_settings',
  USER: 'engmat_user'
};

export const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving to local storage", e);
  }
};

export const getFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error("Error reading from local storage", e);
    return defaultValue;
  }
};

export const StorageService = {
  ...STORAGE_KEYS
};
