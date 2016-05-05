const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");

var events = {};

var eventShimObserver = {
  observe: function(subject, topic, data) {
    // New tab opened will fire this event
    if (topic == "content-document-global-created") {
      loadIntoWindow(subject);
    }
  }
};

function eventShimmer(e){
  var theWin;
  // Using a duck test to find the right window
  if(('document' in e.target) && e.target.window === e.target) { // target is window
    theWin = e.target;
  }else if('defaultView' in e.target) { // target is probably a document
    theWin = e.target.defaultView;
  } else if('ownerDocument' in e.target) { // target is some DOM element
    theWin = e.target.ownerDocument.defaultView;
  }
  if(theWin) {
    theWin.wrappedJSObject.event = e;
  } else {
    Services.console.logStringMessage('wot? no win? ' + e.target);
  }
}

function addListeners(win) {
  for(var prop in win) {
    if(/^on/.test(prop)) {
      var evt = prop.replace(/^on/, '');
      events[evt] = 1;
      //Services.console.logStringMessage('Adding capturing listener for ' + evt + ' to ' + win);
      win.addEventListener(evt, eventShimmer, true);
    }
  }
}

function loadIntoWindow(window) {
  if(window.BrowserApp) {
    window.BrowserApp.tabs.forEach(function(tab){
      addListeners(tab.window);
    });
  } else {
    addListeners(window);
  }
}

function unloadFromWindow(window) {
  window.BrowserApp.tabs.forEach(function(tab){
    for(var evt in events) {
      tab.window.removeEventListener(evt, eventShimmer, true);
    };
  });
}


/**
 * bootstrap.js API
 */

function startup(aData, aReason) {
  Services.obs.addObserver(eventShimObserver, "content-document-global-created", false);
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let internalWin = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(internalWin);
  }
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN)
    return;

  Services.obs.removeObserver(eventShimObserver, "content-document-global-created");

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {
  shutdown(aData, aReason);
}
