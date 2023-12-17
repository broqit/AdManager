export default class NodeSearch {
    constructor(options, Config) {
        this.Config = Config;

        this.totalHeight = 0;
        this.marginDifference = 40;
        this.inserted = [];
        this.$insertBefore = null;
        this.disableFloat = false;
        this.locationFound = false;
        this.validHeight = 0;
        this.exitLoop = false;
        this.height = options.height;
        this.force = options.force;
        this.limit = options.limit;
        this.$nodes = options.$nodes;
        this.lastPosition = 0;
        this.neededheight = options.height - this.marginDifference;
    }

    setLastPosition() {
        this.lastPosition = this.$insertBefore.offset().top + this.neededheight;
    }

    markValidNodes() {
        if (!this.inserted.length) {
            return;
        }
        this.inserted.forEach((item) => {
            item.setAttribute('data-valid-location', false);
        });
    }

    verifyNode(index, $node) {
        var since = $node.offset().top - this.lastPosition,
            height = $node.outerHeight(),
            isLast = (this.$nodes.length - 1) === index;
        this.totalHeight += height;
        if (this.force && (this.totalHeight >= this.limit || isLast)) {
            this.$insertBefore = $node;
            this.disableFloat = true;
            this.locationFound = true;
            this.exitLoop = true;
        } else if (this.limit && (this.totalHeight >= this.limit || isLast)) {
            this.locationFound = false;
            this.exitLoop = true;
        } else if (this.isValidInsertionLocation($node)) {
            this.validHeight += height;
            this.inserted.push($node);
            if (this.$insertBefore === null) {
                this.$insertBefore = $node;
            }
            if (this.validHeight >= this.neededheight) {
                if (!this.limit && (since < this.Config.get('insertion.pxBetweenUnits'))) {
                    this.validHeight = 0;
                    this.$insertBefore = null;
                }
                this.locationFound = true;
                this.exitLoop = true;
            }
        } else {
            this.validHeight = 0;
            this.$insertBefore = null;
            this.exitLoop = null;
        }
        return this.exitLoop;
    }

    // This method should be added to the class body, other it will not be visible for `verifyNode` method
    isValidInsertionLocation($node) {
        // Add logic for proper validation
        return true;
    }
}