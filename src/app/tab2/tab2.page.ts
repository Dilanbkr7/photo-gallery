import { Component, inject } from '@angular/core';
// CHANGE: Import the Ionic standalone components used on this page
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular';
// CHANGE: Register the camera icon used by the FAB
import { addIcons } from 'ionicons';
import { camera } from 'ionicons/icons';
// CHANGE: Import the PhotoService
import { PhotoService } from '../services/photo.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  // CHANGE: Add the standalone component imports
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonGrid,  IonFab, IonFabButton, IonIcon],
})
export class Tab2Page {
  // CHANGE: Inject the PhotoService
  public photoService = inject(PhotoService);

  constructor() {
    // CHANGE: Register the icons this page uses
    addIcons({ camera });
  }

  // CHANGE: Add `addPhotoToGallery()` method
  addPhotoToGallery() {
    this.photoService.addNewToGallery();
  }
}