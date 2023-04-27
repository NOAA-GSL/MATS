SELECT m0.time AS avtime,
        SUM(m0.hit) AS hit,
        SUM(m0.fa) AS fa,
        SUM(m0.miss) AS miss,
        SUM(m0.cn) AS cn
    FROM {{database}}.{{model}}_{{grid_scale}}{{truth}}_{{region}} AS m0
    WHERE 1=1
        AND m0.time >= {{fromSecs}}
        AND m0.time <= {{toSecs}}
        AND floor((m0.time)%(24*3600)/3600) IN({{validTimes}})
        AND m0.trsh = {{threshold}}
        AND m0.fcst_len = {{forecastLength}}
    GROUP BY avtime
    ORDER BY avtime;
