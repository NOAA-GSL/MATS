SELECT m0.time AS avtime,
        COUNT(DISTINCT m0.time) AS N_times,
        MIN(m0.time) AS min_secs,
        MAX(m0.time) AS max_secs,
        SUM(m0.yy) AS hit,
        SUM(m0.yn) AS fa,
        SUM(m0.ny) AS miss,
        SUM(m0.nn) AS cn,
        COUNT(m0.yy) AS N0
    FROM {{database}}.{{model}}_{{region}} AS m0
    WHERE 1=1
        AND m0.time >= {{fromSecs}}
        AND m0.time <= {{toSecs}}
        AND floor((m0.time)%(24*3600)/3600) IN({{validTimes}})
        AND m0.trsh = {{threshold}}
        AND m0.fcst_len = {{forecastLength}}
    GROUP BY avtime
    ORDER BY avtime;
