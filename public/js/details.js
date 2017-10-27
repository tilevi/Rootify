
/*
    This a sample data of a random track.
    Keep in mind that "popularity", "danceability", "energy" and "valence" go from 0-1 (inclusive).
    
        NOTE: 'key' and 'mode' are not supposed to be a progress bar. It indicates a qualitative attribute of a track. Mode indicates if the track is major or minor.
        
        For these, just a rectangle bar with the text in the center will suffice.
*/

var audioFeatures = {
    "popularity": 0.5,
    "danceability" : 0.366,
    "energy" : 0.963,
    "valence" : 0.212,
    "key" : 11,
    "mode" : 0
}

// Print the audioFeatures object in console.
console.log(audioFeatures);