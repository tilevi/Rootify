jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;

describe('Root children tests', function() {
    beforeEach(function(done) {
        callAPI(loadMe);
        // Root loading should be done within 4 seconds.
        // Assumption: Decent Internet connection.
        setTimeout(function() {  
            if (root.children.length > 0) {
                var notClicked = true;
                var i = 0;
                svgGroup.selectAll("g.node").each(function(d) {
                    if ((d.aid || d.tid) && notClicked) {
                        notClicked = false;
                        setTimeout(function() {
                            click(d);
                            setTimeout(function() {
                                done();
                            }, 2500);
                        }, (250) * i);
                        i++;
                    }
                });
            }
        }, 3000);
    });

    it("Loaded root children and the grandchildren of one of its own nodes.", function () {
        var rootLength = root.children.length;
        expect(rootLength).toBeGreaterThan(0);
        expect(rootLength).toBeLessThan(12);
        
        var rootChild = null;
        
        svgGroup.select("g.node").each(function(d) {
            if ((d.aid || d.tid)) {
                rootChild = d;
                console.log("Found.");
            }
        });
        
        var childLength = rootChild.children.length;
        
        /* Technically, we could have 0 children if the related artists already exist in our tree. */
        expect(childLength).toBeGreaterThan(-1);
        expect(childLength).toBeLessThan(4);
    });
});