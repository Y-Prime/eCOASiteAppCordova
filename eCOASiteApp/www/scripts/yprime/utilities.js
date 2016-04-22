/*global $, desktopMode, alert, Connection, Base64, console, db, deviceID, SERVER_URL, getAppVersion, desktopModeAppVersion */


// Close app
function closeApp() {
    'use strict';
    if (typeof navigator.app == 'undefined') {
        window.close();
    } else {
        navigator.app.exitApp();
    }
}

// get app version
function fetchAppVersion($page) {
    'use strict';
    if (pgEnable === true) {
        getAppVersion(function (version) {
            $(".appVersion").text(version);
        });
    } else if (pgEnable === false) {
        $(".appVersion").text(desktopModeAppVersion);
    } else {
        alert('missing pgDisable.js');
    }
}
// Pull app version
function getVersion($page) {
    'use strict';
    if (desktopMode === false) {
        // App version
        getAppVersion(function (version) {
            console.log('Getting app version, inserting into #appVersion');
            $("#appVersion", $page).text(version);
        });
    } else {
        console.log(desktopModeAppVersion);
        console.log($page);
        $("#appVersion", $page).text(desktopModeAppVersion);
    }
}
function alertDismissed() {
    //Do nothing
}
// PhoneGap Dialog Alert 
function pgAlert(message, callback, title, button) {
    'use strict';
    if (typeof navigator.notification != "undefined") {
          navigator.notification.alert(
            message,    // messages
            callback,   // callback
            title,      // title
            button      // buttonName
        );
    } else {
        alert(message);
    }
}

function pgConfirm(message, callback, title, buttons) {
    'use strict';
    if (typeof navigator.notification != "undefined") {
        navigator.notification.confirm(
            message, // message
            callback,            // callback to invoke with index of button pressed
            title,           // title
            buttons         // buttonLabels
        );
    } else {
        alert(message);
        callback(1);
    }
}

// jQuery Mobile changePage
function jqmChangePage(destination) {
    'use strict';
    $.mobile.changePage(destination, {
        //changeHash: false
    });
}

//// PhoneGap Network start
//function pgNetworkStart() {
//    'use strict';
//    if (desktopMode === false) {
//        navigator.notification.activityStart("Loading", "Please wait...");
//    } else {
//        return;
//    }
//}

//// PhoneGap Network Stop
//function pgNetworkStop() {
//    'use strict';
//    if (desktopMode === false) {
//        navigator.notification.activityStop();
//    } else {
//        return;
//    }
//}

// PhoneGap Connection Check
function pgConnectCheck() {
    'use strict';
    if (desktopMode === false && typeof navigator.notification != "undefined") {
        if (navigator.connection.type === Connection.NONE) {
            return false;
        } else {
            return true;
        }
    } else {
        return true;
    }
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function getCurrentDate() {
    return moment().format();
}

function arrayContains(arr, val) {
    var result = false;
    
    var len = arr.length;
    for (var i = 0; i < len; i++){
        if (arr[i] == val) {
            result = true;
            break;
        }
    }

    return result;
}

function reverse(s) {
    var o = [];
    for (var i = 0, len = s.length; i <= len; i++)
        o.push(s.charAt(len - i));
    return o.join('');
}

function getObjectPropertyCount(obj) {
    var cnt = 0;
    for (var p in obj) { cnt++; };
    return cnt;
}

function displayObject(obj, full, html) {
    var lf = html ? '</br>' : '\n';
    var result = JSON.stringify(obj, 2);
    if (full) {
        result = '';
        for (var p in obj) {
            result += 'p = ' + obj[p] + lf;
        }
    }
    console.log(result);
    app.alert(result);
}