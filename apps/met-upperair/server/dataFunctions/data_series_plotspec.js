import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

plotSpecTimeSeries = function (plotParams, key,plotSpecCallback) {
    var builder = require('xmlbuilder');
    var xml = builder.create('plot_spec',
        {version: '1.0', encoding: 'UTF-8', standalone: no});
    xml.ele('connection')
        .ele('host','a host name')
        .ele('database','aDataBase')
        .ele('user','some user')
        .ele('password','some password');
    xml.ele('rscript',"rscript path");
    xml.ele('folders')
        .ele('r_tmpl','r tmpl path')
        .ele('r_work','r work path')
        .ele('r_plots','r plots path')
        .ele('r_data','r data path')
        .ele('r_scripts','r scripts path')
};

/*
"<plot_spec>"
    + "<connection>"
    + "<host>" + databaseManager.getDatabaseInfo().getHost() + "</host>"
    + "<database>" + databases + "</database>"
    + "<user>" + "******" + "</user>"
    + "<password>" + "******" + "</password>"
    + "</connection>"
    + (rscript.equals("") ? "" : "<rscript>" + rscript + "</rscript>")
    + "<folders>"
    + "<r_tmpl>" + rTmpl + "</r_tmpl>"
    + "<r_work>" + rWork + "</r_work>"
    + "<plots>" + plots + "</plots>"
    + "<data>" + data + "</data>"
    + "<scripts>" + scripts + "</scripts>"
    + "</folders>"
    + strPlotXML
    + "</plot_spec>";                                                       */

/*
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<plot_spec>
    <connection>
        <host>137.75.129.120:3312</host>
        <database>mv_prod_vsdb_gfs_prfv3rt1</database>
        <user>******</user>
        <password>******</password>
    </connection>
    <rscript>/bin/Rscript</rscript>
    <folders>
        <r_tmpl>/usr/share/tomcat/webapps/metviewer-mysql/R_tmpl</r_tmpl>
        <r_work>/usr/share/tomcat/webapps/metviewer-mysql/R_work</r_work>
        <plots>/usr/share/tomcat/webapps/metviewer_mysql_output/plots</plots>
        <data>/usr/share/tomcat/webapps/metviewer_mysql_output/data</data>
        <scripts>/usr/share/tomcat/webapps/metviewer_mysql_output/scripts</scripts>
    </folders>
    <plot>
        <template>series_plot.R_tmpl</template>
        <dep>
            <dep1>
                <fcst_var name="T">
                    <stat>RMSE</stat>
                </fcst_var>
            </dep1>
            <dep2/>
        </dep>
        <series1>
            <field name="model">
                <val>GFS</val>
            </field>
        </series1>
        <series2/>
        <plot_fix>
            <field equalize="false" name="vx_mask">
                <set name="vx_mask_0">
                    <val>G2</val>
                </set>
            </field>
            <field equalize="false" name="fcst_lead">
                <set name="fcst_lead_1">
                    <val>12</val>
                </set>
            </field>
            <field equalize="false" name="fcst_lev">
                <set name="fcst_lev_2">
                    <val>P500</val>
                </set>
            </field>
        </plot_fix>
        <plot_cond/>
        <indep equalize="false" name="fcst_valid_beg">
            <val label="2018-07-06 00:00:00" plot_val="">2018-07-06 00:00:00</val>
            <val label="2018-07-06 06:00:00" plot_val="">2018-07-06 06:00:00</val>
            <val label="2018-07-06 12:00:00" plot_val="">2018-07-06 12:00:00</val>
            <val label="2018-07-06 18:00:00" plot_val="">2018-07-06 18:00:00</val>
            <val label="2018-07-07 00:00:00" plot_val="">2018-07-07 00:00:00</val>
            <val label="2018-07-07 06:00:00" plot_val="">2018-07-07 06:00:00</val>
            <val label="2018-07-07 12:00:00" plot_val="">2018-07-07 12:00:00</val>
            <val label="2018-07-07 18:00:00" plot_val="">2018-07-07 18:00:00</val>
            <val label="2018-07-08 00:00:00" plot_val="">2018-07-08 00:00:00</val>
            <val label="2018-07-08 06:00:00" plot_val="">2018-07-08 06:00:00</val>
            <val label="2018-07-08 12:00:00" plot_val="">2018-07-08 12:00:00</val>
            <val label="2018-07-08 18:00:00" plot_val="">2018-07-08 18:00:00</val>
            <val label="2018-07-09 00:00:00" plot_val="">2018-07-09 00:00:00</val>
            <val label="2018-07-09 06:00:00" plot_val="">2018-07-09 06:00:00</val>
            <val label="2018-07-09 12:00:00" plot_val="">2018-07-09 12:00:00</val>
            <val label="2018-07-09 18:00:00" plot_val="">2018-07-09 18:00:00</val>
            <val label="2018-07-10 00:00:00" plot_val="">2018-07-10 00:00:00</val>
            <val label="2018-07-10 06:00:00" plot_val="">2018-07-10 06:00:00</val>
            <val label="2018-07-10 12:00:00" plot_val="">2018-07-10 12:00:00</val>
            <val label="2018-07-10 18:00:00" plot_val="">2018-07-10 18:00:00</val>
            <val label="2018-07-11 00:00:00" plot_val="">2018-07-11 00:00:00</val>
            <val label="2018-07-11 06:00:00" plot_val="">2018-07-11 06:00:00</val>
            <val label="2018-07-11 12:00:00" plot_val="">2018-07-11 12:00:00</val>
            <val label="2018-07-11 18:00:00" plot_val="">2018-07-11 18:00:00</val>
            <val label="2018-07-12 00:00:00" plot_val="">2018-07-12 00:00:00</val>
            <val label="2018-07-12 06:00:00" plot_val="">2018-07-12 06:00:00</val>
            <val label="2018-07-12 12:00:00" plot_val="">2018-07-12 12:00:00</val>
            <val label="2018-07-12 18:00:00" plot_val="">2018-07-12 18:00:00</val>
            <val label="2018-07-13 00:00:00" plot_val="">2018-07-13 00:00:00</val>
        </indep>
        <calc_stat>
            <calc_sl1l2>true</calc_sl1l2>
        </calc_stat>
        <plot_stat>mean</plot_stat>
        <tmpl>
            <data_file>plot_20181220_202506.data</data_file>
            <plot_file>plot_20181220_202506.png</plot_file>
            <r_file>plot_20181220_202506.R</r_file>
            <title>test title</title>
            <x_label>test x_label</x_label>
            <y1_label>test y_label</y1_label>
            <y2_label/>
            <caption/>
            <job_title/>
            <keep_revisions>false</keep_revisions>
            <listdiffseries1>list()</listdiffseries1>
            <listdiffseries2>list()</listdiffseries2>
        </tmpl>
        <event_equal>false</event_equal>
        <vert_plot>false</vert_plot>
        <x_reverse>false</x_reverse>
        <num_stats>false</num_stats>
        <indy1_stag>false</indy1_stag>
        <indy2_stag>false</indy2_stag>
        <grid_on>true</grid_on>
        <sync_axes>false</sync_axes>
        <dump_points1>false</dump_points1>
        <dump_points2>false</dump_points2>
        <log_y1>false</log_y1>
        <log_y2>false</log_y2>
        <varianceinflationfactor>true</varianceinflationfactor>
        <plot_type>png16m</plot_type>
        <plot_height>8.5</plot_height>
        <plot_width>11</plot_width>
        <plot_res>72</plot_res>
        <plot_units>in</plot_units>
        <mar>c(8,4,5,4)</mar>
        <mgp>c(1,1,0)</mgp>
        <cex>1</cex>
        <title_weight>2</title_weight>
        <title_size>1.4</title_size>
        <title_offset>-2</title_offset>
        <title_align>0.5</title_align>
        <xtlab_orient>1</xtlab_orient>
        <xtlab_perp>-0.75</xtlab_perp>
        <xtlab_horiz>0.5</xtlab_horiz>
        <xtlab_freq>0</xtlab_freq>
        <xtlab_size>1</xtlab_size>
        <xlab_weight>1</xlab_weight>
        <xlab_size>1</xlab_size>
        <xlab_offset>2</xlab_offset>
        <xlab_align>0.5</xlab_align>
        <ytlab_orient>1</ytlab_orient>
        <ytlab_perp>0.5</ytlab_perp>
        <ytlab_horiz>0.5</ytlab_horiz>
        <ytlab_size>1</ytlab_size>
        <ylab_weight>1</ylab_weight>
        <ylab_size>1</ylab_size>
        <ylab_offset>-2</ylab_offset>
        <ylab_align>0.5</ylab_align>
        <grid_lty>3</grid_lty>
        <grid_col>#cccccc</grid_col>
        <grid_lwd>1</grid_lwd>
        <grid_x>listX</grid_x>
        <x2tlab_orient>1</x2tlab_orient>
        <x2tlab_perp>1</x2tlab_perp>
        <x2tlab_horiz>0.5</x2tlab_horiz>
        <x2tlab_size>0.8</x2tlab_size>
        <x2lab_size>0.8</x2lab_size>
        <x2lab_offset>-0.5</x2lab_offset>
        <x2lab_align>0.5</x2lab_align>
        <y2tlab_orient>1</y2tlab_orient>
        <y2tlab_perp>0.5</y2tlab_perp>
        <y2tlab_horiz>0.5</y2tlab_horiz>
        <y2tlab_size>1</y2tlab_size>
        <y2lab_size>1</y2lab_size>
        <y2lab_offset>1</y2lab_offset>
        <y2lab_align>0.5</y2lab_align>
        <legend_box>o</legend_box>
        <legend_inset>c(0, -.25)</legend_inset>
        <legend_ncol>3</legend_ncol>
        <legend_size>0.8</legend_size>
        <caption_weight>1</caption_weight>
        <caption_col>#333333</caption_col>
        <caption_size>0.8</caption_size>
        <caption_offset>3</caption_offset>
        <caption_align>0</caption_align>
        <ci_alpha>0.05</ci_alpha>
        <plot_ci>c("none")</plot_ci>
        <show_signif>c(FALSE)</show_signif>
        <plot_disp>c(TRUE)</plot_disp>
        <colors>c("#ff0000FF")</colors>
        <pch>c(20)</pch>
        <type>c("b")</type>
        <lty>c(1)</lty>
        <lwd>c(1)</lwd>
        <con_series>c(1)</con_series>
        <order_series>c(1)</order_series>
        <plot_cmd/>
        <legend>c("")</legend>
        <y1_lim>c()</y1_lim>
        <y1_bufr>0.04</y1_bufr>
        <y2_lim>c()</y2_lim>
    </plot>
</plot_spec>
*/
