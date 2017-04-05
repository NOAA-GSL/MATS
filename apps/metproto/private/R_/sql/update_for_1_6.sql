DELIMITER |

CREATE TABLE model_fcst_lead_offset
(
  model VARCHAR(64),
  fcst_lead_offset INT,
  PRIMARY KEY (model)
) ENGINE = MyISAM |



ALTER TABLE line_data_fho MODIFY fcst_lead INT  |
ALTER TABLE line_data_ctc MODIFY fcst_lead INT  |
ALTER TABLE line_data_cts MODIFY fcst_lead INT  |
ALTER TABLE line_data_cnt MODIFY fcst_lead INT  |
ALTER TABLE line_data_mctc MODIFY fcst_lead INT  |
ALTER TABLE line_data_mcts MODIFY fcst_lead INT  |
ALTER TABLE line_data_pct MODIFY fcst_lead INT  |
ALTER TABLE line_data_pct MODIFY fcst_lead INT  |
ALTER TABLE line_data_pstd MODIFY fcst_lead INT  |
ALTER TABLE line_data_pjc MODIFY fcst_lead INT  |
ALTER TABLE line_data_prc MODIFY fcst_lead INT  |
ALTER TABLE line_data_sl1l2 MODIFY fcst_lead INT  |
ALTER TABLE line_data_sal1l2 MODIFY fcst_lead INT  |
ALTER TABLE line_data_vl1l2 MODIFY fcst_lead INT  |
ALTER TABLE line_data_val1l2 MODIFY fcst_lead INT  |
ALTER TABLE line_data_mpr MODIFY fcst_lead INT  |
ALTER TABLE line_data_nbrctc MODIFY fcst_lead INT  |
ALTER TABLE line_data_nbrcts MODIFY fcst_lead INT  |
ALTER TABLE line_data_nbrcnt MODIFY fcst_lead INT  |
ALTER TABLE line_data_enscnt MODIFY fcst_lead INT  |
ALTER TABLE line_data_isc MODIFY fcst_lead INT  |
ALTER TABLE line_data_rhist MODIFY fcst_lead INT  |
ALTER TABLE line_data_phist MODIFY fcst_lead INT  |
ALTER TABLE line_data_orank MODIFY fcst_lead INT  |
ALTER TABLE line_data_ssvar MODIFY fcst_lead INT  |
ALTER TABLE mode_header MODIFY fcst_lead INT  |

INSERT INTO data_file_lu VALUES (7, 'stat', 'All verification statistics')|


DELIMITER ;