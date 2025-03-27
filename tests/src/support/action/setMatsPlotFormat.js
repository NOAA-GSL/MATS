/**
 * Set the plotFormat
 * @param  {String}   plotFormat   The plot format
 * */
export default async (plotFormat) => {
    switch (plotFormat) {
        case 'matching diffs':
            await $('#plotFormat-radioGroup-matching').scrollIntoView();
            await $('#plotFormat-radioGroup-matching').click();
            break;
        case 'pairwise diffs':
            await $('#plotFormat-radioGroup-pairwise').scrollIntoView();
            await $('#plotFormat-radioGroup-pairwise').click();
            break;
        case 'no diffs':
            await $('#plotFormat-radioGroup-none').scrollIntoView();
            await $('#plotFormat-radioGroup-none').click();
            break;
        default:
            throw new Error('invalid plotFormat in setMatsPlotFormat');
    }
};
