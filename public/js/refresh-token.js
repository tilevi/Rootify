/*
    This code handles refreshing our access token.
*/
var refreshAccessToken = function(callback) {
    var refresh_token = getCookie("myRefreshToken");
    
    $.ajax({
        url: '/refresh_token',
        data: {
        'refresh_token': refresh_token
        }
    }).done(function(data) {
        setCookie('myToken', data.access_token, 5);
        spotifyApi.setAccessToken(data.access_token);
        
        if (callback) {
            callback();
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