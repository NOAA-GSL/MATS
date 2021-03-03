Feature: Add Remove Curve

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/landuse"
        Then I expect the app title to be "Surface Land Use"

    @watch
    Scenario: addRemoveCurve
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I set the dates to "03/02/2021 0:00 - 03/03/2021 0:00"
        Then the dates value is "03/02/2021 0:00 - 03/03/2021 0:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "TimeSeries" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
