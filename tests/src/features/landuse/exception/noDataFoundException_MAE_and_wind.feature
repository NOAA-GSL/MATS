Feature: No Data Found Exception: MAE_and_wind

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to change the statistic to MAE
    I want to change the variable to wind
    I want to add one curve
    and I click plot unmatched
    then see "not supported by the database" in the info dialog
    then click the "Clear" button
    then the info dialog is not visible
    and the plot buttons and add curve buttons are enabled.

    Background:
        Given I load the app "/landuse"
        Then I expect the app title to be "Surface Land Use"

    @watch
    Scenario: noDataFoundException_MAE_and_wind
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "statistic" parameter to "MAE"
        Then the "statistic" parameter value matches "MAE"
        When I change the "variable" parameter to "wind"
        Then the "variable" parameter value matches "wind"
        When I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then the "info" dialog should be visible
        And I should see "INFO:  The statistic/variable combination [MAE and wind] is not supported by the database for the model/vgtyp [RR1h and Evergreen Needleleaf Forest]." in the "info" dialog

        When I click the "Clear" button
        Then the "info" dialog should not be visible
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
