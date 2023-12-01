#!/bin/tcsh
source /home/role.amb-verif/.tcshrc
conda activate avid_verify_py3
# do not forget the 'deploy' switch
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_ceiling.py persis
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ceiling5.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_ceiling5.py persis
/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surface.py deploy
/home/role.amb-verif/mats_metadata/update_metadata_surface.py persis
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_upperair.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_upperair.py persis
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_visibility.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_visibility.py persis
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_visibility1.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_visibility1.py persis
/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip2.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip_gauge.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_precip_gauge.py persis
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_precip_1hr.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ptype.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_cref.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vil.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_echotop.py deploy
/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_anomalycor.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_aircraft.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_vgtyp.py deploy
/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_surfrad.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_raobamdar.py deploy
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_upperair_prepbufr.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_upperair_prepbufr.py persis
#/home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_upperair2.py deploy
#/home/role.amb-verif/mats_metadata/update_metadata_upperair2.py persis
# /home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ensemble_cref.py deploy
# /home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_ensemble_pqpf.py deploy
# /home/role.amb-verif/mats_metadata/make_regions_per_model_mats_all_categories_cloud_base.py deploy
conda deactivate