export default class Inventory {
    constructor(Config, Util) {
        this.Config = Config;
        this.Util = Util;
    }

    /**
     * Get sanitized inventory.
     *
     * @return {Object}
     */
    getInventory() {
        return this.getAvailableSizes( this.inventoryCleanTypes( this.Config.get( 'inventory' ) ) );
    }

    /**
     * Add default unit type if not set.
     *
     * @todo   Should this edit the inventory in the Config?
     *
     * @param  {Mixed} inventory
     * @return {Array} inventory
     */
    inventoryCleanTypes( inventory ) {
        for ( var i = 0; i < inventory.length; i++ ) {

            if ( typeof inventory[ i ].type !== 'undefined' ) {
                continue;
            }

            inventory[ i ].type = 'default';

        }

        return inventory;
    }

    /**
     * Remove sizes from inventory that will not display properly.
     *
     * @todo   Clarify what this function is limiting, and remove the
     *         hard limits set to use desktop width for tablets.
     *
     * @param  {Array} inventory
     * @return {Array} inventory
     */
    getAvailableSizes( inventory ) {
        var width = window.innerWidth > 0 ? window.innerWidth : screen.width;

        if ( width > 1024 ) {
            return inventory;
        }

        if ( width >= 768 && width <= 1024 ) {

            var max = 980;

            for ( var i = 0; i < inventory.length; i++ ) {
                var sizesToRemove = [];
                for ( var j = 0; j < inventory[ i ].sizes.length; j++ ) {
                    if ( inventory[ i ].sizes[ j ][0] > max ) {
                        sizesToRemove.push( inventory[ i ].sizes[ j ] );
                    }
                }
                inventory[ i ].sizes = this.Util.difference( inventory[ i ].sizes, sizesToRemove );
            }
        }

        return inventory;
    }

    /**
     * Get ad units for dynamic insertion.
     *
     * @return {Object}
     */
    getDynamicInventory() {

        var dynamicItems = [],
            type = this.Config.get( 'clientType' ),
            inventory = this.getInventory(),
            localContext;

        for (let position of inventory) {
            if (position.dynamic === true) {
                if (!type || type === position.type) {
                    dynamicItems.push(position);
                    localContext = position.localContext;
                }
            }
        }

        return {
            dynamicItems: dynamicItems,
            localContext: localContext
        };
    }

    /**
     * Get info about an ad unit by slot name.
     *
     * @param  {String} slotName
     * @return {Object} adInfo
     */
    getAdInfo( slotName ) {
        var adInfo = {},
            inventory = this.getInventory();

        for ( var i = 0; i < inventory.length; i++ ) {
            if ( inventory[ i ].slot !== slotName ) {
                continue;
            }

            adInfo = inventory[ i ];

            break;
        }

        return adInfo;
    }

    /**
     * Get shortest possible height for unit.
     *
     * @todo   Consider abstracting shortest and tallest
     *         functions into one.
     *
     * @param  {Object}  unit
     * @return {Integer} shortest
     */
    shortestAvailable( unit ) {
        let shortest = 0;
        unit.sizes.forEach(function(sizes) {
            if (shortest === 0) {
                shortest = sizes[1];
            } else if (sizes[1] < shortest) {
                shortest = sizes[1];
            }
        });

        return shortest;
    }

    /**
     * Get tallest possible height for unit.
     *
     * @todo   Consider abstracting shortest and tallest
     *         functions into one.
     *
     * @param  {Object}  unit
     * @return {Integer} tallest
     */
    tallestAvailable( unit ) {
        let tallest = 0;
        unit.sizes.forEach(function(sizes) {
            if (sizes[1] > tallest) {
                tallest = sizes[1];
            }
        });

        return tallest;
    }

    /**
     * Limit ad unit sizes.
     * Removes heights too large for context.
     *
     * @param  {Object}  unit
     * @param  {Integer} limit
     * @return {Object}  unit
     */
    limitUnitHeight( unit, limit ) {
        unit.sizes = unit.sizes.filter(function(sizes, index) {
            if (sizes[1] <= limit) {
                return true;
            }
        });

        return unit;
    }

    /**
     * Finds the unit by slot name and returns its type.
     * Type is used to filter the inventory (like desktop and mobile).
     *
     * @param  {String} slotName
     * @return {String} type
     */
    getUnitType( slotName ) {
        let type = 'default';
        this.getInventory().forEach(function(unit) {
            if (unit.slot !== slotName) {
                return true;
            }
            type = unit.type;
            return false;
        });

        return type;
    }
}