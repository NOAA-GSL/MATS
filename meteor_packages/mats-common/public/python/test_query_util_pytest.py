import unittest
import pytest
import json
from python_query_util import QueryUtil


class MyTestCase(unittest.TestCase):
    def test_timeseries_with_data(self):
        try:
            options = {
                "host": "137.75.129.120",
                "port": 3312,
                "user": "met_admin",
                "password": "MaPass4mvmay2018##",
                "database": "metviewerDBstatus",
                "statement": "select unix_timestamp(ld.fcst_valid_beg) as avtime, count(distinct unix_timestamp(ld.fcst_valid_beg)) as N_times, min(unix_timestamp(ld.fcst_valid_beg)) as min_secs, max(unix_timestamp(ld.fcst_valid_beg)) as max_secs, sum(ld.total) as N0, avg(ld.fbar) as fbar, avg(ld.obar) as obar, group_concat(ld.fbar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_fbar, group_concat(ld.obar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_obar, group_concat(ld.ffbar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_ffbar, group_concat(ld.oobar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_oobar, group_concat(ld.fobar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_fobar, group_concat(ld.total order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_total, group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs, group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs from mv_gsd.stat_header h, mv_gsd.line_data_sl1l2 ld where 1=1 and h.model = 'GFS' and h.vx_mask IN('G2') and unix_timestamp(ld.fcst_valid_beg) >= '1541008800' and unix_timestamp(ld.fcst_valid_beg) <= '1541934000' and ld.fcst_lead IN (0) and h.fcst_var = 'HGT' and h.fcst_lev IN('P10','P20','P30','P50','P70','P100','P150','P200','P250','P300','P400','P500','P700','P850','P925','P1000') and ld.stat_header_id = h.stat_header_id group by avtime order by avtime;",
                "statistic": "ACC",
                "plotType": "TimeSeries",
                "hasLevels": True,
                "completenessQCParam": 0,
                "vts": "0,6,12,18"
            }
            qutil = QueryUtil()
            qutil.do_query(options)
            qutil.construct_output_json()
            json_data = json.loads(qutil.output_JSON)
            self.assertTrue("data" in json_data, "json data does not contain data")
            self.assertTrue("N0" in json_data, "json data does not contain N0")
            self.assertTrue("N_times" in json_data, "json data does not contain N_times")
            self.assertTrue("error" in json_data, "json data does not contain error")
            self.assertIsNot({}, json_data, "JSON is empty: ")
            self.assertIsNot("", qutil.output_JSON, "JSON is empty: ")
            self.assertIs("", qutil.error, "error returned: " + qutil.error)
            self.assertIsNot(qutil.data, [], "data is empty")
        except Exception as e:
            pytest.fail("Caught Exception:", e)



if __name__ == '__main__':
    unittest.main()
