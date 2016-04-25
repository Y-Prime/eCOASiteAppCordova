/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/********************
RELIES ON:
   screenController.js
   fileController.js
   serviceController.js
   dbController.js
*********************/


var app = (function () {
    return {
        // Application Constructor
        initialize: function () {
            this.bindEvents();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
        },
        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function () {
            app.receivedEvent('deviceready');
        },
        // Update DOM on a Received Event
        receivedEvent: function (id) {
            switch (id) {
                case "deviceready":
                    this.initDevice();
                    break;
            }

            console.log('Received Event: ' + id);
        },
        initDevice: function () {
            app.writeLog('Initializing......');

            serviceController.init();
            dbController.init("ecoa", "1.0", "ecoa", 1000000);

            function initApplicationSettings() {
                function initDeviceIds() {
                    app.initDeviceData(startApp);
                }

                app.initVersion(initDeviceIds);
            }

            function startApp() {
                screenController.changeScreen(
                    "Login",
                    "",
                    "white-background",
                    null,
                    function () {
                        $('.splash').slideUp('slow');
                    }
                );
            }

            function fnSync() {
                function fnLoadup() {
                    //TODO: these need to be async
                    questionController.init(function () {
                        translationController.init(function () {
                            app.syncAnswers(initApplicationSettings, initApplicationSettings);
                        }, initApplicationSettings);
                    }, initApplicationSettings);
                }

                function syncDataSuccess() {
                    setTimeout(function () { fnLoadup(); }, 1);
                }

                //this needs to happen after the other callbacks complete. the transaction for adding to the db doesn't commit until all the callbacks are done.
                app.syncVersionDataCheckDb(syncDataSuccess, syncDataSuccess);
            }

            translationController.init(fnSync);
        },
        syncVersionDataCheckDb: function (onSuccess, onError) {
            //check if there are any questions
            //intentionally only checking questions because a study can't run without them
            var sql = 'select count(*) as cnt from EDiaryQuestion';
            var pars = [];

            function runSync(tx, data) {
                if (data[0].cnt == 0) {
                    app.syncVersionData(onSuccess, onError);
                } else {
                    if (typeof onSuccess == "function") {
                        onSuccess();
                    }
                }
            }

            dbController.executeSql(sql, pars, runSync, onError);
        },
        syncVersionDataCheckPatientService: function (patientNumber, deviceId, onSuccess, onError) {
            //check against the service if the patient should update
            function successCallback() {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            }

            function onServiceSuccess(data) {
                //check the service reply
                if (data == true) {
                    app.syncVersionData(onSuccess, onError);
                } else {
                    successCallback();
                }
            }

            serviceCalls.checkForPatientDeviceUpdate(patientNumber, deviceId, onServiceSuccess, onError);
        },
        syncVersionData: function (onSuccess, onError) {
            //get questions
            //get translations
            function fnTranslations() {
                translationController.loadFromService(function () {
                    if (typeof onSuccess == "function") {
                        onSuccess();
                    }
                },
                onError);
            };

            questionController.loadQuestionsFromService(fnTranslations, onError);
        },
        syncAnswers: function (onSuccess, onError) {
            if (serviceController.connected()) {

                //sync up the patients, reminders and answers
                patientController.transmitPatientInformation(function () {
                    questionController.transmitUnsentEntries(function () {
                        reminderController.transmitReminders(onSuccess, onError);
                    }, onError);
                }, onError);
            } else {
                onSuccess();
            }
        },
        /*****************Version Control********************/
        versionNumberKey: 'applicationVersionNumber',
        initVersion: function (callback) {
            function registerVersion(version) {
                app.setSetting(app.versionNumberKey, version);
                if (typeof callback == 'function') {
                    callback();
                }
            }

            if (typeof getAppVersion == 'function') {
                getAppVersion(function (version) {
                    registerVersion(version);
                });
            } else {
                registerVersion('LOCAL');
            }
        },
        getVersion: function () {
            return app.getSetting(app.versionNumberKey);
        },

        /*****************DeviceId Control********************/
        deviceIdStorageParameter: 'DeviceIdStorage',
        defaultDeviceId: '111111111111111 ',//'000000000000000 ',
        defaultMacAddress: 'MACADR',
        getDeviceId: function () {
            var result = app.getSetting(app.deviceIdStorageParameter);
            //return result;
            return (result == null || result == 'null') ? app.defaultDeviceId : result;
        },
        setDeviceId: function (val) {
            app.setSetting(app.deviceIdStorageParameter, val);
        },

        macAddressStorageParameter: 'MacAddressStorage',
        getMacAddress: function () {
            return app.getSetting(app.macAddressStorageParameter);
        },
        setMacAddress: function (val) {
            app.setSetting(app.macAddressStorageParameter, val);
        },
        initDeviceData: function (callback) {
            function registerDeviceData(imei, macAddress) {
                app.setMacAddress(macAddress);
                app.setDeviceId(imei);
                if (typeof callback == 'function') {
                    callback();
                }
            }

            if (typeof (window.plugins) != 'undefined' && typeof (window.plugins.imeiplugin) != 'undefined') {
                function getMacAddress(imei) {
                    window.MacAddress.getMacAddress(function (macAddress) {
                        registerDeviceData(imei, macAddress);
                    });
                }
                window.plugins.imeiplugin.getImei(function (imei) {
                    getMacAddress(imei);
                });

            } else {
                registerDeviceData(app.defaultDeviceId, app.defaultMacAddress)
            }
        },

        writeLog: function (message, isError) {
            //pgAlert(message, function () { }, (isError ? "ERROR" : "LOG"), null)
            //console.log((isError ? "ERROR" : "LOG"), message);
            console.log(message);
            fileController.writeFile("log.txt", message, false, null);
        },

        alert: function (message, title, callback) {
            if (typeof callback == "undefined" || callback == null) {
                callback = function () { };
            }
            var button = null;

            pgAlert(message, callback, title, button)
        },
        getSetting: function (key) {
            return window.localStorage.getItem(key);
        },
        setSetting: function (key, value) {
            /*dbController.executeSql(
                'INSERT OR REPLACE INTO persist (SettingKey, SettingValue) VALUES (?,?)',
                [key, value],
                null
            );*/
            window.localStorage.setItem(key, value);
            return true; //??
        },
        removeSetting: function (key) {
            window.localStorage.removeItem(key);
        },
        getSiteBasedMode: function () {
            //change this for diary
            return false;
        },
        getDiaryDate: function () {
            return currentDiaryDate;
        },
        setDiaryDate: function (val) {
            currentDiaryDate = val;
        }
    };
})();

window.onerror = function (e, f, g) {
    app.writeLog(e + f + g, true);
    //app.alert(e + f + g);
    console.log("window.onerror ", e, f, g);
    lastErrorMessage = e + f + g;
    screenController.changeScreen("Error", 'keyError');
};


