
DELIMITER |

 DELETE FROM  line_data_cnt     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) |

 DELETE FROM  line_data_ctc     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) |

 DELETE FROM  line_data_cts     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) |

 DELETE FROM  line_data_enscnt  WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_fho     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_isc     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_mctc    WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_mcts    WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_mpr     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_nbrcnt  WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_nbrctc  WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_nbrcts  WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) |

 DELETE FROM  line_data_orank   WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_pct     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_phist   WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_pjc     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_prc     WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_pstd    WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_rhist   WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_sal1l2  WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_sl1l2   WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_ssvar   WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_val1l2  WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) | 

 DELETE FROM  line_data_vl1l2   WHERE fcst_valid_beg>='2016-05-03 19:00:00' AND fcst_valid_beg<='2016-05-07 11:00:00' AND stat_header_id IN (SELECT stat_header_id FROM stat_header WHERE model IN ( 'namrr', 'conusnestrr' ) ) |
 
 DELIMITER ; 
