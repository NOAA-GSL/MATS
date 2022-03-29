#!/bin/bash --login

# do not forget the 'deploy' switch
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling.py deploy
/home/amb-verif/mats_metadata/update_metadata_ceiling.py persis
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling5.py deploy
/home/amb-verif/mats_metadata/update_metadata_ceiling5.py persis
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surface.py deploy
#/home/amb-verif/mats_metadata/update_metadata_surface.py persis
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_upperair.py deploy
#/home/amb-verif/mats_metadata/update_metadata_upperair.py persis
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_visibility.py deploy
/home/amb-verif/mats_metadata/update_metadata_visibility.py persis
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_visibility1.py deploy
#/home/amb-verif/mats_metadata/update_metadata_visibility1.py persis
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip2.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip_gauge.py deploy
#/home/amb-verif/mats_metadata/update_metadata_precip_aqpi.py persis
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip_1hr.py deploy
#home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ptype.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_cref.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vil.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_echotop.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_anomalycor.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_aircraft.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vgtyp.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surfrad.py deploy
#/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_raobamdar.py deploy
/home/amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_upperair_prepbufr.py deploy
/home/amb-verif/mats_metadata/update_metadata_upperair_prepbufr.py persis