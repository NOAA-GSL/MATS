       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff) square_diff_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].num_recs) N_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_diff * -1) obs_model_diff_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_model) model_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_obs) obs_sumX,
       SUM(m0.data.['{{vxSUBVARIABLEX}}'].sum_abs) abs_sumX,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].hits) hitY,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].false_alarms) faY,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].misses) missY,
       SUM(m0.data.['{{vxTHRESHOLDY}}'].correct_negatives) cnY,
       ARRAY_SORT( ARRAY_AGG( CASE WHEN m0.fcstValidEpoch IS NOT NULL THEN TO_STRING(m0.fcstValidEpoch) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].num_recs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].num_recs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_diff IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_diff * -1) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_model IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_model) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_obs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_obs) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxSUBVARIABLEX}}'].sum_abs IS NOT NULL THEN TO_STRING(m0.data.['{{vxSUBVARIABLEX}}'].sum_abs) ELSE "NULL" END
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].hits IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].hits) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].false_alarms IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].false_alarms) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].misses IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].misses) ELSE "NULL" END 
       || ';' || CASE WHEN m0.data.['{{vxTHRESHOLDY}}'].correct_negatives IS NOT NULL THEN TO_STRING(m0.data.['{{vxTHRESHOLDY}}'].correct_negatives) ELSE "NULL" END ) ) sub_data,
       COUNT(m0.data.['{{vxSUBVARIABLEX}}'].sum2_diff) n0
