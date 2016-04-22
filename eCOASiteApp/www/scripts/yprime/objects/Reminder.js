/***********************
File: 			Patient.js
Date: 			05Nov2015
Created: 		J Osifchin
Description: 	Reminder Object
                Inherits from Base Object
***************************/
function Reminder(obj, onSuccess, onError) {
    //initialize the object
    inheritBase(this);
    this.tableName = function () { return "Reminder"; };

    this.PatientNumber = null;
    this.ReminderName = null;
    this.ReminderTypeId = -1;
    this.ReminderValue = null;
    this.ReminderHour = -1;
    this.ReminderMinute = 0;
    this.Transmitted = 'false';


    this.get = function (patientId, reminderName, onSuccess, onError) {
        var pars = [patientId, reminderName];
        var sql = 'SELECT * FROM Reminder WHERE PatientNumber=? AND ReminderName=?';
        var handler = this;
        function callback(tx, results) {
            if (results.length == 1) {
                handler.mergeObject(results[0]);
                if (typeof onSuccess == 'function') {
                    onSuccess(tx, results);
                }
            }
        }

        dbController.executeSql(sql, pars, callback, onError);
    };

    this.loadCurrentSelectedReminderToDefaults = function () {
        var reminder = this;
        //TODO: this is too specific
        delete answers['SelectReminderType.reminderType-choice-1'];
        delete answers['SelectReminderType.reminderType-choice-2'];
        answers['SelectReminderType.reminderType-choice-' + reminder.ReminderTypeId] = (reminder.ReminderTypeId == 1) ? "email" : "text";
        answers[(reminder.ReminderTypeId == 1) ? 'EnterEmailAddress.emailAddress' : 'EnterPhoneNumber.phoneNumber'] = reminder.ReminderValue;
        answers['SelectReminderTime.DiaryTime'] = reminder.ReminderHour;
    };

    this.load(obj, onSuccess, onError);
}

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