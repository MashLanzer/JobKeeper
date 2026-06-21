#!/usr/bin/env python3
"""
Inyecta el intent-filter del deep link `com.workledger.app://` en el
AndroidManifest.xml generado por Capacitor, para que el login con Google
regrese a la APK en vez de quedarse en el navegador.

Se ejecuta en CI después de `npx cap add android`.
"""
import sys
import pathlib

manifest = pathlib.Path("android/app/src/main/AndroidManifest.xml")
if not manifest.exists():
    print(f"ERROR: no se encontró {manifest}", file=sys.stderr)
    sys.exit(1)

text = manifest.read_text()

deeplink = """
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.workledger.app" />
            </intent-filter>"""

changed = False

# 1) Asegurar launchMode="singleTask" en MainActivity (para onNewIntent)
if "android:launchMode" not in text:
    for name in ('android:name="com.workledger.app.MainActivity"',
                 'android:name=".MainActivity"'):
        if name in text:
            text = text.replace(
                name,
                name + '\n            android:launchMode="singleTask"',
                1,
            )
            changed = True
            break

# 2) Añadir el intent-filter del deep link tras el LAUNCHER (si no existe)
if "com.workledger.app" not in text or "BROWSABLE" not in text:
    marker = '<category android:name="android.intent.category.LAUNCHER" />'
    idx = text.find(marker)
    if idx == -1:
        print("ERROR: no se encontró el intent-filter LAUNCHER", file=sys.stderr)
        sys.exit(1)
    close = text.find("</intent-filter>", idx)
    if close == -1:
        print("ERROR: no se encontró el cierre del intent-filter", file=sys.stderr)
        sys.exit(1)
    insert_at = close + len("</intent-filter>")
    text = text[:insert_at] + deeplink + text[insert_at:]
    changed = True

if changed:
    manifest.write_text(text)
    print("AndroidManifest.xml parcheado con el deep link com.workledger.app://")
else:
    print("AndroidManifest.xml ya tenía el deep link, sin cambios")
