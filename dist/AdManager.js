/*!
 * admanager - A JavaScript library for interacting with Google DFP.
 *
 * @author Athletics - https://athleticsnyc.com
 * @see https://github.com/athletics/AdManager
 * @version 0.6.5
 */
/**
 * Shared utilities for debugging and array manipulation.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( 'src/Util',[], factory );

    } else if ( typeof exports === 'object' ) {

        module.exports = factory();

    } else {

        window.AdManager = window.AdManager || {};

        window.AdManager.Util = factory();

    }

} ( window, function () {

    'use strict';

    //////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get the difference of two arrays.
     *
     * @param  {Array} array
     * @param  {Array} values
     * @return {Array} diff
     */
    function difference( array, values ) {
        return array.filter(function(element) {
            return !values.includes(element);
        });
    }

    /**
     * Remove array value by key.
     *
     * @param  {Array}   array
     * @param  {Integer} key
     * @return {Array}   array
     */
    function removeByKey( array, key ) {
        return array.filter(function(element, index) {
            return index !== key;
        });
    }

    function isEmpty(obj) {
        for (const prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                return false;
            }
        }

        return true
    }

    //////////////////////////////////////////////////////////////////////////////////////

    return {
        difference:  difference,
        removeByKey: removeByKey,
        isEmpty: isEmpty
    };

} ) );
(function (window, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('src/Config',[], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        window.AdManager = window.AdManager || {};
        window.AdManager.Config = factory();
    }
}(window, function () {

    'use strict';
    var config = {},
        defaults = {
            account: null,
            autoload: true,
            clientType: false,
            context: 'body',
            enabled: true,
            insertionEnabled: false,
            insertion: {
                pxBetweenUnits: 800,
                adHeightLimit: 1000,
                insertExclusion: [
                    'img',
                    'iframe',
                    'video',
                    'audio',
                    '.video',
                    '.audio',
                    '[data-ad-unit]'
                ]
            },
            inventory: [],
            targeting: []
        };

    function init(newConfig) {
        document.dispatchEvent(new CustomEvent('AdManager:importConfig', {detail: newConfig}));
    }

    function set(key, value) {
        return setConfigValue(config, key, value);
    }

    function get(key) {
        key = key || false;
        if (!key) {
            return config;
        }
        return getConfigValue(config, key);
    }

    function setConfigValue(config, key, value) {
        if (typeof key === 'string') {
            key = key.split('.');
        }
        if (key.length > 1) {
            setConfigValue(config[key.shift()], key, value);
        } else {
            config[key[0]] = value;
        }
        return config;
    }

    function getConfigValue(config, key) {
        if (typeof key === 'string') {
            key = key.split('.');
        }
        if (key.length > 1) {
            return getConfigValue(config[key.shift()], key);
        } else {
            return key[0] in config ? config[key[0]] : null;
        }
    }

    document.addEventListener('AdManager:importConfig', function (event) {
        config = Object.assign(defaults, config, event.detail);
        return config;
    });

    return {
        init: init,
        set: set,
        get: get
    };

}));
/**
 * Get, filter, and augment the ad unit inventory.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( 'src/Inventory',[
            './Util',
            './Config'
        ], function ( Util, Config ) {
            return factory( window, Util, Config );
        } );

    } else if ( typeof exports === 'object' ) {

        module.exports = factory(
            window,
            require( './Util' ),
            require( './Config' )
        );

    } else {

        window.AdManager = window.AdManager || {};

        window.AdManager.Inventory = factory(
            window,
            window.AdManager.Util,
            window.AdManager.Config
        );

    }

} ( window, function ( window, Util, Config ) {

    'use strict';

    //////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get sanitized inventory.
     *
     * @return {Object}
     */
    function getInventory() {

        return getAvailableSizes( inventoryCleanTypes( Config.get( 'inventory' ) ) );

    }

    /**
     * Add default unit type if not set.
     *
     * @todo   Should this edit the inventory in the Config?
     *
     * @param  {Array} inventory
     * @return {Array} inventory
     */
    function inventoryCleanTypes( inventory ) {

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
    function getAvailableSizes( inventory ) {

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
                inventory[ i ].sizes = Util.difference( inventory[ i ].sizes, sizesToRemove );
            }
        }

        return inventory;

    }

    /**
     * Get ad units for dynamic insertion.
     *
     * @return {Object}
     */
    function getDynamicInventory() {

        var dynamicItems = [],
            type = Config.get( 'clientType' ),
            inventory = getInventory(),
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
    function getAdInfo( slotName ) {

        var adInfo = {},
            inventory = getInventory();

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
    function shortestAvailable( unit ) {
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
    function tallestAvailable( unit ) {
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
    function limitUnitHeight( unit, limit ) {
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
    function getUnitType( slotName ) {
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

    //////////////////////////////////////////////////////////////////////////////////////

    return {
        getInventory:        getInventory,
        getAdInfo:           getAdInfo,
        getDynamicInventory: getDynamicInventory,
        shortestAvailable:   shortestAvailable,
        tallestAvailable:    tallestAvailable,
        limitUnitHeight:     limitUnitHeight,
        getUnitType:         getUnitType
    };

} ) );
/**
 * Handles the request and display of ads.
 *
 * @todo  Allow for multiple inits, only bind events
 *        and load library once.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( 'src/Manager',[
            './Config',
            './Inventory',
            './Util'
        ], function ( Config, Inventory ) {
            return factory( window, Config, Inventory );
        } );

    } else if ( typeof exports === 'object' ) {

        module.exports = factory(
            window,
            require( './Config' ),
            require( './Inventory' ),
            require( './Util' )
        );

    } else {

        window.AdManager = window.AdManager || {};

        window.AdManager.Manager = factory(
            window,
            window.AdManager.Config,
            window.AdManager.Inventory,
            window.AdManager.Util
        );

    }

} ( window, function ( window, Config, Inventory, Util ) {

    'use strict';

    var loaded = false,
        definedSlots = [],
        pagePositions = [],
        inventory = [],
        account = null,
        adSelector = '[data-ad-unit]';

    //////////////////////////////////////////////////////////////////////////////////////

    /**
     * Add event listeners and get the DFP library.
     */
    function init() {

        if ( ! Config.get( 'enabled' ) ) {
            return;
        }

        inventory = Inventory.getInventory();
        account = Config.get( 'account' );

        addEventListeners();
        loadLibrary();

    }

    function addEventListeners() {
        document.addEventListener('AdManager:libraryLoaded', libraryLoaded);
        document.addEventListener('AdManager:runSequence', runSequence);
        document.addEventListener('AdManager:slotsDefined', displayPageAds);
        document.addEventListener('AdManager:refresh', refresh);
        document.addEventListener('AdManager:emptySlots', emptySlots);
        document.addEventListener('AdManager:emptySlotsInContext', emptySlotsInContext);
    }

    /**
     * Library loaded callback.
     *
     * @fires AdManager:runSequence
     * @fires AdManager:ready
     */
    function libraryLoaded() {

        loaded = true;

        listenForDfpEvents();
        setupPubAdsService();

        if (Config.get('autoload')) {
            const eventRunSequence = new CustomEvent('AdManager:runSequence');
            document.dispatchEvent(eventRunSequence);
        }

        const eventReady = new CustomEvent('AdManager:ready');
        document.dispatchEvent(eventReady);
    }

    /**
     * Run qualification sequence.
     *
     * - Find page positions in the DOM
     * - Define new slots
     */
    function runSequence() {

        pagePositions = [];
        setTargeting();
        setPagePositions();
        defineSlotsForPagePositions();

    }

    /**
     * Asynchronously load the DFP library.
     * Calls ready event when fully loaded.
     */
    function loadLibrary() {

        if ( loaded ) {
            return onLibraryLoaded();
        }

        var googletag,
            gads,
            useSSL,
            node,
            readyStateLoaded = false
        ;

        window.googletag = window.googletag || {};
        window.googletag.cmd = window.googletag.cmd || [];

        gads = document.createElement( 'script' );
        gads.async = true;
        gads.type = 'text/javascript';
        useSSL = 'https:' == document.location.protocol;
        gads.src = ( useSSL ? 'https:' : 'http:' ) + '//securepubads.g.doubleclick.net/tag/js/gpt.js';
        if ( gads.addEventListener ) {
            gads.addEventListener( 'load', onLibraryLoaded, false );
        } else if ( gads.readyState ) {
            gads.onreadystatechange = function () {
                // Legacy IE
                if ( ! readyStateLoaded ) {
                    readyStateLoaded = true;
                    onLibraryLoaded();
                }
            };
        }
        node = document.getElementsByTagName( 'script' )[0];
        node.parentNode.insertBefore( gads, node );
    }

    /**
     * Callback when GPT library is loaded.
     *
     * @fires AdManager:libraryLoaded
     */
    function onLibraryLoaded() {
        googletag.cmd.push(function () {
            const event = new CustomEvent('AdManager:libraryLoaded');
            document.dispatchEvent(event);
        });
    }

    /**
     * Add a listener for the GPT `slotRenderEnded` event.
     */
    function listenForDfpEvents() {
        googletag.cmd.push( function () {
            googletag.pubads().addEventListener( 'slotRenderEnded', onSlotRenderEnded );
        } );
    }

    /**
     * Enable batched SRA calls for requesting multiple ads at once.
     * Disable initial load of units, wait for display call.
     */
    function setupPubAdsService() {
        googletag.cmd.push( function () {

            // https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_collapseEmptyDivs
            googletag.pubads().collapseEmptyDivs();

            // https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_enableSingleRequest
            googletag.pubads().enableSingleRequest();

            // https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_disableInitialLoad
            googletag.pubads().disableInitialLoad();

        } );
    }

    /**
     * Send key-value targeting in ad request.
     *
     * @todo  https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_clearTargeting
     */
    function setTargeting() {
        googletag.cmd.push(function() {
            const targeting = Config.get('targeting');

            if (Object.keys(targeting).length === 0 ) {
                return;
            }

            Object.keys(targeting).forEach(function(key) {
                const value = targeting[key];
                googletag.pubads().setTargeting(key, value);
            });
        });
    }

    /**
     * Looks for ad unit markup in the context to build a list
     * of units to request.
     */
    function setPagePositions() {
        var clientType = Config.get( 'clientType' ),
            $context = document.querySelector( Config.get( 'context' ) ),
            $units = null,
            selector = adSelector + ':not(.is-disabled)';

        if ( clientType !== false ) {
            selector += '[data-client-type="' + clientType + '"]';
        }

        $units = $context.querySelectorAll(selector);

        Array.from($units).forEach(function(unit) {
            const element = unit.getAttribute('data-ad-unit');
            if(element) {
                pagePositions.push(element);
            }
        });
    }

    /**
     * Define slots for page positions.
     *
     * @fires AdManager:slotsDefined
     */
    function defineSlotsForPagePositions() {
        googletag.cmd.push( function () {
            let undefinedPagePositions = [];

            if (Object.keys(definedSlots).length === 0) {
                undefinedPagePositions = pagePositions;
            } else {
                let definedSlotNames = Object.keys(definedSlots).map(index => {
                    let slot = definedSlots[index];
                    return convertSlotName(slot.getAdUnitPath(), 'local');
                });

                undefinedPagePositions = pagePositions.filter(slotName => {
                    if (definedSlotNames.indexOf(slotName) !== -1) {
                        return false;
                    }
                    return true;
                });
            }

            undefinedPagePositions.forEach((slotName) => {
                let position = Inventory.getAdInfo(slotName);

                if(!Util.isEmpty(position)) {
                    let slot = googletag
                        .defineSlot(
                            convertSlotName(slotName, 'dfp'),
                            position.sizes,
                            position.slot
                        )
                        .addService(googletag.pubads());

                    definedSlots.push(slot);
                }
            });

            // Enables GPT services for defined slots.
            googletag.enableServices();

            insertUnitTargets();

            let event = new CustomEvent('AdManager:slotsDefined');
            document.dispatchEvent(event);
        } );
    }

    /**
     * Creates the containers for the DFP to fill.
     * DFP wants ids.
     */
    function insertUnitTargets() {
        var context = document.querySelector(Config.get('context'));
        var notInserted = [];

        notInserted = pagePositions.filter(function(slotName) {
            return document.getElementById(slotName) === null;
        });

        notInserted.forEach(function(slotName) {
            var ads = context.querySelectorAll('[data-ad-unit="' + slotName + '"]');
            ads.forEach(function(ad) {
                ad.classList.add('is-initialized');

                var newDiv = document.createElement('div');
                newDiv.id = slotName;
                newDiv.classList.add('ad-unit-target');

                ad.appendChild(newDiv);
            });
        });
    }

    /**
     * Fetch and display the current page ads.
     */
    function displayPageAds() {
        googletag.cmd.push(function() {
            var pageSlots = definedSlots.filter(function(slot) {
                var slotName = convertSlotName(slot.getAdUnitPath(), 'local');
                return pagePositions.includes(slotName);
            });

            googletag.pubads().refresh(pageSlots);

            pagePositions.forEach(function(slotName) {
                googletag.display(slotName);
            });

        });
    }

    /**
     * Callback from DFP rendered event.
     *
     * @fires AdManager:adUnitRendered
     * @see   https://developers.google.com/doubleclick-gpt/reference
     *
     * @param {Object} unit
     */
    function onSlotRenderEnded( unit ) {
        var slotName = convertSlotName(unit.slot.getAdUnitPath(), 'local');

        var adUnitRenderedEvent = new CustomEvent('AdManager:adUnitRendered', {
            detail: {
                name: slotName,
                size: unit.size,
                isEmpty: unit.isEmpty,
                creativeId: unit.creativeId,
                lineItemId: unit.lineItemId,
                serviceName: unit.serviceName
            }
        });

        document.dispatchEvent(adUnitRenderedEvent);
    }

    /**
     * Get defined slot by name.
     *
     * @param  {String} slotName
     * @return {Object} definedSlot
     */
    function getDefinedSlot( slotName ) {
        var definedSlot = null;

        for(var i = 0; i < definedSlots.length; i++) {
            var slot = definedSlots[i];
            var unitName = convertSlotName(slot.getAdUnitPath(), 'local');
            if(unitName === slotName) {
                definedSlot = slot;
                break;
            }
        }

        return definedSlot;
    }

    /**
     * Display slot by ID or slot.
     * Separate display call from `displayPageAds()`.
     *
     * @param {String} slotName
     */
    function displaySlot( slotName ) {
        googletag.cmd.push( function () {
            var slot = getDefinedSlot(slotName);
            googletag.pubads().refresh([slot]);
            googletag.display(slotName);

            _this.pagePositions = pagePositions.filter(function (pagePosition) {
                return slotName !== pagePosition;
            });
        });
    }

    /**
     * Empty slots by name. Removes their target container,
     *
     * @param  {Object} event
     * @param  {Array}  units List of slot names.
     */
    function emptySlots( event, units ) {
        units = units.map(function (unit, index) {
            return convertSlotName(unit, 'dfp');
        });

        googletag.pubads().clear( units );


        units.forEach(function (unit) {
            var id = convertSlotName(unit, 'local');
            var element = document.getElementById(id);
            if (element) {
                element.parentNode.removeChild(element);
            }
        });
    }

    /**
     * Empties all ads in a given context.
     *
     * @param  {Object} event
     * @param  {Object}  options
     *         {Array}   $context        javascript element.
     *         {Boolean} removeContainer Default is true.
     */
    function emptySlotsInContext( event, options ) {
        // Опції за замовчуванням
        options = options || {};
        options = Object.assign({
            $context: document.querySelector(Config.get('context')),
            removeContainer: true
        }, options);

        // Знаходження adSelector в контексті та конвертація імені слота
        var units = Array.from(options.$context.querySelectorAll(adSelector)).map(function (unit) {
            return convertSlotName(unit.dataset.adUnit, 'dfp');
        });

        // Очистка pubads
        googletag.pubads().clear(units);

        // Знаходження елементів за id та обробка їх
        var elements = units.map(function (unit) {
            var id = convertSlotName(unit, 'local');
            return options.$context.querySelector('#' + id);
        });

        // Видалення або очищення елементів в залежності від параметра removeContainer
        if ( options.removeContainer ) {
            elements.forEach(function (element) {
                if (element) {
                    element.parentNode.removeChild(element);
                }
            });
        } else {
            elements.forEach(function (element) {
                if (element) {
                    element.innerHTML = '';
                }
            });
        }
    }

    /**
     * Converts a slot name local to DFP or vice versa.
     *
     * @param  {String} slotName
     * @param  {String} format   'dfp' or 'local'.
     * @return {String}
     */
    function convertSlotName( slotName, format ) {
        if ( 'dfp' === format ) {
            return '/' + account + '/' + slotName;
        }

        return slotName.replace( '/' + account + '/', '' );
    }

    /**
     * Refresh slots.
     *
     * @param  {Object} event
     * @param  {Array}  units Optional. List of units to refresh.
     *                        Default is all.
     */
    function refresh( event, units ) {
        units = units || definedSlots;

        googletag.cmd.push( function () {
            googletag.pubads().refresh( units );
        } );
    }

    //////////////////////////////////////////////////////////////////////////////////////

    return {
        init:                init,
        displaySlot:         displaySlot,
        runSequence:         runSequence,
        emptySlots:          emptySlots,
        emptySlotsInContext: emptySlotsInContext,
        refresh:             refresh
    };

} ) );
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

        define( 'src/Insertion',[
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
/**
 * Builds the AdManager prototype.
 * This file should be required directly for CommonJS usage.
 *
 * @see  http://requirejs.org/docs/commonjs.html#intro On CommonJS Transport.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( 'src/Index',[
            './Util',
            './Config',
            './Inventory',
            './Manager',
            './Insertion'
        ], factory );

    } else if ( typeof exports === 'object' ) {

        module.exports = factory(
            require( './Util' ),
            require( './Config' ),
            require( './Inventory' ),
            require( './Manager' ),
            require( './Insertion' )
        );

    } else {

        var _AdManager = window.AdManager;

        window.AdManager = factory(
            _AdManager.Util,
            _AdManager.Config,
            _AdManager.Inventory,
            _AdManager.Manager,
            _AdManager.Insertion
        );

    }

} ( window, function ( Util, Config, Inventory, Manager, Insertion ) {

    'use strict';

    /**
     * AdManager prototype.
     *
     * @param  {Object} newConfig Required configuration for initialization.
     * @throws {Error}            When no configuration is specified.
     */
    function AdManager( newConfig ) {

        newConfig = newConfig || false;

        if ( ! newConfig ) {
            throw new Error( 'Please provide a config.' );
        }

        Config.init( newConfig );
        Insertion.init();
        Manager.init();

    }

    var module = AdManager.prototype;

    module.Util = Util;
    module.Config = Config;
    module.Inventory = Inventory;
    module.Manager = Manager;
    module.Insertion = Insertion;

    return AdManager;

} ) );
