       SUM(m0.data.['{{vxTHRESHOLD}}'].hits) hit,
       SUM(m0.data.['{{vxTHRESHOLD}}'].false_alarms) fa,
       SUM(m0.data.['{{vxTHRESHOLD}}'].misses) miss,
       SUM(m0.data.['{{vxTHRESHOLD}}'].correct_negatives) cn,
       ARRAY_SORT( ARRAY_AGG( TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].hits) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].false_alarms) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].misses) || ';' || TO_STRING(m0.data.['{{vxTHRESHOLD}}'].correct_negatives) ) ) sub_data,
       COUNT(m0.data.['{{vxTHRESHOLD}}'].hits) N0
