import { Injectable, inject, signal } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { DEVICE_GALLERY } from './device-gallery';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  public photos = signal<UserPhoto[]>([]);
  private readonly PHOTO_STORAGE = 'photos';
  private readonly gallery = inject(DEVICE_GALLERY);

  public async addNewToGallery(): Promise<void> {
    const captured = await Camera.takePhoto({
      quality: 85, targetWidth: 1600, targetHeight: 1600, saveToGallery: false,
    });
    if (!captured.webPath) throw new Error('No se pudo obtener la fotografía.');
    const response = await fetch(captured.webPath);
    if (!response.ok) throw new Error('No se pudo leer la fotografía.');
    const dataUrl = await this.toDataUrl(await response.blob());
    const data = dataUrl.split(',')[1];
    const filepath = `${Date.now()}-${crypto.randomUUID()}.jpeg`;
    await Filesystem.writeFile({ path: filepath, data, directory: Directory.Data });
    let galleryUri: string | undefined;
    try {
      if (Capacitor.getPlatform() === 'android') {
        ({ uri: galleryUri } = await this.gallery.savePhoto({ filename: filepath, data }));
      }
      const updated = [{ filepath, galleryUri, webviewPath: dataUrl }, ...this.photos()];
      await this.persist(updated);
      this.photos.set(updated);
    } catch (error) {
      if (galleryUri) await this.gallery.deletePhoto({ uri: galleryUri }).catch(console.error);
      await Filesystem.deleteFile({ path: filepath, directory: Directory.Data }).catch(console.error);
      throw error;
    }
  }

  public async deletePhoto(photo: UserPhoto): Promise<void> {
    if (!this.photos().some((item) => item.filepath === photo.filepath)) return;
    if (photo.galleryUri && Capacitor.getPlatform() === 'android') {
      await this.gallery.deletePhoto({ uri: photo.galleryUri });
    }
    try {
      await Filesystem.deleteFile({ path: photo.filepath, directory: Directory.Data });
    } catch (error) {
      if ((error as { code?: string }).code !== 'OS-PLUG-FILE-0008') throw error;
    }
    const updated = this.photos().filter((item) => item.filepath !== photo.filepath);
    await this.persist(updated);
    this.photos.set(updated);
  }

  public async loadSaved(): Promise<void> {
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    const stored: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(stored)) throw new Error('El índice de fotografías no es válido.');
    const loaded: UserPhoto[] = [];
    for (const item of stored) {
      if (!item || typeof item.filepath !== 'string' || !/^[a-zA-Z0-9-]+\.jpeg$/.test(item.filepath)) continue;
      const photo: UserPhoto = { filepath: item.filepath, galleryUri: item.galleryUri };
      try {
        if (Capacitor.isNativePlatform()) {
          await Filesystem.stat({ path: photo.filepath, directory: Directory.Data });
          const { uri } = await Filesystem.getUri({ path: photo.filepath, directory: Directory.Data });
          photo.webviewPath = Capacitor.convertFileSrc(uri);
        } else {
          const file = await Filesystem.readFile({ path: photo.filepath, directory: Directory.Data });
          photo.webviewPath = typeof file.data === 'string'
            ? (file.data.startsWith('data:') ? file.data : `data:image/jpeg;base64,${file.data}`)
            : await this.toDataUrl(file.data);
        }
      } catch (error) {
        // Retain the entry so the public copy can still be deleted.
        console.error('No se pudo recuperar la vista previa:', photo.filepath, error);
      }
      loaded.push(photo);
    }
    this.photos.set(loaded);
  }

  private persist(photos: UserPhoto[]): Promise<void> {
    return Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(photos.map(({ filepath, galleryUri }) => ({ filepath, galleryUri }))),
    });
  }

  private toDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo convertir la fotografía.'));
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('La conversión de la fotografía falló.'));
      reader.readAsDataURL(blob);
    });
  }
}

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
  galleryUri?: string;
}
