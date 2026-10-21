package com.dilanbkr7.photogallery;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceGalleryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
