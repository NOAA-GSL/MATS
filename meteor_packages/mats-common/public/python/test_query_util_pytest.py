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
                "statement": "select unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as xVal,  ld.fcst_lead as yVal,  min(unix_timestamp(ld.fcst_valid_beg)) as min_secs, max(unix_timestamp(ld.fcst_valid_beg)) as max_secs, count(ld.fbar) as n, avg(ld.fbar) as sub_fbar, avg(ld.obar) as sub_obar, avg(ld.ffbar) as sub_ffbar, avg(ld.oobar) as sub_oobar, avg(ld.fobar) as sub_fobar, avg(ld.total) as sub_total, avg(ld.fcst_valid_beg) as sub_secs, count(h.fcst_lev) as sub_levs from mv_test_2.stat_header h, mv_test_2.line_data_sl1l2 ld where 1=1 and h.model = 'AFWAOCv3.5.1_d01' and h.vx_mask IN('APL') and unix_timestamp(ld.fcst_valid_beg) >= '1309478400' and unix_timestamp(ld.fcst_valid_beg) <= '1310299200'   and h.fcst_var = 'DPT' and h.fcst_lev IN('Z0','Z2','Z10') and ld.stat_header_id = h.stat_header_id group by xVal,yVal order by xVal,yVal;",
                "statistic": "RMS",
                "plotType": "Contour",
                "hasLevels": True,
                "completenessQCParam": 0,
                "vts": ""
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
