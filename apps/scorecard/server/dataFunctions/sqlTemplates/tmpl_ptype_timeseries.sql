SELECT m0.valid_secs AS avtime,
        COUNT(DISTINCT m0.valid_secs) AS N_times,
        MIN(m0.valid_secs) AS min_secs,
        MAX(m0.valid_secs) AS max_secs,
        {{statisticClause}}
    FROM {{database}}.{{model}}_freq_{{region}} AS m0
    WHERE 1=1
        AND m0.valid_secs >= {{fromSecs}}
        AND m0.valid_secs <= {{toSecs}}
        AND floor((m0.valid_secs)%(24*3600)/3600) IN({{validTimes}})
        AND m0.trsh = {{threshold}}
        AND m0.scale = {{grid_scale}}
        AND m0.fcst_len = {{forecastLength}}
    GROUP BY avtime
    ORDER BY avtime;
