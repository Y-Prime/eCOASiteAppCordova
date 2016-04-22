/***********************
File: 			siteUserController.js
Date: 			13Jan2016
Created: 		J Osifchin
Description: 	control for users
***************************/
var currentSiteUser;

var siteUserController = (function () {
    return {
        getCurrentSiteUserName: function () {
            return currentSiteUser;
        },
        setCurrentSiteUsername: function (val) {
            currentSiteUser = val;
        },
        login: function (username, password, onSuccess, onFail, onError) {
            function fnLoggedIn(onLoginSuccess, onLoginError) {
                if (typeof onLoginSuccess == 'function') {
                    onLoginSuccess();
                }
            }

            if (username.length > 0 && password.length > 0) {
                if (serviceController.connected()) {
                    this.loginAPI(username, password, function () { fnLoggedIn(onSuccess, onError); }, onFail, onError);
                } else {
                    this.loginDB(username, password, function () { fnLoggedIn(onSuccess, onError); }, onFail, onError);
                }
            } else {
                if (typeof onFail == 'function') {
                    onFail();
                }
                this.failedLoginHandler();
            }
        },
        loginAPI: function (username, password, onSuccess, onFail, onError) {
            function onAPISuccess(e) {
                siteUserController.setCurrentSiteUsername(username);

                function checkForVersionUpdate(onVersionSuccess, onVersionError) {
                    var deviceId = app.app.getDeviceId();
                    var patientNumber = null;
                    app.syncVersionDataCheckPatientService(patientNumber, deviceId, onVersionSuccess, onVersionError);
                }

                function loginSuccess(onSuccess, onError) {
                    function tempPinSuccess(onSuccess, onError) {
                        patientController.checkForTemporaryPin(onSuccess);
                    }

                    checkForVersionUpdate(function () { tempPinSuccess(onSuccess, onError); }, onError);
                }


                function importVisitPattern() {
                    visitController.inloadVisitPattern(e.VisitEdiaryQuestionnaires, onSuccess, onError);
                }

                patientController.inloadPatients(e.SitePatients, importVisitPattern, onError)
            };
            function onAPIFail(xhr, status, error) {
                siteUserController.failedLoginHandler(xhr, status, error);
                if (typeof onFail == 'function') {
                    onFail();
                }
            };

            serviceCalls.getSiteUserFromAPI(username, password, onAPISuccess, onAPIFail);
        },
        logout: function (onSuccess) {       
            if (typeof onSuccess == 'function') {
                onSuccess();
            }
        },
        failedLoginHandler: function (xhr, status, error) {
            var message = translationController.get('keyInvalidLogin');
            if (typeof xhr != 'undefined' && typeof xhr.statusText != 'undefined') {
                message = xhr.statusText;
            }
            app.alert(message);
        }
    }
})();