Feature: Add Remove ContourDiff

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the ContourDiff radio button,
    I want to add one curve.
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/precipitation1hr"
        Then I expect the app title to be "1 Hour Precipitation"

    @watch
    Scenario: addRemoveContourDiff
        When I set the plot type to "ContourDiff"
        Then the plot type should be "ContourDiff"
        When I change the "data-source" parameter to "RAP_OPS"
        Then the "data-source" parameter value matches "RAP_OPS"
        When I set the dates to "11/10/2023 00:00 - 11/13/2023 00:00"
        Then the dates value is "11/10/2023 00:00 - 11/13/2023 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Contour Diff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Contour Diff" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
