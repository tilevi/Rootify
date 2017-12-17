/*
    File:
            refresh-token.js
    Purpose:
            This code handles retrieving a new access token.
*/
var refreshAccessToken = function(callback) {
    console.log("Trying..");
    $.ajax({
        url: '/refresh_token',
        data: {
            'refresh_token': refresh_token
        }
    }).done(function(data) {
        spotifyApi.setAccessToken(data.access_token);
        console.log(data);
        if (callback) {
            callback(true);
        }
    });
}

/*
    Token sanity check.
    This is used to generate a new access token if ours has expired.
*/
var tokenSanityCheck = function() {
    spotifyApi.getMe({}, function(err, data) {
        if (err) {
            // Generate a new access token.
            refreshAccessToken();
        }
    });
}

/*
    Refresh our access token every hour.
    3600 seconds = 1 hour.
*/
setInterval(function(){
    refreshAccessToken();
}, 3600 * 1000);