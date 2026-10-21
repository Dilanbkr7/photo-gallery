package com.dilanbkr7.photogallery;

import static org.junit.Assert.*;

import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginHandle;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.UUID;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class DeviceGalleryInstrumentedTest {
    private static class ResultCall extends PluginCall {
        JSObject result;
        String error;
        boolean resolved;

        ResultCall(String method, JSObject data) {
            super(null, "DeviceGallery", "native-test", method, data);
        }

        @Override public void resolve(JSObject data) { result = data; resolved = true; }
        @Override public void resolve() { resolved = true; }
        @Override public void reject(String message, String code, Exception ex, JSObject data) { error = message; }
    }

    @Test
    public void pluginIsRegisteredWhenActivityStarts() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull("DeviceGallery must be registered before bridge creation", activity.getBridge().getPlugin("DeviceGallery"));
            });
        }
    }

    @Test
    public void savesAndDeletesOnlyItsOwnTestPhoto() {
        Assume.assumeTrue("Legacy permission flow requires a separate device test", Build.VERSION.SDK_INT >= 29);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                PluginHandle handle = activity.getBridge().getPlugin("DeviceGallery");
                assertNotNull(handle);
                DeviceGalleryPlugin gallery = (DeviceGalleryPlugin) handle.getInstance();
                Bitmap bitmap = Bitmap.createBitmap(16, 16, Bitmap.Config.ARGB_8888);
                bitmap.eraseColor(0xFF087C50);
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, bytes);
                bitmap.recycle();
                JSObject options = new JSObject();
                options.put("filename", "diagnostic-" + UUID.randomUUID() + ".jpeg");
                options.put("data", Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
                ResultCall saved = new ResultCall("savePhoto", options);
                gallery.savePhoto(saved);
                assertNull(saved.error);
                assertTrue(saved.resolved);
                String uri = saved.result.getString("uri");
                assertNotNull(uri);
                try {
                    try (InputStream input = activity.getContentResolver().openInputStream(Uri.parse(uri))) {
                        assertNotNull(input);
                        assertTrue("The public gallery image must contain bytes", input.read() >= 0);
                    }
                } catch (Exception error) {
                    throw new AssertionError(error);
                } finally {
                    JSObject deletion = new JSObject();
                    deletion.put("uri", uri);
                    ResultCall deleted = new ResultCall("deletePhoto", deletion);
                    gallery.deletePhoto(deleted);
                    assertNull(deleted.error);
                    assertTrue(deleted.resolved);
                }
                try (android.database.Cursor cursor = activity.getContentResolver().query(Uri.parse(uri), null, null, null, null)) {
                    assertTrue("The diagnostic photo must be removed", cursor == null || cursor.getCount() == 0);
                }
                JSObject foreign = new JSObject();
                foreign.put("uri", "content://media/external/images/media/0");
                ResultCall rejected = new ResultCall("deletePhoto", foreign);
                gallery.deletePhoto(rejected);
                assertNotNull("Unregistered photos must not be deleted", rejected.error);
                assertFalse(rejected.resolved);
            });
        }
    }
}
