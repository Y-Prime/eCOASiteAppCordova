/***********************
File: 			fileController.js
Date: 			30Oct2015
Created: 		J Osifchin
Description: 	control to handle file manipulations
***************************/
var fileController = (function () {
    return {
        writeFile: function (filename, text, overwrite, onSuccess, onError) {
            function fnCallback(file) {
                var textToWrite = "[" + (new Date()) + "]" + text + "\n";
                file.createWriter(function (fileWriter) {
                    if (!overwrite) {
                        fileWriter.seek(fileWriter.length);
                    }

                    var blob = new Blob([textToWrite], { type: 'text/plain' });
                    fileWriter.write(blob);

                    if (typeof onSuccess == "function") {
                        onSuccess();
                    }
                }, 
                function (e, f, g) {
                    fileController.fileErrorHandler(e, f, g, onError);
                });
            }

            this.runFileRoutine(filename, fnCallback);
        },
        readFile: function (filename, onSuccess, onError) {
            function fnCallback(fileObj) {
                fileObj.file(function (file) {
                    var reader = new FileReader();

                    reader.onloadend = function (e) {
                        console.log(this.result);
                        if (typeof onSuccess == "function") {
                            onSuccess(this.result);
                        }
                    };

                    reader.readAsText(file);
                },
                function (e,f,g) {
                    fileController.fileErrorHandler(e, f, g, onError);
                });
            }

            this.runFileRoutine(filename, fnCallback);
        },
        runFileRoutine: function (filename, onSuccess) {
            if (typeof window.resolveLocalFileSystemURL != "undefined") {
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dir) {
                    dir.getFile(filename, { create: true }, function (file) {
                        if (typeof onSuccess == "function") {
                            onSuccess(file);
                        }
                    });
                });
            }
        },
        fileErrorHandler: function (e, f, g, onError) {
            if (typeof onError == "function") {
                onError();
            }
            window.onerror(e, f, g);
        }
    };
})();