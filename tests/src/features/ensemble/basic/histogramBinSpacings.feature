Feature: Histogram Bin Spacings

    As an unauthenticated user to the app,
    with the app in its default state,
    I want click the histogram radio button,
    I want to add two curves
    I want to set the histogram bin controls to "Set number of bins and make zero a bin bound"
    then plot those curves and see the graph,
    then go back to the curve management page,
    then delete the curves.

    Background:
        Given I load the app "/ensemble"
        Then I expect the app title to be "Ensemble"

    @watch
    Scenario: histogramBinSpacings
        When I set the plot type to "Histogram"
        Then the plot type should be "Histogram"
        When I change the "variable" parameter to "Composite Reflectivity"
        Then the "variable" parameter value matches "Composite Reflectivity"
        When I change the "data-source" parameter to "RRFSE_SP"
        Then the "data-source" parameter value matches "RRFSE_SP"
        When I set the curve-dates to "05/10/2023 12:00 - 05/16/2023 00:00"
        Then the curve-dates value is "05/10/2023 12:00 - 05/16/2023 00:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "RRFSE_MP"
        Then the "data-source" parameter value matches "RRFSE_MP"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I change the "histogram-bin-controls" parameter to "Set number of bins and make zero a bin bound"
        Then the "histogram-bin-controls" parameter value matches "Set number of bins and make zero a bin bound"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Histogram" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
