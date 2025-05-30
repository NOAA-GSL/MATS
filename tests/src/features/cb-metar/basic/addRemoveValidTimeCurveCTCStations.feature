Feature: Add Remove Valid Time Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the validtime radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/cb-metar"
        Then I expect the app title to be "METAR"

    @watch
    Scenario: addRemoveValidTimeCurve
        When I set the plot type to "ValidTime"
        Then the plot type should be "ValidTime"
        When I change the "variable" parameter to "Ceiling (ft)"
        Then the "variable" parameter value matches "Ceiling (ft)"
        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I change the "region-type" parameter to "Select stations"
        Then the "region-type" parameter value matches "Select stations"
        When I change the "threshold" parameter to "60000 (ceiling <60000 ft -- any cloud)"
        Then the "threshold" parameter value matches "60000 (ceiling <60000 ft -- any cloud)"
        When I change the "sites" parameter to "KDEN"
        Then the "sites" parameter value matches "KDEN"
        When I set the curve-dates to "10/12/2024 00:00 - 10/12/2024 23:59"
        Then the curve-dates value is "10/12/2024 00:00 - 10/12/2024 23:59"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Valid Time" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
