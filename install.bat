del fx-nightly-android-debug-addon.xpi
"C:\Program Files\7-Zip\7z.exe" a -tzip fx-nightly-android-debug-addon.xpi install.rdf bootstrap.js icon.png

adb push "fx-nightly-android-debug-addon.xpi" /sdcard/fx-nightly-android-debug-addon.xpi
adb push "install.html" /sdcard/install.html

adb shell am start -a android.intent.action.VIEW  -c android.intent.category.DEFAULT -d file:///mnt/sdcard/install.html  -n org.mozilla.fennec/.App

echo Pushed fx-nightly-android-debug-addon.xpi to org.mozilla.fennec