#!/usr/bin/env python3
"""
This script creates the metadata tables required for a METexpress surface app. It parses the required fields from any
databases that begin with 'mv_' in a mysql instance.

Usage: ["(c)nf_file=", "[(m)ats_metadata_database_name]",
                 "[(D)ata_table_stat_header_id_limit - default is 10,000,000,000]",
                 "[(d)atabase name]" "(u)=metexpress_base_url"]
        cnf_file = None

Author: Molly B Smith, heavily modified by Randy Pierce
"""

#  Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.

from __future__ import print_function
import sys
from datetime import datetime
from metexpress.MEmetadata import MEMetadata

class MESurface(MEMetadata):
    def __init__(self, options):
        options['needsTrshs'] = False  # surface does not have thresholds
        options['fcstWhereClause'] = 'fcst_lev in ("MSL", "SFC", "Z0", "Z2", "Z10", "H0", "H2", "H10", "L0") and fcst_var not regexp "^OZ|^PM25"'
        super().__init__(options)

    def strip_level(self, elem):
        # helper function for sorting levels
        if elem[0] in ['Z', 'H', 'L', 'A']:
            try:
                return int(elem[1:])
            except ValueError:
                return 0
        else:
            try:
                return int(float(elem) + 10000)
            except ValueError:
                return 0


if __name__ == '__main__':
    options = MEMetadata.get_options(sys.argv)
    options['name'] = __name__
    options['line_data_table'] = ["line_data_sl1l2"]
    options['metadata_table'] = "surface_mats_metadata"
    options['app_reference'] = "met-surface"
    options['string_fields'] = ["regions", "levels", "fcst_lens", "variables", "fcst_orig"]
    options['int_fields'] = ["mindate", "maxdate", "numrecs", "updated"]
    options['database_groups'] = "surface_database_groups"
    start = str(datetime.now())
    print('SURFACE MATS FOR MET METADATA START: ' + start)
    me_dbcreator = MESurface(options)
    me_dbcreator.main()
    print('SURFACE MATS FOR MET METADATA END: ' + str(datetime.now()) + " started at: " + start)
    sys.exit(0)
