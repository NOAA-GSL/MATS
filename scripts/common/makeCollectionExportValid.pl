#! /usr/bin/perl

# This utility is used to make an export of the deployment collections (which is a group of json obects) into a valid
# json list of json objects
# the resulting deployment.json file is copied by the build script to an uncontrolled file in the mats-common package -
# prior to the meteor build so that it can be used bu an app to read version information

local $/ = undef;
my $file = <>;
$file =~ s/\n\}\n\{\n/\n},\n{\n/sg;
$file =~ s/^\{/[{/;
$file =~ s/\}$/}]/;
print $file;
