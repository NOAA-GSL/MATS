#! /usr/bin/perl

local $/ = undef;

my $file = <>;

$file =~ s/\n\}\n\{\n/\n},\n{\n/sg;
$file =~ s/^\{/[{/;
$file =~ s/\}$/}]/;

print $file;
