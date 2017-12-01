/*
    File:
            resize_filter_sliders.js
    Purpose:
            Handles with the resize boxes and filter sliders for the bottom bar.
*/

var filterOptions = {
    pop_slider: { typ: "popularity", values: [0, 100] }, 
    dance_slider: { typ: "dance", values: [0, 100] }, 
    energy_slider: { typ: "energy", values: [0, 100] }, 
    valence_slider: { typ: "valence", values: [0, 100] }
};

function upperCaseFirstLetter(string) {    
    if (string == "valence") {
        return "Happiness";
    } else if (string == "dance") {
        return "Danceability";
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
}

$( function() {
    for (var key in filterOptions) {

        $("#filter_" + key).slider({
            range: true, 
            min: 0, 
            max: 100, 
            values: [0, 100], 
            slide: function(event, ui) {
                var min = ui.values[0];
                var max = ui.values[1];
                var id = $(this).attr("id");

                var typ = filterOptions[id.slice(7)].typ;

                $("#" + id + "_text").html(upperCaseFirstLetter(typ) + ": " + min + " - " + max); 
            }
        });

        $("#" + key).slider({
            range: true,
            min: 0,
            max: 100,
            values: [0, 100],
            change: function (event, ui) {
                var min = ui.values[0];
                var max = ui.values[1];

                var id = $(this).attr("id");
                filterOptions[id].values = [min, max];
                filterNodes();
            }, 
            slide: function(event, ui) {
                var min = ui.values[0];
                var max = ui.values[1];
                var id = $(this).attr("id");

                var typ = filterOptions[id].typ;

                $("#" + id + "_text").html(upperCaseFirstLetter(typ) + ": " + min + " - " + max); 
            }
        });
    }
});

var scaleOptions = {
    popCheck: false, 
    energyCheck: false, 
    danceCheck: false, 
    posCheck: false
};

function handleClick(cb) {
    scaleOptions[cb.id] = cb.checked;
    resizeNodes();
}