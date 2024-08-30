Feature: Add Remove Map

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/upperair"
        Then I expect the app title to be "Upper Air"

    @watch
    Scenario: addRemoveCurve
        When I set the plot type to "Map"
        Then the plot type should be "Map"
        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I select all options in the "sites" parameter
        Then the "sites" parameter value matches "999 .. ZHENGZHOU (ZHCC)"
        When I change the "top" number parameter to "500"
        Then the "top" parameter value matches "500"
        When I change the "bottom" number parameter to "500"
        Then the "bottom" parameter value matches "500"
        When I set the dates to "08/12/2024 00:00 - 08/12/2024 23:59"
        Then the dates value is "08/12/2024 00:00 - 08/12/2024 23:59"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Map" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
