package com.dilanbkr7.photogallery;

import android.Manifest;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.OutputStream;

/** Publishes and removes only photos created by this installation. */
@CapacitorPlugin(name = "DeviceGallery", permissions = {
    @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
})
public class DeviceGalleryPlugin extends Plugin {
    private SharedPreferences ownedPhotos() {
        return getContext().getSharedPreferences("device-gallery-owned", 0);
    }

    @PluginMethod
    public void savePhoto(PluginCall call) {
        if (Build.VERSION.SDK_INT <= 28 && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storageResult");
            return;
        }
        writePhoto(call);
    }

    @PermissionCallback
    private void storageResult(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) writePhoto(call);
        else call.reject("Autoriza el almacenamiento para guardar fotos en la galería.");
    }

    private void writePhoto(PluginCall call) {
        Uri uri = null;
        File legacyFile = null;
        try {
            String filename = call.getString("filename");
            String data = call.getString("data");
            if (filename == null || !filename.matches("[a-zA-Z0-9-]+\\.jpeg") || data == null) {
                call.reject("Fotografía inválida.");
                return;
            }
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            if (Build.VERSION.SDK_INT >= 29) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/PhotoGallery");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
            } else {
                File album = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "PhotoGallery");
                if (!album.exists() && !album.mkdirs()) throw new Exception("No se pudo crear el álbum.");
                legacyFile = new File(album, filename);
                values.put(MediaStore.Images.Media.DATA, legacyFile.getAbsolutePath());
            }
            uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new Exception("No se pudo crear la foto en la galería.");
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                if (output == null) throw new Exception("No se pudo abrir la fotografía.");
                output.write(bytes);
            }
            if (Build.VERSION.SDK_INT >= 29) {
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);
            } else {
                MediaScannerConnection.scanFile(getContext(), new String[] { legacyFile.getAbsolutePath() }, new String[] { "image/jpeg" }, null);
            }
            if (!ownedPhotos().edit().putBoolean(uri.toString(), true).commit()) {
                throw new Exception("No se pudo registrar la fotografía.");
            }
            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            if (uri != null) {
                try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }
            }
            call.reject("No se pudo guardar la fotografía en la galería.", error);
        }
    }

    @PluginMethod
    public void deletePhoto(PluginCall call) {
        if (Build.VERSION.SDK_INT <= 28 && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storageDeleteResult");
            return;
        }
        String value = call.getString("uri");
        if (value == null || !ownedPhotos().getBoolean(value, false)) {
            call.reject("Solo se pueden eliminar fotografías creadas por esta aplicación.");
            return;
        }
        try {
            getContext().getContentResolver().delete(Uri.parse(value), null, null);
            // Keep the ownership marker until uninstall so interrupted deletions can be retried.
            call.resolve();
        } catch (Exception error) {
            call.reject("No se pudo eliminar la fotografía de la galería.", error);
        }
    }

    @PermissionCallback
    private void storageDeleteResult(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) deletePhoto(call);
        else call.reject("Autoriza el almacenamiento para eliminar esta fotografía de la galería.");
    }
}
