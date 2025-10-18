import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  message: 'app.message',
} as const;

export async function saveMessage(message: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.message, message);
}

export async function loadMessage(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.message);
}

export async function clearMessage(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.message);
}
