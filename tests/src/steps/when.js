import { When } from '@cucumber/cucumber';

import pause from '../support/action/pause';

import setMatsDateRange from '../support/action/setMatsDateRange';
import setMatsCurveDateRange from '../support/action/setMatsCurveDateRange';
import setMatsPlotType from '../support/action/setMatsPlotType';
import setMatsPlotFormat from '../support/action/setMatsPlotFormat';
import clickMatsButton from '../support/action/clickMatsButton';
import setMatsAllSelectedOptions from '../support/action/setMatsAllSelectedOptions';
import setMatsSelectedOption from '../support/action/setMatsSelectedOption';
import setMatsSelectedNumberSpinner from '../support/action/setMatsSelectedNumberSpinner';
import matsRefreshBrowser from '../support/action/matsRefreshBrowser';
import matsRefreshPage from '../support/action/matsRefreshPage';
import matsClearParameter from '../support/action/matsClearParameter';

When(
    /^I clear the "([^"]*)?" parameter$/,
    matsClearParameter
);

When(
    /^I refresh the browser$/,
    matsRefreshBrowser
);

When(
    /^I refresh the page$/,
    matsRefreshPage
);

When(
    /^I click the "([^"]*)?" radio button$/,
    setMatsPlotFormat
);

When(
    /^I click the "([^"]*)?" button$/,
    clickMatsButton
);

When(
    /^I select all options in the "([^"]*)" parameter$/, { wrapperOptions: { retry: 2 } },
    setMatsAllSelectedOptions
);

When(
    /^I change the "([^"]*)" parameter to "([^"]*)"$/, { wrapperOptions: { retry: 2 } },
    setMatsSelectedOption
);

When(
    /^I change the "([^"]*)" number parameter to "([^"]*)"$/, { wrapperOptions: { retry: 2 } },
    setMatsSelectedNumberSpinner
);

When(
    /^I set the plot type to "([^"]*)?"$/,
    setMatsPlotType
);

When(
    /^I set the dates to "([^"]*)?"$/, { wrapperOptions: { retry: 2 } },
    setMatsDateRange
);

When(
    /^I set the curve-dates to "([^"]*)?"$/, { wrapperOptions: { retry: 2 } },
    setMatsCurveDateRange
);

When(
    /^I pause for (\d+)ms$/,
    pause
);
