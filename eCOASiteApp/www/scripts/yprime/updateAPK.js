
function updateAPK() {
    getAppVersion(function(version){
		getRemoteVersion(version)
    });
	
}
function getRemoteVersion(versionNumber) {
	$.support.cors = true;

    var surl = SERVER_URL + "jcz7p2ct8690xdnb4j75/eproversion.txt";
    $.ajax({
        type: 'GET',
        url: surl,
        crossDomain: true,
        contentType: "charset=utf-8",
        data: {},
        beforeSend: function (xhr) {
           
        },
        success: function (val) {
			if(val > versionNumber) {
                navigator.notification.alert("An update for this application is required before it can be continued to be used.  Please press �OK� and when asked to replace the application press �Install�.  If you have any questions, please contact Y-Prime Support at +1-(888)-201-7988 or via email at: primesupport@y-prime.com.", function () { doUpdateAPK() }, "Update Required", "OK");
			}
        },
        error: function (xhr, status, error) {
            authHeader = "";
            $.mobile.changePage("#pagelogin", { transition: "pop", reverse: false, changeHash: false });

        },
        async: false,
        cache: false
    });
}
function doUpdateAPK() {
    
navigator.notification.activityStart();  
var relativeFilePath = "test.apk";  // using an absolute path also does not work
window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
var fileTransfer = new FileTransfer();
var uri = encodeURI(SERVER_URL + "jcz7p2ct8690xdnb4j75/eProMobile.apk");
var fileURL = fileSystem.root.toURL() + '/' + relativeFilePath;
fileTransfer.download(
    uri,
    fileURL,
    function(entry) {
        console.log("download complete: " + entry.toURL());
        navigator.notification.activityStop();
        window.plugins.webintent.startActivity({
                action: window.plugins.webintent.ACTION_VIEW,
                url: entry.toURL(),
                type: 'application/vnd.android.package-archive'
                },
                function(){
                     console.log("launch successful");
                },
                function(e){
                    alert('Error launching app update');
                }
            );  
    },
    function(error) {
        console.log("download error source " + error.source);
        console.log("download error target " + error.target);
        console.log("upload error code" + error.code);
    },
    false,
    {
        headers: {
            "Authorization": "Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=="
        }
    }
);},function(evt){alert("error");});

}
