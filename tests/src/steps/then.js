import { Then } from '@cucumber/cucumber';

import checkClass from '../support/check/checkClass';
import checkContainsAnyText from '../support/check/checkContainsAnyText';
import checkIsEmpty from '../support/check/checkIsEmpty';
import checkContainsText from '../support/check/checkContainsText';
import checkCookieContent from '../support/check/checkCookieContent';
import checkCookieExists from '../support/check/checkCookieExists';
import checkDimension from '../support/check/checkDimension';
import checkEqualsText from '../support/check/checkEqualsText';
import checkFocus from '../support/check/checkFocus';
import checkInURLPath from '../support/check/checkInURLPath';
import checkIsOpenedInNewWindow from
    '../support/check/checkIsOpenedInNewWindow';
import checkModal from '../support/check/checkModal';
import checkModalText from '../support/check/checkModalText';
import checkNewWindow from '../support/check/checkNewWindow';
import checkOffset from '../support/check/checkOffset';
import checkProperty from '../support/check/checkProperty';
import checkFontProperty from '../support/check/checkFontProperty';
import checkSelected from '../support/check/checkSelected';
import checkMatsDatesValue from '../support/check/checkMatsDatesValue';
import checkMatsCurveDatesValue from '../support/check/checkMatsCurveDatesValue';
import checkTitle from '../support/check/checkTitle';
import checkTitleContains from '../support/check/checkTitleContains';
import checkURL from '../support/check/checkURL';
import checkURLPath from '../support/check/checkURLPath';
import checkWithinViewport from '../support/check/checkWithinViewport';
import compareText from '../support/check/compareText';
import isEnabled from '../support/check/isEnabled';
import isExisting from '../support/check/isExisting';
import isVisible from '../support/check/isDisplayed';
import waitFor from '../support/action/waitFor';
import waitForVisible from '../support/action/waitForDisplayed';
import checkIfElementExists from '../support/lib/checkIfElementExists';
import checkParameterValue from '../support/check/checkParameterValue';
import checkMatsAppTitle from '../support/check/checkMatsAppTitle';
import checkMatsCurveIsAdded from '../support/check/checkMatsCurveIsAdded';
import checkMatsGraphPlotType from '../support/check/checkMatsGraphPlotType';
import checkMatsCurveNumber from '../support/check/checkMatsCurveNumber';
import checkMatsPlotNumber from '../support/check/checkMatsPlotNumber';
import checkMatsCurveListContains from '../support/check/checkMatsCurveListContains';
import checkMatsLegendListContains from '../support/check/checkMatsLegendListContains';
import isGraphDisplayed from '../support/check/isMatsGraphDisplayed';
import isMainDisplayed from '../support/check/isMainDisplayed';
import isMatsButtonVisible from '../support/check/isMatsButtonVisible';
import isMatsPlotType from '../support/check/isMatsPlotType';
import isMatsPlotFormat from '../support/check/isMatsPlotFormat';
import isMatsSelectedOption from '../support/check/isMatsSelectedOption';
import isMatsCurveColor from '../support/check/isMatsCurveColor';
import checkMatsParameters from '../support/check/checkMatsParameters';
import isMatsInfoVisible from '../support/check/isMatsInfoVisible';
import checkMatsInfoMessage from '../support/check/checkMatsInfoMessage';
import matsDebug from '../support/action/matsDebug';
import isMatsButtonEnabled from '../support/check/isMatsButtonEnabled';



Then(/^I debug$/, matsDebug);

Then(
    /^the "info" dialog should( not)* be visible$/,
    isMatsInfoVisible
);

Then(
    /^the "([^"]*)" button should( not)* be enabled$/,
    isMatsButtonEnabled
);

Then(
    /^I should see "([^"]*)" in the "info" dialog$/,
    checkMatsInfoMessage
);

Then(
    /^the parameter values should remain unchanged$/,
    checkMatsParameters
);

Then(
    /^the "([^"]*)" color should be "([^"]*)"$/,
    isMatsCurveColor
);

Then(
    /^the "([^"]*)?" parameter value matches "([^"]*)?"$/,
    isMatsSelectedOption
);

Then(
    /^the "([^"]*)?" button should be visible$/,
    isMatsButtonVisible
);

Then(
    /^"([^"]*)?" is added$/,
    checkMatsCurveIsAdded
);

Then(
    /^I should be on the graph page$/,
    isGraphDisplayed
);

Then(
    /^I should be on the main page$/,
    isMainDisplayed
);

Then(
    /^I should have a "([^"]*)?" plot$/,
    checkMatsGraphPlotType
);

Then(
    /^the plot type should be "([^"]*)?"$/,
    isMatsPlotType
);

Then(
    /^the plot format should be "([^"]*)?"$/,
    isMatsPlotFormat
);

Then(
    /^I should have (\d+) curve.*$/,
    checkMatsCurveNumber
);

Then(
    /^I should have (\d+) trace.*$/,
    checkMatsPlotNumber
);

Then(
    /^I expect the app title to be "([^"]*)?"$/,
    checkMatsAppTitle
);

Then(
    /^I should see a list of curves containing "([^"]*)?"$/,
    checkMatsCurveListContains
);

Then(
    /^I should see a list of legends containing "([^"]*)?"$/,
    checkMatsLegendListContains
);

Then(
    /^I expect that the "([^"]*)?" parameter value matches "([^"]*)?"$/,
    checkParameterValue
);

Then(
    /^the dates value is "([^"]*)?"$/,
    checkMatsDatesValue
);

Then(
    /^the curve-dates value is "([^"]*)?"$/,
    checkMatsCurveDatesValue
);

Then(
    /^the plot type should be "([^"]*)?"&/,
    isMatsPlotType
);
Then(
    /^I expect that the title is( not)* "([^"]*)?"$/,
    checkTitle
);

Then(
    /^I expect that the title( not)* contains "([^"]*)?"$/,
    checkTitleContains
);

Then(
    /^I expect that element "([^"]*)?" does( not)* appear exactly "([^"]*)?" times$/,
    checkIfElementExists
);

Then(
    /^I expect that element "([^"]*)?" is( not)* displayed$/,
    isVisible
);

Then(
    /^I expect that element "([^"]*)?" becomes( not)* displayed$/,
    waitForVisible
);

Then(
    /^I expect that element "([^"]*)?" is( not)* within the viewport$/,
    checkWithinViewport
);

Then(
    /^I expect that element "([^"]*)?" does( not)* exist$/,
    isExisting
);

Then(
    /^I expect that element "([^"]*)?"( not)* contains the same text as element "([^"]*)?"$/,
    compareText
);

Then(
    /^I expect that (button|element) "([^"]*)?"( not)* matches the text "([^"]*)?"$/,
    checkEqualsText
);

Then(
    /^I expect that (button|element|container) "([^"]*)?"( not)* contains the text "([^"]*)?"$/,
    checkContainsText
);

Then(
    /^I expect that (button|element) "([^"]*)?"( not)* contains any text$/,
    checkContainsAnyText
);

Then(
    /^I expect that (button|element) "([^"]*)?" is( not)* empty$/,
    checkIsEmpty
);

Then(
    /^I expect that the url is( not)* "([^"]*)?"$/,
    checkURL
);

Then(
    /^I expect that the path is( not)* "([^"]*)?"$/,
    checkURLPath
);

Then(
    /^I expect the url to( not)* contain "([^"]*)?"$/,
    checkInURLPath
);

Then(
    /^I expect that the( css)* attribute "([^"]*)?" from element "([^"]*)?" is( not)* "([^"]*)?"$/,
    checkProperty
);

Then(
    /^I expect that the font( css)* attribute "([^"]*)?" from element "([^"]*)?" is( not)* "([^"]*)?"$/,
    checkFontProperty
);

Then(
    /^I expect that checkbox "([^"]*)?" is( not)* checked$/,
    checkSelected
);

Then(
    /^I expect that element "([^"]*)?" is( not)* selected$/,
    checkSelected
);

Then(
    /^I expect that element "([^"]*)?" is( not)* enabled$/,
    isEnabled
);

Then(
    /^I expect that cookie "([^"]*)?"( not)* contains "([^"]*)?"$/,
    checkCookieContent
);

Then(
    /^I expect that cookie "([^"]*)?"( not)* exists$/,
    checkCookieExists
);

Then(
    /^I expect that element "([^"]*)?" is( not)* ([\d]+)px (broad|tall)$/,
    checkDimension
);

Then(
    /^I expect that element "([^"]*)?" is( not)* positioned at ([\d+.?\d*]+)px on the (x|y) axis$/,
    checkOffset
);

Then(
    /^I expect that element "([^"]*)?" (has|does not have) the class "([^"]*)?"$/,
    checkClass
);

Then(
    /^I expect a new (window|tab) has( not)* been opened$/,
    checkNewWindow
);

Then(
    /^I expect the url "([^"]*)?" is opened in a new (tab|window)$/,
    checkIsOpenedInNewWindow
);

Then(
    /^I expect that element "([^"]*)?" is( not)* focused$/,
    checkFocus
);

Then(
    /^I wait on element "([^"]*)?"(?: for (\d+)ms)*(?: to( not)* (be checked|be enabled|be selected|be displayed|contain a text|contain a value|exist))*$/,
    {
        wrapperOptions: {
            retry: 3,
        },
    },
    waitFor
);

Then(
    /^I expect that a (alertbox|confirmbox|prompt) is( not)* opened$/,
    checkModal
);

Then(
    /^I expect that a (alertbox|confirmbox|prompt)( not)* contains the text "([^"]*)?"$/,
    checkModalText
);
