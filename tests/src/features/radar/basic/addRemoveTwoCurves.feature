Feature: Add Remove Two Curves

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    I want to change the data-source to HRRR_GSL
    I want to add one other curve
    then plot unmatched and see the graph,
    then go back to the curve management page,
    then remove all curves.
    I should have no curves.

    Background:
        Given I load the app "/radar"
        Then I expect the app title to be "Radar"

    @watch
    Scenario: addRemoveTwoCurves
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "variable" parameter to "Composite Reflectivity"
        Then the "variable" parameter value matches "Composite Reflectivity"
        When I change the "data-source" parameter to "RAP_GSL"
        Then the "data-source" parameter value matches "RAP_GSL"
        When I set the dates to "09/21/2020 00:00 - 09/24/2020 00:00"
        Then the dates value is "09/21/2020 00:00 - 09/24/2020 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR_GSL"
        Then the "data-source" parameter value matches "HRRR_GSL"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
