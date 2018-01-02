/*
    File:
            resize.js
    Purpose:
            Handles resizing the main SVG width and height, and also updates the 'Details' bars.
*/

// Tree container
var treeDiv = document.getElementById("tree-container");

// Artist track container
var atDiv = document.getElementById("at-container");

var selectedType = null;
var generateTabIsActive = false;
var svg = d3.select(treeDiv).append("svg").attr("id", "baseSVG");

// For the bars in the 'Details' tab
var barManager = new BarManager();

function redraw() {
    // Extract the width and height that was computed by CSS.
    viewerWidth = treeDiv.clientWidth;
    viewerHeight = treeDiv.clientHeight;

    // Use the extracted size to set the size of an SVG element.
    svg
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay");
    
    if (!generateTabIsActive) {
        setTimeout(function() {
            barManager.updateBars();
        }, 0);
    }
}

// Draw for the first time to initialize.
redraw();

// Redraw based on the new size whenever the browser window is resized.
window.addEventListener("resize", redraw);