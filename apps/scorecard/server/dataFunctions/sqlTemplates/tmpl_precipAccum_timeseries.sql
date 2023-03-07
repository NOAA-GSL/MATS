SELECT m0.time AS avtime,
        SUM(m0.yy) AS hit,
        SUM(m0.yn) AS fa,
        SUM(m0.ny) AS miss,
        SUM(m0.nn) AS cn
    FROM {{database}}.{{model}}_{{grid_scale}}_{{region}} AS m0
    WHERE 1=1
        AND m0.time >= {{fromSecs}}
        AND m0.time <= {{toSecs}}
        AND floor((m0.time)%(24*3600)/3600) IN({{validTimes}})
        AND m0.trsh = {{threshold}}
        AND {{forecastType}}
    GROUP BY avtime
    ORDER BY avtime;
