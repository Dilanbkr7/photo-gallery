import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Camera } from '@capacitor/camera';
import { DEVICE_GALLERY } from './device-gallery';
import { PhotoService } from './photo.service';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: { writeFile: vi.fn(), readFile: vi.fn(), deleteFile: vi.fn(), stat: vi.fn(), getUri: vi.fn() },
}));
vi.mock('@capacitor/preferences', () => ({ Preferences: { set: vi.fn(), get: vi.fn() } }));
vi.mock('@capacitor/camera', () => ({ Camera: { takePhoto: vi.fn() } }));
const DeviceGallery = { savePhoto: vi.fn(), deletePhoto: vi.fn() };

describe('PhotoService', () => {
  let service: PhotoService;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue();
    vi.mocked(Filesystem.deleteFile).mockResolvedValue();
    TestBed.configureTestingModule({ providers: [{ provide: DEVICE_GALLERY, useValue: DeviceGallery }] });
    service = TestBed.inject(PhotoService);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('restores persisted photos after restarting the service', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: '[{"filepath":"123.jpeg"}]' });
    vi.mocked(Filesystem.readFile).mockResolvedValue({ data: 'YWJj' });
    await service.loadSaved();
    expect(service.photos()[0].webviewPath).toBe('data:image/jpeg;base64,YWJj');
  });

  it('deletes the file and persists the remaining index without image data', async () => {
    const first = { filepath: '1.jpeg', webviewPath: 'data:image/jpeg;base64,a' };
    service.photos.set([first, { filepath: '2.jpeg', webviewPath: 'data:image/jpeg;base64,b' }]);
    await service.deletePhoto(first);
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: '1.jpeg', directory: 'DATA' });
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'photos', value: '[{"filepath":"2.jpeg"}]' });
    expect(service.photos()).toHaveLength(1);
  });

  it('keeps the index when Android gallery deletion fails', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    const photo = { filepath: '1.jpeg', galleryUri: 'content://media/external/images/media/1' };
    service.photos.set([photo]);
    vi.mocked(DeviceGallery.deletePhoto).mockRejectedValue(new Error('Permission denied'));
    await expect(service.deletePhoto(photo)).rejects.toThrow('Permission denied');
    expect(service.photos()).toEqual([photo]);
    expect(Filesystem.deleteFile).not.toHaveBeenCalled();
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('allows retry when the local file has already been removed', async () => {
    const photo = { filepath: '1.jpeg' };
    service.photos.set([photo]);
    vi.mocked(Filesystem.deleteFile).mockRejectedValue({ code: 'OS-PLUG-FILE-0008' });
    await service.deletePhoto(photo);
    expect(service.photos()).toEqual([]);
  });

  it('does not swallow storage failures during deletion', async () => {
    const photo = { filepath: '1.jpeg' };
    service.photos.set([photo]);
    vi.mocked(Filesystem.deleteFile).mockRejectedValue(new Error('Disk error'));
    await expect(service.deletePhoto(photo)).rejects.toThrow('Disk error');
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('captures a photo, exports it to Android and stores its gallery URI', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(Camera.takePhoto).mockResolvedValue({ webPath: 'blob:photo' } as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }) }));
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///photo.jpeg' });
    vi.mocked(DeviceGallery.savePhoto).mockResolvedValue({ uri: 'content://photo/1' });
    await service.addNewToGallery();
    expect(DeviceGallery.savePhoto).toHaveBeenCalledOnce();
    expect(service.photos()[0].galleryUri).toBe('content://photo/1');
    expect(JSON.parse(vi.mocked(Preferences.set).mock.calls[0][0].value)[0].webviewPath).toBeUndefined();
  });

  it('rolls back local capture when exporting to Android fails', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
    vi.mocked(Camera.takePhoto).mockResolvedValue({ webPath: 'blob:photo' } as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }) }));
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///photo.jpeg' });
    vi.mocked(DeviceGallery.savePhoto).mockRejectedValue(new Error('No storage'));
    await expect(service.addNewToGallery()).rejects.toThrow('No storage');
    expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(service.photos()).toEqual([]);
  });
});
