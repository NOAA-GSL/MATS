Feature: addThreeCurvesRemoveOneCurveAddAnotherCurve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    I want to change the data-source to GFS
    I want to add one other curve
    then plot unmatched and see the graph,
    then go back to the curve management page,
    then remove all curves.
    I should have no curves.

    Background:
        Given I load the app "/anomalycor"
        Then I expect the app title to be "Anomaly Correlation"

    @watch
    Scenario: addThreeCurvesRemoveOneCurveAddAnotherCurve
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "data-source" parameter to "GFS"
        Then the "data-source" parameter value matches "GFS"
        When I set the dates to "06/28/2019 0:00 - 09/24/2019 0:00"
        Then the dates value is "06/28/2019 0:00 - 09/24/2019 0:00"
        Then I change the "forecast-length" parameter to "144"
        Then the "forecast-length" parameter value matches "144"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "FV3_CCPP_GSL"
        Then the "data-source" parameter value matches "FV3_CCPP_GSL"
        When I click the "Add Curve" button
        Then "Curve1" is added

        When I change the "data-source" parameter to "FV3_CCPP_EMC"
        Then the "data-source" parameter value matches "FV3_CCPP_EMC"
        When I click the "Add Curve" button
        Then "Curve2" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve2"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "TimeSeries" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible
        When I click the "Remove Curve1" button
        Then I click the "Remove curve Curve1" button
        And I should see a list of curves containing "Curve0,Curve2"

        When I change the "data-source" parameter to "FV3_CCPP_GSL"
        Then the "data-source" parameter value matches "FV3_CCPP_GSL"
        When I click the "Add Curve" button
        Then "Curve3" is added

        And I should see a list of curves containing "Curve0,Curve2,Curve3"
        Then the "Curve0" color should be "rgb(255,0,0)"
        Then the "Curve2" color should be "rgb(255,165,0)"
        Then the "Curve3" color should be "rgb(128,128,128)"

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
