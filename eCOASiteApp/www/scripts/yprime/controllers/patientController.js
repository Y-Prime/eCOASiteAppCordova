/***********************
File: 			patientController.js
Date: 			04Nov2015
Created: 		J Osifchin
Description: 	control for patient objects
***************************/
var currentLoginAttempts = 0;
var currentLoggingPatientNumber = null;
var localLoginAttempts = {};

var patientController = (function () {
    return {
        getCurrentPatient: function () {
            return currentPatientObject;
        },
        setCurrentPatient: function (obj) {
            currentPatientObject = obj;
        },
        login: function (patientId, pin, onSuccess, onFail, onError) {
            function doLogin() {
                function fnLoggedIn(onLoginSuccess, onLoginError) {
                    patientController.resetLoginAttempts(patientId, onLoginSuccess, onLoginError);
                }

                patientController.setCurrentLoggingInPatientNumber(patientId);
                if (patientId.length > 0 && pin.length > 0) {
                    if (serviceController.connected()) {
                        patientController.loginAPI(patientId, pin, function () { fnLoggedIn(onSuccess, onError); }, onFail, onError);
                    } else {
                        patientController.loginDB(patientId, pin, function () { fnLoggedIn(onSuccess, onError); }, onFail, onError);
                    }
                } else {
                    if (typeof onFail == 'function') {
                        onFail();
                    }
                    //make sure that the code calling handles a failed login - jo 01Feb2016
                    patientController.failedLoginHandler();
                }
            }

            doLogin();
            //make sure the logged in value is initialized
            //patientController.resetLoginAttempts(patientId, doLogin);
        },
        loginAPI: function (patientId, pin, onSuccess, onFail, onError) {
            function onAPISuccess(e) {

                function checkForVersionUpdate(onVersionSuccess, onVersionError) {
                    var deviceId = app.getDeviceId();
                    var patientNumber = patientController.getCurrentPatient().PatientNumber;
                    app.syncVersionDataCheckPatientService(patientNumber, deviceId, onVersionSuccess, onVersionSuccess);
                }

                function loginSuccess(onSuccess, onError) {
                    checkForVersionUpdate(onSuccess, onError);
                }

                //check the pin against the sent pin
                //login in the user
                //check against the db
                currentPatientObject = new Patient({
                    Id: e.Id,
                    EnrolledId: e.EnrolledId,
                    PatientNumber: e.EnrolledId, //TODO: this may not be correct!!!
                    Pin: e.Pin,
                    IsTempPin: e.IsTempPin,
                    PatientStatusTypeId: e.PatientStatusTypeId,
                    SecurityAnswer: e.SecurityAnswer,
                    LoginAttempts: e.LoginAttempts,
                    EnrolledDate: e.EnrolledDate,
                    IsTrainingComplete: e.IsTrainingComplete
                });
                currentSubjectNumber = patientId;

                currentPatientObject.insertUpdate(null, function () { loginSuccess(onSuccess, onError); }, onError);
            };
            function onAPIFail(e) {
                patientController.failedLoginHandler();
                if (typeof onFail == 'function') {
                    onFail();
                }
            };

            serviceCalls.getPatientFromAPI(patientId, pin, onAPISuccess, onAPIFail);
        },
        loginDB: function (patientId, pin, onSuccess, onFail, onError) {
            //login against the patients table
            //var sql = 'SELECT * FROM patients WHERE Patient=? AND PIN=?';
            var sql = 'SELECT * FROM Patient WHERE PatientNumber=?';
            var pars = [patientId];//, pin];
            function callback(tx, results) {
                if ((results.length > 0 && (results[0]['Pin'] + '') == patientController.encryptMD5(pin)) || (results.length == 1 && results[0]['Pin'] == '1234')) {
                    //add the object
                    currentPatientObject = new Patient(results[0]);
                    currentSubjectNumber = patientId;
                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                } else {
                    if (typeof onFail == 'function') {
                        //update the login attempts
                        onFail();
                    }
                    patientController.failedLoginHandler();
                }
            };

            dbController.executeSql(sql, pars, callback, onError);

        },
        logout: function (onSuccess) {
            currentPatientObject = {};
            if (typeof onSuccess == 'function') {
                onSuccess();
            }
        },
        validPin: function (val) {
            return val.length >= 4;
        },
        validChangePIN: function (oldPIN, newPIN, confirmPIN) {
            //note this returns a message, if blank then valid
            //TODO: add extra logic
            var message = '';
            //if (oldPIN != this.PIN) {
            //    message += 'Invalid Old PIN.';
            //}

            if (newPIN != confirmPIN) {
                message += (message.length > 0 ? '<br/>' : '') + translationController.get('keyNewPINDoesNotMatchConfirmPIN');
            }

            return message;
        },
        getCurrentPatientIsTempPin: function () {
            return currentPatientObject.IsTempPin == true || currentPatientObject.IsTempPin == 'true';
        },
        checkForTemporaryPin: function (onSuccess, onError) {
            if (patientController.getCurrentPatientIsTempPin()) {
                //reset the pin
                screenController.changeScreen('EnterNewPIN', '');
            } else {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
                //patientController.checkForReminderSetup(onSuccess, onError);
            }
        },
        checkForReminderSetup: function (onSuccess, onError) {
            var fn = function (cnt) {
                if (cnt == 0) {
                    var screenName = 'SelectReminderType';
                    var title = '';

                    screenController.changeScreen(screenName, title);
                } else {
                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                }
            };

            reminderController.getReminderCount(currentPatientObject.PatientNumber, fn, null);
        },
        checkForTrainingCompleted: function (onSuccess, onError) {
            if (!currentPatientObject.IsTrainingComplete) {
                function completeTrainingQuestionnaire() {
                    //check for training
                    currentPatientObject.completeTraining(onSuccess);
                }
                //screenController.addScreenViewed('Main', 'keySubjectMainMenu');
                questionController.startQuestionnaire('Training', null, false, completeTrainingQuestionnaire);
            } else {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            }
        },
        checkForPracticeDiary: function (callback) {
            var title = '';
            var message = translationController.get('keyCompletePracticeDiary');

            function confirmPractice(idx) {
                $('#main-content').removeClass('training-border');
                switch (idx) {
                    case 1:
                        //fix the back button on the second questionnaire
                        screenController.addScreenViewed('Main', 'keySubjectMainMenu');
                        //assembla #268 - navigation on training screen - jo 31Jan2016
                        var exitScreen = 'Training';
                        var exitTitle = 'keyTrainingMenu';
                        questionController.startQuestionnaire('Daily_Diary', null, true, null, true, exitScreen, exitTitle);
                        break;
                    default:
                        screenController.changeScreen('Main', 'keySubjectMainMenu');
                        break;
                }


            }

            pgConfirm(message, confirmPractice, title, [translationController.get('keyyes'), translationController.get('keyno')]);
            //I am specifically not calling this to control the navigation from the choice
            //callback();
        },
        /******************Login Control**********************/
        getCurrentLoggingInPatientNumber: function () { 
            return currentLoggingPatientNumber;
        },
        setCurrentLoggingInPatientNumber: function(val){
            currentLoggingPatientNumber = val;
        },
        maximumLoginAttempts: 10, //Assembla #138 - track maximum login attempts
        failedLoginHandler: function (xhr, status, error) {
            var patientNumber = patientController.getCurrentLoggingInPatientNumber();

            function displayFailedLoginMessage(attempts) {
                if (!serviceController.connected() && attempts == -1) {
                    app.alert(translationController.get('keyNotConnected'));

                } else {
                    app.alert(translationController.get(attempts <= patientController.maximumLoginAttempts ? 'keyInvalidLogin' : 'keyInvalidLoginMax'));
                }
             }

            //get the number of attempts
            if (patientNumber != null) {
                function getPatientAttempts() {
                    patientController.getLoginAttempts(patientNumber, displayFailedLoginMessage);
                }

                patientController.incrementLoginAttempts(patientNumber, getPatientAttempts);
                //dbController.executeSql(sql, pars, getPatientAttempts);
            } else {
                displayFailedLoginMessage(0);
            }
            
        },
        getLoginAttempts: function (patientNumber, onSuccess, onError) {
            var sql = 'select LoginAttempts from Patient where PatientNumber=?';
            var pars = [patientNumber];

            function onGotAttempts(tx, rows) {
                var LoginAttempts = 0;
                if (rows.length > 0) {
                    LoginAttempts = rows.length > 0 ? rows[0]['LoginAttempts'] * 1 : -1;
                } else {
                    LoginAttempts = patientController.getLocalLoginAttempts(patientNumber);
                }
                if (typeof onSuccess == 'function') {
                    onSuccess(LoginAttempts);
                }
            }
            //Assembla #264 - error when entering incorrect pin completing diary
            dbController.executeSql(sql, pars, onGotAttempts, onError);
        },
        //this is necessary for the first time a user logs in to retain the number of attempts
        getLocalLoginAttempts: function (patientNumber) {         
                localLoginAttempts[patientNumber] = -1;           
            return localLoginAttempts[patientNumber];
        },
        setLocalLoginAttempts: function (patientNumber, val) {
            localLoginAttempts[patientNumber] = val;
        },
        incrementLoginAttempts: function (patientNumber, onSuccess, onError) {
            function setLoginAttempts(loginAttempts) {
                var sql = "update Patient set LoginAttempts = ? where PatientNumber=?";
                //var sql = 'update Patient set LoginAttempts = LoginAttempts + 1 where PatientNumber=?';
                var pars = [loginAttempts + 1, patientNumber];

                patientController.setLocalLoginAttempts(patientNumber, patientController.getLocalLoginAttempts(patientNumber) + 1);
                dbController.executeSql(sql, pars, onSuccess, onError);
            }

            patientController.getLoginAttempts(patientNumber, setLoginAttempts);
        },
        resetLoginAttempts: function (patientNumber, onSuccess, onError) {
            var sql = 'update Patient set LoginAttempts = ? where PatientNumber=?';
            var pars = [0, patientNumber];

            patientController.setLocalLoginAttempts(patientNumber, 0);
            dbController.executeSql(sql, pars, onSuccess, onError);
        },
        showInvalidPinMessage: function () {
            app.alert(translationController.get('keyInvalidPinMessage'));
        },
        validSecurityAnswer: function (securityAnswer, onSuccess, onFail, onError) {
            //call the service and get the pin
            var sql = 'SELECT * FROM Patient WHERE SecurityAnswer = ?';
            var pars = [patientController.encryptMD5(securityAnswer)];

            function securityAnswerCallback(tx, rows) {
                //should this be -== 1 ?? todo:
                if (rows.length > 0) {
                    currentPatientObject = new Patient(rows[0]);

                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                } else {
                    if (typeof onFail == 'function') {
                        onFail();
                    }
                }
            }

            dbController.executeSql(
                sql,
                pars,
                securityAnswerCallback);

        },
        transmitPatientInformation: function (onSuccess, onError) {
            var sql = "SELECT * FROM Patient WHERE [Transmitted] = 'false'";
            var pars = [];

            //check connectivity-
            if (!serviceController.connected()) {
                if (typeof onSuccess == 'function') {
                    //TODO: double check that this is how it should be handled
                    onSuccess();
                }
            }

            function fnProcess(tx, rows) {
                if (rows.length > 0) {
                    var patients = [];
                    var patient;
                    var row;

                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        patient = {
                            Id: row['Id'],
                            EnrolledId: row['PatientNumber'],
                            Pin: row['Pin'],
                            IsTempPin: row['IsTempPin'],
                            PatientGender: row['PatientGender'],
                            SecurityQuestion: row['SecurityQuestion'],
                            SecurityAnswer: row['SecurityAnswer'],
                            LoginAttempts: row['LoginAttempts'],
                            IsTrainingComplete: row['IsTrainingComplete'],
                            EnrolledDate: serviceController.serializeDate(row['EnrolledDate'])
                        };
                    }
                    //get the last one
                    patients.push(patient);
                    //displayObject(patients);
                    function fn(patients, onSuccess, onError) {
                        if (patients.length > 0) {
                            var patient = patients.pop();
                            serviceCalls.transmitPatient(
                                patient,
                                function () {
                                    patientController.setPatientAsTransmitted(patient.Id, function () { fn(patients, onSuccess, onError); }
                                );
                                },
                                onError);
                            //TODO: this may need to be more resilient and continue the transmit attempts after initial fail.
                        } else {
                            if (typeof onSuccess == 'function') {
                                onSuccess();
                            }
                        }
                    };
                    //send the entries
                    fn(patients, onSuccess, onError);
                } else {

                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                }
            };

            dbController.executeSql(sql, pars, fnProcess);
        },
        setPatientAsTransmitted: function (id, onSuccess, onError) {
            var sql = 'UPDATE Patient SET Transmitted=? WHERE Id=?';
            var pars = ['true', id];

            dbController.executeSql(sql, pars, onSuccess, onError);
        },
        encryptMD5: function (val) {
            return (CryptoJS.MD5(val + '') + '').toUpperCase()
            //return CryptoJS.MD5(val);
        }

    };
})();
