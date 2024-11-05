Feature: Match Unmatch Diff Curves Timeseries

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are time series,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/cb-metar"
        Then I expect the app title to be "METAR"

    @watch
    Scenario: matchUnmatchDiffCurvesTimeseries
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "variable" parameter to "Ceiling (ft)"
        Then the "variable" parameter value matches "Ceiling (ft)"
        When I change the "data-source" parameter to "HRRR_OPS"
        Then the "data-source" parameter value matches "HRRR_OPS"
        When I change the "region-type" parameter to "Select stations"
        Then the "region-type" parameter value matches "Select stations"
        When I change the "sites" parameter to "KDEN"
        Then the "sites" parameter value matches "KDEN"
        When I set the dates to "08/01/2023 00:00 - 08/15/2023 00:00"
        Then the dates value is "08/01/2023 00:00 - 08/15/2023 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "variable" parameter to "Temperature at 2m (°C)"
        Then the "variable" parameter value matches "Temperature at 2m (°C)"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "Diff all curves against the 1st added curve"
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "Diff the 1st and 2nd curves, 3rd and 4th, etc"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Time Series" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "none"
        Then I should see a list of curves containing "Curve0,Curve1"
        And I should have 2 curves

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
