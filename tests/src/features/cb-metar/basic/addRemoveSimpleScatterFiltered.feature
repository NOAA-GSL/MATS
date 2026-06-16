Feature: Add Remove Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/cb-metar"
        Then I expect the app title to be "METAR"

    @watch
    Scenario: addRemoveCurve
        When I set the plot type to "SimpleScatter"
        Then the plot type should be "SimpleScatter"
        When I change the "x-variable" parameter to "Ceiling (ft)"
        Then the "x-variable" parameter value matches "Ceiling (ft)"
        When I change the "y-variable" parameter to "Ceiling (ft)"
        Then the "y-variable" parameter value matches "Ceiling (ft)"
        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I change the "x-statistic" parameter to "CSI (Critical Success Index)"
        Then the "x-statistic" parameter value matches "CSI (Critical Success Index)"
        When I change the "y-statistic" parameter to "Model average"
        Then the "y-statistic" parameter value matches "Model average"
        When I change the "x-threshold" parameter to "3000 (ceiling <3000 ft)"
        Then the "x-threshold" parameter value matches "3000 (ceiling <3000 ft)"
        When I change the "filter-model-by" parameter to "Wind Speed at 10m (m/s)"
        Then the "filter-model-by" parameter value matches "Wind Speed at 10m (m/s)"
        When I change the "filter-obs-by" parameter to "Temperature at 2m (°C)"
        Then the "filter-obs-by" parameter value matches "Temperature at 2m (°C)"
        When I set the curve-dates to "08/01/2023 00:00 - 08/15/2023 00:00"
        Then the curve-dates value is "08/01/2023 00:00 - 08/15/2023 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Simple Scatter" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
