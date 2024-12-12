Feature: Match Unmatch Diff Curves GridScaleProbability

    As an unauthenticated user to the app,
    with the app in its default state so that the plots are GridScaleProbability,
    I want to add two curves, plot unmatched, and then return to the main page.
    I then want to add a matched difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I then want to add a piecewise difference curve, plot unmatched, return to the main page, plot matched, and then return to the main page.
    I want to end by removing all of the curves.

    Background:
        Given I load the app "/ensemble"
        Then I expect the app title to be "Ensemble"

    @watch
    Scenario: matchUnmatchDiffCurvesGridScaleProb
        When I set the plot type to "GridScaleProbability"
        Then the plot type should be "GridScaleProbability"
        When I change the "variable" parameter to "Composite Reflectivity"
        Then the "variable" parameter value matches "Composite Reflectivity"
        When I change the "data-source" parameter to "RRFSE_SP"
        Then the "data-source" parameter value matches "RRFSE_SP"
        When I set the curve-dates to "05/10/2023 12:00 - 05/16/2023 00:00"
        Then the curve-dates value is "05/10/2023 12:00 - 05/16/2023 00:00"
        When I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "threshold" parameter to "50"
        Then the "threshold" parameter value matches "50"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Grid Scale Probability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Grid Scale Probability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I change the "plotFormat" parameter to "Diff all curves against the 1st added curve"
        Then "Curve1-Curve0" is added
        And I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Grid Scale Probability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Grid Scale Probability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I change the "plotFormat" parameter to "Diff the 1st and 2nd curves, 3rd and 4th, etc"
        Then I should see a list of curves containing "Curve0,Curve1,Curve1-Curve0"
        And I should have 3 curves

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Grid Scale Probability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Plot Matched" button
        Then I should be on the graph page
        And I should have a "Grid Scale Probability" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Matched" button should be visible

        When I change the "plotFormat" parameter to "none"
        Then I should see a list of curves containing "Curve0,Curve1"
        And I should have 2 curves

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
