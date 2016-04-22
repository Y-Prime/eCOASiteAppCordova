/*global openDatabase */
// open or create websql db if it doesn't exist
//var db = openDatabase('eprodb', '1.0', 'database for epro phonegap', 2 * 1024 * 1024),

// desktop mode
var desktopMode = true,
    DEBUGMODE = false;//,
    //SKIPSYNC = true;//this skips the initial sync to speed up the process

var SERVER_URL = 'http://val-opcservices.eclinicalcloud.net/';
if (DEBUGMODE) {
    SERVER_URL = 'http://localhost:59388/'; //THIS IS FOR DEBUG
}

var STUDY_NUMBER = "OPC 2065-5",
SOFTWARE_VERSION = "",

// App version for desktopMode, not too important
desktopModeAppVersion = "1.0.0",

loginAttempt = 0,
loginAttemptPatient = 0,
phoneAttemptPatient = 0,
// change user override, this is to enable change user function 
changeUserOverride = false,
// time and date
subjectStartTime,
subjectEndTime,
durationSAQ = 0,
//Site
currentSite,
// patient enrollment variables
currentSubjectNumber,
currentPatientObject, //this is the Patient() object
patientLanguage,
patientPassword,
patientPhone,
//reminder information
reminderName = "DiaryReminder1",
currentReminder = {},
currentVisitNumber = -1,
saveCurrentQuestionnaire = false,
questionnaireStartTime = null,
questionnaireCompletedTime = null,
currentDiaryDate = null, //retain the current diary date for later saves
diaryStartTime = 18, //global for diary availability
diaryEndTime = 10, //global for diary availability

answers = {},

   //PIN control
   currentSubjectPIN,
   oldPIN,
   newPIN,
   isTempPIN,

   lastErrorMessage = '',

   currentSubjectPhoneNumber,
   currentpatientquestion = 0,
   BLDate,
   // language
   languageId = 'en-US',

   //standard base vars
   compareDateFormat = 'YYYY-MM-DD',
   displayDateFormat = 'DD MMM YYYY'
;

