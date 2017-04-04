DELIMITER |

ALTER TABLE line_data_cnt ADD pac DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD pac_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD pac_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD pac_bcl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_cnt ADD pac_bcu DOUBLE DEFAULT -9999|



ALTER TABLE line_data_pstd ADD briercl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD briercl_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD briercl_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD bss DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD bss_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD bss_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD inf DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD inf_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD inf_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD brier10 DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD brier10_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD brier10_ncu DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD brier90 DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD brier90_ncl DOUBLE DEFAULT -9999|
ALTER TABLE line_data_pstd ADD brier90_ncu DOUBLE DEFAULT -9999|

DROP TABLE IF EXISTS line_data_enscnt|
CREATE TABLE line_data_enscnt
(
  stat_header_id INT UNSIGNED NOT NULL,
  data_file_id INT UNSIGNED NOT NULL,
  line_num INT UNSIGNED,
  fcst_lead INT UNSIGNED,
  fcst_valid_beg DATETIME,
  fcst_valid_end DATETIME,
  fcst_init_beg DATETIME,
  obs_lead INT UNSIGNED,
  obs_valid_beg DATETIME,
  obs_valid_end DATETIME,

  rpsf DOUBLE DEFAULT -9999,
  rpsf_ncl DOUBLE DEFAULT -9999,
  rpsf_ncu DOUBLE DEFAULT -9999,
  rpsf_bcl DOUBLE DEFAULT -9999,
  rpsf_bcu DOUBLE DEFAULT -9999,

  rpscl DOUBLE DEFAULT -9999,
  rpscl_ncl DOUBLE DEFAULT -9999,
  rpscl_ncu DOUBLE DEFAULT -9999,
  rpscl_bcl DOUBLE DEFAULT -9999,
  rpscl_bcu DOUBLE DEFAULT -9999,

  rpss DOUBLE DEFAULT -9999,
  rpss_ncl DOUBLE DEFAULT -9999,
  rpss_ncu DOUBLE DEFAULT -9999,
  rpss_bcl DOUBLE DEFAULT -9999,
  rpss_bcu DOUBLE DEFAULT -9999,

  crpsf DOUBLE DEFAULT -9999,
  crpsf_ncl DOUBLE DEFAULT -9999,
  crpsf_ncu DOUBLE DEFAULT -9999,
  crpsf_bcl DOUBLE DEFAULT -9999,
  crpsf_bcu DOUBLE DEFAULT -9999,

  crpscl DOUBLE DEFAULT -9999,
  crpscl_ncl DOUBLE DEFAULT -9999,
  crpscl_ncu DOUBLE DEFAULT -9999,
  crpscl_bcl DOUBLE DEFAULT -9999,
  crpscl_bcu DOUBLE DEFAULT -9999,

  crpss DOUBLE DEFAULT -9999,
  crpss_ncl DOUBLE DEFAULT -9999,
  crpss_ncu DOUBLE DEFAULT -9999,
  crpss_bcl DOUBLE DEFAULT -9999,
  crpss_bcu DOUBLE DEFAULT -9999,



  CONSTRAINT line_data_enscnt_file_id_pk
  FOREIGN KEY (data_file_id)
  REFERENCES data_file (data_file_id),
  CONSTRAINT line_data_enscnt_stat_header_id_pk
  FOREIGN KEY (stat_header_id)
  REFERENCES stat_header (stat_header_id)
) ENGINE MyISAM;|




DELIMITER ;