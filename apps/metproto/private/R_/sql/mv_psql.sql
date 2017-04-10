-- data_file_type_lu is a look-up table containing information about the different types
--   of MET output data files.  Each data file that is loaded into the database is
--   represented by a record in the data_file table, which points at one of the data file
--   types.  The file type indicates which database tables store the data in the file.

DROP TABLE IF EXISTS data_file_lu;
CREATE TABLE data_file_lu
(
    data_file_lu_id     INTEGER NOT NULL,
    type_name           VARCHAR(32),
    type_desc           VARCHAR(128),
    PRIMARY KEY (data_file_lu_id)
);
    
    
-- data_file_id stores information about files that have been parsed and loaded into the
--   database.  Each record represents a single file of a particular MET output data file
--   type (point_stat, mode, etc.).  Each data_file record points at its file type in the
--   data_file_type_lu table via the data_file_type_lu_id field.

DROP TABLE IF EXISTS data_file;
CREATE TABLE data_file
(
    data_file_id        INTEGER NOT NULL,
    data_file_lu_id     INTEGER NOT NULL,
    filename            VARCHAR(256),
    path                VARCHAR(512),
    load_date           TIMESTAMP,
    mod_date            TIMESTAMP,
    PRIMARY KEY (data_file_id),
    CONSTRAINT data_file_unique_pk
        UNIQUE  (filename, path),
    CONSTRAINT stat_header_data_file_lu_id_pk
            FOREIGN KEY(data_file_lu_id)
            REFERENCES data_file_lu(data_file_lu_id)
);


-- stat_header contains the forecast and observation bookkeeping information, except for
--   the valid and init times, for a verification case.  Statistics tables point at a
--   single stat_header record, which indicate the circumstances under which they were
--   calculated.

DROP TABLE IF EXISTS stat_header;
CREATE TABLE stat_header
(
    stat_header_id      INTEGER NOT NULL,
    version             VARCHAR(8),
    model               VARCHAR(64),
    fcst_var            VARCHAR(64),
    fcst_lev            VARCHAR(16),
    obs_var             VARCHAR(64),
    obs_lev             VARCHAR(16),
    obtype              VARCHAR(32),
    vx_mask             VARCHAR(32),
    interp_mthd         VARCHAR(16),
    interp_pnts         INTEGER,
    fcst_thresh         VARCHAR(128),
    obs_thresh          VARCHAR(128),
    
    PRIMARY KEY          (stat_header_id),
    
    CONSTRAINT stat_header_unique_pk UNIQUE  (
            model,
            fcst_var,
            fcst_lev,
            obtype,
            vx_mask,
            interp_mthd,
            interp_pnts,
            fcst_thresh,
            obs_thresh
        )
);


-- line_data_fho contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_fho;
CREATE TABLE line_data_fho
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    f_rate              REAL,
    h_rate              REAL,
    o_rate              REAL,
    
    CONSTRAINT line_data_fho_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_fho_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_ctc contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_ctc;
CREATE TABLE line_data_ctc
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    fy_oy               INTEGER,   
    fy_on               INTEGER,   
    fn_oy               INTEGER,   
    fn_on               INTEGER,   
       
    CONSTRAINT line_data_ctc_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_ctc_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_cts contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_cts;
CREATE TABLE line_data_cts
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    alpha               REAL,
    total               INTEGER,

    baser               REAL,
    baser_ncl           REAL,
    baser_ncu           REAL,
    baser_bcl           REAL,
    baser_bcu           REAL,
    fmean               REAL,
    fmean_ncl           REAL,
    fmean_ncu           REAL,
    fmean_bcl           REAL,
    fmean_bcu           REAL,
    acc                 REAL,
    acc_ncl             REAL,
    acc_ncu             REAL,
    acc_bcl             REAL,
    acc_bcu             REAL,
    fbias               REAL,
    fbias_bcl           REAL,
    fbias_bcu           REAL,
    pody                REAL,
    pody_ncl            REAL,
    pody_ncu            REAL,
    pody_bcl            REAL,
    pody_bcu            REAL,
    podn                REAL,
    podn_ncl            REAL,
    podn_ncu            REAL,
    podn_bcl            REAL,
    podn_bcu            REAL,
    pofd                REAL,
    pofd_ncl            REAL,
    pofd_ncu            REAL,
    pofd_bcl            REAL,
    pofd_bcu            REAL,
    far                 REAL,
    far_ncl             REAL,
    far_ncu             REAL,
    far_bcl             REAL,
    far_bcu             REAL,
    csi                 REAL,
    csi_ncl             REAL,
    csi_ncu             REAL,
    csi_bcl             REAL,
    csi_bcu             REAL,
    gss                 REAL,
    gss_bcl             REAL,
    gss_bcu             REAL,
    hk                  REAL,
    hk_ncl              REAL,
    hk_ncu              REAL,
    hk_bcl              REAL,
    hk_bcu              REAL,
    hss                 REAL,
    hss_bcl REAL,
    hss_bcu REAL,
    odds REAL,
    odds_ncl REAL,
    odds_ncu REAL,
    odds_bcl REAL,
    odds_bcu REAL,

    lodds REAL DEFAULT -9999,
    lodds_ncl REAL DEFAULT -9999,
    lodds_ncu REAL DEFAULT -9999,
    lodds_bcl REAL DEFAULT -9999,
    lodds_bcu REAL DEFAULT -9999,

    orss REAL DEFAULT -9999,
    orss_ncl REAL DEFAULT -9999,
    orss_ncu REAL DEFAULT -9999,
    orss_bcl REAL DEFAULT -9999,
    orss_bcu REAL DEFAULT -9999,

    eds REAL DEFAULT -9999,
    eds_ncl REAL DEFAULT -9999,
    eds_ncu REAL DEFAULT -9999,
    eds_bcl REAL DEFAULT -9999,
    eds_bcu REAL DEFAULT -9999,

    seds REAL DEFAULT -9999,
    seds_ncl REAL DEFAULT -9999,
    seds_ncu REAL DEFAULT -9999,
    seds_bcl REAL DEFAULT -9999,
    seds_bcu REAL DEFAULT -9999,

    edi REAL DEFAULT -9999,
    edi_ncl REAL DEFAULT -9999,
    edi_ncu REAL DEFAULT -9999,
    edi_bcl REAL DEFAULT -9999,
    edi_bcu REAL DEFAULT -9999,

    sedi REAL DEFAULT -9999,
    sedi_ncl REAL DEFAULT -9999,
    sedi_ncu REAL DEFAULT -9999,
    sedi_bcl REAL DEFAULT -9999,
    sedi_bcu REAL DEFAULT -9999,

    bagss REAL DEFAULT -9999,
    bagss_bcl REAL DEFAULT -9999,
    bagss_bcu REAL DEFAULT -9999,

    CONSTRAINT line_data_cts_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_cts_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);
-- CREATE INDEX line_data_cts_fcst_lead_pk ON line_data_cts (fcst_lead);
-- CREATE INDEX line_data_cts_fcst_valid_beg_pk ON line_data_cts (fcst_valid_beg);
-- CREATE INDEX line_data_cts_fcst_init_beg_pk ON line_data_cts (fcst_init_beg);


-- line_data_cnt contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_cnt;
CREATE TABLE line_data_cnt
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    alpha               REAL,
    total               INTEGER,
    
    fbar                REAL,
    fbar_ncl            REAL,
    fbar_ncu            REAL,
    fbar_bcl            REAL,
    fbar_bcu            REAL,
    fstdev              REAL,
    fstdev_ncl          REAL,
    fstdev_ncu          REAL,
    fstdev_bcl          REAL,
    fstdev_bcu          REAL,
    obar                REAL,
    obar_ncl            REAL,
    obar_ncu            REAL,
    obar_bcl            REAL,
    obar_bcu            REAL,
    ostdev              REAL,
    ostdev_ncl          REAL,
    ostdev_ncu          REAL,
    ostdev_bcl          REAL,
    ostdev_bcu          REAL,
    pr_corr             REAL,
    pr_corr_ncl         REAL,
    pr_corr_ncu         REAL,
    pr_corr_bcl         REAL,
    pr_corr_bcu         REAL,
    sp_corr             REAL,
    dt_corr             REAL,
    ranks               INTEGER,
    frank_ties          INTEGER,
    orank_ties          INTEGER,
    me                  REAL,
    me_ncl              REAL,
    me_ncu              REAL,
    me_bcl              REAL,
    me_bcu              REAL,
    estdev              REAL,
    estdev_ncl          REAL,
    estdev_ncu          REAL,
    estdev_bcl          REAL,
    estdev_bcu          REAL,
    mbias               REAL,
    mbias_bcl           REAL,
    mbias_bcu           REAL,
    mae                 REAL,
    mae_bcl             REAL,
    mae_bcu             REAL,
    mse                 REAL,
    mse_bcl             REAL,
    mse_bcu             REAL,
    bcmse               REAL,
    bcmse_bcl           REAL,
    bcmse_bcu           REAL,
    rmse                REAL,
    rmse_bcl            REAL,
    rmse_bcu            REAL,
    e10                 REAL,
    e10_bcl             REAL,
    e10_bcu             REAL,
    e25                 REAL,
    e25_bcl             REAL,
    e25_bcu             REAL,
    e50                 REAL,
    e50_bcl             REAL,
    e50_bcu             REAL,
    e75                 REAL,
    e75_bcl             REAL,
    e75_bcu             REAL,
    e90                 REAL,
    e90_bcl             REAL,
    e90_bcu             REAL,
    iqr                 REAL DEFAULT -9999,
    iqr_bcl             REAL DEFAULT -9999,
    iqr_bcu             REAL DEFAULT -9999,
    mad                 REAL DEFAULT -9999,
    mad_bcl             REAL DEFAULT -9999,
    mad_bcu             REAL DEFAULT -9999,
    pac                 REAL DEFAULT -9999,
    pac_ncl             REAL DEFAULT -9999,
    pac_ncu             REAL DEFAULT -9999,
    pac_bcl             REAL DEFAULT -9999,
    pac_bcu             REAL DEFAULT -9999,

    
    CONSTRAINT line_data_cnt_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_cnt_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_mctc contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_mctc;
CREATE TABLE line_data_mctc
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,    
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    n_cat               INTEGER,    
    
    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_mctc_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_mctc_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_mctc_cnt contains count data for a particular line_data_mctc record.  The 
--   number of counts is determined by assuming a square contingency table and stored in
--   the line_data_mctc field n_cat.

DROP TABLE IF EXISTS line_data_mctc_cnt;
CREATE TABLE line_data_mctc_cnt
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    j_value             INTEGER NOT NULL,
    fi_oj               INTEGER NOT NULL,
    
    PRIMARY KEY (line_data_id, i_value, j_value),
    CONSTRAINT line_data_mctc_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_mctc(line_data_id)
);


-- line_data_mcts contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_mcts;
CREATE TABLE line_data_mcts
(
    stat_header_id      INTEGER NOT NULL,    
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    alpha               REAL,
    total               INTEGER,
    n_cat               INTEGER,
    
    acc                 REAL,
    acc_ncl             REAL,
    acc_ncu             REAL,
    acc_bcl             REAL,
    acc_bcu             REAL,
    hk                  REAL,
    hk_bcl              REAL,
    hk_bcu              REAL,
    hss                 REAL,
    hss_bcl             REAL,
    hss_bcu             REAL,
    ger                 REAL,
    ger_bcl             REAL,
    ger_bcu             REAL,
    
    CONSTRAINT line_data_mcts_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_mcts_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_pct contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_pct;
CREATE TABLE line_data_pct
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    n_thresh            INTEGER,
    
    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_pct_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_pct_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_pct_thresh contains threshold data for a particular line_data_pct record and
--   threshold.  The number of thresholds stored is given by the line_data_pct field n_thresh.

DROP TABLE IF EXISTS line_data_pct_thresh;
CREATE TABLE line_data_pct_thresh
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    thresh_i            REAL,
    oy_i                INTEGER,
    on_i                INTEGER,
    
    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_pct_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_pct(line_data_id)
);


-- line_data_pstd contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_pstd;
CREATE TABLE line_data_pstd
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    alpha               REAL,
    total               INTEGER,
    n_thresh            INTEGER,
    
    baser               REAL,
    baser_ncl           REAL,
    baser_ncu           REAL,
    reliability         REAL,
    resolution          REAL,
    uncertainty         REAL,
    roc_auc             REAL,
    brier               REAL,
    brier_ncl           REAL,
    brier_ncu           REAL,
    briercl            REAL DEFAULT -9999,
    briercl_ncl        REAL DEFAULT -9999,
    briercl_ncu        REAL DEFAULT -9999,
    bss                 REAL DEFAULT -9999,
    bss_ncl             REAL DEFAULT -9999,
    bss_ncu             REAL DEFAULT -9999,
    inf                 REAL DEFAULT -9999,
    inf_ncl             REAL DEFAULT -9999,
    inf_ncu             REAL DEFAULT -9999,
    brier10               REAL DEFAULT -9999,
    brier10_ncl           REAL DEFAULT -9999,
    brier10_ncu           REAL DEFAULT -9999,
    brier90               REAL DEFAULT -9999,
    brier90_ncl           REAL DEFAULT -9999,
    brier90_ncu           REAL DEFAULT -9999,

    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_pstd_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_pstd_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_pstd_thresh contains threshold data for a particular line_data_pstd record and
--   threshold.  The number of thresholds stored is given by the line_data_pstd field n_thresh.

DROP TABLE IF EXISTS line_data_pstd_thresh;
CREATE TABLE line_data_pstd_thresh
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    thresh_i            REAL,
    
    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_pstd_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_pstd(line_data_id)
);


-- line_data_pjc contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_pjc;
CREATE TABLE line_data_pjc
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    n_thresh            INTEGER,
    
    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_pjc_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_pjc_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_pjc_thresh contains threshold data for a particular line_data_pjc record and
--   threshold.  The number of thresholds stored is given by the line_data_pjc field n_thresh.

DROP TABLE IF EXISTS line_data_pjc_thresh;
CREATE TABLE line_data_pjc_thresh
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    thresh_i            REAL,
    oy_tp_i             REAL,
    on_tp_i             REAL,
    calibration_i       REAL,
    refinement_i        REAL,
    likelihood_i        REAL,
    baser_i             REAL,
    
    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_pjc_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_pjc(line_data_id)
);


-- line_data_prc contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_prc;
CREATE TABLE line_data_prc
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    n_thresh            INTEGER,
    
    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_prc_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_prc_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_prc_thresh contains threshold data for a particular line_data_prc record and
--   threshold.  The number of thresholds stored is given by the line_data_prc field n_thresh.

DROP TABLE IF EXISTS line_data_prc_thresh;
CREATE TABLE line_data_prc_thresh
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    thresh_i            REAL,
    pody_i              REAL,
    pofd_i              REAL,
    
    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_prc_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_prc(line_data_id)
);


-- line_data_sl1l2 contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_sl1l2;
CREATE TABLE line_data_sl1l2
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    fbar                REAL,
    obar                REAL,
    fobar               REAL,
    ffbar               REAL,
    oobar               REAL,
    mae                 REAL DEFAULT -9999,
           
    CONSTRAINT line_data_sl1l2_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_sl1l2_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_sal1l2 contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_sal1l2;
CREATE TABLE line_data_sal1l2
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    fabar               REAL,
    oabar               REAL,
    foabar              REAL,
    ffabar              REAL,
    ooabar              REAL,
    mae                 REAL DEFAULT -9999,
    
    CONSTRAINT line_data_sal2l1_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_sal2l1_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_vl1l2 contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_vl1l2;
CREATE TABLE line_data_vl1l2
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    ufbar               REAL,
    vfbar               REAL,
    uobar               REAL,
    vobar               REAL,
    uvfobar             REAL,
    uvffbar             REAL,
    uvoobar             REAL,
    
    CONSTRAINT line_data_vl1l2_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_vl1l2_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_val1l2 contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_val1l2;
CREATE TABLE line_data_val1l2
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    ufabar              REAL,
    vfabar              REAL,
    uoabar              REAL,
    voabar              REAL,
    uvfoabar            REAL,
    uvffabar            REAL,
    uvooabar            REAL,
    
    CONSTRAINT line_data_val1l2_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_val1l2_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_mpr contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_mpr;
CREATE TABLE line_data_mpr
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    mp_index            INTEGER,
    obs_sid             VARCHAR(32),
    obs_lat             REAL,
    obs_lon             REAL,
    obs_lvl             REAL,
    obs_elv             REAL,
    fcst                REAL,
    obs                 REAL,
    climo               REAL,
    obs_qc              REAL DEFAULT -9999,
    
    CONSTRAINT line_data_mpr_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_mpr_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_nbrctc contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_nbrctc;
CREATE TABLE line_data_nbrctc
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    cov_thresh          VARCHAR(32),
    total               INTEGER,
    
    fy_oy               INTEGER,
    fy_on               INTEGER,
    fn_oy               INTEGER,
    fn_on               INTEGER,
    
    CONSTRAINT line_data_nbrctc_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_nbrctc_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_nbrcts contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_nbrcts;
CREATE TABLE line_data_nbrcts
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    cov_thresh          VARCHAR(32),
    alpha               REAL,
    total               INTEGER,
    
    baser               REAL,
    baser_ncl           REAL,
    baser_ncu           REAL,
    baser_bcl           REAL,
    baser_bcu           REAL,
    fmean               REAL,
    fmean_ncl           REAL,
    fmean_ncu           REAL,
    fmean_bcl           REAL,
    fmean_bcu           REAL,
    acc                 REAL,
    acc_ncl             REAL,
    acc_ncu             REAL,
    acc_bcl             REAL,
    acc_bcu             REAL,
    fbias               REAL,
    fbias_bcl           REAL,
    fbias_bcu           REAL,
    pody                REAL,
    pody_ncl            REAL,
    pody_ncu            REAL,
    pody_bcl            REAL,
    pody_bcu            REAL,
    podn                REAL,
    podn_ncl            REAL,
    podn_ncu            REAL,
    podn_bcl            REAL,
    podn_bcu            REAL,
    pofd                REAL,
    pofd_ncl            REAL,
    pofd_ncu            REAL,
    pofd_bcl            REAL,
    pofd_bcu            REAL,
    far                 REAL,
    far_ncl             REAL,
    far_ncu             REAL,
    far_bcl             REAL,
    far_bcu             REAL,
    csi                 REAL,
    csi_ncl             REAL,
    csi_ncu             REAL,
    csi_bcl             REAL,
    csi_bcu             REAL,
    gss                 REAL,
    gss_bcl             REAL,
    gss_bcu             REAL,
    hk                  REAL,
    hk_ncl              REAL,
    hk_ncu              REAL,
    hk_bcl              REAL,
    hk_bcu              REAL,
    hss                 REAL,
    hss_bcl             REAL,
  hss_bcu REAL,
  odds REAL,
  odds_ncl REAL,
  odds_ncu REAL,
  odds_bcl REAL,
  odds_bcu REAL,

  lodds REAL DEFAULT -9999,
  lodds_ncl REAL DEFAULT -9999,
  lodds_ncu REAL DEFAULT -9999,
  lodds_bcl REAL DEFAULT -9999,
  lodds_bcu REAL DEFAULT -9999,

  orss REAL DEFAULT -9999,
  orss_ncl REAL DEFAULT -9999,
  orss_ncu REAL DEFAULT -9999,
  orss_bcl REAL DEFAULT -9999,
  orss_bcu REAL DEFAULT -9999,

  eds REAL DEFAULT -9999,
  eds_ncl REAL DEFAULT -9999,
  eds_ncu REAL DEFAULT -9999,
  eds_bcl REAL DEFAULT -9999,
  eds_bcu REAL DEFAULT -9999,

  seds REAL DEFAULT -9999,
  seds_ncl REAL DEFAULT -9999,
  seds_ncu REAL DEFAULT -9999,
  seds_bcl REAL DEFAULT -9999,
  seds_bcu REAL DEFAULT -9999,

  edi REAL DEFAULT -9999,
  edi_ncl REAL DEFAULT -9999,
  edi_ncu REAL DEFAULT -9999,
  edi_bcl REAL DEFAULT -9999,
  edi_bcu REAL DEFAULT -9999,

  sedi REAL DEFAULT -9999,
  sedi_ncl REAL DEFAULT -9999,
  sedi_ncu REAL DEFAULT -9999,
  sedi_bcl REAL DEFAULT -9999,
  sedi_bcu REAL DEFAULT -9999,

  bagss REAL DEFAULT -9999,
  bagss_bcl REAL DEFAULT -9999,
  bagss_bcu REAL DEFAULT -9999,
    
    CONSTRAINT line_data_nbrcts_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_nbrcts_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_nbrcnt contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_nbrcnt;
CREATE TABLE line_data_nbrcnt
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    alpha               REAL,
    total               INTEGER,
    
    fbs                 REAL,
    fbs_bcl             REAL,
    fbs_bcu             REAL,
    fss                 REAL,
    fss_bcl REAL,
    fss_bcu REAL,
    afss REAL DEFAULT -9999,
    afss_bcl REAL DEFAULT -9999,
    afss_bcu REAL DEFAULT -9999,
    ufss REAL DEFAULT -9999,
    ufss_bcl REAL DEFAULT -9999,
    ufss_bcu REAL DEFAULT -9999,
    f_rate REAL DEFAULT -9999,
    f_rate_bcl REAL DEFAULT -9999,
    f_rate_bcu REAL DEFAULT -9999,
    o_rate REAL DEFAULT -9999,
    o_rate_bcl REAL DEFAULT -9999,
    o_rate_bcu REAL DEFAULT -9999,


  CONSTRAINT line_data_nbrcnt_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_nbrcnt_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);

DROP TABLE IF EXISTS line_data_enscnt;
CREATE TABLE line_data_enscnt
(
  stat_header_id INTEGER NOT NULL,
   data_file_id INTEGER NOT NULL,
   line_num INTEGER,
   fcst_lead INTEGER,
   fcst_valid_beg TIMESTAMP,
   fcst_valid_end TIMESTAMP,
   fcst_init_beg TIMESTAMP,
   obs_lead INTEGER,
   obs_valid_beg TIMESTAMP,
   obs_valid_end TIMESTAMP,

   rpsf REAL DEFAULT -9999,
   rpsf_ncl REAL DEFAULT -9999,
   rpsf_ncu REAL DEFAULT -9999,
   rpsf_bcl REAL DEFAULT -9999,
   rpsf_bcu REAL DEFAULT -9999,

   rpscl REAL DEFAULT -9999,
   rpscl_ncl REAL DEFAULT -9999,
   rpscl_ncu REAL DEFAULT -9999,
   rpscl_bcl REAL DEFAULT -9999,
   rpscl_bcu REAL DEFAULT -9999,

   rpss REAL DEFAULT -9999,
   rpss_ncl REAL DEFAULT -9999,
   rpss_ncu REAL DEFAULT -9999,
   rpss_bcl REAL DEFAULT -9999,
   rpss_bcu REAL DEFAULT -9999,

   crpsf REAL DEFAULT -9999,
   crpsf_ncl REAL DEFAULT -9999,
   crpsf_ncu REAL DEFAULT -9999,
   crpsf_bcl REAL DEFAULT -9999,
   crpsf_bcu REAL DEFAULT -9999,

   crpscl REAL DEFAULT -9999,
   crpscl_ncl REAL DEFAULT -9999,
   crpscl_ncu REAL DEFAULT -9999,
   crpscl_bcl REAL DEFAULT -9999,
   crpscl_bcu REAL DEFAULT -9999,

   crpss REAL DEFAULT -9999,
   crpss_ncl REAL DEFAULT -9999,
   crpss_ncu REAL DEFAULT -9999,
   crpss_bcl REAL DEFAULT -9999,
   crpss_bcu REAL DEFAULT -9999,



   CONSTRAINT line_data_enscnt_file_id_pk
   FOREIGN KEY (data_file_id)
   REFERENCES data_file (data_file_id),
   CONSTRAINT line_data_enscnt_stat_header_id_pk
   FOREIGN KEY (stat_header_id)
   REFERENCES stat_header (stat_header_id)
);



--  contains stat data for a particular stat_header record, which it points
--    at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_isc;
CREATE TABLE line_data_isc
(
    stat_header_id      INTEGER NOT NULL,    
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    tile_dim            REAL,
    time_xll            REAL,
    tile_yll            REAL,
    nscale              REAL,
    iscale              REAL,
    mse                 REAL,
    isc                 REAL,
    fenergy2            REAL,
    oenergy2            REAL,
    baser               REAL,
    fbias               REAL,
    
    CONSTRAINT line_data_isc_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_isc_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_rhist contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_rhist;
CREATE TABLE line_data_rhist
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,    
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    crps                REAL,
    ign                 REAL,
    n_rank              INTEGER,
    
    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_rhist_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_rhist_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_rhist_rank contains rank data for a particular line_data_rhist record.  The 
--   number of ranks stored is given by the line_data_rhist field n_rank.

DROP TABLE IF EXISTS line_data_rhist_rank;
CREATE TABLE line_data_rhist_rank
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    rank_i              INTEGER,
    
    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_rhist_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_rhist(line_data_id)
);

-- line_data_phist contains stat data for a particular stat_header record, which it points
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_phist;
CREATE TABLE line_data_phist
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,

    bin_size            REAL,
    n_bin              INTEGER,

    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_phist_data_file_id_pk FOREIGN KEY(data_file_id) REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_phist_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_phist_rank contains rank data for a particular line_data_phist record.  The
--   number of ranks stored is given by the line_data_phist field n_rank.

DROP TABLE IF EXISTS line_data_phist_bin;
CREATE TABLE line_data_phist_bin
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    bin_i              INTEGER,

    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_phist_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_phist(line_data_id)
);



-- line_data_orank contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_orank;
CREATE TABLE line_data_orank
(
    line_data_id        INTEGER NOT NULL,
    stat_header_id      INTEGER NOT NULL,    
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    total               INTEGER,
    
    orank_index         INTEGER,
    obs_sid             VARCHAR(64),
    obs_lat             VARCHAR(64),
    obs_lon             VARCHAR(64),
    obs_lvl             VARCHAR(64),
    obs_elv             VARCHAR(64),
    obs                 REAL,
    pit                 REAL,
    rank                INTEGER,
    n_ens_vld           INTEGER,
    n_ens               INTEGER,
    obs_qc              REAL DEFAULT -9999,
    
    PRIMARY KEY (line_data_id),
    CONSTRAINT line_data_orank_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_orank_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);


-- line_data_orank_ens contains ensemble data for a particular line_data_orank record.  The 
--   number of ens values stored is given by the line_data_orank field n_ens.

DROP TABLE IF EXISTS line_data_orank_ens;
CREATE TABLE line_data_orank_ens
(
    line_data_id        INTEGER NOT NULL,
    i_value             INTEGER NOT NULL,
    ens_i               REAL,
    PRIMARY KEY (line_data_id, i_value),
    CONSTRAINT line_data_orank_id_pk
            FOREIGN KEY(line_data_id)
            REFERENCES line_data_orank(line_data_id)
);


-- line_data_nbrcnt contains stat data for a particular stat_header record, which it points 
--   at via the stat_header_id field.

DROP TABLE IF EXISTS line_data_ssvar;
CREATE TABLE line_data_ssvar
(
    stat_header_id      INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    line_num            INTEGER,
    fcst_lead           INTEGER,
    fcst_valid_beg      TIMESTAMP,
    fcst_valid_end      TIMESTAMP,
    fcst_init_beg       TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid_beg       TIMESTAMP,
    obs_valid_end       TIMESTAMP,
    alpha               REAL,
    total               INTEGER,

    n_bin               INTEGER,
    bin_i               INTEGER,
    bin_n               INTEGER,
    var_min             REAL,
    var_max             REAL,
    var_mean            REAL,
    fbar                REAL,
    obar                REAL,
    fobar               REAL,
    ffbar               REAL,
    oobar               REAL,

    fbar_ncl            REAL,
    fbar_ncu            REAL,
    fstdev              REAL,
    fstdev_ncl          REAL,
    fstdev_ncu          REAL,
    obar_ncl            REAL,
    obar_ncu            REAL,
    ostdev              REAL,
    ostdev_ncl          REAL,
    ostdev_ncu          REAL,
    pr_corr             REAL,
    pr_corr_ncl         REAL,
    pr_corr_ncu         REAL,
    me	                REAL,
    me_ncl              REAL,
    me_ncu              REAL,
    estdev              REAL,
    estdev_ncl          REAL,
    estdev_ncu          REAL,
    mbias               REAL,
    mse                 REAL,
    bcmse               REAL,
    rmse	              REAL,
    CONSTRAINT line_data_ssvar_data_file_id_pk
            FOREIGN KEY(data_file_id)
            REFERENCES data_file(data_file_id),
    CONSTRAINT line_data_ssvar_stat_header_id_pk
            FOREIGN KEY(stat_header_id)
            REFERENCES stat_header(stat_header_id)
);




-- mode_header represents a line in a mode file and contains the header information for
--   that line.  The line-dependent information is stored in specific tables for each line 
--   type, each of which point at the line they are associated with, via the mode_header_id 
--   field.  Each mode_header line also specifies what type it is by pointing at a line
--   type in the line_type_lu table, via the line_type_lu_id field.  The file that the
--   line information was stored in is specified by a record in the data_file table, pointed
--   at by the data_file_id field.

DROP TABLE IF EXISTS mode_header;
CREATE TABLE mode_header
(
    mode_header_id      INTEGER NOT NULL,
    line_type_lu_id     INTEGER NOT NULL,
    data_file_id        INTEGER NOT NULL,
    linenumber          INTEGER,
    version             VARCHAR(8),
    model               VARCHAR(64),
    fcst_lead           INTEGER,
    fcst_valid          TIMESTAMP,
    fcst_accum          INTEGER,
    fcst_init           TIMESTAMP,
    obs_lead            INTEGER,
    obs_valid           TIMESTAMP,
    obs_accum           INTEGER,
    fcst_rad            INTEGER,
    fcst_thr            VARCHAR(16),
    obs_rad             INTEGER,
    obs_thr             VARCHAR(16),
    fcst_var            VARCHAR(64),
    fcst_lev            VARCHAR(16),
    obs_var             VARCHAR(64),
    obs_lev             VARCHAR(16),
    PRIMARY KEY (mode_header_id),

    CONSTRAINT mode_header_data_file_id_pk
        FOREIGN KEY(data_file_id)
        REFERENCES data_file(data_file_id),
    CONSTRAINT stat_header_unique_pk
        UNIQUE  (
            model,
            fcst_lead,
            fcst_valid,
            fcst_accum,
            fcst_init,
            obs_lead,
            obs_valid,
            obs_accum,
            fcst_rad,
            fcst_thr,
            obs_rad,
            obs_thr,
            fcst_var,
            fcst_lev,
            obs_var,
            obs_lev
        )
);


-- mode_cts contains mode cts data for a particular mode_header record, which it points 
--   at via the mode_header_id field.

DROP TABLE IF EXISTS mode_cts;
CREATE TABLE mode_cts
(
    mode_header_id      INTEGER NOT NULL,
    field               VARCHAR(16),
    total               INTEGER,
    fy_oy               INTEGER,
    fy_on               INTEGER,
    fn_oy               INTEGER,
    fn_on               INTEGER,
    baser               REAL,
    fmean               REAL,
    acc                 REAL,
    fbias               REAL,
    pody                REAL,
    podn                REAL,
    pofd                REAL,
    far                 REAL,
    csi                 REAL,
    gss                 REAL,
    hk                  REAL,
    hss                 REAL,
    odds                REAL,
    CONSTRAINT mode_cts_mode_header_id_pk
        FOREIGN KEY(mode_header_id)
        REFERENCES mode_header(mode_header_id)
);


-- mode_obj_single contains mode object data for a particular mode_header record, which it 
--   points at via the mode_header_id field.  This table stores information only about 
--   single mode objects.  Mode object pair information is stored in the mode_obj_pair 
--   table.

DROP TABLE IF EXISTS mode_obj_single;
CREATE TABLE mode_obj_single
(
    mode_obj_id         INTEGER NOT NULL,
    mode_header_id      INTEGER NOT NULL,
    object_id           VARCHAR(128),
    object_cat          VARCHAR(128),
    centroid_x          REAL,
    centroid_y          REAL,
    centroid_lat        REAL,
    centroid_lon        REAL,
    axis_avg            REAL,
    length              REAL,
    width               REAL,
    area                INTEGER,
    area_filter         INTEGER,
    area_thresh         INTEGER,
    curvature           REAL,
    curvature_x         REAL,
    curvature_y         REAL,
    complexity          REAL,
    intensity_10        REAL,
    intensity_25        REAL,
    intensity_50        REAL,
    intensity_75        REAL,
    intensity_90        REAL,
    intensity_nn        REAL,
    intensity_sum       REAL,
    PRIMARY KEY (mode_obj_id),
    CONSTRAINT mode_obj_single_mode_header_id_pk
            FOREIGN KEY(mode_header_id)
            REFERENCES mode_header(mode_header_id)
);


-- mode_obj_pair contains mode object data for a particular mode_header record, which it 
--   points at via the mode_header_id field.  This table stores information only about pairs
--   of mode objects.  Each mode_obj_pair record points at two mode_obj_single records, one
--   corresponding to the observed object (via mode_obj_obs) and one corresponding to the 
--   forecast object (via mode_obj_fcst). 

DROP TABLE IF EXISTS mode_obj_pair;
CREATE TABLE mode_obj_pair
(
    mode_obj_obs_id     INTEGER NOT NULL,
    mode_obj_fcst_id    INTEGER NOT NULL,
    mode_header_id      INTEGER NOT NULL,    
    object_id           VARCHAR(128),
    object_cat          VARCHAR(128),
    centroid_dist       REAL,
    boundary_dist       REAL,
    convex_hull_dist    REAL,
    angle_diff          REAL,
    area_ratio          REAL,
    intersection_area   INTEGER,
    union_area          INTEGER,
    symmetric_diff      INTEGER,
    intersection_over_area REAL,
    complexity_ratio    REAL,
    percentile_intensity_ratio REAL,
    interest            REAL,
    CONSTRAINT mode_obj_pair_mode_header_id_pk
        FOREIGN KEY(mode_header_id)
        REFERENCES mode_header(mode_header_id),
    CONSTRAINT mode_obj_pair_mode_obj_obs_pk
        FOREIGN KEY(mode_obj_obs_id)
        REFERENCES mode_obj_single(mode_obj_id),
    CONSTRAINT mode_obj_pair_mode_obj_fcst_pk
        FOREIGN KEY(mode_obj_fcst_id)
        REFERENCES mode_obj_single(mode_obj_id)
);


--  look-up table data

INSERT INTO data_file_lu VALUES (0, 'point_stat', 'Verification statistics for forecasts at observation points');
INSERT INTO data_file_lu VALUES (1, 'grid_stat', 'Verification statistics for a matched forecast and observation grid');
INSERT INTO data_file_lu VALUES (2, 'mode_cts', 'Contingency table counts and statistics comparing forecast and observations');
INSERT INTO data_file_lu VALUES (3, 'mode_obj', 'Attributes for simple objects, merged cluster objects and pairs of objects');
INSERT INTO data_file_lu VALUES (4, 'wavelet_stat', 'Verification statistics for intensity-scale comparison of forecast and observations');
INSERT INTO data_file_lu VALUES (5, 'ensemble_stat', 'Ensemble verification statistics');
INSERT INTO data_file_lu VALUES (6, 'vsdb_point_stat', 'Verification statistics for forecasts at observation points for vsdb files');


-- mv_rev contains information about metvdb revisions, and provides an indicator of
--   the changes made in the current revision

DROP TABLE IF EXISTS mv_rev;
CREATE TABLE mv_rev
(
    rev_id              INTEGER NOT NULL,
    rev_date            TIMESTAMP,
    rev_name            VARCHAR(16),
    rev_detail          VARCHAR(2048),
    PRIMARY KEY (rev_id)    
);

INSERT INTO mv_rev VALUES (0, '2010-07-29 12:00:00', '0.1',   'Initial revision, includes metvdb_rev, instance_info and web_plot tables');
INSERT INTO mv_rev VALUES (1, '2010-10-14 12:00:00', '0.1',   'Increased web_plot.plot_xml field width to 65536');
INSERT INTO mv_rev VALUES (2, '2010-11-15 12:00:00', '0.3',   'METViewer changes to support out from METv3.0');
INSERT INTO mv_rev VALUES (3, '2011-01-13 12:00:00', '0.5',   'Major refactoring of schema, compatible with METv3.0');
INSERT INTO mv_rev VALUES (4, '2011-03-18 12:00:00', '0.5',   'Added instance_info table');
INSERT INTO mv_rev VALUES (5, '2012-09-25 12:00:00', '0.5.6', 'Added line_data_ssvar table');


-- instance_info contains information about the particular instance of metvdb, including 
--   dates of data updates and information about data table contents

CREATE TABLE IF NOT EXISTS instance_info
(
    instance_info_id    INTEGER NOT NULL,
    updater             VARCHAR(64),
    update_date         TIMESTAMP,
    update_detail       VARCHAR(2048),
    load_xml            TEXT,
    PRIMARY KEY (instance_info_id)    
);





--
--  Sl1l2 stat calculations
--

DROP FUNCTION IF EXISTS calcStdDev(vsum REAL, vsum_sq REAL, n INT);
CREATE FUNCTION calcStdDev (vsum REAL, vsum_sq REAL, n INT) RETURNS REAL AS $$
DECLARE
    v REAL;
BEGIN

    IF 1 > n THEN RETURN -1; END IF;
    v := (vsum_sq - vsum*vsum/n)/(n - 1);
    IF 0 > v THEN RETURN -1; END IF;
    RETURN SQRT(v);
END ;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcFBAR(total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN FORMAT( fbar, 4 ); END; $$ LANGUAGE plpgsql;


DROP FUNCTION IF EXISTS calcOBAR(total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN FORMAT( obar, 4 ); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcFSTDEV(total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) ;
CREATE FUNCTION calcFSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN calcStdDev(fbar * total, ffbar * total, total); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcOSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcOSTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN calcStdDev(obar * total, oobar * total, total); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcFOBAR(total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcFOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN FORMAT( fobar, 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcFFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcFFBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN FORMAT( ffbar, 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcOOBAR(total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) ;
CREATE FUNCTION calcOOBAR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN RETURN FORMAT( oobar, 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcMBIAS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcMBIAS (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
BEGIN IF 0 = obar THEN RETURN 'NA'; END IF; RETURN FORMAT( (fbar / obar), 4 ); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcPR_CORR (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);

CREATE FUNCTION calcPR_CORR(total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16) AS $$
DECLARE
  v REAL;
  pr_corr REAL;
BEGIN
  v := (power(total, 2) * ffbar - power(total, 2) * power(fbar, 2)) * (power(total, 2) * oobar - power(total, 2) * power(obar, 2));
  IF 0 >= v THEN RETURN 'NA'; END IF;
  pr_corr := (power(total, 2) * fobar - power(total, 2) * fbar * obar) / sqrt(v);
  IF 1 < pr_corr THEN RETURN 'NA'; END IF;
  RETURN FORMAT(pr_corr, 4);
END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcME (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcME (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16)  AS $$
BEGIN RETURN FORMAT( (fbar - obar), 4 ); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16)  AS $$
BEGIN RETURN FORMAT( (ffbar + oobar - 2*fobar), 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16)  AS $$
BEGIN RETURN FORMAT( SQRT(ffbar + oobar - 2*fobar), 4 ); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcESTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcESTDEV (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16)  AS $$
BEGIN RETURN FORMAT( calcStdDev( (fbar - obar)*total, (ffbar + oobar - 2*fobar)*total, total ), 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcBCMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcBCMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16)  AS $$
BEGIN RETURN FORMAT( (ffbar + oobar - 2*fobar) - POW(fbar - obar, 2), 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcBCRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL);
CREATE FUNCTION calcBCRMSE (total INT, fbar REAL, obar REAL, fobar REAL, ffbar REAL, oobar REAL) RETURNS CHAR(16)  AS $$
BEGIN RETURN FORMAT( SQRT((ffbar + oobar - 2*fobar) - POW(fbar - obar, 2)), 4 ); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcMAE ( mae REAL);
CREATE FUNCTION calcMAE ( mae REAL) RETURNS CHAR(16) AS $$
BEGIN IF mae = -9999 THEN RETURN 'NA'; END IF; RETURN FORMAT( mae, 4 ); END ; $$ LANGUAGE plpgsql;

--
-- CTC stat calculations
--

DROP FUNCTION IF EXISTS calcBASER (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcBASER (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF total = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT((fy_oy + fn_oy) / total, 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcACC(total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcACC (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF total = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT((fy_oy + fn_on) / total, 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcFBIAS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcFBIAS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF (fy_oy + fn_oy) = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT((fy_oy + fy_on) / (fy_oy + fn_oy), 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcPODY (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcPODY (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF (fy_oy + fn_oy) = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT(fy_oy / (fy_oy + fn_oy), 4); END; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcPOFD (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcPOFD (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF (fy_on + fn_on) = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT(fy_on / (fy_on + fn_on), 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcPODN (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcPODN (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF (fy_on + fn_on) = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT(fn_on / (fy_on + fn_on), 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcFAR (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcFAR (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF (fy_oy + fy_on) = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT(fy_on / (fy_oy + fy_on), 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcCSI (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT)
CREATE FUNCTION calcCSI (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN IF (fy_oy + fy_on + fn_oy) = 0 THEN RETURN 'NA'; END IF; RETURN FORMAT(fy_oy / (fy_oy + fy_on + fn_oy), 4); END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcGSS(total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT);
CREATE FUNCTION calcGSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
DECLARE c REAL;
BEGIN
    IF total = 0 THEN RETURN 'NA'; END IF;
     c := ( (fy_oy + fy_on) / total ) * (fy_oy + fn_oy);
    RETURN FORMAT( (fy_oy - c) / (fy_oy + fy_on + fn_oy - c), 4);
END ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcHK (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT);
CREATE FUNCTION calcHK (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
BEGIN	
    IF ( (fy_oy + fn_oy) = 0 OR (fy_on + fn_on) = 0 ) THEN RETURN 'NA'; END IF;
    RETURN FORMAT( (fy_oy / (fy_oy + fn_oy)) - (fy_on / (fy_on + fn_on)), 4);
END  ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcHSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT);
CREATE FUNCTION calcHSS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
DECLARE c REAL;
BEGIN
    IF total = 0 THEN RETURN 'NA'; END IF;
    c := ( (fy_oy + fy_on)*(fy_oy + fn_oy) + (fn_oy + fn_on)*(fy_on + fn_on) ) / total;
    RETURN FORMAT( (fy_oy + fn_on - c) / (total - c), 4);
END  ; $$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS calcODDS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT);
CREATE FUNCTION calcODDS (total INT, fy_oy INT, fy_on INT, fn_oy INT, fn_on INT) RETURNS CHAR(16) AS $$
DECLARE pody REAL;
    pofd REAL;
BEGIN
    IF ( (fy_oy + fn_oy) = 0 OR (fy_on + fn_on) = 0 ) THEN RETURN 'NA'; END IF;
    pody := fy_oy / (fy_oy + fn_oy);
    pofd := fy_on / (fy_on + fn_on);
    IF ( pody = 0 OR pofd = 0 ) THEN RETURN 'NA'; END IF;
    RETURN FORMAT( (pody * (1-pofd)) / (pofd * (1-pody)), 4);
END  ; $$ LANGUAGE plpgsql;




