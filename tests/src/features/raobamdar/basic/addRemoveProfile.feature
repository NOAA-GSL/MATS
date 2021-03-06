Feature: Add Remove Profile

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one profile
    then plot that profile and see the graph,
    then go back to the profile management page,
    then delete that profile.

    Background:
        Given I load the app "/raobamdar"
        Then I expect the app title to be "Upper Air (Combo)"

    @watch
    Scenario: addRemoveProfile
        When I set the plot type to "Profile"
        Then the plot type should be "Profile"
        When I change the "data-source" parameter to "RAP_GSL_iso_130"
        Then the "data-source" parameter value matches "RAP_GSL_iso_130"
        When I set the curve-dates to "12/15/2020 0:00 - 03/15/2021 0:00"
        Then the curve-dates value is "12/15/2020 0:00 - 03/15/2021 0:00"
        Then I click the "Add Curve" button
        Then "Curve0" is added
        And I should see a list of curves containing "Curve0"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
