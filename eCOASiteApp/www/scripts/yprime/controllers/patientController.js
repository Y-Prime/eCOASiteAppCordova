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
            function fnLoggedIn(onLoginSuccess, onLoginError) {
                patientController.resetLoginAttempts(patientId, onLoginSuccess, onLoginError);
            }

            patientController.setCurrentLoggingInPatientNumber(patientId);
            if (patientId.length > 0 && pin.length > 0) {
                if (serviceController.connected()) {
                    this.loginAPI(patientId, pin, function () { fnLoggedIn(onSuccess, onError); }, onFail, onError);
                } else {
                    this.loginDB(patientId, pin, function () { fnLoggedIn(onSuccess, onError); }, onFail, onError);
                }
            } else {
                if (typeof onFail == 'function') {
                    onFail();
                }
                this.failedLoginHandler(xhr, status, error);
            }
        },
        loginAPI: function (patientId, pin, onSuccess, onFail, onError) {
            function onAPISuccess(e) {
                function checkForVersionUpdate(onVersionSuccess, onVersionError) {
                    var deviceId = app.getDeviceId();
                    var patientNumber = patientController.getCurrentPatient().PatientNumber;
                    app.syncVersionDataCheckPatientService(patientNumber, deviceId, onVersionSuccess, onVersionSuccess);
                }

                function loginSuccess(onSuccess, onError) {
                    function tempPinSuccess(onSuccess, onError) {
                        patientController.checkForTemporaryPin(onSuccess);
                    }

                    checkForVersionUpdate(function () { tempPinSuccess(onSuccess, onError); }, onError);
                }

                //check the pin against the sent pin
                //login in the user
                //check against the db
                patientController.setCurrentPatient(new Patient({
                    Id: e.Id,
                    EnrolledId: e.EnrolledId,
                    PatientNumber: e.EnrolledId, //TODO: this may not be correct!!!
                    PatientGender: e.PatientGender, //Assembla #217, 243 - losing the patient gender on login in db - jo 02Feb2016
                    Pin: e.Pin,
                    IsTempPin: e.IsTempPin,
                    PatientStatusTypeId: e.PatientStatusTypeId,
                    SecurityAnswer: e.SecurityAnswer,
                    LoginAttempts: e.LoginAttempts,
                    EnrolledDate: e.EnrolledDate,
                    IsTrainingComplete: e.IsTrainingComplete//,
                    //these are not returned from the service right now.
                    /*PhoneNumber: e.PhoneNumber, 
                    SiteId, 
                    NextVisit, 
                    BLDate*/
                }));
                currentSubjectNumber = patientId;

                patientController.getCurrentPatient().insertUpdate(null, function () { loginSuccess(onSuccess, onError); }, onError);
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
                    patientController.setCurrentPatient(new Patient(results[0]));
                    currentSubjectNumber = patientId;
                    //make sure to set the base 64 token for patient

                    serviceController.setAuthHeader(patientId, pin, false);
                    patientController.checkForTemporaryPin(onSuccess);
                    //if (typeof onSuccess == 'function') {
                    //    onSuccess();
                    //}
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
            patientController.setCurrentPatient({});
            if (typeof onSuccess == 'function') {
                onSuccess();
            }
        },
        getCurrentLoginCallback: function () {
            if (typeof currentLoginCallback == 'undefined') {
                currentLoginCallback = null;
            }
            return currentLoginCallback;
        },
        setCurrentLoginCallback: function (callback) {
            currentLoginCallback = callback;
        },
        getCurrentChangePinCallback: function () {
            if (typeof currentChangePinCallback == 'undefined') {
                currentChangePinCallback = null;
            }
            return currentChangePinCallback;
        },
        setCurrentChangePinCallback: function (callback) {
            currentChangePinCallback = callback;
        },
        getCurrentEnrollmentCallback: function () {
            if (typeof currentEnrollmentCallback == 'undefined') {
                currentEnrollmentCallback = null;
            }
            return currentEnrollmentCallback;
        },
        setCurrentEnrollmentCallback: function (callback) {
            currentEnrollmentCallback = callback;
        },
        validPin: function (val) {
            return val.length >= 4;
        },
        validChangePIN: function (oldPIN, newPIN, confirmPIN) {
            //note this returns a message, if blank then valid
            //TODO: add extra logic
            var message = '';

            if (newPIN != confirmPIN) {
                message += (message.length > 0 ? '<br/>' : '') + translationController.get('keyNewPINDoesNotMatchConfirmPIN');
            }

            return message;
        },
        getCurrentPatientIsTempPin: function () {
            var result = false;
            if (typeof patientController.getCurrentPatient() != 'undefined') {
                result = patientController.getCurrentPatient().IsTempPin == true || patientController.getCurrentPatient().IsTempPin == 'true';
            }
            return result;
        },
        checkForTemporaryPin: function (onSuccess, onError) {
            if (patientController.getCurrentPatientIsTempPin()) {
                //add a check for enrollment here
                function changePinSuccess() {
                    patientController.checkForEnrollment(onSuccess, onError);
                }
                //reset the pin
                patientController.setCurrentChangePinCallback(changePinSuccess);
                screenController.changeScreen('EnterNewPIN', '');
            } else {
                patientController.checkForEnrollment(onSuccess, onError);
                //if (typeof onSuccess == 'function') {
                //    onSuccess();
                //}
                //patientController.checkForReminderSetup(onSuccess, onError);
            }
        },
        getExitChangePinScreen: function () {
            return app.getSiteBasedMode() ? 'VisitQuestionnaires' : 'Tools' ;
        },
        getExitChangePinScreenTitle: function () {
            return app.getSiteBasedMode() ? '' : 'keyToolsMenu';
        },
        checkForEnrollment: function (onSuccess, onError) {
            function onTrue() {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            }
            function onFalse() {
                patientController.setCurrentEnrollmentCallback(onSuccess);
            }

            if (patientController.getCurrentPatient().isEnrolled()) {
                onTrue();
            } else {
                onFalse();
                //go to the page
                screenController.changeScreen('PatientEnrollSecurityQuestion', '');
            }

        },
        validSecurityAnswerValue: function (securityQuestionId, answerValue) {
            var message = '';
            answerValue = answerValue + '';
            //TODO: this number should be configurable! + more logic per security question
            if (answerValue.length != 4) {
                message += (message.length > 0 ? '<br/>' : '') + translationController.get('keyInvalidLast4Digits');
            }
            return message;
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

            reminderController.getReminderCount(patientController.getCurrentPatient().PatientNumber, fn, null);
        },
        checkForTrainingCompleted: function (onSuccess, onError) {
            if (!patientController.getCurrentPatient().IsTrainingComplete) {
                function completeTrainingQuestionnaire(callback) {
                    //check for training
                    patientController.getCurrentPatient().completeTraining(callback);
                }

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
                app.alert(translationController.get(attempts <= patientController.maximumLoginAttempts ? 'keyInvalidLogin' : 'keyInvalidLoginMax'));
            }

            //get the number of attempts
            if (patientNumber != null) {
                function getPatientAttempts() {
                    patientController.getLoginAttempts(patientNumber, displayFailedLoginMessage);
                }

                patientController.incrementLoginAttempts(patientNumber, getPatientAttempts);
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
                    LoginAttempts = rows.length > 0 ? rows[0]['LoginAttempts'] * 1 : 0;
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
        getLocalLoginAttempts: function (patientNumber) {
            if (typeof localLoginAttempts[patientNumber] == 'undefined') {
                localLoginAttempts[patientNumber] = 0;
            }
            return localLoginAttempts[patientNumber];
        },
        setLocalLoginAttempts: function (patientNumber, val) {
            localLoginAttempts[patientNumber] = val;
        },
        incrementLoginAttempts: function (patientNumber, onSuccess, onError) {
            var sql = 'update Patient set LoginAttempts = LoginAttempts + 1 where PatientNumber=?';
            var pars = [patientNumber];

            patientController.setLocalLoginAttempts(patientNumber, patientController.getLocalLoginAttempts(patientNumber) + 1);
            dbController.executeSql(sql, pars, onSuccess, onError);
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
                    patientController.setCurrentPatient(new Patient(rows[0]));

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
        syncQuestionnaires: function (patientId, onSuccess, onError) {
            function doOnSuccess() {
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            }

            //check connectivity
            if (!serviceController.connected()) {
                doOnSuccess();
            }

            function processQuestionnaires(data) {
                var sqlCommands = [];
                var pars = [];

                function createObject(e) {
                    return {
                        Guid: e.Guid,
                        //Id: e.Id,
                        PatientNumber: e.PatientNumber,
                        Date: e.Date,
                        VisitId: e.VisitId,
                        QuestionnaireName: e.EDiaryQuestionnaireName,
                        Status: e.Status,
                        Source: e.Source,
                        Started: e.Started,
                        Completed: e.Completed,
                        TransmitDate: e.Transmitted
                    };
                }

                for (var i = 0; i < data.length; i++) {
                    var entry = data[i];
                    //check each patient to db
                    var entryObject = createObject(entry);
                    sqlCommands.push(dbController.getInsertUpdateSql(entryObject, 'EDiary'));
                    pars.push(dbController.getInsertUpdateParameters(entryObject));
                }

                dbController.executeSqlStatements(sqlCommands, pars, doOnSuccess);
            }

            /*
            Answers: Array[8]
            Completed: "2015-11-17T20:47:38.846+00:00"
            Date: "2015-11-17T00:00:00"
            EDiaryPatientId: 8
            EDiaryQuestionnaireName: "Daily_Diary"
            Guid: "c174bd41-2b31-d01f-fc82-299e4e83ce65"
            Id: 7
            PatientNumber: null
            SiteId: null
            Source: "BYOD      "
            Started: "2015-11-17T20:47:26.715+00:00"
            Status: "Saved"
            Transmitted: "2015-11-17T15:53:50.0422015-05:00"
            */

            serviceCalls.syncQuestionnaires(patientId, processQuestionnaires, onError);
        },
        getAllPatients: function (onSuccess, onFail) {
            var sql = 'select * from Patient order by EnrolledId';
            var pars = [];

            dbController.executeSql(sql, pars, onSuccess, onFail)
        },
        inloadPatients: function (sitepatients, onSuccess, onFail) {
            var sqlCommands = [];
            var pars = [];

            function createObject(e) {
                return new Patient({
                    Id: e.Id,
                    EnrolledId: e.EnrolledId,
                    PatientNumber: e.EnrolledId, //TODO: this may not be correct!!!
                    Pin: e.Pin,
                    IsTempPin: e.IsTempPin,
                    PatientGender: e.PatientGender,
                    PatientStatusTypeId: e.PatientStatusTypeId,
                    SecurityAnswer: e.SecurityAnswer,
                    LoginAttempts: e.LoginAttempts,
                    EnrolledDate: e.EnrolledDate,
                    IsTrainingComplete: e.IsTrainingComplete,
                    SiteId: e.SiteId
                });
            }

            for (var i = 0; i < sitepatients.length; i++) {
                var siteObject = sitepatients[i];
                var siteId = siteObject.SiteId;
                for (var j = 0; j < siteObject.Patients.length; j++) {
                    //check each patient to db
                    var patientObject = createObject(siteObject.Patients[j]);
                    sqlCommands.push(dbController.getInsertUpdateSql(patientObject, 'Patient'));
                    pars.push(dbController.getInsertUpdateParameters(patientObject));
                }
            }

            dbController.executeSqlStatements(sqlCommands, pars, onSuccess, onFail);
        },
        encryptMD5: function (val) {
            return (CryptoJS.MD5(val + '') + '').toUpperCase()
            //return CryptoJS.MD5(val);
        }

    };
})();
