Feature: Add Remove Histogram

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the histogram radio button,
    I want to add one curve
    then plot that curve and see the graph,
    then go back to the curve management page,
    then delete that curve.

    Background:
        Given I load the app "/ceil-vis15"
        Then I expect the app title to be "15 Minute Ceiling and Visibility"

    @watch
    Scenario: addRemoveHistogram
        When I set the plot type to "Histogram"
        Then the plot type should be "Histogram"
        When I change the "database" parameter to "15 Minute Visibility"
        Then the "database" parameter value matches "15 Minute Visibility"
        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I set the curve-dates to "09/21/2019 0:00 - 09/24/2019 0:00"
        Then the curve-dates value is "09/21/2019 0:00 - 09/24/2019 0:00"
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