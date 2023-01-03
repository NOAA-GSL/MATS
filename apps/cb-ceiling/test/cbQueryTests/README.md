Configuration is loaded from ./config/config.json
see config.json on how to override the setings.json bucket setting

Male sure there is a linked settings file: <app>/settings/settings.json
To run all tests, do (at app folder):
    npm install
    npm test

To run a particulat test, do:
    npm test -- -t="Establish CouchBase connection"
    npm test -- -t="Get METAR count"

Observed run times:
    final_TimeSeries.sql: 7.3 s
    final_Map.sql: 5.5s
    final_DieOff.sql: 165s
    final_ValidTime.sql: 4.7s
    final_DailyModelCycle.sql: 7.6s
    
