/***********************
File: 			reminderController.js
Date: 			30Oct2015
Created: 		J Osifchin
Description: 	control to reminders
***************************/
var reminderController = (function () {
    return {
        currentSelectedReminder: {
            ReminderName: "",
            ReminderTypeId: -1,
            ReminderValue: "",
            ReminderHour: 0,
            ReminderMinute: 0
        },
        clearCurrentSelectedReminder: function () {
            this.currentSelectedReminder = {};
        },
        getReminders: function (patientId, reminderName, onSuccess, onError) {
            var pars = [patientId];
            var sql = 'SELECT * FROM Reminder WHERE PatientNumber=?';
            if (reminderName != null && reminderName.length > 0) {
                pars.push(reminderName);
                sql += ' AND ReminderName=?';
            }
            dbController.executeSql(
                sql,
                pars,
                function (tx, results) {
                    if (results.length == 1) {
                        var row = results[0];
                        reminderController.currentSelectedReminder = new Reminder({
                            PatientNumber: row['PatientNumber'],
                            ReminderName: row['ReminderName'],
                            ReminderTypeId: row['ReminderTypeId'],
                            ReminderValue: row['ReminderValue'],
                            ReminderHour: row['ReminderHour'],
                            ReminderMinute: row['ReminderMinute'],
                            Transmit: false,
                        });

                        //reminderController.currentSelectedReminder = new Reminder(row.reminderName, row.reminderTypeId, row.reminderValue, row.reminderHour, row.reminderMinute);
                    }
                    if (typeof onSuccess == 'function') {
                        onSuccess(tx, results);
                    }
                },
                onError
            );
        },
        updateReminder: function (onSuccess, onFail) {
            reminderController.currentSelectedReminder.Transmitted = false;
            //call a generic success screen??

            if (typeof currentReminder.insertUpdate != 'function') {
                currentReminder = new Reminder({ PatientNumber: currentSubjectNumber });
            }

            function updateSuccess() {
                enrolling = false;
                reminderController.clearCurrentSelectedReminder();
                if (serviceController.connected()) {
                    //TODO: this may not be right
                    app.syncAnswers(onSuccess, onSuccess);
                } else {
                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                }
            }

            $.extend(currentReminder, reminderController.currentSelectedReminder);
            currentReminder.insertUpdate(null, updateSuccess);
        },
        transmitReminders: function (onSuccess, onError) {
            var sql = "SELECT * FROM Reminder WHERE [Transmitted] = 'false'";
            var pars = [];

            //check connectivity
            if (!serviceController.connected()) {
                if (typeof onSuccess == 'function') {
                    //TODO: double check that this is how it should be handled
                    onSuccess();
                }
            }

            function fnProcess(tx, rows) {
                if (rows.length > 0) {
                    var reminders = [];
                    var reminder;
                    var row;

                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        reminder = {
                            PatientNumber: row['PatientNumber'],
                            ReminderName: row['ReminderName'],
                            ReminderMethodId: row['ReminderTypeId'],
                            ReminderValue: row['ReminderValue'],
                            ReminderHour: row['ReminderHour'],
                            ReminderMinute: row['ReminderMinute']
                        };
                    }
                    //get the last one
                    reminders.push(reminder);

                    function processReminder(reminders, onSuccess, onError) {
                        if (reminders.length > 0) {
                            var reminder = reminders.pop();
                            serviceCalls.transmitReminder(
                                reminder,
                                function () {
                                    reminderController.setReminderAsTransmitted(
                                        reminder.PatientNumber,
                                        reminder.ReminderName,
                                        function () { processReminder(reminders, onSuccess, onError); }
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
                    processReminder(reminders, onSuccess, onError);
                } else {

                    if (typeof onSuccess == 'function') {
                        onSuccess();
                    }
                }
            };

            dbController.executeSql(sql, pars, fnProcess);
        },
        setReminderAsTransmitted: function (patientNumber, reminderName, onSuccess, onError) {
            var sql = 'UPDATE Reminder SET Transmitted=? WHERE PatientNumber=? AND ReminderName=?';
            var pars = ['true', patientNumber, reminderName];

            dbController.executeSql(sql, pars, onSuccess, onError);
        },
        //getUntransmittedReminders: function (onSuccess, onError) {
        //    var pars = ['false'];
        //    var sql = 'SELECT * FROM Reminder WHERE Transmit =?';
        //    dbController.executeSql(
        //        sql,
        //        pars,
        //        function (tx, results) {
        //            if (typeof onSuccess == 'function') {
        //                onSuccess(tx, result);
        //            }
        //        },
        //        onError
        //    );
        //},
        //setRemindersAsTransmitted: function (ids, onSuccess, onError) {
        //    var pars = ['true'];
        //    //TODO: not sure how to handle this yet
        //    var sql = 'UPDATE Reminder SET Transmit = ? WHERE ROWID IN(' + ids.join() + ')'
        //    dbController.executeSql(
        //        sql,
        //        pars,
        //        function (tx, results) {
        //            if (typeof onSuccess == 'function') {
        //                onSuccess(tx, result);
        //            }
        //        },
        //        onError
        //    );
        //},
        getReminderCount: function (patientId, onSuccess, onError) {
            dbController.executeSql(
                'SELECT COUNT(*) AS cnt FROM Reminder WHERE PatientNumber=?',
                [patientId],
                function (tx, results) {
                    onSuccess(results[0].cnt);
                },
                onError
            );
        }
    };
})();


/********************
NOTE: the id column is ROWID
---------------------
reminder (
    patientId TEXT
    , reminderName TEXT
    , reminderTypeId INT
    , reminderValue TEXT
    , reminderHour INT
    , reminderMinute INT
    , transmit TEXT
    , PRIMARY KEY (patientId, reminderName)
)
**********************/