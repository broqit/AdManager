export class Config {
    constructor() {
        this.config = {};
        this.defaults = {
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

        document.addEventListener('AdManager:importConfig', this.onImportConfig.bind(this));
    }

    /**
     * Get config value by key.
     * Pass no key to get entire config object.
     *
     * @param  {String|Null} key Optional.
     * @return {Mixed}
     */
    get(key) {
        key = key || false;

        if (!key) {
            return this.config;
        }

        console.log(this.config, 'key', key)

        return this.getConfigValue(this.config, key);
    }

    /**
     * Set config value by key.
     *
     * @param  {String} key
     * @param  {Mixed}  value
     * @return {Object} config
     */
    set(key, value) {
        return this.setConfigValue(this.config, key, value);
    }

    /**
     * Set config value.
     * Uses recursion to set nested values.
     *
     * @param  {Object} config
     * @param  {String} key
     * @param  {Mixed}  value
     * @return {Object} config
     */
    setConfigValue(config, key, value) {
        if (typeof key === 'string') {
            key = key.split('.');
        }

        if (key.length > 1) {
            this.setConfigValue(config[key.shift()], key, value);
        } else {
            config[key[0]] = value;
        }

        return config;
    }

    /**
     * Get config value.
     * Uses recursion to get nested values.
     *
     * @param  {Object} config
     * @param  {String} key
     * @return {Mixed}
     */
    getConfigValue(config, key) {
        if (typeof key === 'string') {
            key = key.split('.');
        }

        if (key.length > 1) {
            return this.getConfigValue(config[key.shift()], key);
        } else {
            return key[0] in config ? config[key[0]] : null;
        }
    }

    /**
     * Merge passed config with defaults.
     *
     * @fires AdManager:unitsInserted
     *
     * @param  {Object} newConfig
     */
    init(newConfig) {
        var event;

        if (document.createEvent) {
            event = document.createEvent("Event");
            event.initEvent("AdManager:importConfig", true, true);
        } else {
            event = new Event("AdManager:importConfig", { bubbles: true, cancelable: true });
        }

        event.detail = newConfig;

        document.dispatchEvent(event);
    }

    /**
     * Import new config.
     * Merges with the current config.
     *
     * @param  {Object} event
     * @param  {Object} newConfig
     * @return {Object} config
     */
    onImportConfig(event) {
        this.config = Object.assign({}, this.defaults, this.config, event.detail);

        return this.config;
    }
}