Feature: No Data Found Exception: invalid_times

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to change the data-source to HRRR_GSL
    I want to change the region to RUC
    I want to add one curve
    and I click plot unmatched
    then see "0 data records found" in the info dialog
    then click the "Clear" button
    then the info dialog is not visible
    and the plot buttons and add curve buttons are enabled.

    Background:
        Given I load the app "/ceil-vis"
        Then I expect the app title to be "Ceiling and Visibility"

    @watch
    Scenario: noDataFoundException_invalid_times
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "data-source" parameter to "RAP_GSL"
        Then the "data-source" parameter value matches "RAP_GSL"
        When I set the dates to "01/19/1995 12:00 - 06/19/1996 12:00"
        Then the dates value is "01/19/1995 12:00 - 06/19/1996 12:00"
        When I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then the "info" dialog should be visible
        And I should see "INFO:  No valid data for any curves." in the "info" dialog

        When I click the "Clear" button
        Then the "info" dialog should not be visible
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
