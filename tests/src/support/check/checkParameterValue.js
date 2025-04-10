/**
 * Check the selected state of the given element
 * @param  {String}   parameter the selection parameter
 * @param  {String}   option the selected option
 */
export default async (parameter, option) => {
    /**
     * The selected state
     * @type {Boolean}
     */
    const isSelected = await $(parameter).isSelected();

    if (option) {
        expect(isSelected)
            .not.toEqual(true, `"${option}" should not be selected`);
    } else {
        expect(isSelected)
            .toEqual(true, `"${option}" should be selected`);
    }
};
