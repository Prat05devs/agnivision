import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const INSTALLATION_ID_KEY = "agnivision.notification.installation-id";
const DEVICE_SECRET_KEY = "agnivision.notification.device-secret";

export type DeviceIdentity = { installationId: string; deviceSecret: string };

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  let installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  let deviceSecret = await SecureStore.getItemAsync(DEVICE_SECRET_KEY);

  if (!installationId) {
    installationId = Crypto.randomUUID();
    await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId);
  }

  if (!deviceSecret) {
    deviceSecret = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replaceAll("-", "");
    await SecureStore.setItemAsync(DEVICE_SECRET_KEY, deviceSecret);
  }

  return { installationId, deviceSecret };
}
