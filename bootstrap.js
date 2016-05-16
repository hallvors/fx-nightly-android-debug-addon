const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");

var prefs = {
  debugVideoSrc:    false,
  shimWindowEvent:  true,
  logEvents:        ['click'],
  // Note: log overrides ignore if event is listed in both
  ignoreEvents:     ['unload', 'beforeunload']
};


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

function injectDebugJS(win) {
  console.log(win.location);
  if(prefs.shimWindowEvent) {
    for(var prop in win) {
      if(/^on/.test(prop)) {
        var evt = prop.replace(/^on/, '');
        events[evt] = 1;
        //Services.console.logStringMessage('Adding capturing listener for ' + evt + ' to ' + win);
        win.addEventListener(evt, eventShimmer, true);
      }
    }
  }
  if(prefs.debugVideoSrc) {
    // log scripts that set video.src (to debug for example 1228971)
    var originalSetter = win.wrappedJSObject.document.createElement('video').__lookupSetter__('src');
    win.wrappedJSObject.HTMLVideoElement.prototype.__defineSetter__('src', function(str){
      console.log('Setting video src to ' + str);
      if(str === null || str === '') {
        try{undefined();}catch(e){console.log(e.stack);}
      }
      return originalSetter.call(this, str);
    });
  }

  if(prefs.ignoreEvents.length || prefs.logEvents.length) {
    // control what event listeners are added or log when they fire
    // This isn't watertight - not modifying or tracking inline event handlers
    var ael = win.wrappedJSObject.addEventListener;
    win.wrappedJSObject.addEventListener = /* on window */
      win.wrappedJSObject.Element.prototype.addEventListener = /* on elements */
      win.wrappedJSObject.document.addEventListener = /* on document */
      /* more objects needed? Probably.. */
      function(evt, func, capture) {
        var debugme;
        if(evt === 'click' && this.tagName === 'DIV' && func.toString().indexOf('&&(!a||f.event.triggered!')>-1) {
          // try{undefined();}catch(e){console.log( this + ' ' + this.tagName + ' ' + '\n' + e.stack.substr(-550))}
          debugme = true;
        }
        if(prefs.logEvents.indexOf(evt) > -1 || debugme) {
          ael.call(this, evt, (function(func){
            return function(e) {
              console.log('will now fire ' + e.type + ' on ' + e.target + ', listener ' + func);
              debugger;
              return func.call(this, e);
            };
          })(func), capture);
        } else if(prefs.ignoreEvents.indexOf(evt) === -1) {
          return ael.call(this, evt, func, capture);
        } else {
          console.log('Not adding listener for ' + evt + ' on ' + this);
        }
      };
  }
}

function loadIntoWindow(window) {
  if(window.BrowserApp) {
    window.BrowserApp.tabs.forEach(function(tab){
      injectDebugJS(tab.window);
    });
  } else {
    injectDebugJS(window);
  }
}

function unloadFromWindow(window) {
  window.BrowserApp.tabs.forEach(function(tab){
    for(var evt in events) {
      tab.window.removeEventListener(evt, eventShimmer, true);
    }
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
