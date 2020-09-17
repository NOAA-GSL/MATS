/**
 * Check the selected state of the given element
 * @param  {String}   value  the expected value
 */
export default (value) => {
    /**
     * The expected value
     * @type {string}
     */
    const datesValue = $('#controlButton-curve-dates-value').getText();
    expect(datesValue).toEqual(value, `"daterange" should be ${value} but was ${datesValue}`);
};
