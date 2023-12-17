/**
 * Handles the request and display of ads.
 *
 * @todo  Allow for multiple inits, only bind events
 *        and load library once.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( [
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