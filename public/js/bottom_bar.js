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

$('#bottombarbtn2').click(function(){
    $('#slideout2').toggleClass('on');
    var status = $('#bottombarbtn2').html();

    if (status == "▲"){
        $('#bottombarbtn2').html("&#x25BC;");
    } else {
        $('#bottombarbtn2').html("&#x25B2;");
    }
});