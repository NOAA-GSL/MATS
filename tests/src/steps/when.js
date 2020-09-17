import clearInputField from '../support/action/clearInputField';
import clickElement from '../support/action/clickElement';
import closeLastOpenedWindow from '../support/action/closeLastOpenedWindow';
import deleteCookies from '../support/action/deleteCookies';
import dragElement from '../support/action/dragElement';
import focusLastOpenedWindow from '../support/action/focusLastOpenedWindow';
import handleModal from '../support/action/handleModal';
import moveTo from '../support/action/moveTo';
import pause from '../support/action/pause';
import pressButton from '../support/action/pressButton';
import scroll from '../support/action/scroll';
import selectOption from '../support/action/selectOption';
import selectOptionByIndex from '../support/action/selectOptionByIndex';
import setCookie from '../support/action/setCookie';
import setInputField from '../support/action/setInputField';
import setPromptText from '../support/action/setPromptText';

import setPredefinedDateRange from '../support/action/setPredefinedDateRange';
import setMatsDateRange from '../support/action/setMatsDateRange';
import setMatsCurveDateRange from '../support/action/setMatsCurveDateRange';
import setScatterDateRange from '../support/action/setScatterDateRange';
import setMatsPlotType from '../support/action/setMatsPlotType';
import setMatsPlotFormat from '../support/action/setMatsPlotFormat';
import clickMatsButton from '../support/action/clickMatsButton';
import setMatsSelectedOption from '../support/action/setMatsSelectedOption';
import matsRefreshBrowser from '../support/action/matsRefreshBrowser';
import matsRefreshPage from '../support/action/matsRefreshPage';
import matsClearParameter from '../support/action/matsClearParameter';

const { When } = require('cucumber');

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
    /^I change the "([^"]*)" parameter to "([^"]*)"$/, { wrapperOptions: { retry: 2 } },
    setMatsSelectedOption
);

When(
    /^I set the plot type to "([^"]*)?"$/,
    setMatsPlotType
);

When(
    /^I choose a predefined "([^"]*)?" range of "([^"]*)?"$/, { wrapperOptions: { retry: 2 } },
    setPredefinedDateRange
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
    /^I set the scatter dates to "([^"]*)?"$/, { wrapperOptions: { retry: 2 } },
    setScatterDateRange
);

When(
    /^I (click|doubleclick) on the (link|button|element) "([^"]*)?"$/,
    clickElement
);

When(
    /^I (add|set) "([^"]*)?" to the inputfield "([^"]*)?"$/,
    setInputField
);

When(
    /^I clear the inputfield "([^"]*)?"$/,
    clearInputField
);

When(
    /^I drag element "([^"]*)?" to element "([^"]*)?"$/,
    dragElement
);

When(
    /^I pause for (\d+)ms$/,
    pause
);

When(
    /^I set a cookie "([^"]*)?" with the content "([^"]*)?"$/,
    setCookie
);

When(
    /^I delete the cookie "([^"]*)?"$/,
    deleteCookies
);

When(
    /^I press "([^"]*)?"$/,
    pressButton
);

When(
    /^I (accept|dismiss) the (alertbox|confirmbox|prompt)$/,
    handleModal
);

When(
    /^I enter "([^"]*)?" into the prompt$/,
    setPromptText
);

When(
    /^I scroll to element "([^"]*)?"$/,
    scroll
);

When(
    /^I close the last opened (window|tab)$/,
    closeLastOpenedWindow
);

When(
    /^I focus the last opened (window|tab)$/,
    focusLastOpenedWindow
);

When(
    /^I select the (\d+)(st|nd|rd|th) option for element "([^"]*)?"$/,
    selectOptionByIndex
);

When(
    /^I select the option with the (name|value|text) "([^"]*)?" for element "([^"]*)?"$/,
    selectOption
);

When(
    /^I move to element "([^"]*)?"(?: with an offset of (\d+),(\d+))*$/,
    moveTo
);
