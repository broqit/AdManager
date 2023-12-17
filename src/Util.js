export default class Util {
    /**
     * Get the difference of two arrays.
     *
     * @param  {Array} array
     * @param  {Array} values
     * @return {Array} diff
     */
    difference(array, values) {
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
    removeByKey(array, key) {
        return array.filter(function(element, index) {
            return index !== key;
        });
    }

    isEmpty(obj) {
        for (const prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                return false;
            }
        }

        return true
    }
}
