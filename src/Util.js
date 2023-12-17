/**
 * Shared utilities for debugging and array manipulation.
 */
( function ( window, factory ) {

    'use strict';

    if ( typeof define === 'function' && define.amd ) {

        define( [], factory );

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