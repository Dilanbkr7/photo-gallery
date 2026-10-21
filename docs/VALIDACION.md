# Registro de validación

**Fecha:** 21 de octubre de 2026.<br />
**Dispositivo físico:** realme RMX2063.<br />
**Android:** 11, API 30.<br />
**Aplicación:** Photo Gallery · `com.dilanbkr7.photogallery`.

## Comprobaciones realizadas

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Dependencias | Instalación correcta con npm ci | Ejecución durante la preparación |
| Compilación web | Correcta | npm run build |
| Revisión estática | Sin errores | npm run lint |
| Suite web | 13 pruebas aprobadas | Componentes y lógica del servicio |
| APK | Compilado y firmado correctamente | Gradle assembleDebug y apksigner verify |
| Instalación en teléfono | Correcta, sin desinstalar la aplicación antigua | ADB devolvió Success |
| Registro del complemento | Correcto al crear el puente | Prueba instrumentada |
| Álbum público | Escritura, lectura y eliminación correctas | Prueba instrumentada con un JPEG de diagnóstico |
| Restricción de borrado | URI no registrada rechazada | Comprobación dentro de la prueba del álbum |
| Identificador de paquete | Correcto | Prueba instrumentada |
| Interfaz y fotos reales | Inicio, Galería con tres fotos y Ayuda documentados | Cuatro capturas en docs/screenshots |

## Suite web

Se comprobaron recuperación del índice persistido, eliminación y actualización de metadatos, fallo de borrado público, reintento tras eliminación local interrumpida, errores de almacenamiento, captura y exportación, y reversión local si falla la exportación.

Los plugins nativos se sustituyen por dobles de prueba en esta suite. Sus resultados se complementan con las pruebas físicas de Android.

## Pruebas instrumentadas

Resultado registrado en el teléfono:

```text
com.dilanbkr7.photogallery.DeviceGalleryInstrumentedTest:..
com.getcapacitor.myapp.ExampleInstrumentedTest:.

OK (3 tests)
```

Las pruebas validan:

1. Que DeviceGallery esté registrado cuando inicia MainActivity.
2. Que el complemento guarde un JPEG de diagnóstico en MediaStore, permita leer sus bytes, lo elimine y rechace una URI ajena.
3. Que el paquete instalado tenga el identificador esperado.

La imagen de diagnóstico era nueva, de 16 × 16 píxeles. Se eliminó durante la prueba y no se borraron fotografías personales.

## Correcciones verificadas

- Registro de DeviceGallery antes de super.onCreate, de acuerdo con el orden de creación del puente en la versión instalada de Capacitor.
- Identificador propio para evitar el conflicto de firma con una aplicación existente llamada io.ionic.starter.
- Uso de un APK distribuible de build/outputs sin la marca testOnly.
- Actualización instalada conservando los datos de la app.

## Alcance pendiente de evidencia visual

Las capturas actuales muestran instalación, Inicio, Galería con fotografías y Ayuda. La secuencia de confirmación de borrado, el álbum externo y la reapertura de la aplicación no están adjuntas todavía; el guion se encuentra en [CAPTURAS.md](CAPTURAS.md).

Las pruebas físicas de MediaStore se realizaron en Android 11. El flujo de permisos de Android 9 y anteriores y otros modelos de teléfono no se han validado.
