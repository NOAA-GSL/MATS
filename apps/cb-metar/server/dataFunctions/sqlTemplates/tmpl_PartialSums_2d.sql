       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff) square_diff_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].num_recs) N_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_diff * -1) obs_model_diff_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_model) model_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_obs) obs_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_abs) abs_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum2_diff) square_diff_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].num_recs) N_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_diff * -1) obs_model_diff_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_model) model_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_obs) obs_sumY,
       SUM(m0.data.['{{vxSUBVARIABLEY}}'].sum_abs) abs_sumY,
       ARRAY_SORT( ARRAY_AGG( CASE WHEN m0.fcstValidEpoch IS NOT NULL THEN TO_STRING(m0.fcstValidEpoch) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].num_recs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].num_recs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_diff * -1) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_model IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_model) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_obs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_obs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_abs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_abs) ELSE "NULL" END
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum2_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum2_diff) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].num_recs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].num_recs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_diff * -1) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_model IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_model) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_obs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_obs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEY}}'].sum_abs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEY}}'].sum_abs) ELSE "NULL" END  ) ) sub_data,
       COUNT(m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff) n0
