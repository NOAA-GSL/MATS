#!/bin/bash --login

# do not forget the 'deploy' switch
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling15.py deploy -- replaced by ceiling5
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling5.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surface.py deploy -- old surface metadata script
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surface_new.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_upperair.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_visibility.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_visibility1.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip2.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip_aqpi.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_cref.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vil.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_echotop.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_anomalycor2.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_aircraft.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vgtyp.py deploy -- old vgtyp metadata script
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vgtyp_new.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surfrad.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_anomalycor.py deploy -- old anomalycor metadata script
