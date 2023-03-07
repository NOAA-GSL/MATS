SELECT unix_timestamp(m0.valid_date) + 3600 * m0.valid_hour AS avtime,
        COUNT(DISTINCT unix_timestamp(m0.valid_date) + 3600 * m0.valid_hour) AS N_times,
        MIN(unix_timestamp(m0.valid_date) + 3600 * m0.valid_hour) AS min_secs,
        MAX(unix_timestamp(m0.valid_date) + 3600 * m0.valid_hour) AS max_secs,
        AVG(m0.wacorr/100) AS stat,
        COUNT(m0.wacorr) AS N0
    FROM {{database}}.{{model}}_anomcorr_{{region}} AS m0
    WHERE 1=1
        AND unix_timestamp(m0.valid_date)+3600*m0.valid_hour >= {{fromSecs}}
        AND unix_timestamp(m0.valid_date)+3600*m0.valid_hour <= {{toSecs}}
        AND m0.valid_hour IN({{validTimes}})
        AND m0.variable = {{variable}}
        AND m0.fcst_len = {{forecastLength}}
        AND m0.level = {{level}}
    GROUP BY avtime
    ORDER BY avtime;
