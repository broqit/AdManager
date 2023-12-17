import NodeSearch from "./NodeSearch";

export default class Insertion {
    constructor(Config, Inventory, Util) {
        this.Config = Config;
        this.Inventory = Inventory;
        this.Util = Util;

        this.$context = null;
        this.$localContext = null;
        this.inContent = false;
        this.inventory = [];
        this.odd = true;
        this.localContext = null;
        this.adSelector = '[data-ad-unit]';
    }

    /**
     * Bind init event listener.
     * Begins qualification procedure when the DOM is ready.
     *
     * @todo  Check if is already attached.
     */
    init() {
        // Додаємо обробник події 'AdManager:initSequence'
        document.addEventListener('AdManager:initSequence', this.qualifyContext.bind(this));
    }

    /**
     * Sets the context jQuery object variable.
     *
     * @todo  Consider resetting variable to `null` when
     *        no longer needed in a pushState context.
     */
    setContext() {
        this.$context = document.querySelector(Config.get('context'));
    }

    /**
     * First qualify the DOM context where ads are to be inserted
     * to determine if insertion should proceed.
     */
    qualifyContext() {
        var inventoryData = Inventory.getDynamicInventory();

        this.inventory = this.inventory.length ? this.inventory : inventoryData.dynamicItems;
        this.localContext = this.localContext ? this.localContext : inventoryData.localContext;

        // No dynamic inventory.
        if ( ! this.inventory.length ) {
            return this.broadcast();
        }

        this.setContext();
        this.$localContext = this.$context.querySelector( this.localContext );

        // Detect a local context.
        if ( this.$localContext ) {
            this.inContent = true;
        }

        // There is no insertion selector.
        if ( ! this.inContent ) {
            return this.broadcast();
        }

        this.insertAdUnits();
    }

    /**
     * Triggers ad units inserted event.
     *
     * @fires AdManager:unitsInserted
     */
    broadcast() {
        // Create the event
        var event = new Event('AdManager:unitsInserted');

        // Dispatch the event
        window.dispatchEvent(event);
    }

    /**
     * Is Insertion Enabled?
     *
     * @return {Boolean} Probably!
     */
    isEnabled() {
        return this.Config.get( 'insertionEnabled' );
    }

    /**
     * Run in-content insertion.
     *
     * @todo  Does this need the extra check?
     */
    insertAdUnits() {
        if ( this.inContent ) {
            this.denoteValidInsertions();
            this.insertPrimaryUnit();
            this.insertSecondaryUnits();
        }

        this.broadcast();
    }

    /**
     * Walks DOM elements in the local context.
     * Sets a data attribute if element is a valid insertion location.
     *
     */
    denoteValidInsertions() {

        let nodes = this.localContext.children;
        let excluded = this.Config.get('insertion.insertExclusion');

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
     * @param  {Object}  $element
     * @return {Boolean}
     */
    isValidInsertionLocation( $element ) {
        return JSON.parse($element.getAttribute('data-valid-location'));
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
    adUnitMarkup( slotName, disableFloat ) {

        disableFloat = disableFloat || false;

        let type = Inventory.getUnitType(slotName),
            alignment = this.odd ? 'odd' : 'even',
            html = document.createElement('div');

        html.setAttribute('data-ad-unit', slotName);
        html.setAttribute('data-client-type', type);

        if (disableFloat) {
            html.classList.add('disable-float');
        } else {
            html.classList.add('in-content');
            html.classList.add(alignment);
        }

        if (!disableFloat) {
            this.odd = !this.odd;
        }

        return html;
    }

    /**
     * Inserts the primary unit, which must display above the fold.
     *
     * @todo  Clarify usage, make optional.
     */
    insertPrimaryUnit() {

        var unit = this.getPrimaryUnit(),
            tallest = this.Inventory.tallestAvailable( unit ),
            shortest = this.Inventory.shortestAvailable( unit ),
            location = this.findInsertionLocation( {
                height: tallest,
                limit: this.Config.get( 'insertion.adHeightLimit' )
            } ),
            markup = null
        ;

        if ( ! location ) {
            location = this.findInsertionLocation( {
                height: shortest,
                limit: this.Config.get( 'insertion.adHeightLimit' ),
                force: true
            } );

            if ( ! location.disableFloat ) {
                // unset large sizes
                unit = this.Inventory.limitUnitHeight( unit, shortest );
            }
        }

        markup = this.adUnitMarkup( unit.slot, location.disableFloat );

        location.$insertBefore.before( markup );
    }

    /**
     * Inserts the secondary units, which can appear below the fold.
     */
    insertSecondaryUnits() {

        for (let index = 0; index < this.inventory.length; index++) {
            let unit = this.inventory[index];

            let tallest = this.Inventory.tallestAvailable(unit);
            let location = this.findInsertionLocation({
                height: tallest
            });
            let markup = null;

            if (!location) {
                return false;
            }

            markup = this.adUnitMarkup(unit.slot, location.disableFloat);
            location.$insertBefore.parentNode.insertBefore(markup, location.insertBefore);
        }
    }

    /**
     * Determines the primary unit, which is either denoted or the first listed.
     *
     * @todo   Use `$.grep` instead of `$.each` for optimization.
     * @return {Object|Boolean} primaryUnit False on failure.
     */
    getPrimaryUnit() {
        var primaryUnit = false;
        const _this = this;

        $.each( this.inventory, function ( index, unit ) {
            if ( unit.primary ) {
                primaryUnit = unit;
                _this.inventory = _this.Util.removeByKey( _this.inventory, index );
                return false;
            }
        } );

        if ( ! primaryUnit ) {
            primaryUnit = _this.inventory[0];
            _this.inventory = _this.Util.removeByKey( _this.inventory, 0 );
        }

        return primaryUnit;
    }

    /**
     * Find insertion location.
     * Considers distance between units and valid locations.
     *
     * @todo   Convert `$.each` to `for` loop.
     *         Use `continue` and `break` for clarity.
     *
     * @param  {Object}         options
     * @return {Object|Boolean}         False on failure.
     */
    findInsertionLocation( options ) {

        options = options || {};

        let nodes = this.getNodes(),

            nodeSearch = new NodeSearch({
                nodes: nodes,
                force: options.force ? options.force : false,
                limit: options.limit ? options.limit : false,
                height: options.height
            }, this.Config);

        if (nodes.length === 0) {
            return false;
        }

        // Loop through each node as necessary.
        // verifyNode() returns true when found.
        // Break the loop when true.
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];

            if(nodeSearch.verifyNode(i, node)){
                break;
            }
        }

        if (!nodeSearch.locationFound) {
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
     * Is Element an Ad Unit?
     *
     * @param  {Mixed}   el
     * @return {Boolean}
     */
    isThisAnAd( el ) {
        if (!el) {
            return false;
        }

        return el.matches(this.adSelector);
    }

    /**
     * Get next group of nodes to loop through.
     * Grabs the nodes after previous unit or all nodes if no previous.
     *
     * @return {Array} $nodes
     */
    getNodes() {
        let prevUnit = this.$localContext.querySelector(this.adSelector + ':last-child'),
            nodes = null;

        if (prevUnit) {
            nodes = Array.from(prevUnit.nextElementSibling ? prevUnit.nextElementSibling.children : []);
        } else {
            nodes = Array.from(this.$localContext.children);
        }

        return nodes;
    }
}