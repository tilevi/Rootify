/*
    File:
            select2_track.js
    Purpose:
            Select2 box for searching for a track on Spotify.
*/

$("#search_tracks").select2({
    placeholder: "Please click to search for a track.", 
    ajax: {
        url: "https://api.spotify.com/v1/search",
        dataType: 'json',
        delay: 250,
        headers: {
            "Authorization": "Bearer " + getCookie('myToken'), 
            "Content-Type": "application/json",
        }, 
        data: function (params) {
            return {
                query: params.term, 
                type: "track", 
                market: "US", 
                limit: 10
            };
        }, 
        processResults: function (data) {
            var items = [];
            data.tracks.items.forEach(function(d) {
                if (selectedTrack.indexOf(d.id) == -1) {
                    items.push(d);
                }
            });
            
            return {
                results: items
            };
        }, 
        cache: true
    },
    escapeMarkup: function (markup) { return markup; },
    minimumInputLength: 1,
    templateResult: formatTrack,
    templateSelection: formatTrackSelection
});

function formatTrack(track) {
    if (track.loading) {
        return "<div>Searching for tracks..</div>";
    }
    
    var html = "<div class='select2-result-repository clearfix'>" +
    "<div class='select2-result-repository__avatar'><img src='" +  ((track.album.images.length > 2) ? track.album.images[2].url : '../assets/unknown.png') + "' /></div>" +
    "<div class='select2-result-repository__meta'>" +
      "<div class='select2-result-repository__title'>" + track.name + " -<br/>" + track.album.artists[0].name + "</div></div></div>";
    
    return html;
}

function formatTrackSelection(track) {
    if (track.id == "") {
        return "Click to search for a track.";
    } else {
        return "Last selected: " + track.name + " - " + (track.album.artists[0].name);
    }
}

/*
    Fix for Select2 dropdown
    https://github.com/select2/select2/issues/4614
*/
$('#search_tracks').data('select2').on('results:message', function(params){
    this.dropdown._resizeDropdown();
    this.dropdown._positionDropdown();
});

$('#search_tracks').on("select2:open", function(e) {
    tokenSanityCheck();
    $('#search_tracks').val('');
});

$('#search_tracks').on("select2:close", function(e) {
   $('#search_tracks').val(''); 
});

$('#search_tracks').on("select2:select", function(e) {
    var data = e.params.data;
    addToOrRemoveFromSelected(data.name, data.artists[0].name, data.id, "track");
});