Feature: Reload Reset To Defaults

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to remember the reloaded parameter values of all the params
    then I click the "Reset to Defaults" button
    then I compare the default parameter values to the reloaded parameter values

    Background:
        Given I load the app "/upperair"
        Then I expect the app title to be "Upper Air"

    @watch
    Scenario: reloadAndResetToDefaults
        Given I remember the parameter values
        When I click the "Reset to Defaults" button
        Then the parameter values should remain unchanged
        When I click the "Add Curve" button
        Then "Curve0" is added
        When I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves

        When I refresh the page
        And I click the "Add Curve" button
        Then "Curve0" is added
        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves

        When I refresh the browser
        And I load the app "/upperair"
        And I click the "Add Curve" button
        Then "Curve0" is added
        Then I click the "Remove Curve0" button
        And the "Remove curve Curve0" button should be visible
        Then I click the "Remove curve Curve0" button
        Then I should have 0 curves
