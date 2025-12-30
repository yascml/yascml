
export const getLocalStorageAsArray = <T>(key: string): T[] => {
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const result = JSON.parse(raw);
    if (!(result instanceof Array)) {
      console.warn(`Cannot read localStorage "${key}" as an Array: wrong format`);
      return [];
    }

    return result;
  } catch (e) {
    console.warn(`Failed to parse localStorage "${key}"`);
    console.warn(e);
  }

  return [];
};
