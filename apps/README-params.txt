
MATS Application Parameters:
App Parameters are defined in the app startup file ...apps/appname/server/main.js
These parameters define the gui selectors and their basic behaviour.
Parameters define selection widgets in the gui. From here on they will be referred to as selectors.
Each Selector belongs to a group, which is a horizontal row container of selectors. Each group is numbered
starting with 1 at the top. Each selector also has a display oder which defines its position within its group,
starting with 1 at the left. Each selector also has a display priority which defines initial visibility of
a selector. For example, if a selector has a priority of 4 it will not become visible until selectors with priorities
of 1, 2, and 3 have all been selected. Each selector has several other attributes, type, default options etc. which
are explained in further detail below.

Parameter Categories:
There are presently three categories of parameters. That may change as apps get more complex.
Each app currently has PlotParams and CurveParams, and the wfip2 app has an additional category - Scatter2dParams.
Examples:
 PlotParams example:
        matsCollections.PlotParams.insert(
             {
                 name: 'dates',
                 type: matsTypes.InputTypes.dateRange,
                 options: [''],
                 startDate: dstrOneMonthPrior,
                 stopDate: dstrToday,
                 controlButtonCovered: true,
                 default: dstr,
                 controlButtonVisibility: 'block',
                 displayOrder: 1,
                 displayPriority: 1,
                 displayGroup: 1,
                 help: "dateHelp.html"
             });
 CurveParams example:
        matsCollections.CurveParams.insert(
             {
                 name: 'data-source',
                 type: matsTypes.InputTypes.select,
                 optionsMap:modelOptionsMap,
                 options:Object.keys(modelOptionsMap),   // convenience
                 optionsQuery:"call get_data_sources()",
                 dependentNames: ["sites","forecast-length","variable"],
                 controlButtonCovered: true,
                 default: 'HRRR ESRL',
                 unique: false,
                 controlButtonVisibility: 'block',
                 displayOrder: 2,
                 displayPriority: 1,
                 displayGroup: 1,
                 dates:datesMap
             });

  Scatter2dParams example:
          matsCollections.Scatter2dParams.insert(
              {
                  name: 'axis-selector',
                  type: matsTypes.InputTypes.radioGroup,
                  options: ['xaxis', 'yaxis'],
                  controlButtonCovered: true,
                  default: 'xaxis',
                  controlButtonVisibility: 'block',
                  displayOrder: 1,
                  displayPriority: 1,
                  displayGroup: 1,
                  help: "axis-selector.html"
              });


Each parameter has some or all of these parameters. All of the parameters are keyed by a string key. The values are objects.
name: String (required) - The name of the parameter, how it is referred to by other methods and what will appear on the selector control button.
        Names are strings, and will be used to identify a parameter in its mongodb collection.
type: matsTypes.InputTypes.nnnn (required) - The type of selector, usually self-explanatory. e.g. ‘select’, ‘textInput’, daterange
        Valid mats types are contained in a list that resides in the matsTypes,InputTypes collection . This collection resides in the mats-common package.
optionsMap: Object (required for matsTypes.InputTypes.select)- This defines the list of options that a "select" selector will
        offer the user on the web page.
options: Array of Strings (optional: usually the keys of the optionsMap) - Selects what is shown to the user from the options map. Usually written Object.keys(optionsMap), which
              returns the enumerable properties of the object it is given (in this example optionsMap) as a string. In this
              case it returns the names of all the properties given to the optionsMap, which will appear on the website as
              the different options which the user may select.
optionsQuery: String (optional) - In some cases the optionsMap needs to be generated from an SQL database. The query for the
              database is written here as a string.
min: integer (optional) - The minimum value that the selector may be set to. Only for number spinner types.
max: integer (optional) - The maximum value that the selector may be set to. Only for number spinner types.
step: integer (optional) - The value by which the selector changes whenever an arrow (up or down) is clicked on. Only for number spinner types.
startDate: daterange (required for daterange selectors) - "month/day/yr hour:minute" - The starting time for the selector. Only for daterange types. ex. "08/20/2001 12:30"
stopDate: (required for daterange selectors) The ending time for the selector. Only for date range types. ex. "08/30/2001 12:00"
dependentNames: (optional) - Defines the names of any parameters that are dependent on the selection of this Parameter (for example the options for forecast length
             vary based on the data source selected), written as an array of strings (selector names). When a selector has its value changed each dependant in
             the dependantNames list will be automatically refreshed and its option list will be set to the optionsMap entry that is keyed by the new selection value.
superiorName: string (optional) - The name of any parameter on which this selection is dependent (e.g. data source is a superior of forecast length), written as a string.
controlButtonCovered: boolean (required). When false that name of the selector will be hidden and the selection will be
            open and cannot be closed. When false the name is displayed and the selection opens up when the name is clicked on.
disableOtherFor: array of strings (optional) - Disables another selector, graying out all of its values and not allowing any to be selected. Written
            as an array of objects, with the key as the name of the selector to be disabled and the following
            being the conditions under which it is disabled. For example: {'truth_data_source':[statisticOptionsMap.none][0]} disable the ‘truth data source’
            selector when the option at index 0 of the statisticOptionsMap is selected.
hideOtherFor: array of strings (optional) - Similar to disableOtherFor, however this hides the other selector completely. The syntax is exactly the
            same as it is for disableOtherFor.
default:string (optional) - Determines what the default selection will be when the selector is rendered. Written as a string. Does not have to
             match anything from the options map, however if it does not the curve will not work while the default option is
             selected and it will disappear from the selector if anything else is selected.
unique: boolean (optional) - Parameters with true will limit the number of curves that can be added
             with that exact parameter to one. Parameters with false have no such limitation.
controlButtonVisibility: "block | none" Written as a string. Determines the manner in which the selector will be displayed. ‘Block’
             displays the selector as a block type element, ‘none’ will not display the element.
displayOrder: integer (optional) - The order in which the selectors are displayed on the website, from left to right. E.g. 1 will be displayed
                       in the top left, with 2 to the right of it.
displayPriority: integer (optional) - When set to 1 the selector will be displayed when the page loads. When set to 2 the selector will be
             hidden until another selector has been changed by the user, after which it will appear on the web
             page at its default value.
displayGroup: integer (optional) - Increasing the displayGroup number will move the selector down on the website. Essentially,
             parameters in higher display groups (1 is higher than 2) will display further up on the web page.
             displayGroup also dominates displayOrder i.e. a parameter with displayOrder=1 and displayGroup=3
             will be appear below a parameter with displayOrder=3 and displayGroup=1.
multiple: boolean (optional). When true allows multiple options to be selected at once. Otherwise
              only one option may be selected at a time. defaults to false - single select
defaultMapView: {point:[x, y], zoomLevel: n, minZoomLevel: n, maxZoomLevel: n} (optional)- Sets the starting position of the map
help: Attaches at small ? button to the selector that opens a separate html file containing instructions on the selector’s
         use. Should contain the name of the file (with the .html included). The file itself should be placed in the
         /public/help/ folder of the app.

customKey: customObject (optional) - customKey can be any unused string and will result in the key pair custumKey : customObject being passed to the data processing routine.
              This is useful for passing a map of values to the server side processing routine that can be indexed by a different selection.

