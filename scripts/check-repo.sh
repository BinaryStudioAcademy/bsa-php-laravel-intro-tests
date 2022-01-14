#!/bin/bash
 
REPO_URL=$1
git ls-remote $REPO_URL -q
exist=$?

if [ $exist == 0 ]
then
   echo 'true';
else
   echo 'false';
fi
