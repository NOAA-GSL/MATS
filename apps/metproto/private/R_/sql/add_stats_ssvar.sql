ALTER TABLE line_data_ssvar ADD fbar_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD fbar_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD fstdev DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD fstdev_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD fstdev_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD obar_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD obar_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD ostdev DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD ostdev_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD ostdev_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD pr_corr DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD pr_corr_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD pr_corr_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD me DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD me_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD me_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD estdev DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD estdev_ncl DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD estdev_ncu DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD mbias DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD mse DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD bcmse DOUBLE  DEFAULT -9999;
ALTER TABLE line_data_ssvar ADD rmse DOUBLE  DEFAULT -9999;


ALTER TABLE line_data_ssvar ADD alpha DOUBLE  DEFAULT -9999 AFTER obs_valid_end;