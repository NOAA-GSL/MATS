Feature: Match Unmatch Diff Curves Profile

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are time series,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/anomalycor"
        Then I expect the app title to be "Anomaly Correlation"

    @watch
    Scenario: matchUnmatchDiffCurvesProfile
        When I set the plot type to "Profile"
        Then the plot type should be "Profile"
        When I change the "data-source" parameter to "GFS"
        Then the "data-source" parameter value matches "GFS"
        When I set the curve-dates to "02/28/2020 0:00 - 05/24/2020 0:00"
        Then the curve-dates value is "02/28/2020 0:00 - 05/24/2020 0:00"
        When I change the "forecast-length" parameter to "144"
        Then the "forecast-length" parameter value matches "144"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "FV3_GSL_L127"
        Then the "data-source" parameter value matches "FV3_GSL_L127"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "matching diffs" radio button
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "pairwise diffs" radio button
        Then the plot format should be "pairwise"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I click the "no diffs" radio button
        Then I should see a list of curves containing "Curve0,Curve1"
        And I should have 2 curves

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
