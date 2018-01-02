/*
    File:
            refresh-token.js
    Purpose:
            This code handles retrieving a new access token.
*/
refreshAccessToken = function(callback) {
    $.ajax({
        url: '/refresh_token',
        data: {
            'refresh_token': refresh_token
        }
    }).done(function(data) {
        access_token = data.access_token;
        spotifyApi.setAccessToken(access_token);
        
        if (callback) {
            callback(true);
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