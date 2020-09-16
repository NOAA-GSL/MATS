Feature: Add Remove Two Profiles

    As an unauthenticated user to the app,
    with the app in its default state,
    I want to add one profile
    I want to change the data-source to RT_CCPP_GSL
    I want to add one other profile
    then plot unmatched and see the graph,
    then go back to the profile management page,
    then remove all profiles.
    I should have no profiles.

    Background:
        Given I load the app "/anomalycor"
        Then I expect the app title to be "Anomaly Correlation"

    @watch
    Scenario: addRemoveTwoProfiles
        When I set the plot type to "Profile"
        Then the plot type should be "Profile"
        When I set the curve-dates to "06/28/2019 0:00 - 09/24/2019 0:00"
        Then the curve-dates value is "06/28/2019 0:00 - 09/24/2019 0:00"
        Then I change the "forecast-length" parameter to "144"
        Then the "forecast-length" parameter value matches "144"
        Then I click the "Add Curve" button
        Then "Curve0" is added

        When I change the "data-source" parameter to "RT_CCPP_GSL"
        Then the "data-source" parameter value matches "RT_CCPP_GSL"
        When I click the "Add Curve" button
        Then "Curve1" is added
        And I should see a list of curves containing "Curve0,Curve1"

        When I click the "Plot Unmatched" button
        Then I should be on the graph page
        And I should have a "Profile" plot

        When I click the "Back" button
        Then I should be on the main page
        And the "Plot Unmatched" button should be visible

        When I click the "Remove All" button
        And the "Remove all the curves" button should be visible
        Then I click the "Remove all the curves" button
        Then I should have 0 curves
