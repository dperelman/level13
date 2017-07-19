define(['ash'], function (Ash) {
    
    var OutgoingCaravanVO = Ash.Class.extend({
	
        constructor: function (campOrdinal) {
            this.campOrdinal = campOrdinal;
            this.sellGood = null;
            this.sellAmount = 0;
            this.buyGood = null;
		},
    });

    return OutgoingCaravanVO;
});
