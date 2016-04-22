/***********************
File: 			serviceController.js
Date: 			29Oct2015
Created: 		J Osifchin
Description: 	control to handle service posts
***************************/



var serviceController = (function () {
    return {
        init: function () {            
            $.ajaxSetup({
                cache: false,
                crossDomain: true,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                async: false
            });

            $.support.cors = true;

            app.writeLog('Initialized Service Controller...');
        },
        ajaxGet: function (url, isSiteUser, onSuccess, onError) {
            this.networkStart();
            $.ajax({
                type: 'GET',
                url: url,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', serviceController.getAuthHeader(isSiteUser));
                },
                success: function (e) {
                    serviceController.ajaxSuccess(e, onSuccess);
                },
                error: function (xhr, status, error) {
                    //alert(JSON.stringify(xhr));
                    serviceController.ajaxError(xhr, status, error, onError);
                }
            })
        },
        ajaxPost: function (url, data, isSiteUser, onSuccess, onError) {
            this.networkStart();
            this.cleanJSONData(data);
            $.ajax({
                type: 'POST',
                url: url,
                //crossDomain: true,
                //contentType: "application/json; charset=utf-8",
                data: JSON.stringify(data),
                //dataType: "json",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', serviceController.getAuthHeader(isSiteUser));
                },
                success: function (e) {
                    serviceController.ajaxSuccess(e, onSuccess);
                },
                error: function (xhr, status, error) {
                    serviceController.ajaxError(xhr, status, error, onError);
                }//,
                //async: false,
                //cache: false
            });
        },
        authHeaderKey: "authHeader",
        authPatientHeaderKey: "authHeaderPatient",
        setAuthHeader: function (userid, password, isSiteUser) {
            var auth = "Basic " + Base64.encode(userid + ":" + password);
            app.setSetting((isSiteUser ? this.authHeaderKey : this.authPatientHeaderKey), auth);
        },
        getAuthHeader: function (isSiteUser) {
            return app.getSetting(isSiteUser ? this.authHeaderKey : this.authPatientHeaderKey);
        },
        ajaxSuccess: function (e, onSuccess) {
            serviceController.networkStop();
            if (typeof onSuccess == "function") {
                onSuccess(e);
            }
        },
        ajaxError: function (xhr, status, error, onError) {
            serviceController.networkStop();
            //app.alert(JSON.stringify(xhr) + status + error);
            if (typeof onError == "function") {
                onError(xhr, status, error);
            } else {
                window.onerror(xhr, status, error);
            }
        },
        serializeDate: function (val) {
            // format is:  /Date(1267695086938+0100)/
            //return moment(val).format();
            // return moment().format();
            return val;
            //return '/Date(' + val + ')/';
        },
        cleanJSONData: function (data) {
            //clean any possible nulls
            for (var p in data) {
                if (data[p] == 'null') {
                    data[p] = null;
                }
            }
        },
        connected: function () {
            return pgConnectCheck();
        },
        networkStart: function () {
            'use strict';
            if (desktopMode === false && typeof navigator.notification != "undefined") {
                navigator.notification.activityStart(translationController.get('keyLoading'), translationController.get('keyPleaseWait'));
            } else {
                return;
            }
        },
        networkStop: function () {
            'use strict';
            if (desktopMode === false && typeof navigator.notification != "undefined") {
                navigator.notification.activityStop();
            } else {
                return;
            }
        }
    };
})();

var serviceCalls = (function () {
    return {
        baseServiceCall: function (url, requestType, data, isSiteUser, onSuccess, onFail) {
            function ajaxSuccess(e) {
                if (typeof onSuccess == 'function') {
                    onSuccess(e);
                }
            };
            function ajaxFail(e) {
                if (typeof onFail == 'function') {
                    onFail(e);
                }
            };


            if (requestType.toLowerCase() == 'get') {
                serviceController.ajaxGet(url, isSiteUser, ajaxSuccess, ajaxFail);
            } else {
                //displayObject(data);
                serviceController.ajaxPost(url, data, isSiteUser, ajaxSuccess, ajaxFail);
            }
        },
        getSiteUserFromAPI: function (username, password, onSuccess, onFail) {
            var url = SERVER_URL + 'api/site/login';
            serviceController.setAuthHeader(username, password, true);
            this.baseServiceCall(url, 'GET', null, true, onSuccess, onFail);
        },
        getPatientFromAPI: function (patientId, pin, onSuccess, onFail) {
            var url = SERVER_URL + 'api/patient/login';

            serviceController.setAuthHeader(patientId, pin, false);
            this.baseServiceCall(url, 'GET', null, false, onSuccess, onFail);

            //patientId =  '10001001';
            //var pin = '1234';//'81DC9BDB52D04DC20036DBD8313ED055';
        },
        getQuestions: function (onSuccess, onFail) {
            var url = SERVER_URL + 'api/Diary/GetQuestions';
            this.baseServiceCall(url, 'GET', null, true, onSuccess, onFail);
        },
        getTranslations: function (onSuccess, onFail) {
            var url = SERVER_URL + 'api/Translations';
            this.baseServiceCall(url, 'GET', null, true, onSuccess, onFail);
        },
        transmitEntry: function (entryObject, onSuccess, onFail) {
            var url = SERVER_URL + 'api/Diary';
            this.baseServiceCall(url, 'POST', entryObject, false, onSuccess, onFail);
        },
        transmitPatient: function (patientObject, onSuccess, onFail) {
            var url = SERVER_URL + 'api/patient/ResetPin';
            this.baseServiceCall(url, 'POST', patientObject, false, onSuccess, onFail);
        },
        transmitReminder: function (reminders, onSuccess, onFail) {
            var url = SERVER_URL + 'api/patient/PostReminder';
            this.baseServiceCall(url, 'POST', reminders, false, onSuccess, onFail);
        },
        syncQuestionnaires: function (patientId, onSuccess, onFail) {
            var url = SERVER_URL + 'api/site/syncQuestionnaires';
            this.baseServiceCall(url, 'POST', { Id: patientId }, true, onSuccess, onFail);
        },
        checkForPatientDeviceUpdate: function (patientNumber, deviceId, onSuccess, onFail) {
            var url = SERVER_URL + 'api/Diary/CheckForPatientDeviceUpdate';
            this.baseServiceCall(url, 'POST', { PatientNumber: patientNumber, DeviceId: deviceId }, true, onSuccess, onFail);
        },
        checkForDrugKitValidity: function (patientNumber, drugKitNumber, scanType, scanTime,onSuccess, onFail) {
            var url = SERVER_URL + 'api/DrugKit/CheckValidity';
            this.baseServiceCall(url, 'POST', { PatientId: patientNumber, DrugKitNumber: drugKitNumber , ScanType: scanType, ScanTime: scanTime }, true, onSuccess, onFail);
        }
    };
})();
