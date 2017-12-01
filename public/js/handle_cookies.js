/*
    File:
            handle-cookies.js
    Purpose:
            Handles setting, getting, and deleting cookies.
*/

// Source: https://www.w3schools.com/js/js_cookies.asp
var setCookie = function(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// Source: http://www.the-art-of-web.com/javascript/getcookie/
var getCookie = function(name)
{
    var re = new RegExp(name + "=([^;]+)");
    var value = re.exec(document.cookie);
    return (value != null) ? unescape(value[1]) : null;
}

// Source: https://stackoverflow.com/questions/2144386/how-to-delete-a-cookie
var deleteCookie = function(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}