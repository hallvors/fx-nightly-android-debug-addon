# Firefox Android addon for injecting javascript

This is an addon for Firefox on Android, injecting JavaScript into pages for debugging purposes. It's sort of based on [Mike Taylor's window.orientation shim](https://github.com/miketaylr/orientation-shim).

## Requirements
 * Firefox Nightly for Android installed on a device
 * **xpinstall.signatures.required** preference set to false in said Nightly's about:config page
 * The adb tool from Google's Android SDK
 
## Usage

To use, 
1. Edit bootstrap.js to add/enable/disable debug code that gets injected. 
2. Create a zip file (with an .xpi extension) 
3. Push it to the device using adb
4. Also push a html page that contains a link to the addon (as a security precaution, Firefox on Android requires a user gesture to install an addon.)
5. Open the install.html page in Firefox Nightly 
6. Tap the link. You should now be asked if you really want to install the addon.

(The install.sh / install.bat file will automate steps 2-5 above - until the "tap the link" part.)

When updating the addon with new debug code, you should probably go to about:addons on the device to remove the old version. Also, unless you're very carefully undoing all the addon does in an uninstall handler, it may be a good idea to also restart Firefox Nightly before re-installing the addon.