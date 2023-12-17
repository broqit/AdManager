export default class Manager {
    constructor(Config, Inventory, Util) {
        this.Config = Config;
        this.Inventory = Inventory;
        this.Util = Util;

        this.loaded = false;
        this.definedSlots = [];
        this.pagePositions = [];
        this.inventory = [];
        this.account = null;
        this.adSelector = '[data-ad-unit]';
    }

    /**
     * Add event listeners and get the DFP library.
     */
    init() {
        if ( ! this.Config.get( 'enabled' ) ) {
            return;
        }

        this.inventory = this.Inventory.getInventory();
        this.account = this.Config.get( 'account' );

        this.addEventListeners();
        this.loadLibrary();
    }

    addEventListeners() {
        document.addEventListener('AdManager:libraryLoaded', this.libraryLoaded.bind(this));
        document.addEventListener('AdManager:runSequence', this.runSequence.bind(this));
        document.addEventListener('AdManager:slotsDefined', this.displayPageAds.bind(this));
        document.addEventListener('AdManager:refresh', this.refresh.bind(this));
        document.addEventListener('AdManager:emptySlots', this.emptySlots.bind(this));
        document.addEventListener('AdManager:emptySlotsInContext', this.emptySlotsInContext.bind(this));
    }

    /**
     * Library loaded callback.
     *
     * @fires AdManager:runSequence
     * @fires AdManager:ready
     */
    libraryLoaded() {
        this.loaded = true;

        this.listenForDfpEvents();
        this.setupPubAdsService();

        if (this.Config.get('autoload')) {
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
    runSequence() {
        this.pagePositions = [];
        this.setTargeting();
        this.setPagePositions();
        this.defineSlotsForPagePositions();
    }

    /**
     * Asynchronously load the DFP library.
     * Calls ready event when fully loaded.
     */
    loadLibrary() {
        var _this = this;

        if ( this.loaded ) {
            return this.onLibraryLoaded();
        }

        var googletag,
            gads,
            useSSL,
            node,
            readyStateLoaded = false;

        window.googletag = window.googletag || {};
        window.googletag.cmd = window.googletag.cmd || [];

        gads = document.createElement( 'script' );
        gads.async = true;
        gads.type = 'text/javascript';
        useSSL = 'https:' == document.location.protocol;
        gads.src = ( useSSL ? 'https:' : 'http:' ) + '//securepubads.g.doubleclick.net/tag/js/gpt.js';
        if ( gads.addEventListener ) {
            gads.addEventListener( 'load', _this.onLibraryLoaded, false );
        } else if ( gads.readyState ) {
            gads.onreadystatechange = function () {
                // Legacy IE
                if ( ! readyStateLoaded ) {
                    readyStateLoaded = true;
                    _this.onLibraryLoaded();
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
    onLibraryLoaded() {
        googletag.cmd.push(function () {
            const event = new CustomEvent('AdManager:libraryLoaded');
            document.dispatchEvent(event);
        });
    }

    /**
     * Add a listener for the GPT `slotRenderEnded` event.
     */
    listenForDfpEvents() {
        const _this = this;
        googletag.cmd.push( function () {
            googletag.pubads().addEventListener( 'slotRenderEnded', _this.onSlotRenderEnded.bind(_this) );
        } );
    }

    /**
     * Enable batched SRA calls for requesting multiple ads at once.
     * Disable initial load of units, wait for display call.
     */
    setupPubAdsService() {
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
    setTargeting() {
        const _this = this;

        googletag.cmd.push(function() {
            const targeting = _this.Config.get('targeting');

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
    setPagePositions() {
        const clientType = this.Config.get('clientType');
        const context = document.querySelector(this.Config.get('context'));
        let units = null;
        let selector = this.adSelector + ':not(.is-disabled)';

        if (clientType !== false) {
            selector += '[data-client-type="' + clientType + '"]';
        }

        units = context.querySelectorAll(selector);

        const _this = this;

        Array.from(units).forEach(function(unit) {
            const element = unit.getAttribute('data-ad-unit');
            if(element) {
                _this.pagePositions.push(element);
            }
        });
    }

    /**
     * Define slots for page positions.
     *
     * @fires AdManager:slotsDefined
     */
    defineSlotsForPagePositions() {
        googletag.cmd.push(() => {
            let undefinedPagePositions = [];

            if (Object.keys(this.definedSlots).length === 0) {
                undefinedPagePositions = this.pagePositions;
            } else {
                let definedSlotNames = Object.keys(this.definedSlots).map(index => {
                    let slot = this.definedSlots[index];
                    return this.convertSlotName(slot.getAdUnitPath(), 'local');
                });

                undefinedPagePositions = this.pagePositions.filter(slotName => {
                    if (definedSlotNames.indexOf(slotName) !== -1) {
                        return false;
                    }
                    return true;
                });
            }

            undefinedPagePositions.forEach((slotName) => {
                let position = this.Inventory.getAdInfo(slotName);

                if(!this.Util.isEmpty(position)) {
                    let slot = googletag
                        .defineSlot(
                            this.convertSlotName(slotName, 'dfp'),
                            position.sizes,
                            position.slot
                        )
                        .addService(googletag.pubads());

                    this.definedSlots.push(slot);
                }
            });

            // Enables GPT services for defined slots.
            googletag.enableServices();

            this.insertUnitTargets();

            let event = new CustomEvent('AdManager:slotsDefined');
            document.dispatchEvent(event);
        });

    }

    /**
     * Creates the containers for the DFP to fill.
     * DFP wants ids.
     */
    insertUnitTargets() {
        var context = document.querySelector(this.Config.get('context'));
        var notInserted = [];

        notInserted = this.pagePositions.filter(function(slotName) {
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
    displayPageAds() {
        const _this = this;

        googletag.cmd.push(function() {
            var pageSlots = _this.definedSlots.filter(function(slot) {
                var slotName = _this.convertSlotName(slot.getAdUnitPath(), 'local');
                return _this.pagePositions.includes(slotName);
            });

            googletag.pubads().refresh(pageSlots);

            _this.pagePositions.forEach(function(slotName) {
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
    onSlotRenderEnded( unit ) {
        var slotName = this.convertSlotName(unit.slot.getAdUnitPath(), 'local');

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
     * @todo   Use `$.grep` instead of `$.each`.
     *
     * @param  {String} slotName
     * @return {Object} definedSlot
     */
    getDefinedSlot( slotName ) {
        var definedSlot = null;

        for(var i = 0; i < this.definedSlots.length; i++) {
            var slot = this.definedSlots[i];
            var unitName = this.convertSlotName(slot.getAdUnitPath(), 'local');
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
    displaySlot( slotName ) {
        const _this = this;

        googletag.cmd.push( function () {
            var slot = _this.getDefinedSlot(slotName);
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
    emptySlots( event, units ) {
        const _this = this;

        units = units.map(function (unit, index) {
            return _this.convertSlotName(unit, 'dfp');
        });

        googletag.pubads().clear( units );


        units.forEach(function (unit) {
            var id = _this.convertSlotName(unit, 'local');
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
     */
    emptySlotsInContext( event ) {
        const _this = this;

        // Опції за замовчуванням
        let options = event.detail || {};
        options = Object.assign({
            $context: document.querySelector(this.Config.get('context')),
            removeContainer: true
        }, options);

        // Знаходження adSelector в контексті та конвертація імені слота
        var units = Array.from(options.$context.querySelectorAll(this.adSelector)).map(function (unit) {
            return _this.convertSlotName(unit.dataset.adUnit, 'dfp');
        });

        // Очистка pubads
        googletag.pubads().clear(units);

        // Знаходження елементів за id та обробка їх
        var elements = units.map(function (unit) {
            var id = _this.convertSlotName(unit, 'local');
            return options.$context.querySelector('#' + id);
        });

        // Видалення або очищення елементів в залежності від параметра removeContainer
        if (options.removeContainer) {
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
    convertSlotName( slotName, format ) {
        if ( 'dfp' === format ) {
            return '/' + this.account + '/' + slotName;
        }

        return slotName.replace( '/' + this.account + '/', '' );
    }

    /**
     * Refresh slots.
     *
     * @param  {Object} event
     *  Default is all.
     */
    refresh( event ) {
        const units = event.detail || this.definedSlots;

        googletag.cmd.push( function () {
            googletag.pubads().refresh( units );
        } );
    }
}