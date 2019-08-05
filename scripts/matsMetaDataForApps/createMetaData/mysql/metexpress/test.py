#!/usr/bin/env python
from __future__ import print_function
import sys
import os.path
import pymysql
import json
from datetime import datetime

def main(cnf_file):
	cnx = pymysql.connect(read_default_file=cnf_file)
	cnx.autocommit = True
	cursor = cnx.cursor(pymysql.cursors.DictCursor)

	cnx2 = pymysql.connect(read_default_file=cnf_file)
	cnx2.autocommit = True
	cursor2 = cnx2.cursor(pymysql.cursors.DictCursor)

	cnx3 = pymysql.connect(read_default_file=cnf_file)
	cnx3.autocommit = True
	cursor3 = cnx3.cursor(pymysql.cursors.DictCursor)

	print("start processing: " + str(datetime.now()))
	cursor.execute('use mv_gfs_grid2grid_vsdb;')
	cnx.commit()
	cursor.execute('select distinct stat_header_id from stat_header where model="GFS";')
	cnx.commit()
	for l1 in cursor:
		stat_header_id = list(l1.values())[0]
		print("processing stat_header id: " + str(stat_header_id))
		cursor2.execute("select distinct fcst_lead from line_data_sl1l2 where stat_header_id='" + stat_header_id + "';")
		cnx2.commit()
		for  l2 in cursor2:
			fcst_lead_time = list(l2.values())[0]
			print("fcst_lead_time: " + str(fcst_lead_time))
		print("finished processing stat_header id: " + str(stat_header_id)+ "\n")
	print("finished processing: " + str(stat_header_id))

if __name__ == '__main__':
	if len(sys.argv) < 2:
		print("Error -- mysql cnf file needs to be passed in as argument")
		sys.exit(1)
	elif len(sys.argv) == 2:
		cnf_file = sys.argv[1]
		exists = os.path.isfile(cnf_file)
	if exists:
		print("using cnf file: " + cnf_file)
	else:
		print("cnf file " + cnf_file + " is not a file - exiting")
		sys.exit(1)
	main(cnf_file)
	print('TEST FOR MET METADATA END: ' + str(datetime.now()))
	sys.exit(0)
