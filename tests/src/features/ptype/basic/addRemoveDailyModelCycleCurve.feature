Feature: Add Remove DailyModelCycle Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the dailyModelCycle radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/ptype"
        Then I expect the app title to be "Precipitation Type"

    @watch
    Scenario: addRemoveDailyModelCycleCurve
        When I set the plot type to "DailyModelCycle"
        Then the plot type should be "DailyModelCycle"
        When I change the "data-source" parameter to "RAP_GSL_130"
        Then the "data-source" parameter value matches "RAP_GSL_130"
        When I set the dates to "09/21/2019 00:00 - 09/24/2019 00:00"
        Then the dates value is "09/21/2019 00:00 - 09/24/2019 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Daily Model Cycle" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
