DELIMITER |

ALTER TABLE line_data_rhist ADD crpss DOUBLE DEFAULT -9999|



ALTER TABLE line_data_pstd DROP COLUMN bss_ncl |
ALTER TABLE line_data_pstd DROP COLUMN bss_ncu |
ALTER TABLE line_data_pstd DROP COLUMN inf |
ALTER TABLE line_data_pstd DROP COLUMN inf_ncl |
ALTER TABLE line_data_pstd DROP COLUMN inf_ncu |
ALTER TABLE line_data_pstd DROP COLUMN brier10 |
ALTER TABLE line_data_pstd DROP COLUMN brier10_ncl |
ALTER TABLE line_data_pstd DROP COLUMN brier10_ncu |
ALTER TABLE line_data_pstd DROP COLUMN brier90 |
ALTER TABLE line_data_pstd DROP COLUMN brier90_ncl |
ALTER TABLE line_data_pstd DROP COLUMN brier90_ncu |


ALTER TABLE line_data_cnt CHANGE pac anom_corr DOUBLE |
ALTER TABLE line_data_cnt CHANGE pac_ncl anom_corr_ncl DOUBLE |
ALTER TABLE line_data_cnt CHANGE pac_ncu anom_corr_ncu DOUBLE |
ALTER TABLE line_data_cnt CHANGE pac_bcl anom_corr_bcl DOUBLE |
ALTER TABLE line_data_cnt CHANGE pac_bcu anom_corr_bcu DOUBLE |


ALTER TABLE line_data_cnt ADD me2 DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD me2_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD me2_bcu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD msess DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD msess_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD msess_bcu DOUBLE DEFAULT -9999|

ALTER TABLE line_data_orank ADD ens_mean DOUBLE DEFAULT -9999|
ALTER TABLE line_data_orank ADD orank_climo DOUBLE DEFAULT -9999|

ALTER TABLE line_data_mpr CHANGE fcst mpr_fcst DOUBLE |
ALTER TABLE line_data_mpr CHANGE obs mpr_obs DOUBLE |
ALTER TABLE line_data_mpr CHANGE climo mpr_climo DOUBLE |

ALTER TABLE line_data_orank CHANGE obs orank_obs DOUBLE |


DELIMITER ;