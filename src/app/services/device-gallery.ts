import { registerPlugin } from '@capacitor/core';
import { InjectionToken } from '@angular/core';

interface DeviceGalleryPlugin {
  savePhoto(options: { filename: string; data: string }): Promise<{ uri: string }>;
  deletePhoto(options: { uri: string }): Promise<void>;
}

export const DeviceGallery = registerPlugin<DeviceGalleryPlugin>('DeviceGallery');
export const DEVICE_GALLERY = new InjectionToken<DeviceGalleryPlugin>('DeviceGallery', {
  providedIn: 'root', factory: () => ({
    savePhoto: (options) => DeviceGallery.savePhoto(options),
    deletePhoto: (options) => DeviceGallery.deletePhoto(options),
  }),
});
