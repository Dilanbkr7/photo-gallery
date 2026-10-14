
import { Injectable, signal } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import type { Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos = signal<UserPhoto[]>([]);

  private readonly PHOTO_STORAGE = 'photos';

  public async addNewToGallery() {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const savedImageFile = await this.savePicture(capturedPhoto);

    const updatedPhotos = [savedImageFile, ...this.photos()];
    this.photos.set(updatedPhotos);

    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(updatedPhotos),
    });
  }

  private async savePicture(photo: Photo): Promise<UserPhoto> {
    if (!photo.webPath) {
      throw new Error('No se pudo obtener la ruta de la fotografía.');
    }

    const base64Data = await this.base64FromPath(photo.webPath);
    const fileName = `${Date.now()}.jpeg`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    return {
      filepath: fileName,
      webviewPath: photo.webPath,
    };
  }

  private async base64FromPath(path: string): Promise<string> {
    const response = await fetch(path);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () =>
        reject(new Error('No se pudo convertir la fotografía.'));

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('La conversión de la fotografía falló.'));
        }
      };

      reader.readAsDataURL(blob);
    });
  }

  public async loadSaved(): Promise<void> {
    const { value: photoList } = await Preferences.get({
      key: this.PHOTO_STORAGE,
    });

    const photos: UserPhoto[] = photoList ? JSON.parse(photoList) : [];

    for (const photo of photos) {
      try {
        const file = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });

        if (typeof file.data === 'string') {
          photo.webviewPath = file.data.startsWith('data:')
            ? file.data
            : `data:image/jpeg;base64,${file.data}`;
        }
      } catch (error) {
        console.error('No se pudo recuperar la foto:', photo.filepath, error);
      }
    }

    this.photos.set(photos);
  }
}

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}
