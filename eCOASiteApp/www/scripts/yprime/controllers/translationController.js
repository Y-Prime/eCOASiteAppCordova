/***********************
File: 			translationController.js
Date: 			05Nov2015
Created: 		J Osifchin
Description: 	control for translations
***************************/
var translationController = (function () {
    return {
        keys: {},
        init: function (onSuccess, onError) {
            //load all translations into the main object from the db
            this.keys = {};
            this.setDefaultLanguageId('en-US');

            this.loadFromDB(onSuccess, onError);

            app.writeLog("Initialized Translation Controller...");
        },
        get: function (key, languageId) {
            //if not language use the default??
            languageId = (typeof languageId == 'undefined' || languageId == null) ? this.defaultLanguageId() : languageId;
            if (!this.keys[languageId]) {
                this.keys[languageId] = {};
            }
            // app.writeLog('----Getting translation: ' + key + ' lan:' + languageId);
            return uiController.encodeHTML(typeof this.keys[languageId][key] != 'undefined' ? this.keys[languageId][key] : key + "NOTFOUND");
        },
        translateHTMLObject: function (obj) {
            var key = $(obj).attr('translation');
            var languageId = $(obj).attr('translation-language');
            languageId = (typeof languageId == 'undefined' || languageId == null || languageId.length == 0) ? this.defaultLanguageId() : languageId;
            var translation = this.get(key, languageId);
            var type = $(obj)[0].type;

            switch (type) {
                case "text":
                case "password":
                case "textarea":
                case "number":
                    $(obj).attr("placeholder", translation);
                    break;
                case "button":
                    if ($(obj).find('span').length > 0) {
                        $(obj).find('span').html(translation);
                    } else {
                        $(obj).val(translation);
                    }
                    break;
                default:
                    $(obj).html(translation);
                    break;
            }
        },
        defaultLanguageId: function () {
            return patientLanguage;
        },
        setDefaultLanguageId: function (lang) {
            patientLanguage = lang;
        },
        loadFromService: function (onSuccess, onError) {
            function processTranslations(data) {
                var sqlArray = [];
                var parameterArray = [];
                //displayObject(data);
                //this returns key value pairs

                for (var p in data) {
                    var obj = {
                        TranslationKey: p,
                        TranslationText: data[p],
                        CultureCode: 'en-US'
                    };

                    sqlArray.push(dbController.getInsertUpdateSql(obj, 'Translation'));
                    parameterArray.push(dbController.getInsertUpdateParameters(obj));
                }

                dbController.executeSqlStatements(sqlArray, parameterArray, onSuccess);
            };
            if (serviceController.connected()) {
                serviceCalls.getTranslations(processTranslations, onError);
            } else {
                processTranslations(getOfflineTranslations());
            }
        },
        loadFromDB: function (onSuccess, onError) {
            function fnLoad(tx, rows) {
                translationController.keys = {};

                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (!translationController.keys[row['CultureCode']]) {
                        translationController.keys[row['CultureCode']] = {};
                    }
                    translationController.keys[row['CultureCode']][row['TranslationKey']] = row['TranslationText'];
                }

                //displayObject(translationController.keys);
                if (typeof onSuccess == 'function') {
                    onSuccess();
                }
            };

            dbController.executeSql('SELECT * FROM Translation', [], fnLoad, onError);
        }
    };
})();

/*
translationKeys
{
    "en-us": {
        "tk_OK":"OK",
        "tk_Cancel": "OK"
    },
    "en-es": {
        "tk_OK":"OK(spanish)",
        "tk_Cancel": "Cancelar"
    }
}
*/

function getOfflineTranslations() {
    var result =
        {
            "COWS1": "For each item, select the answer that best describes the patient's signs or symptoms. Rate on just the apparent relationship to opiate withdrawal.\n\nFor example, if herat rate is increased because the patient was jogging just prior to assessment, the increase pulse rate would not add to the score.", "COWS10": "Tremor: observation of outstretched hands", "COWS11": "Yawning: Observation during assessment", "COWS12": "Anxiety or Irritability:", "COWS13": "Gooseflesh skin:", "COWS2": "Resting Pulse Rate: (record beats per minute)\nMeasured after patient is sitting or lying for one minute", "COWS3": "Resting Pulse Rate: (record beats per minute)\nMeasured after patient is sitting or lying for one minute", "COWS4": "Sweating: over the past 1/2 hour not accounted for by ", "COWS5": "Restlessness: Observation during assessment", "COWS6": "Pupil size:", "COWS7": "Bone or Joint aches: If patient was having pain previously, only the additional component attributed to opiates withdrawal is scored", "COWS8": "Runny noise or tearing: Not accounted for by cold symptoms or allergies", "COWS9": "GI Upset: over last 1/2 hour", "DailyDiary1": "Confirm the date of your Daily Diary: [date] \n\nIs this correct?", "DailyDiary2": "What was your average pain in the last 24 hours?", "DailyDiary3": "What was the worst pain in the last 24 hours?", "DailyDiary4": "Did you take your morning dose of study medication today?", "DailyDiary5": "Did you take your evening dose of study medication today?", "DailyDiary6": "Was it necessary to take any immediate release opioid rescue medication today?", "DailyDiary7": "How many tablets of the immediate release opioid rescue medication did you take?", "key0": "0", "key015": "0-15 minutes", "key1": "1", "key10": "10", "key101120": "2 - Pulse rate 101-120", "key1630": "16-30 minutes", "key2": "2", "key3": "3", "key3145": "31-45 minutes", "key4": "4", "key4660": "46-60 minutes", "key5": "5", "key6": "6", "key60more": "More than 60 minutes", "key7": "7", "key8": "8", "key80below": "0 - Pulse rate 80 or below", "key81100": "1 - Pulse rate 81-100", "key9": "9", "keyAbout": "About", "keyalittle": "1 = a little", "keyalloftime": "All of the time", "keyBack": "Back", "keyCancel": "Cancel", "keyChangePIN": "Change PIN", "keyChangePinSuccess": "You have successfully changed your PIN.", "keyChangeReminderAlert": "Change Reminder Alert", "keyConfirmExit": "Select Ok to confirm you would like to exit the diary entry. Your diary entry will not be saved. Select continue to exit this screen and continue with your diary entry.", "keyConfirmYourNewPIN": "Confirm your new PIN", "keyconstantrunning": "4 - Nose constantly running or tears streaming down cheeks", "keycontact": "Contact your doctor's office", "keycontactprime": "Contact Prime Support", "keyCopyright": "YPrime ePRO Copyright © 2015", "keyDailyDiary": "Daily Diary", "keyDailyDiaryHistory": "Daily Diary History", "keyDataHasBeenSaved": "Data has been saved on the device.", "keyDataSavedOnDevice": "Data saved on device.", "keyDataSendingFailed": "Data sending failed.", "keyDataSuccessfullySent": "Data successfully sent!", "keydifficultysitting": "1 - Reports difficulty sitting still, but is able to do so", "keyElectronicSignature": "Electronic Signature", "keyElectronicSignatureText": "Enter PIN to save data and confirm you have entered the data related to your experience.", "keyEmailAddressRequired": "Email address is required.", "keyEnterOldPIN": "Enter your old PIN number.", "keyEnterYourEmailAddress": "Enter your email address:", "keyEnterYourNewPIN": "Enter your new PIN", "keyEnterYourPhoneNumber": "Enter your phone number:", "keyError": "An error has occurred.", "keyErrorMessage": "An error has occurred. Please contact support.", "keyExit": "Exit", "keyextremely": "4 = extremely", "keyflushed": "2 - Flushed or observable moistness on the face", "keyforgot": "Use the Forgot PIN button", "keyForgotPIN": "Forgot PIN", "keyfrequentshifting": "3 - Frequent shiftinig or extraneous movements of legs/arms", "keygoodbit": "A Good Bit of the Time", "keygreater120": "4 - Pulse rate greater than 120", "keygrosstremor": "4 - Gross tremor or muscle twithing", "keyHistory": "History", "keyIncorrectLastFourDigits": "The last four digits of your phone number are incorrect.", "keyincreasingirritability": "1 - Patient reports increasing irritability or anxiousness", "keyInvalidLast4Digits": "Entry must be 4 digits in length. Please select the OK button to enter a 4 digits.", "keyInvalidLogin": "The login information you have entered is incorrect.  Please re-enter your login information.", "keyInvalidPinMessage": "The PIN you have entered is invalid.", "keyLastFourDigitsPhoneNumber": "Enter the last four digits of your phone number.", "keylittleoftime": "A Little of the Time", "keyLoading": "Loading...", "keyLogin": "Login", "keymilddiscomfort": "1 - Mild diffuse discomfort", "keymoderately": "2 = moderately", "keymorethanhalf": "More than half the days", "keymoretraining": "No, I need more training", "keymostoftime": "Most of the Time", "keymultipleepisodes": "5 - Multiple episodes of diarrhea or vomiting", "keynausea": "2 - Nausea or loose stool", "keynearlyeveryday": "Nearly every day", "keyNewPINDoesNotMatchConfirmPIN": "The new PIN and the confirm PIN do not match.", "keyNext": "Next", "keyno": "No", "keynochills": "0 - No report of chills or flushing", "keynoGI": "0 - No GI symptoms", "keynone": "0 - None", "keynoserunning": "2 - Nose running or tearing", "keynotatall": "0 = not at all", "keynotpresent": "0 - Not present", "keynotremor": "0 - No tremor", "keyNoUnsentData": "No unsent data present.", "keynoywaning": "0 - No yawning", "keyobviouslyirritable": "2 - Patient obviously irritable anxious", "keyOK": "OK", "keyPhoneNumberRequired": "Phone number is required.", "keypiloeretion": "3 - Piloerection of skin can be felt or hairs standing up on arms", "keyPIN": "PIN", "keyPleaseWait": "Please wait.", "keyPoweredBy": "Powered By", "keyPracticeDailyDiary": "Practice Daily Diary", "keyprominent": "5 - Prominent piloerection", "keypupilsdilated": "2 - Pupils moderately dilated", "keypupilsiris": "5 - Pupils so dilated that only the rim of the iris is visible", "keypupilslarger": "1 - Pupils possibly larger than normal for room light", "keypupilsnormal": "0 - Pupils pinned or normal size for room light", "keyquiteabit": "3 = quite a bit", "keyready": "Yes, I am ready", "keyReminderTimeRequired": "A reminder time is required.", "keyrepeat": "Repeat Training", "keyrubbingjoints": "4 - Patient is rubbing joints or muscles and is unable to site still because of discomfort", "keySelectReminderTime": "Please select your preferred time for this diary reminder:", "keySendingData": "Sending data...", "keyseveral": "Several days", "keyseverediffuse": "2 - Patient reports severe diffuse aching or joints/muscles", "keysitstill": "0 - Able to sit still", "keyslighttremor": "2 - Slight tremor observable", "keysmooth": "0 - Skin is smooth", "keySoftwareVersion": "Software Version", "keysoirritable": "4 - Patient so irritable or anxious that participation in the assessment is difficult", "keysomeoftime": "Some of the Time", "keystomachcramps": "1 - Stomach cramps", "keyStudyNumber": "Study Number", "keystuffiness": "1 - Nasal stuffiness or unusually moist eyes", "keySubjectID": "Subject ID", "keysubjectivechills": "1 - Subjective report of chills or flushing", "keySubjectMainMenu": "Subject Main Menu", "keysweat": "3 - Beads of sweat on brow or face", "keysweatstreaming": "4 - Sweat streaming off face", "keyTermsOfUse": "Terms Of Use", "keyTermsOfUseMessage": "\r\n    ", "keyToolsMenu": "Tools Menu", "keyTraining": "Training", "keyTrainingMenu": "Training Main Menu", "keytremorfelt": "1 - Tremor can be felt, but not observed", "keyTroubleshooting": "Troubleshooting", "keyTroubleshootingText": " ", "keyTryAgain": "Try Again", "keyTryLater": "Try Later", "keyunablesit": "5 - Unable to sit still for more than a few seconds", "keyUnsentData": "Device contains unsent data.", "keyVersion": "Version", "keyvomiting": "3 - Vomiting or diarrhea", "keyyawningonce": "1 - Yawning once or twice during assessment", "keyyawningseveral": "4 - Yawning several times/minute", "keyyawningthree": "2 - Yawning three or more times during assessment", "keyyes": "Yes", "keyYouHaveSuccessfullyChangedYourReminder": "You have successfully changed your reminder alert.", "keyYouHaveSuccessfullyEnrolled": "You have successfully enrolled!", "MOS1": "1. How long did it usually take for you to fall asleep during the past 4 weeks?", "MOS10": "10. How often during the past 4 weeks did you snore during your sleep?", "MOS11": "11. How often during the past 4 weeks did you take naps (5 minutes or longer) during the day?", "MOS12": "12. How often during the past 4 weeks did you get the amount of sleep you needed?", "MOS2": "2. On the average, how many hours did you sleep each night during the past 4 weeks?", "MOS3": "3. How often during the past 4 weeks did you feel that your sleep was not quiet (moving restlessly, feeling tense, speaking, etc., while sleeping)?", "MOS4": "4. How often during the past 4 weeks did you get enough sleep to feel rested upon waking in the morning?", "MOS5": "5. How often during the past 4 weeks did you awaken short of breath or with a headache?", "MOS6": "6. How often during the past 4 weeks did you feel drowsy or sleepy during the day?", "MOS7": "7. How often during the past 4 weeks did you have trouble falling asleep?", "MOS8": "8. How often during the past 4 weeks did you awaken during your sleep time and have trouble falling asleep again?", "MOS9": "9. How often during the past 4 weeks did you have trouble staying awake during the day?", "PHQ81": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n1. Little interest or pleasure in doing things", "PHQ82": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n2. Feeling down, depressed, or hopeless", "PHQ83": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n3. Trouble falling or staying asleep, or sleeping too much", "PHQ84": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n4. Feeling tired or having little energy", "PHQ85": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n5. Poor appetite or overeating", "PHQ86": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n6. Feeling bad about yourself, or that you are a failure, or have let yourself or your family down", "PHQ87": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n7. Trouble concentrating on things, such as reading the newspaper or watching television", "PHQ88": "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\n8. Making or speaking so slowly that other peopld could have noticed. Or the opposite--being so fidgety or restless that you have been moving around a lot more than usual", "PQAS1": "Instructions: There are different aspects and types of chronic low back pain that patients experience and that we are interested in measuring. Pain can feel sharp, hot, cold, dull, and achy. Some pains may feel like they are very superficial (at skin-level), or they may feel like they are from deep inside your body. Pain can be described as unpleasant and also can have different time qualities.\n\nThe Pain Quality Assessment Scale helps us measure these and other different aspects of your pain. For one patient, a pain might feel extremely hot and burning, but not at all dull, while another patient may not experience any burning pain, but feel like their pain is very dull and achy. Therefore, we expect you to rate very high on some of the scales and very low on others. \n\nPlease use the 19 rating sclaes to rate how much of each different pain quality and type you may or may not have felt OVER THE PAST WEEK, ON AVERAGE. Please select the number that best describes your pain.", "PracticeDailyDiary1": "Confirm the date of your Daily Diary: [date] \n\nIs this correct?", "PracticeDailyDiary2": "What was your average pain in the last 24 hours?", "PracticeDailyDiary3": "What was the worst pain in the last 24 hours?", "PracticeDailyDiary4": "Did you take your morning dose of study medication today?", "PracticeDailyDiary5": "Did you take your evening dose of study medication today?", "PracticeDailyDiary6": "Was it necessary to take any immediate release opioid rescue medication today?", "PracticeDailyDiary7": "How many tablets of the immediate release opioid rescue medication did you take?", "SOWS1": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI feel anxious.", "SOWS10": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nMy bones and muscles ache.", "SOWS11": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI feel restless.", "SOWS12": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI feel nauseous.", "SOWS13": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI feel like vomiting.", "SOWS14": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nMy muscles twitch.", "SOWS15": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI have cramps in my stomach.", "SOWS16": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI feel like shooting up now.", "SOWS2": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI feel like yawning.", "SOWS3": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI'm perspiring.", "SOWS4": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nMy eyes are tearing.", "SOWS5": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nMy nose is running.", "SOWS6": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI have goose flesh.", "SOWS7": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI am shaking.", "SOWS8": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI have hot flashes.", "SOWS9": "Instructions: Based on the way you feel now, rate each of the symptoms on a scale for 0-4.\n\nI have cold flashes.",
            "Training1": "<h3>Training Instructions</h3><p>Please complete the following training and short quiz.</p><p>Let's get started! Tap \"Next\" to begin.</p><p>Please complete the following training and short quiz.</p>", "Training10": "", "Training11": "", "Training12": "What do you do if you forget your PIN?", "Training13": "Do you understand how to use the system and are you ready to use it?", "Training14": "More Training", "Training15": "", "Training16": "", "Training2": "", "Training3": "", "Training4": "", "Training5": "", "Training6": "", "Training7": "", "Training8": "", "Training9": ""
        }
    ;

    return result;
}

/*
 this.keys = {
                "en-us": {
                    "tk_OK": "OK",
                    "tk_Cancel": "Cancel",
                    "tk_Test": "Test translation",
                    "tk_SubjectMainMenu": "Subject Main Menu",
                    "tk_Login": "Login",
                    "tk_SubjectId": "Subject ID",
                    "tk_PIN": "PIN",
                    "tk_ForgotPIN": "Forgot PIN",
                    "tk_Exit": "Exit",
                    "tk_Next": "Next",
                    "tk_Back": "Back",
                    "tk_Copyright": "YPrime ePRO &copy; 2015",
                    "OtherSymptomStopDateQuestion": "<h2>Stop date Question</h2><p>INFORMATIONAL TEXT</p>",
                    "OtherSymptomIntensityQuestion": "<h2>Symptom Intensity</h2>Nullam accumsan tempor justo, id feugiat ipsum rutrum in. Vestibulum ultricies elementum risus, a fringilla tortor.",
                    "OtherSymptomMedAdviceQuestion": "Advice Q 1 : <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla posuere sapien non erat gravida, sed maximus tortor euismod. Curabitur ac tortor id tortor sodales cursus. Nam id risus elit. Duis a sem non dolor sagittis pretium nec at leo. Morbi mattis leo varius magna tempor, vel dictum orci porta. Fusce eu nulla turpis. Nam finibus erat ut rutrum euismod. Nam felis felis, dapibus nec leo non, ultricies auctor nunc.</p>",
                    "OtherSymptomMedAdviceQuestion2": "Advice Q 2",
                    "PlainRadio": "Plain radio button",
                    "HorizontalRadio": "Horizontal Radio button",
                    "HorizontalRadio2": "How is your left shoulder?",
                    "CustomScreen": "Custom Screen Text",
                    "tk_None": "None",
                    "tk_Mild": "Mild",
                    "tk_Mod": "Mod",
                    "tk_Severe": "Severe",
                    "VerticalSlider": "<p>We would like to know how is your health today.</p><p>The scale is marked from 0 to 100</p><p>100 means the best health you can imagine.</p><p>0 means the worst health you can imagine.</p><p>Please tap on the scale to indicate how your health is TODAY.</p>",
                    "VerticalSliderHealthToday": "Your Health Today =",
                    "VerticalSliderMax":"The best health you can imagine",
                    "VerticalSliderMin": "The worst health you can imagine",
                    "ConfirmExit": "Select Ok to confirm you would like to exit the diary entry. Your diary entry will not be saved. Select continue to exit this screen and continue with your diary entry.",
                    "tk_Loading": "Loading",
                    "keyPleaseWait": "Please wait...",
                    "tk_InvalidLogin": "The login information you have entered is incorrect.  Please re-enter your login information.",
                    "tk_MaxLoginAttempts": "The login information you have entered is incorrect.  Please select Forgot PIN link or call Prime Support for assistance: 888-201-7988."
                },
                "en-es": {
                    "tk_OK": "OK(spanish)",
                    "tk_Cancel": "Cancelar",
                    "tk_Test": "Prueba de traducción",
                    "tk_SubjectMainMenu": "Menú principal temau",
                    "tk_Login": "el login",
                    "tk_SubjectId": "sujeto id",
                    "tk_PIN": "Número de PIN",
                    "tk_ForgotPIN": "olvidó el número del PIN",
                    "tk_Exit": "la salida",
                    "tk_Copyright": "YPrime ePRO &copy; 2015"
                },
                "zh-cn": {
                    "tk_OK": "还行",
                    "tk_Cancel": "取消",
                    "tk_Test": "测试",
                    "tk_SubjectMainMenu": "主题主菜单",
                    "tk_Login": "登录",
                    "tk_SubjectId": "主题 ID",
                    "tk_PIN": "针脚数",
                    "tk_ForgotPIN": "忘记了 PIN 号码",
                    "tk_Exit": "退出",
                    "tk_Copyright": "YPrime 易宝 &copy; 2015"
                }
            };
*/