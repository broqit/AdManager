(function (window, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define([], factory);
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