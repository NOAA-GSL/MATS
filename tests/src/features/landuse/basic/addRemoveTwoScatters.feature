Feature: Add Remove Two Scatters

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
        Given I load the app "/landuse"
        Then I expect the app title to be "Surface Land Use"

    @watch
    Scenario: addRemoveTwoScatters
        When I set the plot type to "SimpleScatter"
        Then the plot type should be "SimpleScatter"
        When I change the "data-source" parameter to "RAP_GSL"
        Then the "data-source" parameter value matches "RAP_GSL"
        When I change the "x-statistic" parameter to "Bias (Model - Obs)"
        Then the "x-statistic" parameter value matches "Bias (Model - Obs)"
        When I change the "x-variable" parameter to "2m temperature"
        Then the "x-variable" parameter value matches "2m temperature"
        When I change the "y-statistic" parameter to "Obs average"
        Then the "y-statistic" parameter value matches "Obs average"
        When I change the "y-variable" parameter to "2m temperature"
        Then the "y-variable" parameter value matches "2m temperature"
        When I set the curve-dates to "03/02/2021 00:00 - 03/03/2021 00:00"
        Then the curve-dates value is "03/02/2021 00:00 - 03/03/2021 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR_GSL"
        Then the "data-source" parameter value matches "HRRR_GSL"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Simple Scatter" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Simple Scatter" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
