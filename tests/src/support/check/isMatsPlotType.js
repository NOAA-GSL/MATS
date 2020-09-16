/**
 * Check the current value (selected element of named group)
 * of the plot-type selector against a provided value
 * @param  {String} value the expected value
 */
export default (value) => {
    /**
     * The selected state
     * @type {Boolean}
     */
    const selected = $$('input[name=plot-type]').find(
        (elem) => elem.isSelected()
    );
    const selectedValue = $(selected).getValue();
    expect(selectedValue).toBe(value, `"plot type" should be ${value} and is ${selectedValue}`);
};
