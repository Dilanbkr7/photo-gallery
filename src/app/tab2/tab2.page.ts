import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonFab, IonFabButton, IonIcon, IonButton, AlertController, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, trashOutline } from 'ionicons/icons';
import { PhotoService, UserPhoto } from '../services/photo.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow,
    IonCol, IonFab, IonFabButton, IonIcon, IonButton],
})
export class Tab2Page implements OnInit {
  public photoService = inject(PhotoService);
  public busy = signal(true);
  private alerts = inject(AlertController);
  private toasts = inject(ToastController);

  constructor() { addIcons({ camera, trashOutline }); }

  async ngOnInit() {
    try { await this.photoService.loadSaved(); }
    catch { await this.notify('No se pudieron cargar las fotos guardadas.'); }
    finally { this.busy.set(false); }
  }

  async addPhotoToGallery() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.photoService.addNewToGallery();
      await this.notify('Fotografía guardada.');
    } catch (error) {
      const detail = error as { code?: string; message?: string };
      if (!/cancel/i.test(detail.message ?? '') && detail.code !== 'OS-PLUG-CAMR-0006') {
        await this.notify(detail.message || 'No se pudo guardar la foto. Revisa los permisos.');
      }
    } finally { this.busy.set(false); }
  }

  async confirmDelete(photo: UserPhoto) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const alert = await this.alerts.create({
        header: '¿Eliminar fotografía?',
        message: photo.galleryUri
          ? 'Se eliminará de esta aplicación y de la galería del teléfono.'
          : 'Se eliminará la fotografía guardada en esta aplicación.',
        buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive' }],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'destructive') return;
      await this.photoService.deletePhoto(photo);
      await this.notify('Fotografía eliminada.');
    } catch (error) {
      await this.notify((error as Error).message || 'No se pudo eliminar la fotografía.');
    } finally { this.busy.set(false); }
  }

  private async notify(message: string) {
    const toast = await this.toasts.create({ message, duration: 3000, position: 'top' });
    await toast.present();
  }
}
