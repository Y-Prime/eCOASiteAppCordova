// desktop mode
var desktopMode = true,
    DEBUGMODE = false;
var SERVER_URL = 'http://val-opcservices.eclinicalcloud.net/';
if (DEBUGMODE) {
    SERVER_URL = 'http://localhost:59388/'; //THIS IS FOR DEBUG
}

var STUDY_NUMBER = "OPC 2065-5",
SOFTWARE_VERSION = "",

// patient enrollment variables
currentSubjectNumber,
currentPatientObject, //this is the Patient() object
maximumLoginAttempts = 10,
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

lastErrorMessage = '',

//standard base vars
compareDateFormat = 'YYYY-MM-DD',
displayDateFormat = 'DD MMM YYYY',

// App version for desktopMode, not too important
desktopModeAppVersion = "1.0.0",
answers = {},

/*not sure but these are probably no good*/
    loginAttempt = 0,
   languageId = 'en-US'
;

