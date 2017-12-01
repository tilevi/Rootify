/*
    File:
            bottom_bar.js
    Purpose:
            Handles the up and down arrow text on the bottom bar button.
*/
$('#bottombarbtn').click(function(){
    $('#slideout').toggleClass('on');
    var status = $('#bottombarbtn').html();

    if (status == "▲"){
        $('#bottombarbtn').html("&#x25BC;");
    } else {
        $('#bottombarbtn').html("&#x25B2;");
    }
});