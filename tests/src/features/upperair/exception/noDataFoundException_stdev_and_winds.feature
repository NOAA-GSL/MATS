Feature: No Data Found Exception: stdev_and_winds

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to change the statistic to Std deviation
    I want to change the variable to winds
    I want to add one curve
    and I click plot unmatched
    then see "not supported by the database" in the info dialog
    then click the "Clear" button
    then the info dialog is not visible
    and the plot buttons and add curve buttons are enabled.

    Background:
        Given I load the app "/upperair"
        Then I expect the app title to be "Upper Air (RAOBS)"

    @watch
    Scenario: noDataFoundException_stdev_and_winds
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "statistic" parameter to "Std deviation"
        Then the "statistic" parameter value matches "Std deviation"
        When I change the "variable" parameter to "winds"
        Then the "variable" parameter value matches "winds"
        When I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then the "info" dialog should be visible
        And I should see "INFO:  The statistic/variable combination [Std deviation and winds] is not supported by the database for the model/region [RAP and 14]." in the "info" dialog

        When I click the "Clear" button
        Then the "info" dialog should not be visible
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
