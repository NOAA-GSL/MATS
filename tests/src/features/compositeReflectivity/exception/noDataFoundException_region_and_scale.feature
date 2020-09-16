Feature: No Data Found Exception: region_and_scale

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to change the model to HRRRE_mem1
    I want to change the region to Southeastern US moving domain
    I want to change the scale to 20 km
    I want to add one curve
    and I click plot unmatched
    then see "not supported by the database" in the info dialog
    then click the "Clear" button
    then the info dialog is not visible
    and the plot buttons and add curve buttons are enabled.

    Background:
        Given I load the app "/compositeReflectivity"
        Then I expect the app title to be "Composite Reflectivity"

    @watch
    Scenario: noDataFoundException_region_and_scale
        When I set the plot type to "TimeSeries"
        Then the plot type should be "TimeSeries"
        When I change the "data-source" parameter to "HRRRE_mem1"
        Then the "data-source" parameter value matches "HRRRE_mem1"
        When I change the "region" parameter to "Southeastern US moving domain"
        Then the "region" parameter value matches "Southeastern US moving domain"
        When I change the "scale" parameter to "20 km grid"
        Then the "scale" parameter value matches "20 km grid"
        When I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then the "info" dialog should be visible
        And I should see "INFO:  The region/scale combination [Southeastern US moving domain and 20 km grid] is not supported by the database for the model [HRRRE_mem1]. Choose a different scale to continue using this region." in the "info" dialog

        When I click the "Clear" button
        Then the "info" dialog should not be visible
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
