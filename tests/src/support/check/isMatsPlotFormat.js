/**
 * Check the current value (selected element of named group)
 * of the plot-format selector against a provided value
 * @param  {String} value the expected value
 */
export default async (value) => {
    /**
     * The selected state
     * @type {Boolean}
     */
    const selected = await $$('input[name=plotFormat]').find(
        (elem) => elem.isSelected()
    );
    const selectedValue = await $(selected).getValue();
    expect(selectedValue).toBe(value, `"plot format" should be ${value} and is ${selectedValue}`);
};
