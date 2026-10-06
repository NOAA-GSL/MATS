Feature: Add Remove Contour

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the contour radio button,
    I want to add one curve.
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/cb-raob"
        Then I expect the app title to be "RAOB"

    @watch
    Scenario: addRemoveContour
        When I set the plot type to "Contour"
        Then the plot type should be "Contour"
        When I change the "variable" parameter to "Temperature (°C)"
        Then the "variable" parameter value matches "Temperature (°C)"
        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I change the "filter-model-by" parameter to "Wind Speed (m/s)"
        Then the "filter-model-by" parameter value matches "Wind Speed (m/s)"
        When I change the "filter-obs-by" parameter to "Relative Humidity (%)"
        Then the "filter-obs-by" parameter value matches "Relative Humidity (%)"
        When I set the dates to "09/28/2026 00:00 - 10/01/2026 00:00"
        Then the dates value is "09/28/2026 00:00 - 10/01/2026 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Contour" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
