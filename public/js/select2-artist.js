$("#search_artists").select2({
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
                type: "artist", 
                market: "US", 
                limit: 10
            };
        }, 
        processResults: function (data) {
            var items = [];
            data.artists.items.forEach(function(d) {
                if (selectedArtist.indexOf(d.id) == -1) {
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
    templateResult: formatArtist,
    templateSelection: formatArtistSelection
});

function formatArtist(artist) {
    if (artist.loading) {
        return "<div>Searching for artists..</div>";
    }
    
    var html = 
        '<div class="sa_container" height="80px">' +
        '<div class="avatar">' +
        '<img src="' + ((artist.images.length > 2) ? artist.images[2].url : '') + '" style="max-width: 100%" width="50px" height="50px"/>' +
        '</div>' +
        '<p class="info">' + artist.name + '</p></div>';
    
    return html;
}

function formatArtistSelection(artist) {
    return "";
}

$('#search_artists').on("select2:open", function(e) {
    $('#search_artists').val('');
});

$('#search_artists').on("select2:select", function(e) {
    var data = e.params.data;
    addToOrRemoveFromSelected(data.name, null, data.id, "artist");
});