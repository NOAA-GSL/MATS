
/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

/*
generic Math Functions
 */
var isNum = function (args)
{
    if (args == null || args == undefined) {
        return false;
    }
    args = args.toString();
    if (args.length == 0) return false;

    for (var i = 0;  i<args.length;  i++)
    {
        if ((args.substring(i,i+1) < "0" || args.substring(i, i+1) > "9") && args.substring(i, i+1) != "."&& args.substring(i, i+1) != "-")
        {
            return false;
        }
    }

    return true;
};

var mean = function (arr)
{
    var len = 0;
    var sum = 0;

    for(var i=0;i<arr.length;i++)
    {
        if (arr[i] == ""){}
        else if (!isNum(arr[i]))
        {
            //alert(arr[i] + " is not number!");
            console.log("Error: value at position: " + i + " is not number! Mean Calculation failed!" );
            return 0;
        }
        else
        {
            len = len + 1;
            sum = sum + parseFloat(arr[i]);
        }
    }
    return sum / len;
};

var variance = function (arr)
{
    var len = 0;
    var sum=0;
    for(var i=0;i<arr.length;i++)
    {
        if (arr[i] == ""){}
        else if (!isNum(arr[i]))
        {
            //alert(arr[i] + " is not number, Variance Calculation failed!");
            console.log ("value at position " + i + " is not number, Variance Calculation failed!");
            return 0;
        }
        else
        {
            len = len + 1;
            sum = sum + parseFloat(arr[i]);
        }
    }

    var v = 0;
    if (len > 1)
    {
        var mean = sum / len;
        for(var i=0;i<arr.length;i++)
        {
            if (arr[i] == ""){}
            else
            {
                v = v + (arr[i] - mean) * (arr[i] - mean);
            }
        }

        return v / len;
    }
    else
    {
        return 0;
    }
};


var median = function (arr)
{
    arr.sort(function(a,b){return a-b});

    var median = 0;

    if (arr.length % 2 == 1)
    {
        median = arr[(arr.length+1)/2 - 1];
    }
    else
    {
        median = (1 * arr[arr.length/2 - 1] + 1 * arr[arr.length/2] )/2;
    }

    return median
};

export default matsMathUtils = {
    isNum:isNum,
    mean:mean,
    variance:variance,
    median:median
}