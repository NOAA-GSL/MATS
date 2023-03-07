SELECT m0.valid_time AS avtime,
        COUNT(DISTINCT m0.valid_time) AS N_times,
        MIN(m0.valid_time) AS min_secs,
        MAX(m0.valid_time) AS max_secs,
        SUM(m0.yy) AS hit,
        SUM(m0.yn) AS fa,
        SUM(m0.ny) AS miss,
        SUM(m0.nn) AS cn,
        COUNT(m0.yy) AS N0
    FROM {{database}}.{{model}}_{{region}}{{truth}} AS m0
    WHERE 1=1
        AND m0.valid_time >= {{fromSecs}}
        AND m0.valid_time <= {{toSecs}}
        AND floor((m0.valid_time)%(24*3600)/3600) IN({{validTimes}})
        AND m0.thresh = {{threshold}}
        AND m0.fcst_len = {{forecastLength}}
    GROUP BY avtime
    ORDER BY avtime;
