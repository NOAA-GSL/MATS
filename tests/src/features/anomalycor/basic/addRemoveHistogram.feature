Feature: Add Remove Histogram

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the histogram radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/anomalycor"
        Then I expect the app title to be "Anomaly Correlation"

    @watch
    Scenario: addRemoveHistogram
        When I set the plot type to "Histogram"
        Then the plot type should be "Histogram"
        When I change the "data-source" parameter to "GFS"
        Then the "data-source" parameter value matches "GFS"
        When I set the curve-dates to "02/28/2020 00:00 - 05/24/2020 00:00"
        Then the curve-dates value is "02/28/2020 00:00 - 05/24/2020 00:00"
        Then I change the "forecast-length" parameter to "144"
        Then the "forecast-length" parameter value matches "144"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
