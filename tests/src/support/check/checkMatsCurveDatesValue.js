/**
 * Check the selected state of the given element
 * @param  {String}   value  the expected value
 */
export default async (value) => {
    /**
     * The expected value
     * @type {string}
     */
    const datesValue = await $('#controlButton-curve-dates-value').getText();
    expect(datesValue).toEqual(value, `"daterange" should be ${value} but was ${datesValue}`);
};
