/**
 * Dynamically insert ad units into container.
 * Avoids ads and other problematic elements.
 *
 * @todo  Insert the previously inserted units in an infinite scroll context.
 * @todo  Update language to `node` and `nodes` everywhere for consistency.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( [
            './Util',
            './Config',
            './Inventory'
        ], factory );

    } else if ( typeof exports === 'object' ) {

        module.exports = factory(
            require( './Util' ),
            require( './Config' ),
            require( './Inventory' )
        );

    } else {

        window.AdManager = window.AdManager || {};

        window.AdManager.Insertion = factory(
            window.AdManager.Util,
            window.AdManager.Config,
            window.AdManager.Inventory
        );

    }

} ( window, function ( Util, Config, Inventory ) {

    'use strict';

    var $context = null,
        $localContext = null,
        inContent = false,
        inventory = [],
        odd = true,
        localContext = null,
        adSelector = '[data-ad-unit]';

    //////////////////////////////////////////////////////////////////////////////////////

    /**
     * Bind init event listener.
     * Begins qualification procedure when the DOM is ready.
     *
     * @todo  Check if is already attached.
     */
    function init() {
        // Додаємо обробник події 'AdManager:initSequence'
        document.addEventListener('AdManager:initSequence', qualifyContext);
    }

    /**
     * Sets the context javaScript object variable.
     *
     * @todo  Consider resetting variable to `null` when
     *        no longer needed in a pushState context.
     */
    function setContext() {
        $context = document.querySelector( Config.get( 'context' ) );
    }

    /**
     * First qualify the DOM context where ads are to be inserted
     * to determine if insertion should proceed.
     */
    function qualifyContext() {
        var inventoryData = Inventory.getDynamicInventory();

        inventory = inventory.length ? inventory : inventoryData.dynamicItems;
        localContext = localContext ? localContext : inventoryData.localContext;

        // No dynamic inventory.
        if ( ! inventory.length ) {
            return broadcast();
        }

        setContext();
        $localContext = $context.find( localContext ).first();

        // Detect a local context.
        if ( $localContext.length ) {
            inContent = true;
        }

        // There is no insertion selector.
        if ( ! inContent ) {
            return broadcast();
        }

        insertAdUnits();
    }

    /**
     * Triggers ad units inserted event.
     *
     * @fires AdManager:unitsInserted
     */
    function broadcast() {
        var event = new Event('AdManager:unitsInserted');

        // Dispatch the event
        window.dispatchEvent(event);
    }

    /**
     * Is Insertion Enabled?
     *
     * @return {Boolean} Probably!
     */
    function isEnabled() {

        return Config.get( 'insertionEnabled' );

    }

    /**
     * Run in-content insertion.
     *
     * @todo  Does this need the extra check?
     */
    function insertAdUnits() {

        if ( inContent ) {
            denoteValidInsertions();
            insertPrimaryUnit();
            insertSecondaryUnits();
        }

        broadcast();

    }

    /**
     * Walks DOM elements in the local context.
     * Sets a data attribute if element is a valid insertion location.
     */
    function denoteValidInsertions() {

        let nodes = localContext.children;
        let excluded = Config.get('insertion.insertExclusion');

        Array.from(nodes).forEach((element, i) => {
            let prev = i > 0 ? nodes[i - 1] : false;
            let valid = true;

            excluded.forEach((item) => {
                if (element.matches(item) || element.querySelectorAll(item).length) {
                    valid = false;
                    return false;
                }
            });

            if (prev && prev.matches('p') && prev.querySelectorAll('img').length === 1) {
                valid = false;
            }

            element.setAttribute('data-valid-location', valid);
        });
    }

    /**
     * Check if node should be skipped.
     *
     * @param  {Object}  element
     * @return {Boolean}
     */
    function isValidInsertionLocation( element ) {
        return JSON.parse(element.getAttribute('data-valid-location'));
    }

    /**
     * Generate ad unit markup.
     * Creates DOM node to attach to the DOM.
     *
     * @see    https://vip.wordpress.com/2015/03/25/preventing-xss-in-javascript/
     * @param  {String}  slotName
     * @param  {Boolean} disableFloat
     * @return {Array}   $html
     */
    function adUnitMarkup( slotName, disableFloat ) {

        disableFloat = disableFloat || false;

        var type = Inventory.getUnitType( slotName ),
            alignment = odd ? 'odd' : 'even',
            $html = document.createElement( 'div' );

        $html.setAttribute('data-ad-unit', slotName);
        $html.setAttribute('data-client-type', type);

        if (disableFloat) {
            $html.classList.add('disable-float');
        } else {
            $html.classList.add('in-content');
            $html.classList.add(alignment);
        }

        if ( ! disableFloat ) {
            odd = ! odd;
        }

        return $html;

    }

    /**
     * Inserts the primary unit, which must display above the fold.
     *
     * @todo  Clarify usage, make optional.
     */
    function insertPrimaryUnit() {

        var unit = getPrimaryUnit(),
            tallest = Inventory.tallestAvailable( unit ),
            shortest = Inventory.shortestAvailable( unit ),
            location = findInsertionLocation( {
                height: tallest,
                limit: Config.get( 'insertion.adHeightLimit' )
            } ),
            markup = null
        ;

        if ( ! location ) {
            location = findInsertionLocation( {
                height: shortest,
                limit: Config.get( 'insertion.adHeightLimit' ),
                force: true
            } );

            if ( ! location.disableFloat ) {
                // unset large sizes
                unit = Inventory.limitUnitHeight( unit, shortest );
            }
        }

        markup = adUnitMarkup( unit.slot, location.disableFloat );

        location.$insertBefore.before( markup );

    }

    /**
     * Inserts the secondary units, which can appear below the fold.
     */
    function insertSecondaryUnits() {
        for (let index = 0; index < inventory.length; index++) {
            let unit = inventory[index];

            let tallest = Inventory.tallestAvailable(unit);
            let location = findInsertionLocation({
                height: tallest
            });
            let markup = null;

            if (!location) {
                return false;
            }

            markup = adUnitMarkup(unit.slot, location.disableFloat);
            location.$insertBefore.parentNode.insertBefore(markup, location.$insertBefore);
        }
    }

    /**
     * Determines the primary unit, which is either denoted or the first listed.
     *
     * @return {Object|Boolean} primaryUnit False on failure.
     */
    function getPrimaryUnit() {
        let primaryUnit = false;
        let key;

        for (let i = 0; i < inventory.length; i++) {
            if (inventory[i].primary) {
                primaryUnit = inventory[i];
                key = i;
                break;
            }
        }

        if (primaryUnit !== false && key !== undefined) {
            inventory.splice(key, 1);
        } else {
            primaryUnit = inventory[0];
            inventory.splice(0, 1);
        }

        return primaryUnit;
    }

    /**
     * Find insertion location.
     * Considers distance between units and valid locations.
     *
     * @param  {Object}         options
     * @return {Object|Boolean}         False on failure.
     */
    function findInsertionLocation( options ) {

        options = options || {};

        var $nodes = getNodes(),
            nodeSearch = new NodeSearch( {
                $nodes: $nodes,
                force: options.force ? options.force : false,
                limit: options.limit ? options.limit : false,
                height: options.height
            } )
        ;

        if ( ! $nodes.length ) {
            return false;
        }

        // Loop through each node as necessary.
        // `verifyNode()` returns true when found.
        // Break the loop when true.
        for (let i = 0; i < $nodes.length; i++) {
            let node = $nodes[i];

            if(nodeSearch.verifyNode(i, node)){
                break;
            }
        }

        if ( ! nodeSearch.locationFound ) {
            return false;
        }

        nodeSearch.markValidNodes();
        nodeSearch.setLastPosition();

        return {
            '$insertBefore': nodeSearch.$insertBefore,
            'disableFloat': nodeSearch.disableFloat
        };

    }

    /**
     * Search prototype used for determining insertion points.
     *
     * @param  {Object} options
     */
    function NodeSearch( options ) {

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

    /**
     * Store the position of the last ad.
     */
    NodeSearch.prototype.setLastPosition = function () {

        this.lastPosition = this.$insertBefore.offset().top + this.neededheight;

    };

    /**
     * Mark nodes where insertion is valid.
     *
     * @todo  Consistently use `.attr()` or `.data()` when setting.
     *        jQuery does not need the DOM to change for data attributes.
     */
    NodeSearch.prototype.markValidNodes = function () {
        if ( ! this.inserted.length ) {
            return;
        }

        this.inserted.forEach((item) => {
            item.setAttribute('data-valid-location', false);
        });
    };

    /**
     * Verify each node to find a suitable insertion point.
     *
     * @todo   Why is `this.exitLoop` set to `null`?
     * @todo   Document each step. Simplify if possible.
     *
     * @return {Boolean}
     */
    NodeSearch.prototype.verifyNode = function ( index, $node ) {

        var since = $node.offset().top - this.lastPosition,
            height = $node.outerHeight(),
            isLast = ( this.$nodes.length - 1 ) === index;

        this.totalHeight += height;

        if ( this.force && ( this.totalHeight >= this.limit || isLast ) ) {

            this.$insertBefore = $node;
            this.disableFloat = true;
            this.locationFound = true;
            this.exitLoop = true;

        } else if ( this.limit && ( this.totalHeight >= this.limit || isLast ) ) {

            this.locationFound = false;
            this.exitLoop = true;

        } else if ( isValidInsertionLocation( $node ) ) {

            this.validHeight += height;
            this.inserted.push( $node );

            if ( this.$insertBefore === null ) {
                this.$insertBefore = $node;
            }

            if ( this.validHeight >= this.neededheight ) {

                if ( ! this.limit && ( since < Config.get( 'insertion.pxBetweenUnits' ) ) ) {

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

    };

    /**
     * Is Element an Ad Unit?
     *
     * @param  {Mixed}   el
     * @return {Boolean}
     */
    function isThisAnAd( el ) {

        if ( ! el ) {
            return false;
        }

        return el.matches( adSelector );

    }

    /**
     * Get next group of nodes to loop through.
     * Grabs the nodes after previous unit or all nodes if no previous.
     *
     * @return {Array} $nodes
     */
    function getNodes() {
        let prevUnit = $localContext.querySelector(adSelector + ':last-child'),
            nodes = null;

        if (prevUnit) {
            nodes = Array.from(prevUnit.nextElementSibling ? prevUnit.nextElementSibling.children : []);
        } else {
            nodes = Array.from($localContext.children);
        }

        return nodes;
    }

    //////////////////////////////////////////////////////////////////////////////////////

    return {
        init: init
    };

} ) );