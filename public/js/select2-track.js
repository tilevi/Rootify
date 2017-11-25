$("#search_tracks").select2({
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
    
    var html = 
        '<div class="sa_container" height="80px">' +
        '<div class="avatar">' +
        '<img src="' + ((track.album.images.length > 2) ? track.album.images[2].url : '') + '" style="max-width: 100%" width="50px" height="50px"/>' +
        '</div>' +
        '<p class="info">' + track.name + '</p></div>';
    
    return html;
}

function formatTrackSelection(track) {
    return "";
}

$('#search_tracks').on("select2:open", function(e) {
    $('#search_tracks').val('');
});

$('#search_tracks').on("select2:select", function(e) {
    var data = e.params.data;
    addToOrRemoveFromSelected(data.name, data.artists[0].name, data.id, "track");
});