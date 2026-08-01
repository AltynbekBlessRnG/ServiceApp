import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}__${index}`;
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    const countValue = await SecureStore.getItemAsync(`${key}__count`);
    const count = Number(countValue);
    if (!Number.isInteger(count) || count <= 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    return chunks.every((chunk) => chunk != null) ? chunks.join('') : null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await this.removeItem(key);
    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
    await SecureStore.setItemAsync(`${key}__count`, String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    const count = Number(await SecureStore.getItemAsync(`${key}__count`));
    if (Number.isInteger(count) && count > 0) {
      await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))),
      );
    }
    await SecureStore.deleteItemAsync(`${key}__count`);
  },
};
