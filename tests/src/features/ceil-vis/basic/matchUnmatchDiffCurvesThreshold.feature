Feature: Match Unmatch Diff Curves Threshold

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are Threshold,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/ceil-vis"
        Then I expect the app title to be "Ceiling and Visibility"

    @watch
    Scenario: matchUnmatchDiffCurvesThreshold
        When I set the plot type to "Threshold"
        Then the plot type should be "Threshold"
        When I change the "variable" parameter to "Ceiling"
        Then the "variable" parameter value matches "Ceiling"
        When I change the "data-source" parameter to "RAP_GSL"
        Then the "data-source" parameter value matches "RAP_GSL"
        When I set the curve-dates to "09/21/2019 00:00 - 09/24/2019 00:00"
        Then the curve-dates value is "09/21/2019 00:00 - 09/24/2019 00:00"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "HRRR_GSL"
        Then the "data-source" parameter value matches "HRRR_GSL"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "Diff all curves against the 1st added curve"
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I set the plotFormat parameter to "Diff the 1st and 2nd curves, 3rd and 4th, etc"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Threshold" plot

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
