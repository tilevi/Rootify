/*
    File:
            select2_artist.js
    Purpose:
            Select2 box for searching for an artist on Spotify.
*/

$("#search_artists").select2({
    placeholder: "Please click to search for an artist.", 
    ajax: {
        url: "https://api.spotify.com/v1/search",
        dataType: 'json',
        delay: 250,
        headers: {
            "Authorization": "Bearer " + access_token, 
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
    
    var html = "<div class='select2-result-repository clearfix'>" +
    "<div class='select2-result-repository__avatar'><img src='" +  ((artist.images.length > 2) ? artist.images[2].url : '../assets/unknown.png') + "' /></div>" +
    "<div class='select2-result-repository__meta'>" +
      "<p class='select2-result-repository__title'>" + artist.name + "</p></div></div>";
    
    return html;
}

function formatArtistSelection(artist) {
    if (artist.id == "") {
        return "Click to search for an artist.";
    } else {
        return "Last selected: " + artist.name;
    }
}

/*
    Fix for Select2 dropdown
    https://github.com/select2/select2/issues/4614
*/
$('#search_artists').data('select2').on('results:message', function(params){
    this.dropdown._resizeDropdown();
    this.dropdown._positionDropdown();
});

$('#search_artists').on("select2:open", function(e) {
    tokenSanityCheck();
    $('#search_artists').val('');
});

$('#search_artists').on("select2:close", function(e) {
   $('#search_artists').val(''); 
});

$('#search_artists').on("select2:select", function(e) {
    var data = e.params.data;
    addToOrRemoveFromSelected(data.name, null, data.id, "artist");
});