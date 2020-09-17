/**
 * Check the current value (selected element of named group) of the given radio group selector against a provided value
 * @param  {String}   selector   Element group selector
 * @param  {String}   the expected value
 */
export default (name, value) => {
    /**
     * The selected state
     * @type {Boolean}
     */
    const selector = `input[name=${name}]`;
    const selectedValue = $(selector).getValue();
    expect(selectedValue).toBe(value, `"${name}" should should have selected ${value}`);
};
